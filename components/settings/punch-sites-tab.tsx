"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Edit, Link2, Loader2, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { ApiError } from "@/lib/api/client"
import {
  createSite,
  deleteSite,
  fetchSites,
  resolveTenantId,
  updateSite,
  type SiteItem,
} from "@/lib/api/sites"
import { useI18n } from "@/lib/i18n/context"
import { settingsPageDict } from "@/lib/i18n/pages/settings-page"

const RADIUS_MIN = 30
const RADIUS_MAX = 2000
const RADIUS_DEFAULT = 100

type SiteForm = {
  name: string
  address: string
  latitude: string
  longitude: string
  radius: number
  isActive: boolean
}

const EMPTY_FORM: SiteForm = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius: RADIUS_DEFAULT,
  isActive: true,
}

/**
 * Extrait un couple lat/lng depuis un lien Google Maps (`@lat,lng`,
 * `q=lat,lng`, `query=lat,lng`) ou un texte brut "lat, lng".
 */
function parseLatLng(raw: string): { lat: number; lng: number } | null {
  let text = raw.trim()
  if (!text) return null
  try {
    text = decodeURIComponent(text)
  } catch {
    // Texte non encodé : on garde la valeur brute.
  }

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // .../@48.8584,2.2945,17z
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // ...?q=48.8584,2.2945
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/, // "48.8584, 2.2945"
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    const lat = Number.parseFloat(match[1])
    const lng = Number.parseFloat(match[2])
    if (isValidLat(lat) && isValidLng(lng)) {
      return { lat, lng }
    }
  }
  return null
}

function isValidLat(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90
}

function isValidLng(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) return error.message
  return fallback
}

export function PunchSitesTab() {
  const { locale } = useI18n()
  const tr = settingsPageDict[locale]
  const ts = tr.sites

  const [sites, setSites] = useState<SiteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null)
  const [form, setForm] = useState<SiteForm>(EMPTY_FORM)
  const [mapsLink, setMapsLink] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const loadSites = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setSites(await fetchSites())
    } catch (error) {
      setLoadError(errorMessage(error, ts.loadError))
    } finally {
      setIsLoading(false)
    }
  }, [ts.loadError])

  useEffect(() => {
    void loadSites()
  }, [loadSites])

  const parsedLat = Number.parseFloat(form.latitude)
  const parsedLng = Number.parseFloat(form.longitude)
  const coordinatesValid = isValidLat(parsedLat) && isValidLng(parsedLng)

  const mapPreviewUrl = useMemo(() => {
    if (!coordinatesValid) return null
    const bbox = [
      (parsedLng - 0.004).toFixed(6),
      (parsedLat - 0.002).toFixed(6),
      (parsedLng + 0.004).toFixed(6),
      (parsedLat + 0.002).toFixed(6),
    ].join(",")
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${parsedLat},${parsedLng}`
  }, [coordinatesValid, parsedLat, parsedLng])

  const openCreateDialog = () => {
    setEditingSite(null)
    setForm(EMPTY_FORM)
    setMapsLink("")
    setDialogOpen(true)
  }

  const openEditDialog = (site: SiteItem) => {
    setEditingSite(site)
    setForm({
      name: site.name,
      address: site.address ?? "",
      latitude: site.latitude,
      longitude: site.longitude,
      radius: site.radius_m,
      isActive: site.is_active,
    })
    setMapsLink("")
    setDialogOpen(true)
  }

  const applyMapsLink = () => {
    const parsed = parseLatLng(mapsLink)
    if (!parsed) {
      toast.error(ts.mapsLinkInvalid)
      return
    }
    setForm((prev) => ({
      ...prev,
      latitude: String(parsed.lat),
      longitude: String(parsed.lng),
    }))
    toast.success(ts.mapsLinkParsed)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(ts.nameRequired)
      return
    }
    if (!isValidLat(parsedLat)) {
      toast.error(ts.latInvalid)
      return
    }
    if (!isValidLng(parsedLng)) {
      toast.error(ts.lngInvalid)
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: String(parsedLat),
        longitude: String(parsedLng),
        radius_m: form.radius,
        is_active: form.isActive,
      }
      if (editingSite) {
        const updated = await updateSite(editingSite.id, payload)
        setSites((prev) => prev.map((site) => (site.id === updated.id ? updated : site)))
        toast.success(ts.updated)
      } else {
        const tenantId = await resolveTenantId()
        if (tenantId === null) {
          toast.error(ts.tenantMissing)
          return
        }
        const created = await createSite({ ...payload, tenant: tenantId })
        setSites((prev) => [...prev, created])
        toast.success(ts.created)
      }
      setDialogOpen(false)
    } catch (error) {
      toast.error(errorMessage(error, ts.saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (site: SiteItem, nextActive: boolean) => {
    setTogglingId(site.id)
    try {
      const updated = await updateSite(site.id, { is_active: nextActive })
      setSites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(nextActive ? ts.activated : ts.deactivated)
    } catch (error) {
      toast.error(errorMessage(error, ts.toggleError))
    } finally {
      setTogglingId(null)
    }
  }

  const requestDelete = (site: SiteItem) => {
    confirm({
      title: ts.deleteConfirmTitle(site.name),
      description: ts.deleteConfirmDesc,
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteSite(site.id)
          setSites((prev) => prev.filter((item) => item.id !== site.id))
          toast.success(ts.deleted)
        } catch (error) {
          toast.error(errorMessage(error, ts.deleteError))
        }
      },
    })
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-teal-600 opacity-70" />
        <div className="flex items-center justify-between gap-4 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/10 ring-1 ring-emerald-400/20">
              <MapPin className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{ts.title}</h2>
              <p className="text-xs text-muted-foreground">{ts.desc}</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {ts.newSiteButton}
          </Button>
        </div>

        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {ts.loading}
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void loadSites()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {ts.retry}
              </Button>
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-10 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">{ts.emptyTitle}</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">{ts.emptyDesc}</p>
              </div>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                {ts.createFirstCta}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts.colName}</TableHead>
                    <TableHead>{ts.colAddress}</TableHead>
                    <TableHead>{ts.colCoordinates}</TableHead>
                    <TableHead>{ts.colRadius}</TableHead>
                    <TableHead>{ts.colActive}</TableHead>
                    <TableHead className="text-right">{ts.colActions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium text-foreground">{site.name}</TableCell>
                      <TableCell className="max-w-52 truncate text-muted-foreground">
                        {site.address?.trim() ? site.address : ts.noAddress}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {site.latitude}, {site.longitude}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="tabular-nums">
                          {ts.radiusValue(site.radius_m)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={site.is_active}
                          disabled={togglingId === site.id}
                          aria-label={ts.toggleActiveLabel(site.name)}
                          onCheckedChange={(checked) => void handleToggleActive(site, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={ts.editSiteLabel(site.name)}
                            onClick={() => openEditDialog(site)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label={ts.deleteSiteLabel(site.name)}
                            onClick={() => requestDelete(site)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogue création / édition ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !isSaving && setDialogOpen(open)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle>{editingSite ? ts.editTitle : ts.createTitle}</DialogTitle>
            <DialogDescription>{ts.dialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="punch-site-name">{ts.nameLabel}</Label>
              <Input
                id="punch-site-name"
                value={form.name}
                placeholder={ts.namePlaceholder}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="punch-site-address">{ts.addressLabel}</Label>
              <Input
                id="punch-site-address"
                value={form.address}
                placeholder={ts.addressPlaceholder}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="punch-site-maps-link">{ts.mapsLinkLabel}</Label>
              <div className="flex gap-2">
                <Input
                  id="punch-site-maps-link"
                  value={mapsLink}
                  placeholder={ts.mapsLinkPlaceholder}
                  onChange={(event) => setMapsLink(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      applyMapsLink()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={applyMapsLink} disabled={!mapsLink.trim()}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {ts.mapsLinkApply}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="punch-site-lat">{ts.latitudeLabel}</Label>
                <Input
                  id="punch-site-lat"
                  inputMode="decimal"
                  className="font-mono"
                  value={form.latitude}
                  placeholder="48.8584"
                  onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="punch-site-lng">{ts.longitudeLabel}</Label>
                <Input
                  id="punch-site-lng"
                  inputMode="decimal"
                  className="font-mono"
                  value={form.longitude}
                  placeholder="2.2945"
                  onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="punch-site-radius">{ts.radiusLabel}</Label>
                <span className="font-mono text-sm tabular-nums text-foreground">{ts.radiusValue(form.radius)}</span>
              </div>
              <Slider
                id="punch-site-radius"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={10}
                value={[form.radius]}
                onValueChange={([value]) => setForm((prev) => ({ ...prev, radius: value ?? RADIUS_DEFAULT }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{ts.activeLabel}</p>
                <p className="text-xs text-muted-foreground">{ts.activeHint}</p>
              </div>
              <Switch
                checked={form.isActive}
                aria-label={ts.activeLabel}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{ts.mapPreviewTitle}</Label>
              {mapPreviewUrl ? (
                <iframe
                  key={mapPreviewUrl}
                  src={mapPreviewUrl}
                  title={ts.mapPreviewTitle}
                  className="h-48 w-full rounded-xl border border-border/60"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/40 px-4 text-center text-xs text-muted-foreground">
                  {ts.mapPreviewHint}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              {tr.cancel}
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tr.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDialog}
    </>
  )
}
