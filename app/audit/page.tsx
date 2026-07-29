"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileClock,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldX,
  Trash2,
  User,
} from "lucide-react"
import { ApiError } from "@/lib/api/client"
import { fetchAuditEvents, type AuditEvent } from "@/lib/api/audit"
import { useI18n } from "@/lib/i18n/context"
import { auditDict } from "@/lib/i18n/pages/audit"

type AuditDict = (typeof auditDict)["en"]

// ── Helpers ───────────────────────────────────────────────────────────────────
const PAGE_SIZE = 100

// Sentinel stored in state when the fetch fails without a usable message;
// rendered through the dict so it follows the active locale.
const GENERIC_LOAD_ERROR = "__generic_load_error__"

function modelLabel(model: string, tr: AuditDict): string {
  return tr.models[model] ?? model
}

type ActionStyle = { label: string; color: string; bg: string; icon: React.ElementType }
function actionStyle(action: string, tr: AuditDict): ActionStyle {
  if (action === "login") {
    return { label: tr.actionLogin, color: "text-violet-400", bg: "bg-violet-500/10", icon: LogIn }
  }
  if (action.startsWith("create_")) {
    return { label: tr.actionCreate(modelLabel(action.slice("create_".length), tr)), color: "text-green-400", bg: "bg-green-500/10", icon: Plus }
  }
  if (action.startsWith("update_")) {
    return { label: tr.actionUpdate(modelLabel(action.slice("update_".length), tr)), color: "text-blue-400", bg: "bg-blue-500/10", icon: Pencil }
  }
  if (action.startsWith("delete_")) {
    return { label: tr.actionDelete(modelLabel(action.slice("delete_".length), tr)), color: "text-red-400", bg: "bg-red-500/10", icon: Trash2 }
  }
  return { label: action, color: "text-slate-400", bg: "bg-slate-500/10", icon: FileClock }
}

// Actions currently emitted by the backend.
const AUDITED_MODELS = ["employee", "department", "planning", "workshift", "accessgroup", "leaverequest", "device"] as const
function buildActionOptions(tr: AuditDict): Array<{ value: string; label: string }> {
  return [
    { value: "login", label: tr.actionLogin },
    ...AUDITED_MODELS.flatMap((model) => [
      { value: `create_${model}`, label: tr.actionCreate(modelLabel(model, tr)) },
      { value: `update_${model}`, label: tr.actionUpdate(modelLabel(model, tr)) },
      { value: `delete_${model}`, label: tr.actionDelete(modelLabel(model, tr)) },
    ]),
  ]
}

// ── Event Row ─────────────────────────────────────────────────────────────────
function AuditEventRow({ event }: { event: AuditEvent }) {
  const { locale, formatDateTime } = useI18n()
  const tr = auditDict[locale]
  const cfg = actionStyle(event.action, tr)
  const ActionIcon = cfg.icon
  const hasExtra = event.extra != null && Object.keys(event.extra).length > 0
  const targetId = event.target_id != null && String(event.target_id).length > 0 ? String(event.target_id) : null

  return (
    <details className="group border-b border-border/40 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20 [&::-webkit-details-marker]:hidden">
        <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
          <ActionIcon className={cn("h-3.5 w-3.5", cfg.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{cfg.label}</span>
            <Badge variant="outline" className={cn("text-[10px] font-mono", cfg.color)}>{event.action}</Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{event.actor?.username ?? tr.system}</span>
            {event.target_model && (
              <span className="flex items-center gap-1">
                <ChevronRight className="h-2.5 w-2.5" />
                {modelLabel(event.target_model, tr)}{targetId ? ` #${targetId}` : ""}
              </span>
            )}
            {event.ip_address && <span className="font-mono">{event.ip_address}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px] text-muted-foreground">
          <p>{formatDateTime(event.created_at, { second: "2-digit" })}</p>
          <ChevronDown className="ml-auto mt-1 h-3.5 w-3.5 opacity-50 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-border/30 bg-muted/10 px-4 py-3">
        <div className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{tr.detailActor}</p>
            <p className="font-medium text-foreground">{event.actor?.username ?? "—"}</p>
            {event.actor?.email && <p className="text-muted-foreground">{event.actor.email}</p>}
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{tr.detailTarget}</p>
            <p className="font-medium text-foreground">
              {event.target_model ? `${modelLabel(event.target_model, tr)}${targetId ? ` #${targetId}` : ""}` : "—"}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{tr.detailIp}</p>
            <p className="font-mono text-foreground">{event.ip_address ?? "—"}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{tr.detailEvent}</p>
            <p className="font-mono text-foreground">#{event.id} · {event.tenant_code}</p>
          </div>
        </div>

        {hasExtra ? (
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(event.extra, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-[11px] italic text-muted-foreground/60">{tr.noExtraData}</p>
        )}
      </div>
    </details>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type AppliedFilters = {
  actor: string
  action: string
  dateFrom: string
  dateTo: string
}

export default function AuditPage() {
  const { locale } = useI18n()
  const tr = auditDict[locale]
  const actionOptions = useMemo(() => buildActionOptions(tr), [tr])
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const [actorInput, setActorInput] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [applied, setApplied] = useState<AppliedFilters>({ actor: "", action: "all", dateFrom: "", dateTo: "" })

  const load = useCallback(
    async (beforeId?: number) => {
      const append = beforeId != null
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
        setForbidden(false)
      }
      try {
        const response = await fetchAuditEvents({
          actor: applied.actor || undefined,
          action: applied.action === "all" ? undefined : applied.action,
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
          limit: PAGE_SIZE,
          beforeId,
        })
        setTotalCount(response.count)
        setHasMore(response.results.length >= PAGE_SIZE)
        setEvents((previous) => (append ? [...previous, ...response.results] : response.results))
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true)
          setEvents([])
          setTotalCount(null)
        } else {
          setError(err instanceof Error && err.message ? err.message : GENERIC_LOAD_ERROR)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [applied]
  )

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = (overrides?: Partial<AppliedFilters>) => {
    setApplied({
      actor: actorInput.trim(),
      action: actionFilter,
      dateFrom,
      dateTo,
      ...overrides,
    })
  }

  const resetFilters = () => {
    setActorInput("")
    setActionFilter("all")
    setDateFrom("")
    setDateTo("")
    setApplied({ actor: "", action: "all", dateFrom: "", dateTo: "" })
  }

  const loadMore = () => {
    if (events.length === 0 || loadingMore) return
    const minId = events.reduce((min, event) => Math.min(min, event.id), events[0].id)
    void load(minId)
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                <Shield className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{tr.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {forbidden
                    ? tr.restricted
                    : totalCount !== null
                      ? tr.eventCount(totalCount)
                      : tr.subtitle}
                </p>
              </div>
            </div>
            {!forbidden && (
              <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> {tr.refresh}
              </Button>
            )}
          </div>

          {forbidden ? (
            /* ── 403: insufficient role ── */
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                <ShieldX className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {tr.forbiddenTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {tr.forbiddenHint}
              </p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <form
                className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center"
                onSubmit={(e) => {
                  e.preventDefault()
                  applyFilters()
                }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={tr.actorPlaceholder}
                    value={actorInput}
                    onChange={(e) => setActorInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={actionFilter}
                  onValueChange={(value) => {
                    setActionFilter(value)
                    applyFilters({ action: value })
                  }}
                >
                  <SelectTrigger className="w-full lg:w-56"><SelectValue placeholder={tr.actionPlaceholder} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allActions}</SelectItem>
                    {actionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    aria-label={tr.dateFromAria}
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full lg:w-36"
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input
                    type="date"
                    aria-label={tr.dateToAria}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full lg:w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" variant="secondary">{tr.filter}</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>{tr.reset}</Button>
                </div>
              </form>

              {/* Error */}
              {error && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <span className="flex-1 text-red-400">{error === GENERIC_LOAD_ERROR ? tr.loadError : error}</span>
                  <Button size="sm" variant="outline" onClick={() => void load()}>{tr.retry}</Button>
                </div>
              )}

              {/* Events list */}
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <div className="border-b border-border/40 px-4 py-2.5 text-xs text-muted-foreground">
                  {loading ? tr.loading : tr.shownCount(events.length)}
                </div>

                {loading ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin opacity-40" />
                    <p className="text-sm">{tr.loadingEvents}</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <FileClock className="h-10 w-10 opacity-20" />
                    <p className="text-sm">{tr.noEvents}</p>
                  </div>
                ) : (
                  events.map((event) => <AuditEventRow key={event.id} event={event} />)
                )}
              </div>

              {/* Load more */}
              {!loading && hasMore && events.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                    <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loadingMore && "animate-spin")} />
                    {loadingMore ? tr.loading : tr.loadMore}
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
