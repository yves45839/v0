"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { enUS, fr as frLocale } from "date-fns/locale"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import {
  fetchCoreDevices,
  fetchGatewayDevices,
  fetchHikEvents,
  formatGatewayErrorEntry,
  isDeviceOnline,
  type HikEvent,
  type SurveillanceCoreDevice,
  type SurveillanceGatewayDevice,
} from "@/lib/api/surveillance"
import { useI18n } from "@/lib/i18n/context"
import type { Locale } from "@/lib/i18n/config"
import {
  surveillanceDict,
  type SurveillanceDict,
  type SurveillanceToneKey,
} from "@/lib/i18n/pages/surveillance"
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  Inbox,
  Loader2,
  MonitorCheck,
  Plug,
  PlugZap,
  RefreshCw,
  ServerCrash,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react"

// ── Constantes ────────────────────────────────────────────────────────────────
const EVENTS_POLL_INTERVAL_MS = 15_000
const DEVICES_REFRESH_INTERVAL_MS = 60_000
const INITIAL_EVENTS_LIMIT = 100
const POLL_EVENTS_LIMIT = 100
const MAX_FEED_EVENTS = 200
const NEW_EVENT_PULSE_MS = 5_000

// ── Helpers ───────────────────────────────────────────────────────────────────
const DATE_FNS_LOCALES = { fr: frLocale, en: enUS } as const

function formatClockTime(iso: string, localeTag: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date)
}

function formatRelative(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return formatDistanceToNow(date, { addSuffix: true, locale: DATE_FNS_LOCALES[locale] })
}

function isToday(iso: string): boolean {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function eventTimestamp(event: HikEvent): string {
  return event.timestamp || event.raw_event?.event_datetime || ""
}

type EventTone = { labelKey: SurveillanceToneKey; color: string; bg: string; dot: string }

const EVENT_TONES: Record<string, EventTone> = {
  CHECK_IN: { labelKey: "checkIn", color: "text-green-400", bg: "bg-green-500/10", dot: "bg-green-500" },
  CHECK_OUT: { labelKey: "checkOut", color: "text-blue-400", bg: "bg-blue-500/10", dot: "bg-blue-500" },
  BREAK_OUT: { labelKey: "breakOut", color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-500" },
  BREAK_IN: { labelKey: "breakIn", color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-500" },
  OVERTIME_IN: { labelKey: "overtimeIn", color: "text-purple-400", bg: "bg-purple-500/10", dot: "bg-purple-500" },
  OVERTIME_OUT: { labelKey: "overtimeOut", color: "text-purple-400", bg: "bg-purple-500/10", dot: "bg-purple-500" },
  ACCESS_DENIED: { labelKey: "accessDenied", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-500" },
}

function eventTone(event: HikEvent): EventTone {
  const action = (event.normalized_action ?? "").trim().toUpperCase()
  if (EVENT_TONES[action]) return EVENT_TONES[action]
  const status = (event.access_status ?? "").trim().toLowerCase()
  if (status === "granted") {
    return { labelKey: "accessGranted", color: "text-green-400", bg: "bg-green-500/10", dot: "bg-green-500" }
  }
  if (status === "denied") {
    return { labelKey: "accessDenied", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-500" }
  }
  return { labelKey: "event", color: "text-muted-foreground", bg: "bg-muted/40", dot: "bg-slate-500" }
}

function toEventId(event: HikEvent): number {
  const parsed = Number(event.id)
  return Number.isFinite(parsed) ? parsed : 0
}

function mergeEvents(existing: HikEvent[], incoming: HikEvent[]): HikEvent[] {
  const byId = new Map<number, HikEvent>()
  for (const event of existing) byId.set(toEventId(event), event)
  for (const event of incoming) byId.set(toEventId(event), event)
  return Array.from(byId.values())
    .sort((a, b) => toEventId(b) - toEventId(a))
    .slice(0, MAX_FEED_EVENTS)
}

function maxEventId(events: HikEvent[]): number | null {
  if (events.length === 0) return null
  return events.reduce((max, event) => Math.max(max, toEventId(event)), 0)
}

// ── Fusion coeur + passerelle ─────────────────────────────────────────────────
type MergedDevice = {
  key: string
  coreId: number | null
  name: string
  serialNumber: string
  devIndex: string
  model: string
  ipAddress: string
  online: boolean
  /** true = statut confirmé en direct par la passerelle, false = inventaire local. */
  liveStatus: boolean
  registered: boolean
  lastEvent: HikEvent | null
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function matchesDevice(event: HikEvent, device: { coreId: number | null; serialNumber: string; devIndex: string }): boolean {
  const eventDevice = event.device
  if (!eventDevice) return false
  if (device.coreId != null && eventDevice.id === device.coreId) return true
  if (device.serialNumber && eventDevice.serial_number === device.serialNumber) return true
  if (device.devIndex && eventDevice.dev_index === device.devIndex) return true
  return false
}

function mergeDevices(
  core: SurveillanceCoreDevice[],
  gateway: SurveillanceGatewayDevice[],
  gatewayReachable: boolean,
  events: HikEvent[],
  tr: SurveillanceDict,
  localeTag: string,
): MergedDevice[] {
  const findGatewayMatch = (device: SurveillanceCoreDevice): SurveillanceGatewayDevice | undefined =>
    gateway.find((entry) => {
      const serial = readString(entry, ["serial_number", "serialNumber", "sn"])
      const devIndex = readString(entry, ["dev_index", "devIndex"])
      return (
        (serial && device.serial_number && serial === device.serial_number) ||
        (devIndex && device.dev_index && devIndex === device.dev_index)
      )
    })

  const merged: MergedDevice[] = core.map((device) => {
    const gwMatch = gatewayReachable ? findGatewayMatch(device) : undefined
    const gwStatus = gwMatch ? readString(gwMatch, ["status", "device_status", "online_status"]) : ""
    const status = gwStatus || String(device.status ?? "")
    const base = {
      coreId: device.id,
      serialNumber: String(device.serial_number ?? ""),
      devIndex: String(device.dev_index ?? ""),
    }
    return {
      key: `core-${device.id}`,
      ...base,
      name:
        String(device.name ?? "").trim() ||
        (gwMatch ? readString(gwMatch, ["name", "device_name", "dev_name"]) : "") ||
        base.serialNumber ||
        tr.deviceFallbackName(device.id),
      model: String(device.model ?? "").trim() || (gwMatch ? readString(gwMatch, ["model", "device_type", "dev_type"]) : ""),
      ipAddress: String(device.ip_address ?? "").trim() || (gwMatch ? readString(gwMatch, ["ip_address", "ip"]) : ""),
      online: isDeviceOnline(status),
      liveStatus: Boolean(gwMatch && gwStatus),
      registered: true,
      lastEvent: events.find((event) => matchesDevice(event, base)) ?? null,
    }
  })

  // Appareils vus par la passerelle mais absents de l'inventaire local.
  if (gatewayReachable) {
    for (const entry of gateway) {
      const serial = readString(entry, ["serial_number", "serialNumber", "sn"])
      const devIndex = readString(entry, ["dev_index", "devIndex"])
      const alreadyMerged = merged.some(
        (device) =>
          (serial && device.serialNumber === serial) || (devIndex && device.devIndex === devIndex),
      )
      if (alreadyMerged) continue
      const base = { coreId: null, serialNumber: serial, devIndex }
      merged.push({
        key: `gw-${devIndex || serial || merged.length}`,
        ...base,
        name: readString(entry, ["name", "device_name", "dev_name"]) || serial || devIndex || tr.gatewayDeviceFallback,
        model: readString(entry, ["model", "device_type", "dev_type"]),
        ipAddress: readString(entry, ["ip_address", "ip"]),
        online: isDeviceOnline(readString(entry, ["status", "device_status", "online_status"])),
        liveStatus: true,
        registered: false,
        lastEvent: events.find((event) => matchesDevice(event, base)) ?? null,
      })
    }
  }

  // En ligne d'abord, puis par nom.
  return merged.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1
    return a.name.localeCompare(b.name, localeTag)
  })
}

// ── Carte appareil ────────────────────────────────────────────────────────────
function DeviceCard({ device }: { device: MergedDevice }) {
  const { locale } = useI18n()
  const tr = surveillanceDict[locale]
  const StatusIcon = device.online ? Wifi : WifiOff
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        device.online ? "border-border/60 bg-card hover:border-border" : "border-red-500/25 bg-red-500/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              device.online ? "bg-green-500/10" : "bg-red-500/10",
            )}
          >
            <Cpu className={cn("h-4 w-4", device.online ? "text-green-400" : "text-red-400")} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{device.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {device.serialNumber || device.devIndex || "—"}
              {device.model ? ` · ${device.model}` : ""}
            </p>
          </div>
        </div>
        <Badge
          className={cn(
            "shrink-0 gap-1 text-[10px]",
            device.online ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400",
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {device.online ? tr.online : tr.offline}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {device.ipAddress && <span className="font-mono">{device.ipAddress}</span>}
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px]",
            device.liveStatus ? "bg-green-500/10 text-green-400" : "bg-muted/50 text-muted-foreground",
          )}
        >
          {device.liveStatus ? tr.liveStatusChip : tr.localInventoryChip}
        </span>
        {!device.registered && (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">{tr.notRegisteredChip}</span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        {device.lastEvent ? (
          <span className="truncate">
            {tr.tones[eventTone(device.lastEvent).labelKey]}
            {device.lastEvent.employee_name ? ` — ${device.lastEvent.employee_name}` : ""}
            {" · "}
            {formatRelative(eventTimestamp(device.lastEvent), locale)}
          </span>
        ) : (
          <span>{tr.noRecentActivity}</span>
        )}
      </div>
    </div>
  )
}

// ── Ligne du flux ─────────────────────────────────────────────────────────────
function FeedRow({ event, isNew }: { event: HikEvent; isNew: boolean }) {
  const { locale, localeTag } = useI18n()
  const tr = surveillanceDict[locale]
  const tone = eventTone(event)
  const direction = (event.direction ?? "").trim().toLowerCase()
  const DirectionIcon = direction === "out" || direction === "sortie" ? ArrowUpRight : ArrowDownLeft
  const showDirection = direction === "in" || direction === "out" || direction === "entrée" || direction === "sortie"
  const deviceName = event.device?.device_name || event.device?.dev_index || event.device?.serial_number || tr.unknownDevice

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
        isNew ? "bg-green-500/[0.06]" : "hover:bg-muted/20",
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot, isNew && "animate-pulse")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("text-[10px]", tone.bg, tone.color)}>{tr.tones[tone.labelKey]}</Badge>
          <span className="truncate text-xs text-foreground">
            {event.employee_name || (event.person_id ? tr.personId(event.person_id) : tr.unknownPerson)}
          </span>
          {showDirection && <DirectionIcon className="h-3 w-3 shrink-0 text-muted-foreground" />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{deviceName}</span>
          {event.department_name && <span className="truncate rounded bg-muted/50 px-1 text-[9px]">{event.department_name}</span>}
        </div>
      </div>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {formatClockTime(eventTimestamp(event), localeTag)}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SurveillancePage() {
  const { locale, localeTag } = useI18n()
  const tr = surveillanceDict[locale]
  const [coreDevices, setCoreDevices] = useState<SurveillanceCoreDevice[]>([])
  const [gatewayDevices, setGatewayDevices] = useState<SurveillanceGatewayDevice[]>([])
  const [gatewayErrors, setGatewayErrors] = useState<unknown[]>([])
  const [gatewayChecked, setGatewayChecked] = useState(false)
  const [events, setEvents] = useState<HikEvent[]>([])
  const [newEventIds, setNewEventIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [coreError, setCoreError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)

  const sinceIdRef = useRef<number | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const gatewayReachable = gatewayChecked && gatewayErrors.length === 0

  // ── Chargement appareils (coeur + passerelle en parallèle) ──
  const loadDevices = useCallback(async () => {
    const [coreResult, gatewayResult] = await Promise.allSettled([fetchCoreDevices(), fetchGatewayDevices()])

    if (coreResult.status === "fulfilled") {
      setCoreDevices(coreResult.value)
      setCoreError(null)
    } else {
      // On garde les données précédentes si un rafraîchissement échoue :
      // l'erreur devient bloquante uniquement si aucun appareil n'est connu.
      setCoreError(
        coreResult.reason instanceof Error ? coreResult.reason.message : tr.coreLoadError,
      )
    }

    if (gatewayResult.status === "fulfilled") {
      setGatewayDevices(gatewayResult.value.results)
      setGatewayErrors(gatewayResult.value.errors)
    } else {
      // Passerelle injoignable = état de premier ordre, pas un crash.
      setGatewayDevices([])
      setGatewayErrors([
        gatewayResult.reason instanceof Error ? gatewayResult.reason.message : tr.gatewayUnreachableFallback,
      ])
    }
    setGatewayChecked(true)
    setLastUpdatedAt(new Date().toISOString())
  }, [tr])

  // ── Flux d'événements : chargement initial puis curseur since_id ──
  const loadInitialEvents = useCallback(async () => {
    try {
      const payload = await fetchHikEvents({ limit: INITIAL_EVENTS_LIMIT, autoCatchup: true })
      const sorted = [...payload.results].sort((a, b) => toEventId(b) - toEventId(a))
      sinceIdRef.current = maxEventId(sorted)
      setEvents(sorted)
    } catch {
      // Le flux réessaie au prochain tick de polling ; les appareils restent affichés.
    }
  }, [])

  const pollEvents = useCallback(async () => {
    const sinceId = sinceIdRef.current
    if (sinceId == null) {
      await loadInitialEvents()
      return
    }
    try {
      const payload = await fetchHikEvents({ sinceId, limit: POLL_EVENTS_LIMIT, autoCatchup: true })
      if (payload.results.length === 0) return

      const incomingIds = payload.results.map(toEventId)
      setEvents((existing) => {
        const merged = mergeEvents(existing, payload.results)
        sinceIdRef.current = maxEventId(merged)
        return merged
      })
      // Pulsation visuelle sur les nouvelles lignes.
      setNewEventIds(new Set(incomingIds))
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
      pulseTimeoutRef.current = setTimeout(() => setNewEventIds(new Set()), NEW_EVENT_PULSE_MS)
    } catch {
      // Erreur transitoire : on conserve le dernier état connu.
    }
  }, [loadInitialEvents])

  // Chargement initial.
  useEffect(() => {
    let cancelled = false
    void Promise.all([loadDevices(), loadInitialEvents()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadDevices, loadInitialEvents])

  // Polling temps réel : flux toutes les 15 s, appareils toutes les 60 s.
  useEffect(() => {
    const eventsInterval = setInterval(() => void pollEvents(), EVENTS_POLL_INTERVAL_MS)
    const devicesInterval = setInterval(() => void loadDevices(), DEVICES_REFRESH_INTERVAL_MS)
    return () => {
      clearInterval(eventsInterval)
      clearInterval(devicesInterval)
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [pollEvents, loadDevices])

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadDevices(), pollEvents()])
    } finally {
      setRefreshing(false)
    }
  }, [loadDevices, pollEvents])

  // ── Dérivés ──
  const mergedDevices = useMemo(
    () => mergeDevices(coreDevices, gatewayDevices, gatewayReachable, events, tr, localeTag),
    [coreDevices, gatewayDevices, gatewayReachable, events, tr, localeTag],
  )
  const onlineCount = mergedDevices.filter((device) => device.online).length
  const offlineCount = mergedDevices.length - onlineCount
  const eventsToday = useMemo(() => events.filter((event) => isToday(eventTimestamp(event))).length, [events])
  const gatewayErrorDetail = gatewayErrors.length > 0 ? formatGatewayErrorEntry(gatewayErrors[0]) : ""

  const kpis = [
    { label: tr.kpiDevices, value: String(mergedDevices.length), color: "text-foreground", bg: "bg-blue-500/10", iconColor: "text-blue-400", icon: Cpu },
    { label: tr.kpiOnline, value: String(onlineCount), color: "text-green-400", bg: "bg-green-500/10", iconColor: "text-green-400", icon: Wifi },
    { label: tr.kpiOffline, value: String(offlineCount), color: offlineCount > 0 ? "text-red-400" : "text-foreground", bg: "bg-red-500/10", iconColor: "text-red-400", icon: WifiOff },
    { label: tr.kpiEventsToday, value: String(eventsToday), color: "text-foreground", bg: "bg-purple-500/10", iconColor: "text-purple-400", icon: Activity },
    {
      label: tr.kpiGateway,
      value: !gatewayChecked ? "…" : gatewayReachable ? tr.gatewayOk : tr.gatewayUnreachable,
      color: !gatewayChecked ? "text-muted-foreground" : gatewayReachable ? "text-green-400" : "text-red-400",
      bg: gatewayReachable ? "bg-green-500/10" : "bg-red-500/10",
      iconColor: gatewayReachable ? "text-green-400" : "text-red-400",
      icon: gatewayReachable ? PlugZap : Plug,
    },
  ]

  const showFatalError = !loading && coreError !== null && coreDevices.length === 0

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">
          {/* En-tête */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <MonitorCheck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{tr.title}</h1>
                <p className="text-sm text-muted-foreground">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 text-xs text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                {tr.autoRefresh}
              </div>
              <Button variant="outline" size="sm" onClick={() => void handleManualRefresh()} disabled={refreshing || loading}>
                <RefreshCw className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")} /> {tr.refresh}
              </Button>
            </div>
          </div>

          {/* État de chargement initial */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card py-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{tr.loading}</p>
            </div>
          ) : showFatalError ? (
            <EmptyState
              icon={ServerCrash}
              title={tr.fatalErrorTitle}
              description={coreError ?? tr.fatalErrorFallback}
              action={{ label: tr.retry, icon: RefreshCw, onClick: () => void handleManualRefresh() }}
            />
          ) : (
            <>
              {/* Bannière passerelle injoignable */}
              {gatewayChecked && !gatewayReachable && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-red-400">{tr.gatewayBannerTitle}</p>
                    <p className="mt-0.5 text-xs text-red-400/80">
                      {tr.gatewayBannerBody}
                      {gatewayErrorDetail ? tr.gatewayBannerDetail(gatewayErrorDetail) : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Erreur de rafraîchissement non bloquante */}
              {coreError && coreDevices.length > 0 && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-400">{tr.refreshFailedBanner}</p>
                </div>
              )}

              {/* KPIs */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {kpis.map(({ label, value, color, bg, iconColor, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", bg)}>
                      <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("truncate text-lg font-bold", color)}>{value}</p>
                      <p className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grille appareils + flux */}
              <div className="grid gap-5 lg:grid-cols-3">
                {/* Appareils */}
                <div className="lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Cpu className="h-4 w-4 text-primary" />
                      {tr.accessDevices}
                      <Badge className="bg-muted px-1.5 text-[10px] text-muted-foreground">{mergedDevices.length}</Badge>
                    </h2>
                    {lastUpdatedAt && (
                      <span className="text-[11px] text-muted-foreground">
                        {tr.updatedAt(formatClockTime(lastUpdatedAt, localeTag))}
                      </span>
                    )}
                  </div>

                  {mergedDevices.length === 0 ? (
                    <EmptyState
                      icon={Cpu}
                      title={tr.noDevicesTitle}
                      description={tr.noDevicesDescription}
                      action={{ label: tr.manageDevices, href: "/devices" }}
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {mergedDevices.map((device) => (
                        <DeviceCard key={device.key} device={device} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Flux temps réel */}
                <div className="lg:col-span-1">
                  <div className="rounded-xl border border-border/60 bg-card">
                    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Activity className="h-4 w-4 text-primary" />
                        {tr.eventFeed}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-green-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                        {tr.live}
                      </div>
                    </div>

                    {events.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                        <Inbox className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">{tr.noEventsTitle}</p>
                        <p className="text-xs text-muted-foreground/70">{tr.noEventsHint}</p>
                      </div>
                    ) : (
                      <div className="max-h-[38rem] divide-y divide-border/40 overflow-y-auto">
                        {events.map((event) => (
                          <FeedRow key={event.id} event={event} isNew={newEventIds.has(toEventId(event))} />
                        ))}
                      </div>
                    )}

                    {events.length > 0 && (
                      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-400" />
                          {tr.grantedCount(events.filter((event) => eventTone(event).labelKey !== "accessDenied").length)}
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-400" />
                          {tr.deniedCount(events.filter((event) => eventTone(event).labelKey === "accessDenied").length)}
                        </span>
                        <span>{tr.shownCount(events.length)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
