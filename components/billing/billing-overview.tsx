"use client"

/**
 * Vue d'ensemble facturation — 100 % données réelles du backend Django/Stripe.
 *
 *   - Catalogue        : GET /api/billing/plans/
 *   - Abonnement       : GET /api/billing/summary/
 *   - Compteurs usage  : GET /api/home/summary/ (via lib/api/billing-usage)
 */
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  CreditCard,
  Cpu,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import {
  fetchBillingSummary,
  fetchPlans,
  type BillingSummary,
  type Plan,
  type SubscriptionStatus,
} from "@/lib/api/billing"
import {
  fetchTenantUsageCounts,
  type TenantUsageCounts,
} from "@/lib/api/billing-usage"
import { StripePortalButton } from "@/components/billing/stripe-portal-button"
import type { BillingTab } from "./billing-tabs"

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; color: string; dot: string }
> = {
  active: { label: "Actif", color: "bg-success/15 text-success border-success/25", dot: "bg-success" },
  trialing: { label: "Essai gratuit", color: "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400", dot: "bg-amber-500" },
  past_due: { label: "Paiement en retard", color: "bg-destructive/15 text-destructive border-destructive/25", dot: "bg-destructive" },
  unpaid: { label: "Impayé", color: "bg-destructive/15 text-destructive border-destructive/25", dot: "bg-destructive" },
  canceled: { label: "Annulé", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500" },
  paused: { label: "En pause", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500" },
  incomplete: { label: "Incomplet", color: "bg-orange-500/15 text-orange-600 border-orange-500/25 dark:text-orange-400", dot: "bg-orange-500" },
  incomplete_expired: { label: "Expiré", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500" },
}

function formatMoney(amount: string, currency: string): string {
  const value = parseFloat(amount)
  if (!Number.isFinite(value)) return `${amount} ${currency.toUpperCase()}`
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: currency.toLowerCase() === "xof" ? 0 : 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date)
}

function UsageBar({
  label,
  used,
  limit,
  icon: Icon,
}: {
  label: string
  used: number | null
  limit: number | null
  icon: React.ElementType
}) {
  const unlimited = limit === null || limit <= 0
  const percent =
    used === null || unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const isWarning = percent >= 80
  const isCritical = percent >= 95

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            isCritical ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          )}
        >
          {used === null ? "—" : used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      {!unlimited && used !== null && (
        <Progress
          value={percent}
          className={cn(
            "h-1.5",
            isCritical ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
          )}
        />
      )}
    </div>
  )
}

interface BillingOverviewProps {
  onTabChange: (tab: BillingTab) => void
}

export function BillingOverview({ onTabChange }: BillingOverviewProps) {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [plansError, setPlansError] = useState<string>("")
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string>("")
  const [usage, setUsage] = useState<TenantUsageCounts | null>(null)

  const load = useCallback(() => {
    setPlans(null)
    setPlansError("")
    setSummary(null)
    setSummaryError("")
    fetchPlans()
      .then((data) => setPlans([...data].sort((a, b) => a.sort_order - b.sort_order)))
      .catch((err: Error) => setPlansError(err.message))
    fetchBillingSummary()
      .then(setSummary)
      .catch((err: Error) => setSummaryError(err.message))
    fetchTenantUsageCounts()
      .then(setUsage)
      .catch(() => setUsage(null))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Erreur catalogue ──
  if (plansError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Impossible de charger les offres</h2>
          <p className="max-w-md text-sm text-muted-foreground">{plansError}</p>
        </div>
        <Button variant="outline" onClick={load} className="mt-2 gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    )
  }

  // ── Chargement ──
  if (plans === null || (!summary && !summaryError)) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de la facturation…
      </div>
    )
  }

  // ── Catalogue vide ──
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-12 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Aucune offre disponible</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Le catalogue de plans n&apos;est pas encore configuré. Contactez
            votre administrateur ou réessayez plus tard.
          </p>
        </div>
        <Button variant="outline" onClick={load} className="mt-2 gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>
    )
  }

  const subscription = summary?.subscription ?? null
  const plan = subscription?.plan ?? null
  const openInvoices = summary?.open_invoices ?? []
  const deviceQuota =
    (summary?.tenant.device_quota ?? 0) > 0
      ? summary!.tenant.device_quota
      : plan && plan.device_quota > 0
        ? plan.device_quota
        : null

  return (
    <div className="space-y-6">
      {/* ── Erreur abonnement (catalogue OK mais summary KO) ── */}
      {summaryError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">
              Impossible de charger votre abonnement
            </p>
            <p className="mt-0.5 text-muted-foreground">{summaryError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={load} className="shrink-0 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </Button>
        </div>
      )}

      {/* ── Factures ouvertes ── */}
      {openInvoices.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/8 px-4 py-3.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {openInvoices.length} facture{openInvoices.length > 1 ? "s" : ""} en attente de règlement
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {openInvoices
                .map((inv) => `${inv.number || inv.stripe_invoice_id} (${formatMoney(inv.amount_remaining, inv.currency)})`)
                .join(", ")}
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => onTabChange("invoices")}>
            Voir les factures
          </Button>
        </div>
      )}

      {/* ── Hero abonnement ── */}
      {subscription && plan ? (
        <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/15 via-primary/5 to-transparent p-6">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Plan actuel</p>
                  <h2 className="text-2xl font-bold tracking-tight">{plan.name}</h2>
                </div>
                <div
                  className={cn(
                    "ml-2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    STATUS_CONFIG[subscription.status].color
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_CONFIG[subscription.status].dot)} />
                  {STATUS_CONFIG[subscription.status].label}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {subscription.current_period_end && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {subscription.cancel_at_period_end ? "Fin d'accès le " : "Renouvellement le "}
                      {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>
                    {formatMoney(plan.amount, plan.currency)}
                    {plan.interval === "month" ? " / mois" : plan.interval === "year" ? " / an" : ""}
                  </span>
                </div>
                {subscription.trial_end && subscription.status === "trialing" && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Essai jusqu&apos;au {formatDate(subscription.trial_end)}</span>
                  </div>
                )}
              </div>

              {subscription.cancel_at_period_end ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Annulation programmée en fin de période</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <Check className="h-3 w-3" />
                  <span>Renouvellement automatique activé</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onTabChange("plans")} className="gap-1.5 shadow-md">
                <TrendingUp className="h-3.5 w-3.5" />
                Changer de plan
              </Button>
              <Button variant="outline" size="sm" onClick={() => onTabChange("invoices")} className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Factures
              </Button>
              <StripePortalButton variant="outline" size="sm" className="gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Gérer le paiement
              </StripePortalButton>
            </div>
          </div>
        </div>
      ) : (
        !summaryError && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Aucun abonnement actif</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Choisissez un plan pour activer votre tenant et accéder à
                l&apos;ensemble des fonctionnalités LR&nbsp;Time.
              </p>
            </div>
            <Button onClick={() => onTabChange("plans")} className="mt-2">
              Voir les plans
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )
      )}

      {/* ── Utilisation & Fonctionnalités ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Résumé utilisation (compteurs réels) */}
        <div className="overflow-hidden rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Utilisation</h3>
            </div>
            <button
              onClick={() => onTabChange("usage")}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Voir tout <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-4">
            <UsageBar label="Employés" used={usage?.employees ?? null} limit={null} icon={Users} />
            <UsageBar label="Appareils" used={usage?.devices ?? null} limit={deviceQuota} icon={Cpu} />
          </div>
          {usage === null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Compteurs d&apos;utilisation momentanément indisponibles.
            </p>
          )}
        </div>

        {/* Fonctionnalités du plan actuel */}
        <div className="overflow-hidden rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <h3 className="font-semibold text-sm">Fonctionnalités incluses</h3>
            </div>
            <button
              onClick={() => onTabChange("plans")}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Comparer les plans <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {plan ? (
            <div className="space-y-2">
              {[
                { label: `${plan.device_quota.toLocaleString("fr-FR")} appareils inclus`, included: plan.device_quota > 0 },
                { label: `${plan.event_quota_per_month.toLocaleString("fr-FR")} évènements / mois`, included: plan.event_quota_per_month > 0 },
                { label: "Support prioritaire", included: plan.has_priority_support },
                { label: "Analytique avancée", included: plan.has_advanced_analytics },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-2.5 text-sm">
                  <div
                    className={cn(
                      "flex h-4.5 w-4.5 items-center justify-center rounded-full shrink-0",
                      feature.included ? "bg-success/15" : "bg-muted"
                    )}
                  >
                    <Check className={cn("h-2.5 w-2.5", feature.included ? "text-success" : "text-muted-foreground/30")} />
                  </div>
                  <span className={feature.included ? "" : "text-muted-foreground/50 line-through"}>
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Souscrivez à un plan pour débloquer les fonctionnalités.
            </p>
          )}
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <div className="overflow-hidden rounded-xl border bg-card p-5">
        <h3 className="mb-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Changer de plan", icon: TrendingUp, tab: "plans" as BillingTab, color: "text-primary bg-primary/10" },
            { label: "Gérer les paiements", icon: CreditCard, tab: "payment-methods" as BillingTab, color: "text-violet-500 bg-violet-500/10" },
            { label: "Voir les factures", icon: FileText, tab: "invoices" as BillingTab, color: "text-amber-500 bg-amber-500/10" },
            { label: "Utilisation", icon: Zap, tab: "usage" as BillingTab, color: "text-success bg-success/10" },
            { label: "Contacter le support", icon: ShieldCheck, tab: "support" as BillingTab, color: "text-destructive bg-destructive/10" },
          ].map((action) => {
            const ActionIcon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => onTabChange(action.tab)}
                className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/60 p-4 text-center transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110", action.color)}>
                  <ActionIcon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium leading-tight">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
