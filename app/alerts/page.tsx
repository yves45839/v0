"use client"

import { useState, useMemo } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  Flame,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  X,
  Zap,
  Archive,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  ALERTS,
  INCIDENTS,
  ALERT_RULES,
  ALERT_STATS,
  type AlertObject,
  type AlertSeverity,
  type AlertStatus,
  type AlertCategory,
  type Incident,
  type AlertRule,
} from "@/lib/mock-data/demo-alerts"

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string; border: string; dot: string; icon: React.ElementType }> = {
  critical: { label: "Critique",  color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-500",    icon: Flame },
  high:     { label: "Élevée",    color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500", icon: ShieldAlert },
  medium:   { label: "Modérée",   color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500", icon: AlertTriangle },
  low:      { label: "Faible",    color: "text-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   dot: "bg-blue-500",   icon: Bell },
  info:     { label: "Info",      color: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/20",  dot: "bg-slate-400",  icon: Bell },
}

const STATUS_CONFIG: Record<AlertStatus, { label: string; color: string; bg: string }> = {
  active:       { label: "Active",       color: "text-red-400",    bg: "bg-red-500/15" },
  acknowledged: { label: "Acquittée",    color: "text-yellow-400", bg: "bg-yellow-500/15" },
  resolved:     { label: "Résolue",      color: "text-green-400",  bg: "bg-green-500/15" },
  dismissed:    { label: "Ignorée",      color: "text-slate-400",  bg: "bg-slate-500/15" },
}

const INCIDENT_SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; description: string }> = {
  P1: { label: "P1 — Critique",   color: "text-red-500",    bg: "bg-red-500/15",    description: "Impact majeur, SLA < 1h" },
  P2: { label: "P2 — Élevé",      color: "text-orange-500", bg: "bg-orange-500/15", description: "Impact significatif, SLA < 4h" },
  P3: { label: "P3 — Modéré",     color: "text-yellow-500", bg: "bg-yellow-500/15", description: "Impact limité, SLA < 24h" },
  P4: { label: "P4 — Informatif", color: "text-blue-500",   bg: "bg-blue-500/15",   description: "Suivi, SLA < 72h" },
}

const INCIDENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:          { label: "Ouvert",        color: "text-red-400" },
  investigating: { label: "En cours",      color: "text-orange-400" },
  contained:     { label: "Contenu",       color: "text-yellow-400" },
  resolved:      { label: "Résolu",        color: "text-green-400" },
  closed:        { label: "Clôturé",       color: "text-slate-400" },
}

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  access:     "Contrôle d'accès",
  intrusion:  "Intrusion",
  device:     "Appareil",
  system:     "Système",
  compliance: "Conformité",
}

// ── Alert Card ────────────────────────────────────────────────────────────────
function AlertCard({ alert, onView, onAcknowledge, onResolve, onDismiss }: {
  alert: AlertObject
  onView: (a: AlertObject) => void
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const sev = SEVERITY_CONFIG[alert.severity]
  const sta = STATUS_CONFIG[alert.status]
  const SevIcon = sev.icon

  return (
    <div className={cn("group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-md", sev.border)}>
      {/* Left accent */}
      <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", sev.dot)} />

      <div className="ml-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", sev.bg)}>
            <SevIcon className={cn("h-4 w-4", sev.color)} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{alert.title}</span>
              <Badge className={cn("text-[10px] font-medium", sta.bg, sta.color)}>{sta.label}</Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{alert.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{alert.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(alert.createdAt)}</span>
              <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{CATEGORY_LABELS[alert.category]}</span>
              {alert.eventCount > 1 && <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{alert.eventCount} événements</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {alert.status === "active" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onAcknowledge(alert.id)}>
                <Check className="mr-1 h-3 w-3" /> Acquitter
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-500 hover:text-green-400" onClick={() => onResolve(alert.id)}>
                <ShieldCheck className="mr-1 h-3 w-3" /> Résoudre
              </Button>
            </>
          )}
          {alert.status === "acknowledged" && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-500 hover:text-green-400" onClick={() => onResolve(alert.id)}>
              <ShieldCheck className="mr-1 h-3 w-3" /> Résoudre
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onView(alert)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {alert.status === "active" && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-slate-300" onClick={() => onDismiss(alert.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Alert Detail Modal ────────────────────────────────────────────────────────
function AlertDetailModal({ alert, onClose, onAcknowledge, onResolve }: {
  alert: AlertObject | null
  onClose: () => void
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}) {
  if (!alert) return null
  const sev = SEVERITY_CONFIG[alert.severity]
  const sta = STATUS_CONFIG[alert.status]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", sev.bg)}>
              <sev.icon className={cn("h-3.5 w-3.5", sev.color)} />
            </div>
            {alert.id}
          </DialogTitle>
          <DialogDescription>{alert.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(sev.bg, sev.color)}>{sev.label}</Badge>
            <Badge className={cn(sta.bg, sta.color)}>{sta.label}</Badge>
            <Badge variant="outline">{CATEGORY_LABELS[alert.category]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{alert.description}</p>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
            <div><span className="text-muted-foreground">Source</span><p className="mt-0.5 font-medium">{alert.source}</p></div>
            <div><span className="text-muted-foreground">Localisation</span><p className="mt-0.5 font-medium">{alert.location}</p></div>
            <div><span className="text-muted-foreground">Créée</span><p className="mt-0.5 font-medium">{formatDateTime(alert.createdAt)}</p></div>
            <div><span className="text-muted-foreground">Événements</span><p className="mt-0.5 font-medium">{alert.eventCount}</p></div>
            {alert.acknowledgedBy && <div><span className="text-muted-foreground">Acquittée par</span><p className="mt-0.5 font-medium">{alert.acknowledgedBy}</p></div>}
            {alert.resolvedBy && <div><span className="text-muted-foreground">Résolue par</span><p className="mt-0.5 font-medium">{alert.resolvedBy}</p></div>}
          </div>

          {alert.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {alert.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>)}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {alert.status === "active" && (
            <>
              <Button variant="outline" onClick={() => { onAcknowledge(alert.id); onClose() }}>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Acquitter
              </Button>
              <Button onClick={() => { onResolve(alert.id); onClose() }}>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Résoudre
              </Button>
            </>
          )}
          {alert.status === "acknowledged" && (
            <Button onClick={() => { onResolve(alert.id); onClose() }}>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Résoudre
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Incident Card ─────────────────────────────────────────────────────────────
function IncidentCard({ incident, onView }: { incident: Incident; onView: (i: Incident) => void }) {
  const sev = INCIDENT_SEVERITY_CONFIG[incident.severity]
  const sta = INCIDENT_STATUS_CONFIG[incident.status]

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground">{incident.id}</span>
            <Badge className={cn("text-[10px]", sev.bg, sev.color)}>{sev.label}</Badge>
            <Badge variant="outline" className={cn("text-[10px]", sta.color)}>{sta.label}</Badge>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-foreground">{incident.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{incident.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{incident.assignedTo}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{incident.location}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(incident.createdAt)}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{incident.timeline.length} entrées</span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => onView(incident)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" /> Voir
        </Button>
      </div>
    </div>
  )
}

// ── Incident Detail Modal ─────────────────────────────────────────────────────
function IncidentDetailModal({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  if (!incident) return null
  const sev = INCIDENT_SEVERITY_CONFIG[incident.severity]
  const sta = INCIDENT_STATUS_CONFIG[incident.status]

  const EVENT_ICONS: Record<string, React.ElementType> = {
    comment: MessageCircle, status_change: RefreshCw,
    assignment: User, action: Zap, escalation: ShieldAlert,
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {incident.id} — {incident.title}
          </DialogTitle>
          <DialogDescription className="flex gap-2">
            <Badge className={cn("text-[10px]", sev.bg, sev.color)}>{sev.label}</Badge>
            <Badge variant="outline" className={cn("text-[10px]", sta.color)}>{sta.label}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-muted-foreground">{incident.description}</p>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
            <div><span className="text-muted-foreground">Assigné à</span><p className="mt-0.5 font-medium">{incident.assignedTo}</p></div>
            <div><span className="text-muted-foreground">Localisation</span><p className="mt-0.5 font-medium">{incident.location}</p></div>
            <div><span className="text-muted-foreground">SLA</span><p className="mt-0.5 font-medium">{incident.sla}</p></div>
            <div><span className="text-muted-foreground">Créé le</span><p className="mt-0.5 font-medium">{formatDateTime(incident.createdAt)}</p></div>
          </div>

          {incident.affectedAssets.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actifs impactés</p>
              <div className="flex flex-wrap gap-1.5">
                {incident.affectedAssets.map(a => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Chronologie</p>
            <div className="space-y-3">
              {incident.timeline.map((ev) => {
                const EvIcon = EVENT_ICONS[ev.type] ?? MessageCircle
                return (
                  <div key={ev.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted">
                      <EvIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium text-foreground">{ev.author}</span>
                        <span className="text-muted-foreground">{formatDateTime(ev.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{ev.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button><MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Ajouter une entrée</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Alert Rule Card ───────────────────────────────────────────────────────────
function RuleCard({ rule, onToggle }: { rule: AlertRule; onToggle: (id: string) => void }) {
  const sev = SEVERITY_CONFIG[rule.severity]
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", sev.bg)}>
            <sev.icon className={cn("h-4 w-4", sev.color)} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{rule.name}</span>
              <Badge className={cn("text-[10px]", sev.bg, sev.color)}>{sev.label}</Badge>
              <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[rule.category]}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span>Déclenchée {rule.triggeredCount}x</span>
              {rule.lastTriggered && <span>Dernière : {formatRelative(rule.lastTriggered)}</span>}
              <span>Cooldown : {rule.cooldownMinutes}min</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rule.actions.map(a => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <Switch checked={rule.enabled} onCheckedChange={() => onToggle(rule.id)} />
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type AlertsTab = "live" | "incidents" | "rules" | "archives"

export default function AlertsPage() {
  const [tab, setTab] = useState<AlertsTab>("live")
  const [alerts, setAlerts] = useState(ALERTS)
  const [rules, setRules] = useState(ALERT_RULES)
  const [search, setSearch] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedAlert, setSelectedAlert] = useState<AlertObject | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const activeAlerts = useMemo(() =>
    alerts.filter(a => a.status === "active" || a.status === "acknowledged"), [alerts])

  const archivedAlerts = useMemo(() =>
    alerts.filter(a => a.status === "resolved" || a.status === "dismissed"), [alerts])

  const filteredAlerts = useMemo(() => {
    const source = tab === "archives" ? archivedAlerts : activeAlerts
    return source.filter(a => {
      const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.location.toLowerCase().includes(search.toLowerCase())
      const matchSev = severityFilter === "all" || a.severity === severityFilter
      const matchSta = tab === "archives" ? true : (statusFilter === "all" || a.status === statusFilter)
      const matchCat = categoryFilter === "all" || a.category === categoryFilter
      return matchSearch && matchSev && matchSta && matchCat
    })
  }, [alerts, tab, search, severityFilter, statusFilter, categoryFilter, activeAlerts, archivedAlerts])

  function acknowledgeAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "acknowledged" as AlertStatus, acknowledgedBy: "Vous", updatedAt: new Date().toISOString() } : a))
    if (selectedAlert?.id === id) setSelectedAlert(prev => prev ? { ...prev, status: "acknowledged" } : prev)
  }

  function resolveAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved" as AlertStatus, resolvedBy: "Vous", resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : a))
    if (selectedAlert?.id === id) setSelectedAlert(prev => prev ? { ...prev, status: "resolved" } : prev)
  }

  function dismissAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "dismissed" as AlertStatus, updatedAt: new Date().toISOString() } : a))
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const criticalActive = activeAlerts.filter(a => a.severity === "critical").length
  const highActive = activeAlerts.filter(a => a.severity === "high").length

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">

          {/* Page header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">Alertes & Incidents</h1>
                  <p className="text-sm text-muted-foreground">Surveillance en temps réel — {activeAlerts.length} alerte{activeAlerts.length !== 1 ? "s" : ""} active{activeAlerts.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Actualiser
            </Button>
          </div>

          {/* Critical banner */}
          {criticalActive > 0 && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <Flame className="h-5 w-5 shrink-0 text-red-500" />
              <p className="text-sm font-medium text-red-400">
                {criticalActive} alerte{criticalActive > 1 ? "s" : ""} critique{criticalActive > 1 ? "s" : ""} active{criticalActive > 1 ? "s" : ""} — intervention requise immédiatement
              </p>
            </div>
          )}

          {/* KPI row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Actives",   value: activeAlerts.length, color: "text-red-400",    bg: "bg-red-500/10",    icon: Bell },
              { label: "Critiques", value: criticalActive,       color: "text-red-500",    bg: "bg-red-500/10",    icon: Flame },
              { label: "Élevées",   value: highActive,           color: "text-orange-500", bg: "bg-orange-500/10", icon: ShieldAlert },
              { label: "Incidents", value: INCIDENTS.filter(i => i.status !== "closed" && i.status !== "resolved").length, color: "text-purple-400", bg: "bg-purple-500/10", icon: FileText },
            ].map(({ label, value, color, bg, icon: Icon }) => (
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as AlertsTab)}>
            <TabsList className="mb-5 grid w-full grid-cols-4 gap-1 bg-muted/30 p-1">
              <TabsTrigger value="live" className="gap-1.5 text-xs sm:text-sm">
                <Bell className="h-3.5 w-3.5" />
                <span>Flux actif</span>
                {activeAlerts.length > 0 && <Badge className="ml-1 bg-red-500/20 text-red-400 text-[9px] px-1 rounded">{activeAlerts.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="incidents" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" />
                <span>Incidents</span>
                <Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{INCIDENTS.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-1.5 text-xs sm:text-sm">
                <Zap className="h-3.5 w-3.5" />
                <span>Règles</span>
              </TabsTrigger>
              <TabsTrigger value="archives" className="gap-1.5 text-xs sm:text-sm">
                <Archive className="h-3.5 w-3.5" />
                <span>Archives</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Live tab ── */}
            <TabsContent value="live" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Gravité" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes gravités</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="medium">Modérée</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="acknowledged">Acquittée</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    <SelectItem value="intrusion">Intrusion</SelectItem>
                    <SelectItem value="access">Contrôle d'accès</SelectItem>
                    <SelectItem value="device">Appareil</SelectItem>
                    <SelectItem value="system">Système</SelectItem>
                    <SelectItem value="compliance">Conformité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                  <ShieldCheck className="mb-3 h-10 w-10 text-green-500/50" />
                  <p className="font-medium text-foreground">Aucune alerte active</p>
                  <p className="mt-1 text-sm text-muted-foreground">Tous les systèmes fonctionnent normalement</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map(a => (
                    <AlertCard key={a.id} alert={a} onView={setSelectedAlert} onAcknowledge={acknowledgeAlert} onResolve={resolveAlert} onDismiss={dismissAlert} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Incidents tab ── */}
            <TabsContent value="incidents" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{INCIDENTS.length} incidents enregistrés</p>
                <Button size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Créer incident
                </Button>
              </div>
              <div className="space-y-3">
                {INCIDENTS.map(i => (
                  <IncidentCard key={i.id} incident={i} onView={setSelectedIncident} />
                ))}
              </div>
            </TabsContent>

            {/* ── Rules tab ── */}
            <TabsContent value="rules" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{rules.filter(r => r.enabled).length}/{rules.length} règles actives</p>
                <Button size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Nouvelle règle
                </Button>
              </div>
              <div className="space-y-3">
                {rules.map(r => <RuleCard key={r.id} rule={r} onToggle={toggleRule} />)}
              </div>
            </TabsContent>

            {/* ── Archives tab ── */}
            <TabsContent value="archives" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Rechercher dans les archives…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Gravité" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes gravités</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="medium">Modérée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                  <Archive className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-foreground">Archives vides</p>
                  <p className="mt-1 text-sm text-muted-foreground">Aucune alerte archivée pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map(a => (
                    <AlertCard key={a.id} alert={a} onView={setSelectedAlert} onAcknowledge={acknowledgeAlert} onResolve={resolveAlert} onDismiss={dismissAlert} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} onAcknowledge={acknowledgeAlert} onResolve={resolveAlert} />
      )}
      {selectedIncident && (
        <IncidentDetailModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}
    </div>
  )
}
