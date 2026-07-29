"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { StatusChip } from "@/components/ui/status-chip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  CalendarDays,
  Edit,
  ExternalLink,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import { ApiError } from "@/lib/api/client"
import { getActiveTenantCode } from "@/lib/api/auth"
import {
  fetchAccessGroups,
  createAccessGroup,
  updateAccessGroup,
  deleteAccessGroup,
  fetchDevices,
  fetchPlannings,
  fetchTenants,
  type ZoneAccessGroup,
  type ZoneAccessGroupPayload,
  type ZoneDevice,
  type ZonePlanning,
  type ZoneTenant,
} from "@/lib/api/zones"
import { useI18n } from "@/lib/i18n/context"
import { zonesDict } from "@/lib/i18n/pages/zones"

type ZonesDict = (typeof zonesDict)["en"]

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function deviceStatusChip(status: string | undefined, tr: ZonesDict) {
  const normalized = (status ?? "").toLowerCase()
  if (["online", "connected", "active", "ok"].includes(normalized)) {
    return <StatusChip variant="success" label={tr.statusOnline} icon={Wifi} size="sm" />
  }
  if (["offline", "disconnected", "error"].includes(normalized)) {
    return <StatusChip variant="danger" label={tr.statusOffline} icon={WifiOff} size="sm" />
  }
  if (normalized) {
    return <StatusChip variant="neutral" label={status as string} dot size="sm" />
  }
  return <StatusChip variant="neutral" label={tr.statusUnknown} dot size="sm" />
}

// ── Access Group Card ─────────────────────────────────────────────────────────

function GroupCard({
  group,
  onEdit,
  onDelete,
  deleting,
}: {
  group: ZoneAccessGroup
  onEdit: (g: ZoneAccessGroup) => void
  onDelete: (g: ZoneAccessGroup) => void
  deleting: boolean
}) {
  const { locale } = useI18n()
  const tr = zonesDict[locale]

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
            {group.code && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {group.code}
              </Badge>
            )}
          </div>
          {group.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{group.description}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-foreground">{group.reader_count}</p>
          <p className="text-[10px] text-muted-foreground">{tr.readersLabel(group.reader_count)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-foreground">{group.employee_count}</p>
          <p className="text-[10px] text-muted-foreground">{tr.employeesLabel(group.employee_count)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarDays className="h-3 w-3 shrink-0" />
        <span className="truncate">{group.planning_name ?? tr.noLinkedSchedule}</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onEdit(group)}>
          <Edit className="mr-1 h-3 w-3" /> {tr.edit}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={tr.deleteGroupAria(group.name)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
          disabled={deleting}
          onClick={() => onDelete(group)}
        >
          {deleting ? <Spinner className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  )
}

// ── Create / Edit Dialog ──────────────────────────────────────────────────────

const NO_PLANNING = "none"

function GroupDialog({
  group,
  plannings,
  devices,
  tenants,
  onClose,
  onSaved,
}: {
  group: ZoneAccessGroup | null
  plannings: ZonePlanning[]
  devices: ZoneDevice[]
  tenants: ZoneTenant[]
  onClose: () => void
  onSaved: () => void
}) {
  const { locale } = useI18n()
  const tr = zonesDict[locale]
  const isEdit = group !== null
  const [name, setName] = useState(group?.name ?? "")
  const [description, setDescription] = useState(group?.description ?? "")
  const [planningId, setPlanningId] = useState<string>(group?.planning != null ? String(group.planning) : NO_PLANNING)
  const [readerIds, setReaderIds] = useState<number[]>(group?.readers ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleReader = (id: number) => {
    setReaderIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(tr.nameRequired)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const planning = planningId === NO_PLANNING ? null : Number(planningId)
      if (isEdit) {
        await updateAccessGroup(group.id, {
          name: trimmedName,
          description: description.trim(),
          planning,
          readers: readerIds,
        })
      } else {
        const activeCode = getActiveTenantCode()
        const tenant = tenants.find((t) => t.code === activeCode)
        if (!tenant) {
          setError(tr.tenantUnresolved)
          setSaving(false)
          return
        }
        const payload: ZoneAccessGroupPayload = {
          tenant: tenant.id,
          name: trimmedName,
          description: description.trim(),
          planning,
          readers: readerIds,
        }
        await createAccessGroup(payload)
      }
      onSaved()
    } catch (err) {
      setError(errorMessage(err, tr.saveFailed))
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? tr.editGroupTitle : tr.newGroupTitle}</DialogTitle>
          <DialogDescription>
            {isEdit ? tr.editGroupDescription : tr.newGroupDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{tr.nameLabel} *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr.namePlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-description">{tr.descriptionLabel}</Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr.descriptionPlaceholder}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{tr.scheduleLabel}</Label>
            <Select value={planningId} onValueChange={setPlanningId}>
              <SelectTrigger>
                <SelectValue placeholder={tr.schedulePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PLANNING}>{tr.noScheduleOption}</SelectItem>
                {plannings.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{tr.authorizedReaders}</Label>
            {devices.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                {tr.noDevicesAvailable}
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                {devices.map((device) => (
                  <label
                    key={device.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={readerIds.includes(device.id)}
                      onCheckedChange={() => toggleReader(device.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">{device.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{device.serial_number}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {tr.readersSelected(readerIds.length)}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {tr.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
            {isEdit ? tr.save : tr.createGroup}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

type PageTab = "groups" | "readers" | "schedules"

export default function AccessGroupsPage() {
  const { locale } = useI18n()
  const tr = zonesDict[locale]
  const trRef = useRef(tr)
  trRef.current = tr

  const [tab, setTab] = useState<PageTab>("groups")
  const [search, setSearch] = useState("")

  const [groups, setGroups] = useState<ZoneAccessGroup[]>([])
  const [devices, setDevices] = useState<ZoneDevice[]>([])
  const [plannings, setPlannings] = useState<ZonePlanning[]>([])
  const [tenants, setTenants] = useState<ZoneTenant[]>([])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ZoneAccessGroup | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [groupsData, devicesData, planningsData, tenantsData] = await Promise.all([
        fetchAccessGroups(),
        fetchDevices(),
        fetchPlannings(),
        fetchTenants(),
      ])
      setGroups(groupsData)
      setDevices(devicesData)
      setPlannings(planningsData)
      setTenants(tenantsData)
    } catch (err) {
      setLoadError(errorMessage(err, trRef.current.loadFailed))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const refreshGroups = useCallback(async () => {
    try {
      setGroups(await fetchAccessGroups())
    } catch (err) {
      setActionError(errorMessage(err, trRef.current.refreshFailed))
    }
  }, [])

  const handleDelete = async (group: ZoneAccessGroup) => {
    if (!window.confirm(tr.deleteConfirm(group.name))) return
    setDeletingId(group.id)
    setActionError(null)
    try {
      await deleteAccessGroup(group.id)
      setGroups((prev) => prev.filter((g) => g.id !== group.id))
    } catch (err) {
      setActionError(errorMessage(err, tr.deleteFailed))
    } finally {
      setDeletingId(null)
    }
  }

  const openCreate = () => {
    setEditingGroup(null)
    setDialogOpen(true)
  }
  const openEdit = (group: ZoneAccessGroup) => {
    setEditingGroup(group)
    setDialogOpen(true)
  }
  const handleSaved = () => {
    setDialogOpen(false)
    setEditingGroup(null)
    void refreshGroups()
  }

  const lowerSearch = search.trim().toLowerCase()

  const filteredGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          !lowerSearch ||
          g.name.toLowerCase().includes(lowerSearch) ||
          g.description.toLowerCase().includes(lowerSearch) ||
          (g.planning_name ?? "").toLowerCase().includes(lowerSearch),
      ),
    [groups, lowerSearch],
  )

  const filteredDevices = useMemo(
    () =>
      devices.filter(
        (d) =>
          !lowerSearch ||
          d.name.toLowerCase().includes(lowerSearch) ||
          d.serial_number.toLowerCase().includes(lowerSearch),
      ),
    [devices, lowerSearch],
  )

  const filteredPlannings = useMemo(
    () =>
      plannings.filter(
        (p) =>
          !lowerSearch || p.name.toLowerCase().includes(lowerSearch) || p.code.toLowerCase().includes(lowerSearch),
      ),
    [plannings, lowerSearch],
  )

  const groupsByDevice = useMemo(() => {
    const map = new Map<number, ZoneAccessGroup[]>()
    for (const group of groups) {
      for (const readerId of group.readers) {
        const list = map.get(readerId) ?? []
        list.push(group)
        map.set(readerId, list)
      }
    }
    return map
  }, [groups])

  const totalEmployees = useMemo(() => groups.reduce((sum, g) => sum + g.employee_count, 0), [groups])

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">
                <Users className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{tr.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? tr.loadingShort
                    : tr.summary(groups.length, devices.length, plannings.length)}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} disabled={loading || Boolean(loadError)}>
              <Plus className="mr-2 h-3.5 w-3.5" /> {tr.newGroup}
            </Button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card py-16">
              <Spinner className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{tr.loadingGroups}</p>
            </div>
          )}

          {/* Error state */}
          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 py-16 text-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <p className="max-w-md px-4 text-sm text-red-400">{loadError}</p>
              <Button size="sm" variant="outline" onClick={() => void loadAll()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {tr.retry}
              </Button>
            </div>
          )}

          {!loading && !loadError && (
            <>
              {/* Action error banner */}
              {actionError && (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span className="text-red-400">{actionError}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs" onClick={() => setActionError(null)}>
                    {tr.dismiss}
                  </Button>
                </div>
              )}

              {/* KPIs */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: tr.kpiGroups, value: groups.length, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
                  { label: tr.kpiReaders, value: devices.length, icon: Radio, color: "text-green-400", bg: "bg-green-500/10" },
                  { label: tr.kpiSchedules, value: plannings.length, icon: CalendarDays, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { label: tr.kpiEmployees, value: totalEmployees, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bg)}>
                      <Icon className={cn("h-4 w-4", color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
                      <p className="truncate text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <Tabs value={tab} onValueChange={(v) => setTab(v as PageTab)}>
                <TabsList className="mb-5 grid w-full grid-cols-3 gap-1 bg-muted/30 p-1">
                  <TabsTrigger value="groups" className="gap-1.5 text-xs sm:text-sm">
                    <Users className="h-3.5 w-3.5" />
                    <span>{tr.tabGroups}</span>
                    <Badge className="ml-1 rounded bg-muted px-1 text-[9px]">{groups.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="readers" className="gap-1.5 text-xs sm:text-sm">
                    <Radio className="h-3.5 w-3.5" />
                    <span>{tr.tabReaders}</span>
                    <Badge className="ml-1 rounded bg-muted px-1 text-[9px]">{devices.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="schedules" className="gap-1.5 text-xs sm:text-sm">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{tr.tabSchedules}</span>
                    <Badge className="ml-1 rounded bg-muted px-1 text-[9px]">{plannings.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Shared search bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={tr.searchPlaceholder}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* ── Groups tab ── */}
                <TabsContent value="groups">
                  {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">{tr.emptyGroups}</p>
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> {tr.newGroup}
                      </Button>
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      {tr.noGroupMatch}
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredGroups.map((g) => (
                        <GroupCard
                          key={g.id}
                          group={g}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          deleting={deletingId === g.id}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Readers tab ── */}
                <TabsContent value="readers">
                  {devices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
                      <Radio className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">{tr.emptyReaders}</p>
                    </div>
                  ) : filteredDevices.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      {tr.noReaderMatch}
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredDevices.map((device) => {
                        const referencedBy = groupsByDevice.get(device.id) ?? []
                        return (
                          <div
                            key={device.id}
                            className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                                  <Radio className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{device.name}</p>
                                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/70">
                                    {device.serial_number} · {tr.readerIndex(device.dev_index)}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0">{deviceStatusChip(device.status, tr)}</div>
                            </div>

                            <div className="mt-3">
                              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {tr.linkedGroups}
                              </p>
                              {referencedBy.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">{tr.noGroupUsesReader}</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {referencedBy.map((g) => (
                                    <Badge key={g.id} variant="secondary" className="text-[10px]">
                                      <Users className="mr-1 h-2.5 w-2.5" />
                                      {g.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ── Schedules tab ── */}
                <TabsContent value="schedules">
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {tr.schedulesReadOnlyPrefix}
                      <a href="/planning" className="font-medium text-foreground underline underline-offset-2">
                        {tr.schedulesReadOnlyLink}
                      </a>
                      {tr.schedulesReadOnlySuffix}
                    </span>
                  </div>
                  {plannings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
                      <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">{tr.emptySchedules}</p>
                    </div>
                  ) : filteredPlannings.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      {tr.noScheduleMatch}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredPlannings.map((planning) => (
                        <div
                          key={planning.id}
                          className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <CalendarDays className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{planning.name}</p>
                            {planning.description && (
                              <p className="text-xs text-muted-foreground">{planning.description}</p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {planning.code}
                              </Badge>
                              {planning.timezone && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {planning.timezone}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>

      {dialogOpen && (
        <GroupDialog
          key={editingGroup?.id ?? "new"}
          group={editingGroup}
          plannings={plannings}
          devices={devices}
          tenants={tenants}
          onClose={() => {
            setDialogOpen(false)
            setEditingGroup(null)
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
