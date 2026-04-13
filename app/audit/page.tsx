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
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle,
  CheckSquare,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileClock,
  FileDown,
  Filter,
  Info,
  Layers,
  Minus,
  Play,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Tag,
  User,
  XCircle,
} from "lucide-react"
import {
  AUDIT_EVENTS,
  COMPLIANCE_CHECKS,
  REPORT_TEMPLATES,
  COMPLIANCE_SCORE,
  type AuditEvent,
  type ComplianceCheck,
  type AuditSeverity,
  type AuditEventType,
} from "@/lib/mock-data/demo-audit"

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso))
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

const SEVERITY_CONFIG: Record<AuditSeverity, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  info:     { label: "Info",       color: "text-blue-400",   bg: "bg-blue-500/10",   icon: Info },
  notice:   { label: "Notice",     color: "text-slate-400",  bg: "bg-slate-500/10",  icon: Info },
  warning:  { label: "Alerte",     color: "text-yellow-400", bg: "bg-yellow-500/10", icon: AlertCircle },
  critical: { label: "Critique",   color: "text-red-400",    bg: "bg-red-500/10",    icon: ShieldAlert },
}

const EVENT_TYPE_LABELS: Partial<Record<AuditEventType, string>> = {
  access_granted:  "Accès accordé",
  access_denied:   "Accès refusé",
  door_forced:     "Effraction",
  door_held_open:  "Porte maintenue ouverte",
  badge_created:   "Badge créé",
  badge_revoked:   "Badge révoqué",
  badge_suspended: "Badge suspendu",
  user_created:    "Utilisateur créé",
  user_modified:   "Utilisateur modifié",
  user_deleted:    "Utilisateur supprimé",
  zone_modified:   "Zone modifiée",
  group_modified:  "Groupe modifié",
  schedule_modified: "Horaire modifié",
  rule_created:    "Règle créée",
  rule_modified:   "Règle modifiée",
  rule_disabled:   "Règle désactivée",
  system_login:    "Connexion système",
  system_logout:   "Déconnexion système",
  api_access:      "Accès API",
  export_performed:"Export effectué",
  report_generated:"Rapport généré",
  config_changed:  "Configuration modifiée",
  incident_created:"Incident créé",
  incident_resolved:"Incident résolu",
}
function eventTypeLabel(t: AuditEventType): string { return EVENT_TYPE_LABELS[t] ?? t }

const COMPLIANCE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; dot: string }> = {
  pass:    { label: "Conforme",     color: "text-green-400",  bg: "bg-green-500/10",  icon: ShieldCheck, dot: "bg-green-400" },
  fail:    { label: "Non conforme", color: "text-red-400",    bg: "bg-red-500/10",    icon: ShieldX,     dot: "bg-red-400" },
  warning: { label: "Attention",    color: "text-yellow-400", bg: "bg-yellow-500/10", icon: AlertCircle, dot: "bg-yellow-400" },
  na:      { label: "N/A",          color: "text-slate-400",  bg: "bg-slate-500/10",  icon: Minus,       dot: "bg-slate-400" },
}

// ── Score Gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score, label, size = "normal" }: { score: number; label: string; size?: "small" | "normal" }) {
  const radius = size === "small" ? 28 : 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444"
  const textSize = size === "small" ? 14 : 20

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size === "small" ? 68 : 100} height={size === "small" ? 68 : 100} viewBox={`0 0 ${(radius+10)*2} ${(radius+10)*2}`}>
        <circle cx={radius+10} cy={radius+10} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx={radius+10} cy={radius+10} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${radius+10} ${radius+10})`} />
        <text x={radius+10} y={radius+14} textAnchor="middle" fill={color} fontSize={textSize} fontWeight="bold">{score}</text>
      </svg>
      <p className="text-center text-xs text-muted-foreground leading-tight">{label}</p>
    </div>
  )
}

// ── Audit Event Row ───────────────────────────────────────────────────────────
function AuditEventRow({ event, onView }: { event: AuditEvent; onView: (e: AuditEvent) => void }) {
  const sev = SEVERITY_CONFIG[event.severity]
  const SevIcon = sev.icon

  return (
    <div
      className="group flex cursor-pointer items-start gap-3 border-b border-border/40 px-4 py-3 transition-colors hover:bg-muted/20"
      onClick={() => onView(event)}
    >
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", sev.bg)}>
        <SevIcon className={cn("h-3.5 w-3.5", sev.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{event.description}</span>
          <Badge variant="outline" className="text-[10px]">{eventTypeLabel(event.type)}</Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{event.actor}</span>
          {event.target && <span className="flex items-center gap-1"><ChevronRight className="h-2.5 w-2.5" />{event.target}</span>}
          {event.ipAddress && <span className="font-mono">{event.ipAddress}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right text-[11px] text-muted-foreground">
        <p>{formatRelative(event.createdAt)}</p>
      </div>
    </div>
  )
}

// ── Audit Event Modal ─────────────────────────────────────────────────────────
function AuditEventModal({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  if (!event) return null
  const sev = SEVERITY_CONFIG[event.severity]
  const SevIcon = sev.icon

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", sev.bg)}>
              <SevIcon className={cn("h-4 w-4", sev.color)} />
            </div>
            Détail de l'événement
          </DialogTitle>
          <DialogDescription>{formatDateTime(event.createdAt)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm font-medium text-foreground">{event.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("text-[10px]", sev.bg, sev.color)}>{sev.label}</Badge>
            <Badge variant="outline" className="text-[10px]">{eventTypeLabel(event.type)}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Acteur</p>
              <p className="font-medium text-foreground">{event.actor}</p>
              <p className="text-xs text-muted-foreground">{event.actorType}</p>
            </div>
            {event.target && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Cible</p>
                <p className="font-medium text-foreground">{event.target}</p>
                <p className="text-xs text-muted-foreground">{event.targetType}</p>
              </div>
            )}
            {event.ipAddress && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Adresse IP</p>
                <p className="font-mono text-sm text-foreground">{event.ipAddress}</p>
              </div>
            )}
            {event.location && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Localisation</p>
                <p className="font-medium text-foreground">{event.location}</p>
              </div>
            )}
          </div>

          <div className="break-all rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[11px] font-mono text-muted-foreground">
            ID: {event.id} · Type: {event.type}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="gap-1.5"><FileDown className="h-3.5 w-3.5" /> Exporter</Button>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Compliance Card ───────────────────────────────────────────────────────────
function ComplianceCard({ check }: { check: ComplianceCheck }) {
  const cfg = COMPLIANCE_STATUS_CONFIG[check.status]
  const CfgIcon = cfg.icon

  return (
    <div className={cn("rounded-xl border p-4 transition-all", check.status === "fail" ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-card")}>
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
          <CfgIcon className={cn("h-4 w-4", cfg.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground leading-snug">{check.name}</p>
            <Badge className={cn("shrink-0 text-[10px]", cfg.bg, cfg.color)}>{cfg.label}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{check.description}</p>
          {check.evidence && <p className="mt-1 text-xs text-foreground/70 italic">{check.evidence}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">{check.category}</Badge>
            <span>Vérifié {formatDate(check.lastChecked)}</span>
          </div>
        </div>
      </div>

      {(check.status === "fail" || check.status === "warning") && check.recommendation && (
        <div className="mt-3 rounded-lg border border-border/40 bg-background/50 p-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Action corrective</p>
          <p className="text-xs text-muted-foreground">{check.recommendation}</p>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type AuditTab = "trail" | "compliance" | "reports"

export default function AuditPage() {
  const [tab, setTab] = useState<AuditTab>("trail")
  const [search, setSearch] = useState("")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)

  const filteredEvents = useMemo(() => {
    return AUDIT_EVENTS.filter(e => {
      if (filterSeverity !== "all" && e.severity !== filterSeverity) return false
      if (filterType !== "all" && e.type !== filterType) return false
      if (search && !e.description.toLowerCase().includes(search.toLowerCase()) && !e.actorName.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, filterSeverity, filterType])

  const passCount   = COMPLIANCE_CHECKS.filter(c => c.status === "pass").length
  const failCount   = COMPLIANCE_CHECKS.filter(c => c.status === "fail").length
  const warnCount   = COMPLIANCE_CHECKS.filter(c => c.status === "warning").length

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
                <h1 className="text-xl font-bold tracking-tight text-foreground">Audit & Conformité</h1>
                <p className="text-sm text-muted-foreground">{AUDIT_EVENTS.length} événements · Score global {COMPLIANCE_SCORE.global}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualiser
              </Button>
              <Button size="sm">
                <Download className="mr-2 h-3.5 w-3.5" /> Exporter l'audit
              </Button>
            </div>
          </div>

          {/* Critical compliance warning */}
          {failCount > 0 && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
              <ShieldX className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <span className="font-semibold text-red-400">{failCount} contrôle{failCount > 1 ? "s" : ""} non conforme{failCount > 1 ? "s" : ""}</span>
                <span className="ml-1 text-red-400/80">— un plan d'action est requis pour rester dans les délais réglementaires.</span>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Score global",      value: `${COMPLIANCE_SCORE.global}%`,           icon: Shield,    color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Contrôles conformes",value: passCount,                              icon: ShieldCheck,color: "text-green-400", bg: "bg-green-500/10" },
              { label: "Non conformes",      value: failCount,                              icon: ShieldX,   color: "text-red-400",   bg: "bg-red-500/10" },
              { label: "Avertissements",     value: warnCount,                              icon: AlertCircle,color: "text-yellow-400",bg: "bg-yellow-500/10" },
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
          <Tabs value={tab} onValueChange={v => setTab(v as AuditTab)}>
            <TabsList className="mb-5 grid w-full grid-cols-3 gap-1 bg-muted/30 p-1">
              <TabsTrigger value="trail"      className="gap-1.5 text-xs sm:text-sm"><FileClock   className="h-3.5 w-3.5" /><span>Piste d'audit</span><Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{AUDIT_EVENTS.length}</Badge></TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5 text-xs sm:text-sm"><ShieldCheck className="h-3.5 w-3.5" /><span>Conformité</span></TabsTrigger>
              <TabsTrigger value="reports"    className="gap-1.5 text-xs sm:text-sm"><FileCheck   className="h-3.5 w-3.5" /><span>Rapports</span></TabsTrigger>
            </TabsList>

            {/* ── Audit Trail ── */}
            <TabsContent value="trail">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Rechercher événements, acteurs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Sévérité" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes sévérités</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="warning">Alerte</SelectItem>
                    <SelectItem value="notice">Notice</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    <SelectItem value="door_forced">Effraction</SelectItem>
                    <SelectItem value="access_granted">Accès accordé</SelectItem>
                    <SelectItem value="access_denied">Accès refusé</SelectItem>
                    <SelectItem value="api_access">Accès API</SelectItem>
                    <SelectItem value="badge_suspended">Badge suspendu</SelectItem>
                    <SelectItem value="config_changed">Config modifiée</SelectItem>
                    <SelectItem value="export_performed">Export</SelectItem>
                    <SelectItem value="report_generated">Rapport</SelectItem>
                    <SelectItem value="system_login">Connexion</SelectItem>
                    <SelectItem value="user_created">Utilisateur créé</SelectItem>
                    <SelectItem value="rule_modified">Règle modifiée</SelectItem>
                    <SelectItem value="group_modified">Groupe modifié</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                <div className="border-b border-border/40 px-4 py-2.5 text-xs text-muted-foreground">
                  {filteredEvents.length} événement{filteredEvents.length !== 1 ? "s" : ""} affiché{filteredEvents.length !== 1 ? "s" : ""}
                </div>
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <FileClock className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Aucun événement ne correspond aux filtres</p>
                  </div>
                ) : (
                  filteredEvents.map(e => <AuditEventRow key={e.id} event={e} onView={setSelectedEvent} />)
                )}
              </div>
            </TabsContent>

            {/* ── Compliance ── */}
            <TabsContent value="compliance">
              <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="col-span-2 rounded-xl border border-border/60 bg-card p-5 sm:col-span-4">
                  <p className="mb-4 text-sm font-semibold text-foreground">Scores par domaine</p>
                  <div className="flex flex-wrap justify-center gap-8">
                    <ScoreGauge score={COMPLIANCE_SCORE.global}         label="Score global" />
                    <ScoreGauge score={COMPLIANCE_SCORE.authentication}  label="Authentification" size="small" />
                    <ScoreGauge score={COMPLIANCE_SCORE.accessControl}   label="Contrôle d'accès" size="small" />
                    <ScoreGauge score={COMPLIANCE_SCORE.infrastructure}  label="Infrastructure" size="small" />
                    <ScoreGauge score={COMPLIANCE_SCORE.dataProtection}  label="Données" size="small" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {COMPLIANCE_CHECKS.map(c => <ComplianceCard key={c.id} check={c} />)}
              </div>
            </TabsContent>

            {/* ── Reports ── */}
            <TabsContent value="reports">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_TEMPLATES.map(t => (
                  <div key={t.id} className="flex flex-col rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">{t.format.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <CalendarDays className="mr-1 h-2.5 w-2.5" />{t.periodicity}
                      </Badge>
                    </div>

                    {t.standards && t.standards.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.standards.map((s: string) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
                      <div className="text-[11px] text-muted-foreground">
                        {t.lastGenerated ? <span>Généré {formatDate(t.lastGenerated)}</span> : <span className="text-muted-foreground/50">Jamais généré</span>}
                      </div>
                      <div className="flex gap-1.5">
                        {t.lastGenerated && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                            <Download className="h-3 w-3" /> Télécharger
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                          <Play className="h-3 w-3" /> Générer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {selectedEvent && <AuditEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}
