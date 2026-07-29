"use client"

import { useCallback, useEffect, useState } from "react"
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const PAGE_SIZE = 100

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso))
}

const MODEL_LABELS: Record<string, string> = {
  employee: "Employé",
  department: "Département",
  planning: "Planning",
  workshift: "Horaire",
  accessgroup: "Groupe d'accès",
  leaverequest: "Demande de congé",
  device: "Appareil",
}
function modelLabel(model: string): string {
  return MODEL_LABELS[model] ?? model
}

type ActionStyle = { label: string; color: string; bg: string; icon: React.ElementType }
function actionStyle(action: string): ActionStyle {
  if (action === "login") {
    return { label: "Connexion", color: "text-violet-400", bg: "bg-violet-500/10", icon: LogIn }
  }
  if (action.startsWith("create_")) {
    return { label: `Création — ${modelLabel(action.slice("create_".length))}`, color: "text-green-400", bg: "bg-green-500/10", icon: Plus }
  }
  if (action.startsWith("update_")) {
    return { label: `Modification — ${modelLabel(action.slice("update_".length))}`, color: "text-blue-400", bg: "bg-blue-500/10", icon: Pencil }
  }
  if (action.startsWith("delete_")) {
    return { label: `Suppression — ${modelLabel(action.slice("delete_".length))}`, color: "text-red-400", bg: "bg-red-500/10", icon: Trash2 }
  }
  return { label: action, color: "text-slate-400", bg: "bg-slate-500/10", icon: FileClock }
}

// Actions actuellement émises par le backend.
const AUDITED_MODELS = ["employee", "department", "planning", "workshift", "accessgroup", "leaverequest", "device"] as const
const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "login", label: "Connexion" },
  ...AUDITED_MODELS.flatMap((model) => [
    { value: `create_${model}`, label: `Création — ${modelLabel(model)}` },
    { value: `update_${model}`, label: `Modification — ${modelLabel(model)}` },
    { value: `delete_${model}`, label: `Suppression — ${modelLabel(model)}` },
  ]),
]

// ── Event Row ─────────────────────────────────────────────────────────────────
function AuditEventRow({ event }: { event: AuditEvent }) {
  const cfg = actionStyle(event.action)
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
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{event.actor?.username ?? "Système"}</span>
            {event.target_model && (
              <span className="flex items-center gap-1">
                <ChevronRight className="h-2.5 w-2.5" />
                {modelLabel(event.target_model)}{targetId ? ` #${targetId}` : ""}
              </span>
            )}
            {event.ip_address && <span className="font-mono">{event.ip_address}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px] text-muted-foreground">
          <p>{formatDateTime(event.created_at)}</p>
          <ChevronDown className="ml-auto mt-1 h-3.5 w-3.5 opacity-50 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-border/30 bg-muted/10 px-4 py-3">
        <div className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Acteur</p>
            <p className="font-medium text-foreground">{event.actor?.username ?? "—"}</p>
            {event.actor?.email && <p className="text-muted-foreground">{event.actor.email}</p>}
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Cible</p>
            <p className="font-medium text-foreground">
              {event.target_model ? `${modelLabel(event.target_model)}${targetId ? ` #${targetId}` : ""}` : "—"}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Adresse IP</p>
            <p className="font-mono text-foreground">{event.ip_address ?? "—"}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Événement</p>
            <p className="font-mono text-foreground">#{event.id} · {event.tenant_code}</p>
          </div>
        </div>

        {hasExtra ? (
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(event.extra, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-[11px] italic text-muted-foreground/60">Aucune donnée supplémentaire</p>
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
          setError(err instanceof Error && err.message ? err.message : "Erreur lors du chargement du journal d'audit.")
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
                <h1 className="text-xl font-bold tracking-tight text-foreground">Journal d'audit</h1>
                <p className="text-sm text-muted-foreground">
                  {forbidden
                    ? "Accès restreint"
                    : totalCount !== null
                      ? `${totalCount} événement${totalCount !== 1 ? "s" : ""} enregistré${totalCount !== 1 ? "s" : ""}`
                      : "Historique des actions du tenant"}
                </p>
              </div>
            </div>
            {!forbidden && (
              <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Actualiser
              </Button>
            )}
          </div>

          {forbidden ? (
            /* ── 403 : rôle insuffisant ── */
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                <ShieldX className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Journal d'audit réservé aux opérateurs et administrateurs.
              </p>
              <p className="text-xs text-muted-foreground">
                Contactez un administrateur du tenant pour obtenir l'accès.
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
                    placeholder="Filtrer par acteur (nom d'utilisateur)…"
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
                  <SelectTrigger className="w-full lg:w-56"><SelectValue placeholder="Action" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    {ACTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    aria-label="Date de début"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full lg:w-36"
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input
                    type="date"
                    aria-label="Date de fin"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full lg:w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" variant="secondary">Filtrer</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
                </div>
              </form>

              {/* Error */}
              {error && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <span className="flex-1 text-red-400">{error}</span>
                  <Button size="sm" variant="outline" onClick={() => void load()}>Réessayer</Button>
                </div>
              )}

              {/* Events list */}
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <div className="border-b border-border/40 px-4 py-2.5 text-xs text-muted-foreground">
                  {loading
                    ? "Chargement…"
                    : `${events.length} événement${events.length !== 1 ? "s" : ""} affiché${events.length !== 1 ? "s" : ""}`}
                </div>

                {loading ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin opacity-40" />
                    <p className="text-sm">Chargement des événements…</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <FileClock className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Aucun événement d'audit</p>
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
                    {loadingMore ? "Chargement…" : "Charger plus"}
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
