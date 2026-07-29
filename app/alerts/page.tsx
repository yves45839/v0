"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Bell,
  Clock,
  Flame,
  MonitorX,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react"
import {
  deriveAlerts,
  type DerivedAlert,
  type DerivedAlertSeverity,
  type DerivedAlertSource,
} from "@/lib/api/alerts"
import { useI18n } from "@/lib/i18n/context"
import { alertsDict } from "@/lib/i18n/pages/alerts"

type AlertsDict = (typeof alertsDict)["en"]

const REFRESH_INTERVAL_MS = 30_000

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatRelative(iso: string, tr: AlertsDict) {
  const diff = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diff)) return "—"
  const min = Math.floor(diff / 60000)
  if (min < 1) return tr.justNow
  if (min < 60) return tr.minutesAgo(min)
  const h = Math.floor(min / 60)
  if (h < 24) return tr.hoursAgo(h)
  return tr.daysAgo(Math.floor(h / 24))
}

const SEVERITY_ORDER: Record<DerivedAlertSeverity, number> = { critical: 0, high: 1, medium: 2 }

const SEVERITY_CONFIG: Record<
  DerivedAlertSeverity,
  { color: string; bg: string; border: string; dot: string; icon: React.ElementType }
> = {
  critical: { color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-500",    icon: Flame },
  high:     { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500", icon: ShieldAlert },
  medium:   { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500", icon: AlertTriangle },
}

const SOURCE_CONFIG: Record<DerivedAlertSource, { icon: React.ElementType }> = {
  access_denied: { icon: ShieldAlert },
  device_offline: { icon: MonitorX },
  attendance_anomaly: { icon: Timer },
}

// ── Alert Card ────────────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: DerivedAlert }) {
  const { locale, formatDate } = useI18n()
  const tr = alertsDict[locale]
  const sev = SEVERITY_CONFIG[alert.severity]
  const src = SOURCE_CONFIG[alert.source]
  const SevIcon = sev.icon
  const SrcIcon = src.icon

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-md", sev.border)}>
      <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", sev.dot)} />
      <div className="ml-2 flex items-start gap-3">
        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", sev.bg)}>
          <SevIcon className={cn("h-4 w-4", sev.color)} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{alert.title}</span>
            <Badge className={cn("text-[10px] font-medium", sev.bg, sev.color)}>{tr.severity[alert.severity]}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><SrcIcon className="h-3 w-3" />{tr.sources[alert.source].label}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(alert.timestamp, tr)}</span>
            <span>{formatDate(alert.timestamp, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type AlertsTab = "live" | "sources"

export default function AlertsPage() {
  const { locale } = useI18n()
  const tr = alertsDict[locale]
  const [tab, setTab] = useState<AlertsTab>("live")
  const [alerts, setAlerts] = useState<DerivedAlert[]>([])
  const [sourceErrors, setSourceErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [severityFilter, setSeverityFilter] = useState<DerivedAlertSeverity | "all">("all")
  const [sourceFilter, setSourceFilter] = useState<DerivedAlertSource | "all">("all")

  const loadAlerts = useCallback(async (showLoader: boolean) => {
    if (showLoader) setLoading(true)
    setRefreshing(true)
    try {
      const { alerts: nextAlerts, errors } = await deriveAlerts(locale)
      setAlerts(nextAlerts)
      setSourceErrors(errors)
      setLastUpdated(new Date())
    } finally {
      setRefreshing(false)
      if (showLoader) setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    void loadAlerts(true)
  }, [loadAlerts])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadAlerts(false)
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadAlerts])

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        if (bySeverity !== 0) return bySeverity
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      }),
    [alerts],
  )

  const filteredAlerts = useMemo(
    () =>
      sortedAlerts.filter(
        (alert) =>
          (severityFilter === "all" || alert.severity === severityFilter) &&
          (sourceFilter === "all" || alert.source === sourceFilter),
      ),
    [sortedAlerts, severityFilter, sourceFilter],
  )

  const criticalCount = alerts.filter((a) => a.severity === "critical").length
  const highCount = alerts.filter((a) => a.severity === "high").length
  const mediumCount = alerts.filter((a) => a.severity === "medium").length
  const allSourcesFailed = sourceErrors.length === 3

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">

          {/* Page header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{tr.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {tr.subtitle(alerts.length)}
                  {lastUpdated && (
                    <span className="ml-2 text-xs">
                      {tr.updatedAgo(formatRelative(lastUpdated.toISOString(), tr))}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={refreshing} onClick={() => void loadAlerts(false)}>
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")} /> {tr.refresh}
            </Button>
          </div>

          {/* Critical banner */}
          {criticalCount > 0 && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <Flame className="h-5 w-5 shrink-0 text-red-500" />
              <p className="text-sm font-medium text-red-400">
                {tr.criticalBanner(criticalCount)}
              </p>
            </div>
          )}

          {/* Partial source failures */}
          {sourceErrors.length > 0 && !allSourcesFailed && (
            <div className="mb-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-yellow-500">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {tr.partialFailures}
              </p>
              <ul className="mt-1.5 ml-6 list-disc space-y-0.5 text-xs text-yellow-500/90">
                {sourceErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* KPI row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: tr.kpiActive,   value: alerts.length, color: "text-red-400",    bg: "bg-red-500/10",    icon: Bell },
              { label: tr.kpiCritical, value: criticalCount, color: "text-red-500",    bg: "bg-red-500/10",    icon: Flame },
              { label: tr.kpiHigh,     value: highCount,     color: "text-orange-500", bg: "bg-orange-500/10", icon: ShieldAlert },
              { label: tr.kpiMedium,   value: mediumCount,   color: "text-yellow-500", bg: "bg-yellow-500/10", icon: AlertTriangle },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : value}</p>
                  <p className="truncate text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as AlertsTab)}>
            <TabsList className="mb-5 grid w-full grid-cols-2 gap-1 bg-muted/30 p-1">
              <TabsTrigger value="live" className="gap-1.5 text-xs sm:text-sm">
                <Bell className="h-3.5 w-3.5" />
                <span>{tr.liveTab}</span>
                {alerts.length > 0 && (
                  <Badge className="ml-1 rounded bg-red-500/20 px-1 text-[9px] text-red-400">{alerts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sources" className="gap-1.5 text-xs sm:text-sm">
                <Zap className="h-3.5 w-3.5" />
                <span>{tr.sourcesTab}</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Live tab ── */}
            <TabsContent value="live" className="space-y-4">
              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tr.severityFilterLabel}</span>
                <FilterChip active={severityFilter === "all"} onClick={() => setSeverityFilter("all")}>{tr.all}</FilterChip>
                {(Object.keys(SEVERITY_CONFIG) as DerivedAlertSeverity[]).map((severity) => (
                  <FilterChip
                    key={severity}
                    active={severityFilter === severity}
                    onClick={() => setSeverityFilter(severityFilter === severity ? "all" : severity)}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_CONFIG[severity].dot)} />
                    {tr.severity[severity]}
                  </FilterChip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tr.sourceFilterLabel}</span>
                <FilterChip active={sourceFilter === "all"} onClick={() => setSourceFilter("all")}>{tr.all}</FilterChip>
                {(Object.keys(SOURCE_CONFIG) as DerivedAlertSource[]).map((source) => {
                  const SrcIcon = SOURCE_CONFIG[source].icon
                  return (
                    <FilterChip
                      key={source}
                      active={sourceFilter === source}
                      onClick={() => setSourceFilter(sourceFilter === source ? "all" : source)}
                    >
                      <SrcIcon className="h-3 w-3" />
                      {tr.sources[source].label}
                    </FilterChip>
                  )
                })}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                  <RefreshCw className="mb-3 h-8 w-8 animate-spin text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">{tr.loadingAlerts}</p>
                </div>
              ) : allSourcesFailed ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 py-16 text-center">
                  <AlertTriangle className="mb-3 h-10 w-10 text-red-500/60" />
                  <p className="font-medium text-foreground">{tr.loadFailedTitle}</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {tr.loadFailedHint}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadAlerts(true)}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> {tr.retry}
                  </Button>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                  <ShieldCheck className="mb-3 h-10 w-10 text-green-500/50" />
                  <p className="font-medium text-foreground">
                    {alerts.length === 0 ? tr.emptyAll : tr.emptyFiltered}
                  </p>
                  {alerts.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">{tr.emptyFilteredHint}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Sources tab (read-only) ── */}
            <TabsContent value="sources" className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">{tr.sourcesTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tr.sourcesDescription}
                </p>
                <div className="mt-4 space-y-3">
                  {(Object.keys(SOURCE_CONFIG) as DerivedAlertSource[]).map((source) => {
                    const src = SOURCE_CONFIG[source]
                    const severity: DerivedAlertSeverity =
                      source === "device_offline" ? "critical" : source === "access_denied" ? "high" : "medium"
                    const sev = SEVERITY_CONFIG[severity]
                    const SrcIcon = src.icon
                    return (
                      <div key={source} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", sev.bg)}>
                          <SrcIcon className={cn("h-4 w-4", sev.color)} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{tr.sources[source].label}</span>
                            <Badge className={cn("text-[10px]", sev.bg, sev.color)}>{tr.severity[severity]}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{tr.sources[source].description}</p>
                        </div>
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
