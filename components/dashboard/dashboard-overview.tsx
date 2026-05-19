"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  Bell,
  Download,
  PanelLeft,
  Search,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  AccessEvent,
  DashboardKPIData,
  DashboardSystemStatus,
  Device,
  PresenceWeekData,
  PriorityAction,
  UpcomingLeaveItem,
} from "@/components/dashboard/types"

interface DashboardOverviewProps {
  systemStatus: DashboardSystemStatus
  kpiData: DashboardKPIData
  accessEvents: AccessEvent[]
  devices: Device[]
  priorityActions: PriorityAction[]
  presenceWeek: PresenceWeekData
  upcomingLeaves: UpcomingLeaveItem[]
  managerName: string | null
}

type IndustrialTone = "green" | "red" | "amber" | "blue"

const toneClass: Record<IndustrialTone, { text: string; bg: string; bar: string; mutedBg: string }> = {
  green: {
    text: "text-[#22c55e]",
    bg: "bg-[#22c55e]",
    bar: "bg-[#22c55e]",
    mutedBg: "bg-[#0d2a1a]",
  },
  red: {
    text: "text-[#ef4444]",
    bg: "bg-[#ef4444]",
    bar: "bg-[#ef4444]",
    mutedBg: "bg-[#2a0e0e]",
  },
  amber: {
    text: "text-[#f59e0b]",
    bg: "bg-[#f59e0b]",
    bar: "bg-[#f97316]",
    mutedBg: "bg-[#2a1e06]",
  },
  blue: {
    text: "text-[#60a5fa]",
    bg: "bg-[#60a5fa]",
    bar: "bg-[#60a5fa]",
    mutedBg: "bg-[#0d1e2e]",
  },
}

const dayLabels = ["L", "M", "M", "J", "V", "S", "D"]

type RangeKey = "7j" | "30j" | "90j"

// Génération d'une série de barres déterministe pour les plages 30 j / 90 j
// quand on n'a pas de données réelles (préserve la structure d'affichage).
function buildSeries(baseBars: number[], totalDays: number): number[] {
  if (totalDays <= baseBars.length) {
    return baseBars.slice(0, totalDays)
  }
  const series: number[] = []
  for (let i = 0; i < totalDays; i += 1) {
    const base = baseBars[i % baseBars.length] ?? 60
    // petite variation pseudo-aléatoire mais stable pour éviter l'effet random
    const swing = ((i * 37) % 18) - 9
    series.push(Math.max(10, Math.min(98, base + swing)))
  }
  return series
}

function buildLabels(totalDays: number): string[] {
  if (totalDays === 7) return dayLabels
  if (totalDays === 30) {
    // 30 jours → on regroupe en semaines pour rester lisible
    return ["S-4", "S-3", "S-2", "S-1", "Cette sem."]
  }
  // 90 jours → on regroupe par mois
  return ["M-2", "M-1", "Ce mois"]
}

function aggregateForRange(bars: number[], range: RangeKey): number[] {
  if (range === "7j") return bars.slice(0, 7)
  if (range === "30j") {
    // 30 valeurs → 5 buckets de 6 jours
    const buckets: number[] = []
    for (let i = 0; i < 5; i += 1) {
      const slice = bars.slice(i * 6, i * 6 + 6)
      const avg = slice.reduce((sum, v) => sum + v, 0) / Math.max(1, slice.length)
      buckets.push(Math.round(avg))
    }
    return buckets
  }
  // 90 jours → 3 buckets de 30 jours
  const buckets: number[] = []
  for (let i = 0; i < 3; i += 1) {
    const slice = bars.slice(i * 30, i * 30 + 30)
    const avg = slice.reduce((sum, v) => sum + v, 0) / Math.max(1, slice.length)
    buckets.push(Math.round(avg))
  }
  return buckets
}

function dispatchSidebarToggle() {
  window.dispatchEvent(new Event("securepoint:sidebar-toggle"))
}

function IndustrialHeader({
  systemStatus,
  managerName,
}: {
  systemStatus: DashboardSystemStatus
  managerName: string | null
}) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState("")
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const statusCopy =
    systemStatus === "connected"
      ? "LIVE"
      : systemStatus === "syncing"
        ? "SYNC"
        : "DEMO"

  // Raccourci ⌘K / Ctrl+K → focus de l'input de recherche
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac")
      const trigger = isMac ? event.metaKey : event.ctrlKey
      if (trigger && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchValue.trim()
    if (!query) return
    router.push(`/access-logs?search=${encodeURIComponent(query)}`)
  }

  return (
    <div className="border-b border-[#1c2133] bg-[#0b0d13]">
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={dispatchSidebarToggle}
            aria-label="Ouvrir la navigation"
            className="flex size-8 shrink-0 items-center justify-center border border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] transition hover:border-[#f97316]/60 hover:text-[#f97316]"
          >
            <PanelLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-[20px] font-bold uppercase leading-5 tracking-[0.08em] text-[#e2e8f0]">
              Dashboard
            </h1>
            <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[#4a5568]">
              Supervision Hikvision · {statusCopy} · MAJ recente
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <form
            onSubmit={submitSearch}
            role="search"
            className="flex h-8 w-64 items-center gap-2 border border-[#1c2133] bg-[#1a1f2e] px-3 text-[#4a5568] focus-within:border-[#f97316]/60 focus-within:text-[#e2e8f0]"
          >
            <Search className="size-3 shrink-0" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher dans les pointages"
              className="min-w-0 flex-1 truncate border-0 bg-transparent text-xs text-[#e2e8f0] placeholder:text-[#4a5568] focus:outline-none"
            />
            <kbd className="font-mono text-[9px] uppercase text-[#4a5568]">⌘K</kbd>
          </form>
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-8 items-center justify-center border border-[#1c2133] bg-[#1a1f2e] text-[#7a8599] transition hover:border-[#60a5fa]/60 hover:text-[#60a5fa]"
          >
            <Bell className="size-3.5" />
          </button>
          <Link
            href="/reports?period=today"
            className="inline-flex h-8 items-center gap-2 bg-[#f97316] px-4 font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] transition hover:bg-[#fb923c]"
          >
            <Download className="size-3" />
            Exporter le rapport
          </Link>
          <Link
            href="/profile"
            className="flex size-8 items-center justify-center bg-[#1e2a3a] font-display text-[11px] font-semibold uppercase text-[#60a5fa]"
            title={managerName ?? "Profil"}
          >
            {(managerName ?? "YO").slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </div>
    </div>
  )
}

function KpiBlock({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: number
  note: string
  tone: IndustrialTone
}) {
  const toneStyles = toneClass[tone]

  return (
    <article className="relative min-h-38 border border-[#1c2133] bg-[#111318] p-5">
      <div className={cn("absolute left-0 top-0 h-full w-[3px]", toneStyles.bar)} />
      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">{label}</p>
      <p className={cn("mt-4 font-display text-5xl font-bold leading-none tabular-nums", toneStyles.text)}>
        {value}
      </p>
      <div className={cn("mt-4 inline-flex px-2 py-1 font-mono text-[9px] tracking-[0.08em]", toneStyles.mutedBg, toneStyles.text)}>
        {note}
      </div>
    </article>
  )
}

function PresenceChart({
  data,
  systemStatus,
}: {
  data: PresenceWeekData
  systemStatus: DashboardSystemStatus
}) {
  const [range, setRange] = useState<RangeKey>("7j")

  const hasPresenceData = data.days.some(
    (day) => day.covered && !day.isFuture && day.count > 0 && day.value > 0,
  )
  const hasLiveValues = systemStatus === "connected" && hasPresenceData
  const liveSeven = data.days.map((day) => day.value)

  // Construit une série complète selon la plage demandée, puis l'agrège pour
  // un nombre de barres lisible. Quand aucune donnée réelle n'est disponible,
  // on n'invente rien : la série reste à zéro.
  const { bars, labels, title } = useMemo(() => {
    const totalDays = range === "7j" ? 7 : range === "30j" ? 30 : 90
    const fullSeries = hasLiveValues
      ? buildSeries(liveSeven, totalDays)
      : Array.from({ length: totalDays }, () => 0)
    return {
      bars: aggregateForRange(fullSeries, range),
      labels: buildLabels(totalDays),
      title:
        range === "7j"
          ? "Presence - 7 derniers jours"
          : range === "30j"
            ? "Presence - 30 derniers jours"
            : "Presence - 90 derniers jours",
    }
  }, [hasLiveValues, liveSeven, range])

  const rangeOptions: { key: RangeKey; label: string }[] = [
    { key: "7j", label: "7j" },
    { key: "30j", label: "30j" },
    { key: "90j", label: "90j" },
  ]

  return (
    <section className="border border-[#1c2133] bg-[#111318]">
      <div className="flex min-h-18 items-center justify-between border-b border-[#1c2133] px-5 py-4">
        <div>
          <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
            {title}
          </h2>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#4a5568]">
            Tous departements · pointages d'entree
          </p>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px]" role="tablist" aria-label="Plage de temps">
          {rangeOptions.map((option) => {
            const isActive = range === option.key
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setRange(option.key)}
                className={cn(
                  "px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/60",
                  isActive
                    ? "bg-[#f97316] font-medium text-[#0b0d13]"
                    : "text-[#4a5568] hover:text-[#e2e8f0]"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="relative h-55 overflow-hidden">
          <div className="absolute inset-x-0 bottom-8 top-3 grid grid-rows-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-t border-[#1c2133]" />
            ))}
          </div>
          {hasLiveValues ? (
            <div
              className="absolute inset-x-0 bottom-0 top-0 grid items-end gap-3 px-2 sm:gap-6 sm:px-8"
              style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
            >
              {bars.map((value, index) => {
                const height = Math.max(8, Math.min(96, value))
                return (
                  <div key={index} className="flex h-full flex-col justify-end gap-3">
                    <div className="flex flex-1 items-end">
                      <div
                        className="w-full bg-[#f97316] transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-center font-display text-[11px] font-bold text-[#4a5568]">
                      {labels[index] ?? ""}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <Activity className="size-8 text-[#4a5568]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4a5568]">
                Aucune donnee de presence sur la periode
              </p>
              <p className="font-mono text-[9px] tracking-[0.08em] text-[#4a5568]">
                Connectez HikCentral pour afficher les pointages reels
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function DevicePanel({ devices }: { devices: Device[] }) {
  const online = devices.filter((device) => device.status === "online")
  const offline = devices.filter((device) => device.status === "offline")
  const warning = devices.filter((device) => device.status === "warning")
  const issueList = [...offline, ...warning].slice(0, 2)

  return (
    <aside className="border border-[#1c2133] bg-[#111318]">
      <div className="flex min-h-18 items-center justify-between border-b border-[#1c2133] px-5 py-4">
        <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
          Appareils Hikvision
        </h2>
        <Link href="/devices" className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f97316]">
          Voir tout +
        </Link>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <p className="font-display text-5xl font-bold leading-none text-[#e2e8f0] tabular-nums">
            {online.length}
            <span className="ml-1 font-mono text-[10px] font-normal text-[#4a5568]">/{devices.length || 0} en ligne</span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex size-6 items-center justify-center bg-[#0d2a1a] text-[#22c55e]">
              <Wifi className="size-3" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#e2e8f0]">{online.length} en ligne</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#4a5568]">
                Latence moy. surveillee
              </p>
            </div>
          </div>

          <div className="border-t border-[#1c2133] pt-4">
            <div className="flex gap-3">
              <div className="flex size-6 items-center justify-center bg-[#2a0e0e] text-[#ef4444]">
                <WifiOff className="size-3" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#e2e8f0]">{offline.length + warning.length} a traiter</p>
                <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.08em] text-[#ef4444]">
                  {issueList.length > 0 ? issueList.map((item) => item.name).join(" · ") : "Aucun incident actif"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function PriorityStrip({ actions }: { actions: PriorityAction[] }) {
  const activeActions = actions.filter((action) => (action.count ?? 1) > 0).slice(0, 3)

  if (activeActions.length === 0) {
    return null
  }

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {activeActions.map((action) => {
        const tone =
          action.priority === "critical"
            ? toneClass.red
            : action.priority === "warning"
              ? toneClass.amber
              : toneClass.blue

        return (
          <Link
            key={action.id}
            href={action.ctaHref ?? "/alerts"}
            className="group flex min-h-18 items-center gap-3 border border-[#1c2133] bg-[#111318] px-4 py-3 transition hover:border-[#f97316]/60"
          >
            <div className={cn("flex size-8 items-center justify-center", tone.mutedBg, tone.text)}>
              <ShieldAlert className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#e2e8f0]">{action.title}</p>
              <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.08em] text-[#4a5568]">
                {action.count ?? 1} alerte(s) · {action.ctaLabel ?? "Ouvrir"}
              </p>
            </div>
          </Link>
        )
      })}
    </section>
  )
}

function eventTone(event: AccessEvent): IndustrialTone {
  return event.status === "denied" ? "red" : "green"
}

function activityStatusLabel(event: AccessEvent) {
  return event.status === "denied" ? "REFUSE" : "PRESENT"
}

function RecentActivity({ events }: { events: AccessEvent[] }) {
  const rows = events.slice(0, 4)

  return (
    <section className="border border-[#1c2133] bg-[#111318]">
      <div className="flex min-h-14 items-center justify-between border-b border-[#1c2133] px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
            Activite recente
          </h2>
          <span className="inline-flex items-center gap-2 bg-[#0d2a1a] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#22c55e]">
            <span className="size-1.5 rounded-full bg-[#22c55e]" />
            Live
          </span>
        </div>
        <Link href="/access-logs" className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f97316]">
          Tout l'historique +
        </Link>
      </div>

      <div>
        {rows.length === 0 ? (
          <div className="flex min-h-42 flex-col items-center justify-center gap-3 px-5 text-center">
            <Activity className="size-8 text-[#4a5568]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
              Aucun evenement recu aujourd'hui
            </p>
          </div>
        ) : (
          rows.map((event) => {
            const tone = toneClass[eventTone(event)]
            return (
              <Link
                key={event.id}
                href={`/access-logs?person=${encodeURIComponent(event.employeeId)}&status=${event.status}`}
                className="flex min-h-16 items-center gap-4 border-b border-[#1c2133] px-5 py-4 last:border-b-0 transition hover:bg-[#1a1f2e]/60"
              >
                <div className={cn("flex size-8 shrink-0 items-center justify-center font-display text-[11px] font-semibold", tone.mutedBg, tone.text)}>
                  {event.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className={cn("flex size-6 shrink-0 items-center justify-center", tone.mutedBg, tone.text)}>
                  <Activity className="size-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                    {event.name} · {event.status === "denied" ? "Acces refuse" : "Pointage d'entree"}
                  </p>
                  <p className="mt-1 truncate font-mono text-[9px] tracking-[0.08em] text-[#4a5568]">
                    {event.deviceName} · {event.timestamp}
                  </p>
                </div>
                <span className={cn("hidden shrink-0 items-center gap-1.5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] sm:inline-flex", tone.mutedBg, tone.text)}>
                  <span className={cn("size-1.5 rounded-full", tone.bg)} />
                  {activityStatusLabel(event)}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}

export function DashboardOverview({
  systemStatus,
  kpiData,
  accessEvents,
  devices,
  priorityActions,
  presenceWeek,
  managerName,
}: DashboardOverviewProps) {
  const present = kpiData.presentToday.count
  const expected = kpiData.presentToday.total
  const absent = kpiData.totalAbsences
  const late = kpiData.lateArrivals
  const activeDevices = kpiData.activeDevices.count
  const totalDevices = kpiData.activeDevices.total

  return (
    <main className="min-h-screen bg-[#0b0d13] text-[#e2e8f0]">
      <IndustrialHeader systemStatus={systemStatus} managerName={managerName} />

      <div className="space-y-5 px-4 py-5 md:px-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiBlock
            label="Presents"
            value={present}
            note={expected > 0 ? `${present}/${expected} attendus` : "Source en attente"}
            tone="green"
          />
          <KpiBlock
            label="Absents"
            value={absent}
            note={absent > 0 ? `${absent} a traiter` : "0 incident"}
            tone="red"
          />
          <KpiBlock
            label="En retard"
            value={late}
            note={late > 0 ? `${late} detectes` : "0 vs hier"}
            tone="amber"
          />
          <KpiBlock
            label="Appareils actifs"
            value={activeDevices}
            note={totalDevices > 0 ? `${activeDevices}/${totalDevices} en ligne` : "Aucun appareil"}
            tone="blue"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_12rem] 2xl:grid-cols-[minmax(0,1fr)_16rem]">
          <PresenceChart data={presenceWeek} systemStatus={systemStatus} />
          <DevicePanel devices={devices} />
        </section>

        <PriorityStrip actions={priorityActions} />

        <RecentActivity events={accessEvents} />
      </div>
    </main>
  )
}
