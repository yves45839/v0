"use client"

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  Server,
  Webhook,
  XCircle,
} from "lucide-react"
import {
  fetchBetaInfo,
  fetchGatewayHealth,
  fetchLastIngestedEvent,
  fetchSyncedDevices,
  type BetaInfo,
  type GatewayHealth,
  type LastIngestedEvent,
  type SyncedDevice,
} from "@/lib/api/integrations"

// ── Async state helpers ───────────────────────────────────────────────────────
type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return "Une erreur inattendue est survenue."
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr })
  } catch {
    return ""
  }
}

// ── Card shell ────────────────────────────────────────────────────────────────
function HealthCard({
  title,
  icon: Icon,
  iconClass,
  iconBg,
  children,
}: {
  title: string
  icon: React.ElementType
  iconClass: string
  iconBg: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function CardLoading() {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Chargement…
    </div>
  )
}

function CardError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ── Gateway card ──────────────────────────────────────────────────────────────
function GatewayCard({ state }: { state: AsyncState<GatewayHealth> }) {
  return (
    <HealthCard title="Passerelle Hik Device Gateway" icon={Server} iconClass="text-cyan-400" iconBg="bg-cyan-500/10">
      {state.status === "loading" && <CardLoading />}
      {state.status === "error" && <CardError message={state.message} />}
      {state.status === "ready" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {state.data.reachable ? (
              <Badge className="gap-1.5 bg-green-500/10 text-green-400">
                <CheckCircle className="h-3 w-3" /> Connectée
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-red-500/10 text-red-400">
                <XCircle className="h-3 w-3" /> Injoignable
              </Badge>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{state.data.deviceCount}</p>
            <p className="text-xs text-muted-foreground">
              {state.data.deviceCount > 1 ? "appareils vus par la passerelle" : "appareil vu par la passerelle"}
            </p>
          </div>
          {state.data.errors.length > 0 && (
            <div className="space-y-1.5">
              {state.data.errors.map((error, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"
                >
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </HealthCard>
  )
}

// ── Events card ───────────────────────────────────────────────────────────────
function EventsCard({ state }: { state: AsyncState<LastIngestedEvent> }) {
  return (
    <HealthCard title="Réception des événements" icon={Activity} iconClass="text-blue-400" iconBg="bg-blue-500/10">
      {state.status === "loading" && <CardLoading />}
      {state.status === "error" && <CardError message={state.message} />}
      {state.status === "ready" && (
        <div className="space-y-3">
          {state.data.lastEventAt ? (
            <div>
              <p className="text-xs text-muted-foreground">Dernier événement reçu</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{formatDateTime(state.data.lastEventAt)}</p>
              <p className="text-xs text-muted-foreground">{formatRelative(state.data.lastEventAt)}</p>
              {state.data.source && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 text-[10px]",
                    state.data.source === "realtime" ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400",
                  )}
                >
                  {state.data.source === "realtime"
                    ? "Temps réel (webhook)"
                    : state.data.source === "catchup"
                      ? "Rattrapage (catchup)"
                      : state.data.source}
                </Badge>
              )}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Aucun événement reçu pour le moment.</p>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Les événements arrivent via webhook de la passerelle vers{" "}
              <code className="font-mono text-foreground/80">/api/hik/events</code>.
            </span>
          </div>
        </div>
      )}
    </HealthCard>
  )
}

// ── Devices card ──────────────────────────────────────────────────────────────
function deviceStatusChip(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "online") {
    return <Badge className="shrink-0 bg-green-500/10 text-[10px] text-green-400">En ligne</Badge>
  }
  if (normalized === "offline") {
    return <Badge className="shrink-0 bg-red-500/10 text-[10px] text-red-400">Hors ligne</Badge>
  }
  return (
    <Badge className="shrink-0 bg-slate-500/10 text-[10px] text-slate-400">{status || "Inconnu"}</Badge>
  )
}

function DevicesCard({ state }: { state: AsyncState<SyncedDevice[]> }) {
  return (
    <HealthCard title="Appareils synchronisés" icon={HardDrive} iconClass="text-purple-400" iconBg="bg-purple-500/10">
      {state.status === "loading" && <CardLoading />}
      {state.status === "error" && <CardError message={state.message} />}
      {state.status === "ready" && (
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{state.data.length}</p>
            <p className="text-xs text-muted-foreground">
              {state.data.length > 1 ? "appareils en base locale" : "appareil en base locale"}
            </p>
          </div>
          {state.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun appareil synchronisé pour ce tenant.</p>
          ) : (
            <ul className="divide-y divide-border/40 rounded-lg border border-border/60">
              {state.data.map((device) => (
                <li key={device.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {device.name || device.dev_index || `Appareil #${device.id}`}
                    </p>
                    {device.serial_number && (
                      <p className="truncate font-mono text-[10px] text-muted-foreground">SN {device.serial_number}</p>
                    )}
                  </div>
                  {deviceStatusChip(device.status)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </HealthCard>
  )
}

// ── Billing card ──────────────────────────────────────────────────────────────
function BillingCard({ state }: { state: AsyncState<BetaInfo> }) {
  return (
    <HealthCard title="Facturation Stripe" icon={CreditCard} iconClass="text-amber-400" iconBg="bg-amber-500/10">
      {state.status === "loading" && <CardLoading />}
      {state.status === "error" && <CardError message={state.message} />}
      {state.status === "ready" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Stripe</span>
            {state.data.stripe_configured ? (
              <Badge className="gap-1.5 bg-green-500/10 text-green-400">
                <CheckCircle className="h-3 w-3" /> Configuré
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-slate-500/10 text-slate-400">
                <XCircle className="h-3 w-3" /> Non configuré
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Facturation</span>
            {state.data.billing_enabled ? (
              <Badge className="gap-1.5 bg-green-500/10 text-green-400">
                <CheckCircle className="h-3 w-3" /> Activée
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-slate-500/10 text-slate-400">Désactivée</Badge>
            )}
          </div>
          {state.data.beta_mode && (
            <p className="pt-1 text-[11px] text-muted-foreground">Plateforme en mode bêta.</p>
          )}
        </div>
      )}
    </HealthCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [gateway, setGateway] = useState<AsyncState<GatewayHealth>>({ status: "loading" })
  const [lastEvent, setLastEvent] = useState<AsyncState<LastIngestedEvent>>({ status: "loading" })
  const [devices, setDevices] = useState<AsyncState<SyncedDevice[]>>({ status: "loading" })
  const [betaInfo, setBetaInfo] = useState<AsyncState<BetaInfo>>({ status: "loading" })
  const [refreshing, setRefreshing] = useState(false)

  const loadAll = useCallback(async () => {
    setRefreshing(true)
    setGateway({ status: "loading" })
    setLastEvent({ status: "loading" })
    setDevices({ status: "loading" })
    setBetaInfo({ status: "loading" })

    await Promise.all([
      fetchGatewayHealth()
        .then((data) => setGateway({ status: "ready", data }))
        .catch((error) => setGateway({ status: "error", message: errorMessage(error) })),
      fetchLastIngestedEvent()
        .then((data) => setLastEvent({ status: "ready", data }))
        .catch((error) => setLastEvent({ status: "error", message: errorMessage(error) })),
      fetchSyncedDevices()
        .then((data) => setDevices({ status: "ready", data }))
        .catch((error) => setDevices({ status: "error", message: errorMessage(error) })),
      fetchBetaInfo()
        .then((data) => setBetaInfo({ status: "ready", data }))
        .catch((error) => setBetaInfo({ status: "error", message: errorMessage(error) })),
    ])
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">
          {/* Page header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                <Webhook className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Passerelle Hikvision &amp; synchronisation
                </h1>
                <p className="text-sm text-muted-foreground">
                  État en lecture seule de la passerelle, de la réception des événements et de la facturation.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadAll()} disabled={refreshing}>
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")} />
              Actualiser
            </Button>
          </div>

          {/* Health cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <GatewayCard state={gateway} />
            <EventsCard state={lastEvent} />
            <DevicesCard state={devices} />
            <BillingCard state={betaInfo} />
          </div>
        </main>
      </div>
    </div>
  )
}
