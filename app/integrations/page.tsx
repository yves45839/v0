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
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Code,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Info,
  Key,
  Link,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Unplug,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react"
import {
  INTEGRATIONS,
  WEBHOOKS,
  API_KEYS,
  SYNC_LOGS,
  INTEGRATION_STATS,
  type Integration,
  type Webhook,
  type ApiKey,
  type SyncLog,
  type IntegrationStatus,
  type SyncStatus,
} from "@/lib/mock-data/demo-integrations"

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
function maskSecret(s: string) {
  return s.slice(0, 8) + "••••••••" + s.slice(-4)
}

const INTEGRATION_STATUS_CONFIG: Record<IntegrationStatus, { label: string; color: string; bg: string; dot: string; icon: React.ElementType }> = {
  active:     { label: "Actif",       color: "text-green-400",  bg: "bg-green-500/10",  dot: "bg-green-400",  icon: CheckCircle },
  inactive:   { label: "Inactif",     color: "text-slate-400",  bg: "bg-slate-500/10",  dot: "bg-slate-400",  icon: Unplug },
  error:      { label: "Erreur",      color: "text-red-400",    bg: "bg-red-500/10",    dot: "bg-red-400",    icon: XCircle },
  pending:    { label: "En attente",  color: "text-yellow-400", bg: "bg-yellow-500/10", dot: "bg-yellow-400", icon: Clock },
  deprecated: { label: "Déprécié",    color: "text-slate-400",  bg: "bg-slate-500/10",  dot: "bg-slate-500",  icon: Unplug },
}

const SYNC_STATUS_CONFIG: Record<SyncStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  success: { label: "Succès",   color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle },
  failed:  { label: "Échec",    color: "text-red-400",   bg: "bg-red-500/10",   icon: XCircle },
  partial: { label: "Partiel",  color: "text-yellow-400",bg: "bg-yellow-500/10",icon: AlertCircle },
  running: { label: "En cours", color: "text-blue-400",  bg: "bg-blue-500/10",  icon: Loader2 },
  pending: { label: "En attente",color: "text-slate-400", bg: "bg-slate-500/10", icon: Clock },
}

const CATEGORY_LABELS: Record<string, string> = {
  hr:            "RH",
  identity:      "Identité / IAM",
  communication: "Communication",
  erp:           "ERP",
  security:      "Sécurité",
  cloud:         "Cloud",
}

// ── Integration Card ──────────────────────────────────────────────────────────
function IntegrationCard({ integration, onView }: { integration: Integration; onView: (i: Integration) => void }) {
  const [enabled, setEnabled] = useState(integration.status === "active")
  const cfg = INTEGRATION_STATUS_CONFIG[integration.status]
  const CfgIcon = cfg.icon
  const isError = integration.status === "error"

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border p-4 transition-all hover:border-border hover:shadow-md", isError ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-card")}>
      <div className="flex items-start gap-3">
        {/* Logo/Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 text-xs font-bold text-white"
          style={{ backgroundColor: integration.logoColor }}
        >
          {integration.logoText}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{integration.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[integration.category] ?? integration.category}</Badge>
                <Badge className={cn("text-[10px]", cfg.bg, cfg.color)}>
                  <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </Badge>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} className="shrink-0" />
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{integration.description}</p>

      {isError && integration.errorMessage && (
        <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {integration.errorMessage}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-green-400">{(integration.recordsSynced ?? 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Synchronisés</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-1.5">
          <p className="font-bold text-foreground">{integration.syncFrequency}</p>
          <p className="text-[10px] text-muted-foreground">Fréquence</p>
        </div>
      </div>

      {integration.lastSyncAt && (
        <p className="mt-2.5 text-[11px] text-muted-foreground">
          Dernière sync : {formatRelative(integration.lastSyncAt)}
        </p>
      )}

      <div className="mt-3 flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onView(integration)}>
          <Settings className="mr-1 h-3 w-3" /> Configurer
        </Button>
        {integration.status === "error" && (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
            <RotateCcw className="h-3 w-3" /> Relancer
          </Button>
        )}
        {integration.status === "active" && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
            <RefreshCw className="h-3 w-3" /> Sync
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Integration Modal ─────────────────────────────────────────────────────────
function IntegrationModal({ integration, onClose }: { integration: Integration | null; onClose: () => void }) {
  if (!integration) return null
  const cfg = INTEGRATION_STATUS_CONFIG[integration.status]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: integration.logoColor }}
            >
              {integration.logoText}
            </span>
            {integration.name}
          </DialogTitle>
          <DialogDescription className="flex gap-2">
            <Badge className={cn("text-[10px]", cfg.bg, cfg.color)}>{cfg.label}</Badge>
            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[integration.category] ?? integration.category}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{integration.description}</p>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Synchronisés", value: (integration.recordsSynced ?? 0).toLocaleString(), color: "text-green-400" },
              { label: "Version",      value: integration.version,                         color: "text-foreground" },
              { label: "Fréquence",    value: integration.syncFrequency,                   color: "text-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <p className={cn("text-lg font-bold", color)}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {integration.errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <p className="text-xs font-medium text-red-400 mb-1">Dernière erreur</p>
              <p className="text-xs text-red-400/80">{integration.errorMessage}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Fonctionnalités</p>
            <div className="flex flex-wrap gap-1.5">
              {integration.features.map(f => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Activé</p>
            <Switch defaultChecked={integration.status === "active"} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button variant="outline" className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Synchroniser</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Webhook Row ───────────────────────────────────────────────────────────────
function WebhookRow({ webhook }: { webhook: Webhook }) {
  const isActive = webhook.status === "active"

  return (
    <div className="flex items-start gap-4 overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border">
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", isActive ? "bg-green-500/10" : "bg-red-500/10")}>
        <Webhook className={cn("h-4 w-4", isActive ? "text-green-400" : "text-red-400")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{webhook.name}</p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{webhook.url}</p>
          </div>
          <Badge className={cn("shrink-0 text-[10px]", isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
            {isActive ? "Actif" : "Inactif"}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {webhook.events.map(ev => <Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-3 w-3" />{webhook.successCount} succès</span>
          {webhook.failureCount > 0 && <span className="flex items-center gap-1 text-red-400"><XCircle className="h-3 w-3" />{webhook.failureCount} échecs</span>}
          <span>Créé {formatDate(webhook.createdAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Send className="h-3 w-3" /> Tester</Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  )
}

// ── API Key Row ───────────────────────────────────────────────────────────────
function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const isExpired = apiKey.status === "expired" || apiKey.status === "revoked"
  const displayKey = `${apiKey.prefix}••••••••`

  function handleCopy() {
    navigator.clipboard.writeText(apiKey.prefix)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border p-4 transition-all", isExpired ? "border-border/30 bg-muted/10 opacity-60" : "border-border/60 bg-card")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{apiKey.name}</p>
            <Badge className={cn("text-[10px]",
              apiKey.status === "active"  ? "bg-green-500/10 text-green-400" :
              apiKey.status === "expired" ? "bg-yellow-500/10 text-yellow-400" :
              "bg-red-500/10 text-red-400"
            )}>
              {apiKey.status === "active" ? "Active" : apiKey.status === "expired" ? "Expirée" : "Révoquée"}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <code className="block max-w-full truncate text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
              {revealed ? `${apiKey.prefix}••••••••` : maskSecret(displayKey)}
            </code>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRevealed(v => !v)}>
              {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
              {copied ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        {!isExpired && (
          <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs text-red-400 hover:bg-red-500/10">Révoquer</Button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {apiKey.scopes.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {apiKey.lastUsedAt && <span>Utilisée {formatRelative(apiKey.lastUsedAt)}</span>}
        {apiKey.lastUsedIp && <span className="font-mono">{apiKey.lastUsedIp}</span>}
        {apiKey.expiresAt && <span>Expire {formatDate(apiKey.expiresAt)}</span>}
      </div>
    </div>
  )
}

// ── Sync Log Row ──────────────────────────────────────────────────────────────
function SyncLogRow({ log }: { log: SyncLog }) {
  const cfg = SYNC_STATUS_CONFIG[log.status]
  const CfgIcon = cfg.icon

  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0">
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
        <CfgIcon className={cn("h-3.5 w-3.5", cfg.color, log.status === "running" && "animate-spin")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{log.integrationName}</span>
          <Badge className={cn("text-[10px]", cfg.bg, cfg.color)}>{cfg.label}</Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="text-green-400">+{log.recordsCreated} créés</span>
          {log.recordsUpdated > 0 && <span className="text-blue-400">~{log.recordsUpdated} màj</span>}
          {log.recordsFailed > 0 && <span className="text-red-400">{log.recordsFailed} échecs</span>}
          {log.durationMs && <span>{Math.round(log.durationMs / 1000)}s</span>}
          {log.errorDetail && <span className="text-red-400 truncate max-w-xs">{log.errorDetail}</span>}
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(log.startedAt)}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type IntTab = "connectors" | "webhooks" | "apikeys" | "logs"

export default function IntegrationsPage() {
  const [tab, setTab] = useState<IntTab>("connectors")
  const [search, setSearch] = useState("")
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  const filteredIntegrations = useMemo(() =>
    INTEGRATIONS.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || CATEGORY_LABELS[i.category]?.toLowerCase().includes(search.toLowerCase())),
    [search])

  const errorIntegrations = INTEGRATIONS.filter(i => i.status === "error")

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                <Zap className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Intégrations</h1>
                <p className="text-sm text-muted-foreground">{INTEGRATION_STATS.total} connecteurs · {INTEGRATION_STATS.connected} actifs</p>
              </div>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" /> Nouvelle intégration
            </Button>
          </div>

          {/* Error banner */}
          {errorIntegrations.length > 0 && (
            <div className="mb-5 space-y-2">
              {errorIntegrations.map(i => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="text-red-400 flex-1">{i.name} : {i.lastError}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/10">
                    <RotateCcw className="mr-1 h-3 w-3" /> Relancer
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total connecteurs",   value: INTEGRATIONS.length,                   icon: Zap,          color: "text-cyan-400",  bg: "bg-cyan-500/10" },
              { label: "Actifs / connectés",  value: INTEGRATION_STATS.totalActive,         icon: CheckCircle,  color: "text-green-400", bg: "bg-green-500/10" },
              { label: "En erreur",           value: INTEGRATION_STATS.totalError,          icon: XCircle,      color: "text-red-400",   bg: "bg-red-500/10" },
              { label: "APIs actives",        value: INTEGRATION_STATS.apiKeysActive,       icon: Activity,     color: "text-blue-400",  bg: "bg-blue-500/10" },
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
          <Tabs value={tab} onValueChange={v => setTab(v as IntTab)}>
            <TabsList className="mb-5 grid w-full grid-cols-4 gap-1 bg-muted/30 p-1">
              <TabsTrigger value="connectors" className="gap-1.5 text-xs sm:text-sm"><Zap       className="h-3.5 w-3.5" /><span>Connecteurs</span><Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{INTEGRATIONS.length}</Badge></TabsTrigger>
              <TabsTrigger value="webhooks"   className="gap-1.5 text-xs sm:text-sm"><Webhook   className="h-3.5 w-3.5" /><span>Webhooks</span></TabsTrigger>
              <TabsTrigger value="apikeys"    className="gap-1.5 text-xs sm:text-sm"><Key       className="h-3.5 w-3.5" /><span>Clés API</span></TabsTrigger>
              <TabsTrigger value="logs"       className="gap-1.5 text-xs sm:text-sm"><Activity  className="h-3.5 w-3.5" /><span>Logs sync</span></TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            {/* ── Connectors ── */}
            <TabsContent value="connectors">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredIntegrations.map(i => <IntegrationCard key={i.id} integration={i} onView={setSelectedIntegration} />)}
              </div>
            </TabsContent>

            {/* ── Webhooks ── */}
            <TabsContent value="webhooks">
              <div className="mb-3 flex justify-end">
                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nouveau webhook</Button>
              </div>
              <div className="space-y-3">
                {WEBHOOKS.map(w => <WebhookRow key={w.id} webhook={w} />)}
              </div>
            </TabsContent>

            {/* ── API Keys ── */}
            <TabsContent value="apikeys">
              <div className="mb-3 flex justify-end">
                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Générer une clé</Button>
              </div>
              <div className="space-y-3">
                {API_KEYS.map(k => <ApiKeyRow key={k.id} apiKey={k} />)}
              </div>
            </TabsContent>

            {/* ── Sync Logs ── */}
            <TabsContent value="logs">
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                {SYNC_LOGS.map(l => <SyncLogRow key={l.id} log={l} />)}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {selectedIntegration && <IntegrationModal integration={selectedIntegration} onClose={() => setSelectedIntegration(null)} />}
    </div>
  )
}
