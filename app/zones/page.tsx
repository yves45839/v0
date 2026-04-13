"use client"

import { useState, useMemo } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Battery,
  ChevronRight,
  Clock,
  DoorOpen,
  Edit,
  Eye,
  FolderTree,
  Layers,
  Lock,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Tag,
  Trash2,
  Unlock,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
  CalendarDays,
  Building2,
} from "lucide-react"
import {
  ZONES,
  READERS,
  ACCESS_GROUPS,
  ACCESS_SCHEDULES,
  ZONES_STATS,
  type SecurityZone,
  type Reader,
  type AccessGroup,
  type ZoneLevel,
} from "@/lib/mock-data/demo-zones"

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}
function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

const READER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  online:      { label: "En ligne",    color: "text-green-400",  bg: "bg-green-500/10",  icon: Wifi },
  offline:     { label: "Hors ligne",  color: "text-slate-400",  bg: "bg-slate-500/10",  icon: WifiOff },
  tampered:    { label: "Sabotage",    color: "text-red-500",    bg: "bg-red-500/10",    icon: AlertTriangle },
  maintenance: { label: "Maintenance", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Wrench },
}

const DOOR_MODE_LABELS: Record<string, string> = {
  normal:         "Normal",
  always_open:    "Toujours ouverte",
  always_locked:  "Toujours verrouillée",
  time_controlled:"Contrôle horaire",
}

const LEVEL_CONFIG: Record<ZoneLevel, { label: string; color: string; bg: string; border: string }> = {
  1: { label: "Niveau 1",  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  2: { label: "Niveau 2",  color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  3: { label: "Niveau 3",  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  4: { label: "Niveau 4",  color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  5: { label: "Niveau 5",  color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
}

const DAY_LABELS: Record<string, string> = { mon: "L", tue: "M", wed: "Me", thu: "J", fri: "V", sat: "S", sun: "D" }

// ── Zone Card ─────────────────────────────────────────────────────────────────
function ZoneCard({ zone, onView, onEdit }: { zone: SecurityZone; onView: (z: SecurityZone) => void; onEdit: (z: SecurityZone) => void }) {
  const lvl = LEVEL_CONFIG[zone.level]
  const children = ZONES.filter(z => z.parentId === zone.id)
  const occupancyPct = Math.round((zone.occupancy / zone.capacity) * 100)

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card p-4 transition-all hover:border-border hover:shadow-md", lvl.border)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: zone.color }} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{zone.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{zone.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge className={cn("text-[10px]", lvl.bg, lvl.color)}>{lvl.label}</Badge>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-foreground">{zone.occupancy}/{zone.capacity}</p>
          <p className="text-[10px] text-muted-foreground">Occupation</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-foreground">{zone.readers.length}</p>
          <p className="text-[10px] text-muted-foreground">Lecteurs</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-foreground">{zone.accessGroups.length}</p>
          <p className="text-[10px] text-muted-foreground">Groupes</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Étage : {zone.floor}</span>
          <span>{occupancyPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", occupancyPct > 80 ? "bg-red-500" : occupancyPct > 50 ? "bg-yellow-500" : "bg-green-500")}
            style={{ width: `${Math.max(2, occupancyPct)}%` }} />
        </div>
      </div>

      {children.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <FolderTree className="h-3 w-3" /> {children.length} sous-zone{children.length > 1 ? "s" : ""}
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onView(zone)}>
          <Eye className="mr-1 h-3 w-3" /> Détail
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(zone)}>
          <Edit className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ── Zone Detail Modal ─────────────────────────────────────────────────────────
function ZoneDetailModal({ zone, onClose }: { zone: SecurityZone | null; onClose: () => void }) {
  if (!zone) return null
  const lvl = LEVEL_CONFIG[zone.level]
  const zoneReaders = READERS.filter(r => r.zoneId === zone.id)
  const zoneGroups = ACCESS_GROUPS.filter(g => g.zoneIds.includes(zone.id))
  const parent = ZONES.find(z => z.id === zone.parentId)
  const children = ZONES.filter(z => z.parentId === zone.id)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: zone.color }} />
            {zone.name}
          </DialogTitle>
          <DialogDescription className="flex gap-2">
            <Badge className={cn("text-[10px]", lvl.bg, lvl.color)}>{lvl.label}</Badge>
            <Badge variant="outline" className="text-[10px]">{zone.floor}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-muted-foreground">{zone.description}</p>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Occupation", value: `${zone.occupancy}/${zone.capacity}` },
              { label: "Lecteurs",   value: zone.readers.length },
              { label: "Groupes",    value: zone.accessGroups.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {parent && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Zone parente</p>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: parent.color }} />
                <span className="font-medium">{parent.name}</span>
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Sous-zones</p>
              <div className="space-y-1.5">
                {children.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                    <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: c.color }} />
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {zoneReaders.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Lecteurs actifs</p>
              <div className="space-y-1.5">
                {zoneReaders.map(r => {
                  const rCfg = READER_STATUS_CONFIG[r.status]
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{r.name}</span>
                      <Badge className={cn("text-[10px]", rCfg.bg, rCfg.color)}>{rCfg.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {zoneGroups.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Groupes d'accès autorisés</p>
              <div className="flex flex-wrap gap-1.5">
                {zoneGroups.map(g => <Badge key={g.id} variant="secondary" className="text-[10px]"><Users className="mr-1 h-2.5 w-2.5" />{g.name} ({g.memberCount})</Badge>)}
              </div>
            </div>
          )}

          {zone.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {zone.tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button variant="outline"><Edit className="mr-1.5 h-3.5 w-3.5" /> Modifier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Reader Card ───────────────────────────────────────────────────────────────
function ReaderCard({ reader, onView }: { reader: Reader; onView: (r: Reader) => void }) {
  const cfg = READER_STATUS_CONFIG[reader.status]
  const CfgIcon = cfg.icon
  const isTampered = reader.status === "tampered"

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all hover:border-border hover:shadow-md",
      isTampered ? "border-red-500/40 bg-red-500/5" : "border-border/60 bg-card"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
            <CfgIcon className={cn("h-4 w-4", cfg.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{reader.name}</p>
            <p className="text-[11px] text-muted-foreground">{reader.location}</p>
            <p className="mt-0.5 truncate text-[10px] font-mono text-muted-foreground/70">{reader.serialNumber} · {reader.model}</p>
          </div>
        </div>
        <Badge className={cn("shrink-0 text-[10px]", cfg.bg, cfg.color)}>{cfg.label}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-green-400">{reader.accessCount24h}</p>
          <p className="text-[10px] text-muted-foreground">Accès 24h</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className={cn("font-bold", reader.denialCount24h > 0 ? "text-red-400" : "text-foreground")}>{reader.denialCount24h}</p>
          <p className="text-[10px] text-muted-foreground">Refus 24h</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-foreground">{DOOR_MODE_LABELS[reader.doorMode].split(" ")[0]}</p>
          <p className="text-[10px] text-muted-foreground">Mode</p>
        </div>
      </div>

      {reader.batteryLevel !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <Battery className={cn("h-3.5 w-3.5", reader.batteryLevel < 20 ? "text-red-400" : "text-muted-foreground")} />
          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", reader.batteryLevel < 20 ? "bg-red-500" : reader.batteryLevel < 40 ? "bg-yellow-500" : "bg-green-500")}
              style={{ width: `${reader.batteryLevel}%` }} />
          </div>
          <span className={cn("font-medium", reader.batteryLevel < 20 ? "text-red-400" : "text-muted-foreground")}>{reader.batteryLevel}%</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Firmware {reader.firmware}</span>
        <span>Vu {formatRelative(reader.lastSeen)}</span>
      </div>
    </div>
  )
}

// ── Access Group Card ─────────────────────────────────────────────────────────
function GroupCard({ group, onView }: { group: AccessGroup; onView: (g: AccessGroup) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
            {group.isDefault && <Badge variant="secondary" className="text-[10px]">Défaut</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1 text-xs">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{group.memberCount}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{group.scheduleName}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {group.zoneIds.slice(0, 3).map(zId => {
          const zone = ZONES.find(z => z.id === zId)
          return zone ? (
            <Badge key={zId} variant="outline" className="text-[10px]">
              <div className="mr-1 h-2 w-2 rounded-sm" style={{ backgroundColor: zone.color }} />
              {zone.name.split("—")[0].trim()}
            </Badge>
          ) : null
        })}
        {group.zoneIds.length > 3 && <Badge variant="outline" className="text-[10px]">+{group.zoneIds.length - 3}</Badge>}
      </div>

      <Button size="sm" variant="outline" className="mt-3 h-7 w-full text-xs" onClick={() => onView(group)}>
        <Eye className="mr-1.5 h-3 w-3" /> Voir les membres & zones
      </Button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type ZonesTab = "zones" | "readers" | "groups" | "schedules"

export default function ZonesPage() {
  const [tab, setTab] = useState<ZonesTab>("zones")
  const [search, setSearch] = useState("")
  const [selectedZone, setSelectedZone] = useState<SecurityZone | null>(null)

  const filteredZones = useMemo(() =>
    ZONES.filter(z => !search || z.name.toLowerCase().includes(search.toLowerCase()) || z.floor.toLowerCase().includes(search.toLowerCase())),
    [search])

  const filteredReaders = useMemo(() =>
    READERS.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.location.toLowerCase().includes(search.toLowerCase())),
    [search])

  const filteredGroups = useMemo(() =>
    ACCESS_GROUPS.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase())),
    [search])

  const tamperedReaders = READERS.filter(r => r.status === "tampered")
  const lowBattery = READERS.filter(r => r.batteryLevel !== undefined && r.batteryLevel < 20)

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
                <Layers className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Zones & Accès</h1>
                <p className="text-sm text-muted-foreground">{ZONES_STATS.totalZones} zones · {ZONES_STATS.totalReaders} lecteurs · {ZONES_STATS.totalGroups} groupes</p>
              </div>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" /> Nouvelle zone
            </Button>
          </div>

          {/* Alerts */}
          {(tamperedReaders.length > 0 || lowBattery.length > 0) && (
            <div className="mb-5 space-y-2">
              {tamperedReaders.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="text-red-400">Sabotage détecté : {r.name} ({r.location})</span>
                </div>
              ))}
              {lowBattery.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
                  <Battery className="h-4 w-4 shrink-0 text-yellow-500" />
                  <span className="text-yellow-400">Batterie critique : {r.name} ({r.batteryLevel}%) — remplacement requis</span>
                </div>
              ))}
            </div>
          )}

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Zones configurées", value: ZONES_STATS.totalZones,      icon: Layers, color: "text-indigo-400", bg: "bg-indigo-500/10" },
              { label: "Lecteurs en ligne",  value: ZONES_STATS.readersOnline,   icon: Wifi,   color: "text-green-400",  bg: "bg-green-500/10" },
              { label: "Hors ligne/Maint.",  value: ZONES_STATS.readersOffline + ZONES_STATS.readersMaintenance, icon: WifiOff, color: "text-slate-400", bg: "bg-slate-500/10" },
              { label: "Groupes d'accès",    value: ZONES_STATS.totalGroups,     icon: Users,  color: "text-violet-400", bg: "bg-violet-500/10" },
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
          <Tabs value={tab} onValueChange={v => setTab(v as ZonesTab)}>
            <TabsList className="mb-5 grid w-full grid-cols-4 gap-1 bg-muted/30 p-1">
              <TabsTrigger value="zones"     className="gap-1.5 text-xs sm:text-sm"><Layers  className="h-3.5 w-3.5" /><span>Zones</span></TabsTrigger>
              <TabsTrigger value="readers"   className="gap-1.5 text-xs sm:text-sm"><Radio   className="h-3.5 w-3.5" /><span>Lecteurs</span><Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{READERS.length}</Badge></TabsTrigger>
              <TabsTrigger value="groups"    className="gap-1.5 text-xs sm:text-sm"><Users   className="h-3.5 w-3.5" /><span>Groupes</span></TabsTrigger>
              <TabsTrigger value="schedules" className="gap-1.5 text-xs sm:text-sm"><CalendarDays className="h-3.5 w-3.5" /><span>Horaires</span></TabsTrigger>
            </TabsList>

            {/* Search bar shared */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>

            {/* ── Zones tab ── */}
            <TabsContent value="zones">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredZones.map(z => <ZoneCard key={z.id} zone={z} onView={setSelectedZone} onEdit={setSelectedZone} />)}
              </div>
            </TabsContent>

            {/* ── Readers tab ── */}
            <TabsContent value="readers">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredReaders.map(r => <ReaderCard key={r.id} reader={r} onView={() => {}} />)}
              </div>
            </TabsContent>

            {/* ── Groups tab ── */}
            <TabsContent value="groups">
              <div className="mb-3 flex justify-end">
                <Button size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Nouveau groupe
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map(g => <GroupCard key={g.id} group={g} onView={() => {}} />)}
              </div>
            </TabsContent>

            {/* ── Schedules tab ── */}
            <TabsContent value="schedules">
              <div className="space-y-3">
                {ACCESS_SCHEDULES.map(sch => (
                  <div key={sch.id} className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{sch.name}</p>
                      <p className="text-xs text-muted-foreground">{sch.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="flex gap-0.5">
                          {["mon","tue","wed","thu","fri","sat","sun"].map(d => (
                            <span key={d} className={cn("flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium", sch.days.includes(d as never) ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground")}>
                              {DAY_LABELS[d]}
                            </span>
                          ))}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{sch.startTime} – {sch.endTime}</Badge>
                        {sch.isHolidayExcluded && <Badge variant="outline" className="text-[10px]">Sans jours fériés</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full gap-2 border-dashed">
                  <Plus className="h-4 w-4" /> Ajouter un horaire
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {selectedZone && <ZoneDetailModal zone={selectedZone} onClose={() => setSelectedZone(null)} />}
    </div>
  )
}
