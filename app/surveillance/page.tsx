"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  DoorClosed,
  DoorOpen,
  Layers,
  Lock,
  Maximize2,
  Mic,
  MicOff,
  Monitor,
  MoreHorizontal,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Unlock,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
  Eye,
  Video,
} from "lucide-react"
import {
  CAMERAS,
  DOORS,
  FLOORS,
  LIVE_EVENTS,
  ZONE_OVERVIEW,
  SURVEILLANCE_STATS,
  type Camera as CameraType,
  type Door as DoorType,
  type FloorId,
  type LiveEvent,
} from "@/lib/mock-data/demo-surveillance"

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso))
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

const CAMERA_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  online:      { label: "En ligne",    color: "text-green-400",  dot: "bg-green-500",  icon: Wifi },
  recording:   { label: "Enregistrement", color: "text-red-400", dot: "bg-red-500",    icon: Video },
  offline:     { label: "Hors ligne",  color: "text-slate-400",  dot: "bg-slate-500",  icon: WifiOff },
  alarm:       { label: "Alarme",      color: "text-red-500",    dot: "bg-red-500",    icon: ShieldAlert },
  maintenance: { label: "Maintenance", color: "text-yellow-400", dot: "bg-yellow-500", icon: RefreshCw },
}

const DOOR_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  locked:   { label: "Verrouillée", color: "text-green-400",  bg: "bg-green-500/10",  icon: Lock },
  unlocked: { label: "Déverrouillée",color: "text-blue-400",  bg: "bg-blue-500/10",   icon: Unlock },
  open:     { label: "Ouverte",     color: "text-yellow-400", bg: "bg-yellow-500/10", icon: DoorOpen },
  forced:   { label: "Forcée",      color: "text-red-500",    bg: "bg-red-500/10",    icon: AlertTriangle },
  alarm:    { label: "ALARME",      color: "text-red-500",    bg: "bg-red-500/15",    icon: ShieldAlert },
  offline:  { label: "Hors ligne",  color: "text-slate-400",  bg: "bg-slate-500/10",  icon: WifiOff },
}

const EVENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  access_granted:  { label: "Accès accordé",  color: "text-green-400",  bg: "bg-green-500/10" },
  access_denied:   { label: "Accès refusé",   color: "text-red-400",    bg: "bg-red-500/10" },
  door_open:       { label: "Porte ouverte",  color: "text-blue-400",   bg: "bg-blue-500/10" },
  door_forced:     { label: "Porte forcée",   color: "text-red-600",    bg: "bg-red-600/15" },
  motion:          { label: "Mouvement",      color: "text-yellow-400", bg: "bg-yellow-500/10" },
  camera_offline:  { label: "Caméra hors ligne",color:"text-slate-400", bg: "bg-slate-500/10" },
  alarm:           { label: "ALARME",         color: "text-red-500",    bg: "bg-red-500/15" },
}

// ── Camera Tile ───────────────────────────────────────────────────────────────
function CameraFeed({ camera, large = false }: { camera: CameraType; large?: boolean }) {
  const cfg = CAMERA_STATUS_CONFIG[camera.status]
  const CfgIcon = cfg.icon
  const isAlarm = camera.status === "alarm"
  const isOffline = camera.status === "offline"

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border transition-all",
      isAlarm ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-border/60 hover:border-border hover:shadow-md",
      large ? "aspect-video" : "aspect-video"
    )}>
      {/* Simulated feed */}
      <div
        className={cn("absolute inset-0 transition-opacity", isOffline ? "opacity-30" : "opacity-100")}
        style={{ background: isOffline ? "#111" : `radial-gradient(ellipse at 30% 40%, ${camera.thumbnailColor}88 0%, ${camera.thumbnailColor}22 60%, #111 100%)` }}
      >
        {isAlarm && (
          <div className="absolute inset-0 animate-pulse border-2 border-red-500/50" />
        )}
        {camera.status === "recording" && (
          <div className="absolute inset-0 flex items-start justify-end p-2">
            <div className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              REC
            </div>
          </div>
        )}
        {!isOffline && (
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2">
            <p className="text-[10px] font-medium text-white">{camera.name}</p>
            <p className="text-[9px] text-white/60">{camera.location}</p>
          </div>
        )}
        {isOffline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <WifiOff className="h-6 w-6 text-slate-500" />
            <p className="text-[10px] text-slate-500">Signal perdu</p>
          </div>
        )}
      </div>

      {/* Status dot */}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", isAlarm ? "animate-pulse" : "", cfg.dot)} />
        <span className={cn("text-[9px] font-medium", cfg.color)}>{cfg.label}</span>
      </div>

      {/* Hover actions */}
      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs backdrop-blur-sm">
          <Maximize2 className="h-3 w-3" /> Plein écran
        </Button>
      </div>
    </div>
  )
}

// ── Door Status Card ──────────────────────────────────────────────────────────
function DoorCard({ door }: { door: DoorType }) {
  const cfg = DOOR_STATUS_CONFIG[door.status]
  const DoorIcon = cfg.icon
  const isAlarm = door.status === "alarm" || door.status === "forced"

  return (
    <div className={cn(
      "rounded-xl border p-3.5 transition-all",
      isAlarm ? "border-red-500/40 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.15)] animate-pulse" : "border-border/60 bg-card hover:border-border",
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", cfg.bg)}>
            <DoorIcon className={cn("h-4 w-4", cfg.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{door.name}</p>
            <p className="text-[10px] text-muted-foreground">{door.location}</p>
          </div>
        </div>
        <Badge className={cn("text-[10px] shrink-0", cfg.bg, cfg.color)}>{cfg.label}</Badge>
      </div>

      {door.isEmergency && (
        <Badge variant="outline" className="mt-2 text-[9px] border-orange-500/30 text-orange-400">Issue de secours</Badge>
      )}

      <div className="mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {door.lastEventUser ? `${door.lastEventType.replace("_", " ")} — ${door.lastEventUser}` : door.lastEventType.replace("_", " ")}
          {" · "}{formatRelative(door.lastEventAt)}
        </span>
      </div>
    </div>
  )
}

// ── Zone Floor Plan ───────────────────────────────────────────────────────────
function FloorPlan({ floorId }: { floorId: FloorId }) {
  const zones = ZONE_OVERVIEW.filter(z => z.floor === floorId)
  const cameras = CAMERAS.filter(c => c.floor === floorId)
  const doors = DOORS.filter(d => d.floor === floorId)

  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
        <Layers className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucune zone sur ce niveau</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map(zone => {
          const zCameras = cameras.filter(c => c.zoneId === zone.id)
          const zDoors = doors.filter(d => d.zoneId === zone.id)
          const alarmCams = zCameras.filter(c => c.status === "alarm").length
          const alarmDoors = zDoors.filter(d => d.status === "alarm" || d.status === "forced").length
          const hasAlarm = alarmCams > 0 || alarmDoors > 0 || zone.activeAlarms > 0
          const occupancyPct = Math.round((zone.occupancy / zone.capacity) * 100)

          return (
            <div key={zone.id} className={cn(
              "rounded-xl border p-4 transition-all",
              hasAlarm ? "border-red-500/40 bg-red-500/5" : "border-border/60 bg-card hover:border-border"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: zone.color }} />
                  <span className="text-sm font-semibold text-foreground">{zone.name}</span>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">Niveau {zone.securityLevel}</Badge>
              </div>

              {hasAlarm && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400">
                  <ShieldAlert className="h-3.5 w-3.5" /> Alerte active
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted/40 p-1.5">
                  <p className="font-bold text-foreground">{zone.occupancy}</p>
                  <p className="text-[10px] text-muted-foreground">Personnes</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-1.5">
                  <p className="font-bold text-foreground">{zCameras.length}</p>
                  <p className="text-[10px] text-muted-foreground">Caméras</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-1.5">
                  <p className="font-bold text-foreground">{zDoors.length}</p>
                  <p className="text-[10px] text-muted-foreground">Portes</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Occupation</span>
                  <span>{occupancyPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", occupancyPct > 80 ? "bg-red-500" : occupancyPct > 60 ? "bg-yellow-500" : "bg-green-500")}
                    style={{ width: `${occupancyPct}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type SurveillanceTab = "site" | "cameras" | "doors" | "live"

export default function SurveillancePage() {
  const [tab, setTab] = useState<SurveillanceTab>("cameras")
  const [selectedFloor, setSelectedFloor] = useState<FloorId>("rdc")
  const [liveEvents, setLiveEvents] = useState(LIVE_EVENTS)
  const [tick, setTick] = useState(0)

  // Simulate live feed progression
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(interval)
  }, [])

  const filteredCameras = CAMERAS.filter(c => selectedFloor === "rdc" || c.floor === selectedFloor)
  const filteredDoors   = DOORS.filter(d => selectedFloor === "rdc" || d.floor === selectedFloor)

  const alarmCount = CAMERAS.filter(c => c.status === "alarm").length + DOORS.filter(d => d.status === "alarm").length

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <Monitor className="h-5 w-5 text-blue-500" />
                {alarmCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{alarmCount}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Surveillance Live</h1>
                <p className="text-sm text-muted-foreground">
                  {SURVEILLANCE_STATS.camerasOnline + SURVEILLANCE_STATS.camerasAlarm} caméras actives · {SURVEILLANCE_STATS.totalOccupancy} personnes sur site
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 text-xs text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Flux actif
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Synchroniser
              </Button>
            </div>
          </div>

          {/* Alarm banner */}
          {alarmCount > 0 && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-500 animate-pulse" />
              <p className="text-sm font-semibold text-red-400">
                ALERTE — {alarmCount} équipement{alarmCount > 1 ? "s" : ""} en état d'alarme — intervention requise
              </p>
            </div>
          )}

          {/* KPI strip */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {[
              { label: "Caméras actives",  value: SURVEILLANCE_STATS.camerasOnline + SURVEILLANCE_STATS.camerasAlarm, color: "text-green-400",  bg: "bg-green-500/10",  icon: Camera },
              { label: "Hors ligne",       value: SURVEILLANCE_STATS.camerasOffline,  color: "text-slate-400",  bg: "bg-slate-500/10",  icon: WifiOff },
              { label: "En alarme",        value: SURVEILLANCE_STATS.camerasAlarm,    color: "text-red-500",    bg: "bg-red-500/10",    icon: ShieldAlert },
              { label: "Portes verrouillées",value: SURVEILLANCE_STATS.doorsLocked,  color: "text-green-400",  bg: "bg-green-500/10",  icon: Lock },
              { label: "Portes ouvertes",  value: SURVEILLANCE_STATS.doorsOpen,       color: "text-blue-400",   bg: "bg-blue-500/10",   icon: DoorOpen },
              { label: "Alertes portes",   value: SURVEILLANCE_STATS.doorsAlarm,      color: "text-red-500",    bg: "bg-red-500/10",    icon: AlertTriangle },
              { label: "Personnes sur site",value: SURVEILLANCE_STATS.totalOccupancy, color: "text-purple-400", bg: "bg-purple-500/10", icon: Users },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", bg)}>
                  <Icon className={cn("h-3.5 w-3.5", color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={v => setTab(v as SurveillanceTab)}>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <TabsList className="flex-1 grid grid-cols-4 gap-1 bg-muted/30 p-1 min-w-0">
                <TabsTrigger value="site"    className="gap-1.5 text-xs sm:text-sm"><Layers  className="h-3.5 w-3.5" /><span>Plan du site</span></TabsTrigger>
                <TabsTrigger value="cameras" className="gap-1.5 text-xs sm:text-sm"><Camera  className="h-3.5 w-3.5" /><span>Caméras</span><Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{CAMERAS.length}</Badge></TabsTrigger>
                <TabsTrigger value="doors"   className="gap-1.5 text-xs sm:text-sm"><Lock    className="h-3.5 w-3.5" /><span>Portes</span><Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{DOORS.length}</Badge></TabsTrigger>
                <TabsTrigger value="live"    className="gap-1.5 text-xs sm:text-sm"><Activity className="h-3.5 w-3.5" /><span>Événements</span></TabsTrigger>
              </TabsList>

              {tab !== "live" && (
                <Select value={selectedFloor} onValueChange={v => setSelectedFloor(v as FloorId)}>
                  <SelectTrigger className="w-44 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rdc">Tous les niveaux</SelectItem>
                    {FLOORS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ── Site plan tab ── */}
            <TabsContent value="site">
              <div className="space-y-6">
                {FLOORS.map(floor => {
                  const hasZones = ZONE_OVERVIEW.some(z => z.floor === floor.id)
                  if (!hasZones) return null
                  return (
                    <div key={floor.id}>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary">{floor.shortLabel}</span>
                        {floor.label}
                      </h3>
                      <FloorPlan floorId={floor.id} />
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* ── Cameras tab ── */}
            <TabsContent value="cameras">
              {/* Alarm cameras first */}
              {CAMERAS.filter(c => c.status === "alarm" && (selectedFloor === "rdc" || c.floor === selectedFloor)).length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> Caméras en alarme
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {CAMERAS.filter(c => c.status === "alarm" && (selectedFloor === "rdc" || c.floor === selectedFloor)).map(c => (
                      <CameraFeed key={c.id} camera={c} large />
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCameras.filter(c => c.status !== "alarm").map(c => (
                  <CameraFeed key={c.id} camera={c} />
                ))}
              </div>
            </TabsContent>

            {/* ── Doors tab ── */}
            <TabsContent value="doors">
              {/* Alarm doors */}
              {filteredDoors.filter(d => d.status === "alarm" || d.status === "forced").length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> Portes en alerte
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDoors.filter(d => d.status === "alarm" || d.status === "forced").map(d => <DoorCard key={d.id} door={d} />)}
                  </div>
                  <div className="my-4 border-t border-border/40" />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDoors.filter(d => d.status !== "alarm" && d.status !== "forced").map(d => <DoorCard key={d.id} door={d} />)}
              </div>
            </TabsContent>

            {/* ── Live events tab ── */}
            <TabsContent value="live">
              <div className="rounded-xl border border-border/60 bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Activity className="h-4 w-4 text-primary" />
                    Événements en temps réel
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-green-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    Actif
                  </div>
                </div>

                <div className="divide-y divide-border/40">
                  {liveEvents.map(ev => {
                    const cfg = EVENT_CONFIG[ev.type] ?? EVENT_CONFIG.access_granted
                    const floor = FLOORS.find(f => f.id === ev.floor)
                    return (
                      <div key={ev.id} className={cn("flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/20", ev.severity === "critical" && "bg-red-500/5")}>
                        <div className={cn("h-2 w-2 shrink-0 rounded-full", ev.severity === "critical" ? "bg-red-500 animate-pulse" : ev.severity === "warning" ? "bg-yellow-500" : "bg-green-500")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("text-[10px]", cfg.bg, cfg.color)}>{cfg.label}</Badge>
                            <span className="text-xs text-foreground">{ev.entityName}</span>
                            {ev.person && <span className="text-xs text-muted-foreground">— {ev.person}</span>}
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>{ev.location}</span>
                            {floor && <span className="rounded bg-muted/50 px-1 text-[9px]">{floor.shortLabel}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(ev.createdAt)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
