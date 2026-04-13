"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  Calendar,
  Check,
  CreditCard,
  FileText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  Clock,
  ChevronRight,
  Wallet,
} from "lucide-react"
import {
  PLANS,
  currentSubscription,
  currentUsage,
  invoices,
  paymentMethods,
  nextDueDate,
  supportTickets,
} from "@/lib/mock-data/demo-billing"
import type { BillingTab } from "./billing-tabs"

interface BillingOverviewProps {
  onTabChange: (tab: BillingTab) => void
}

const STATUS_CONFIG = {
  active: { label: "Actif", color: "bg-success/15 text-success border-success/25", dot: "bg-success" },
  trial: { label: "Essai gratuit", color: "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400", dot: "bg-amber-500" },
  suspended: { label: "Suspendu", color: "bg-destructive/15 text-destructive border-destructive/25", dot: "bg-destructive" },
  expired: { label: "Expiré", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500" },
  pending_payment: { label: "En attente de paiement", color: "bg-orange-500/15 text-orange-600 border-orange-500/25 dark:text-orange-400", dot: "bg-orange-500" },
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(dateStr)
  )
}

function UsageBar({ label, used, limit, icon: Icon }: { label: string; used: number; limit: number | "illimite"; icon: React.ElementType }) {
  const percent = limit === "illimite" ? 0 : Math.round((used / (limit as number)) * 100)
  const isWarning = percent >= 80
  const isCritical = percent >= 95

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <span className={cn("text-xs font-medium tabular-nums", isCritical ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
          {used} / {limit === "illimite" ? "∞" : limit}
        </span>
      </div>
      {limit !== "illimite" && (
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

export function BillingOverview({ onTabChange }: BillingOverviewProps) {
  const plan = PLANS.find((p) => p.id === currentSubscription.planId)!
  const statusCfg = STATUS_CONFIG[currentSubscription.status]
  const lastInvoice = invoices[0]
  const failedInvoices = invoices.filter((i) => i.status === "failed")
  const defaultPM = paymentMethods.find((pm) => pm.isDefault)
  const supportTicketsCount = supportTickets.filter((t) => t.status === "open" || t.status === "pending").length
  const [showAlert, setShowAlert] = useState(failedInvoices.length > 0)

  const sitesPercent =
    currentUsage.sites.limit !== "illimite"
      ? Math.round((currentUsage.sites.used / (currentUsage.sites.limit as number)) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* ── Alerte facture échouée ── */}
      {showAlert && (
        <div className="relative flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5 text-sm">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/15">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-destructive">
              {failedInvoices.length} paiement{failedInvoices.length > 1 ? "s" : ""} échoué{failedInvoices.length > 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {failedInvoices.map((i) => i.number).join(", ")} — Votre accès peut être suspendu si le paiement n'est pas régularisé.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onTabChange("invoices")}
              className="rounded-lg border border-destructive/30 bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
            >
              Payer maintenant
            </button>
            <button
              onClick={() => setShowAlert(false)}
              className="rounded-lg border border-destructive/20 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Hero plan actuel ── */}
      <div className={cn("relative overflow-hidden rounded-2xl border bg-linear-to-br p-6", plan.gradient)}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_60%)]" />
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
              <div className={cn("ml-2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", statusCfg.color)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                {statusCfg.label}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Renouvellement le {formatDate(currentSubscription.renewalDate)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                <span>{formatAmount(currentSubscription.renewalAmount)}</span>
              </div>
              {defaultPM && (
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>{defaultPM.label}</span>
                </div>
              )}
            </div>

            {currentSubscription.autoRenew && (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <Check className="h-3 w-3" />
                <span>Prélèvement automatique activé</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onTabChange("plans")}
              className="gap-1.5 shadow-md"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Changer de plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange("invoices")}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Factures
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange("payment-methods")}
              className="gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Paiements
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Prochain renouvellement",
            value: formatDate(nextDueDate),
            sub: `${formatAmount(currentSubscription.renewalAmount)}`,
            icon: Calendar,
            color: "text-primary",
            bgColor: "bg-primary/10",
          },
          {
            label: "Dernière facture",
            value: lastInvoice.number,
            sub: formatAmount(lastInvoice.amount),
            icon: FileText,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
          },
          {
            label: "Paiements en attente",
            value: invoices.filter((i) => i.status === "pending").length === 0 ? "Aucun" : `${invoices.filter((i) => i.status === "pending").length}`,
            sub: "Tout est à jour",
            icon: Clock,
            color: "text-success",
            bgColor: "bg-success/10",
          },
          {
            label: "Tickets de support",
            value: `${supportTicketsCount} ticket${supportTicketsCount > 1 ? "s" : ""}`,
            sub: "Lié à la facturation",
            icon: ShieldCheck,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
          },
        ].map((kpi) => {
          const KpiIcon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="group overflow-hidden rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", kpi.bgColor)}>
                  <KpiIcon className={cn("h-4 w-4", kpi.color)} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
              </div>
              <div className="mt-3 min-w-0 space-y-0.5">
                <p className="truncate text-lg font-bold tabular-nums leading-tight">{kpi.value}</p>
                <p className="text-xs text-success">{kpi.sub}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Utilisation & Fonctionnalités ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Résumé utilisation */}
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
            <UsageBar label="Employés" used={currentUsage.employees.used} limit={currentUsage.employees.limit} icon={Users} />
            <UsageBar label="Appareils" used={currentUsage.devices.used} limit={currentUsage.devices.limit} icon={RefreshCw} />
            <UsageBar label="Sites" used={currentUsage.sites.used} limit={currentUsage.sites.limit} icon={ShieldCheck} />
          </div>

          {sitesPercent >= 100 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 p-2.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Limite de sites atteinte. Passez au plan supérieur pour en ajouter.</span>
            </div>
          )}
        </div>

        {/* Fonctionnalités actives */}
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
          <div className="space-y-2">
            {plan.features.slice(0, 7).map((feature) => (
              <div key={feature.label} className="flex items-center gap-2.5 text-sm">
                <div className={cn(
                  "flex h-4.5 w-4.5 items-center justify-center rounded-full shrink-0",
                  feature.included ? "bg-success/15" : "bg-muted"
                )}>
                  <Check className={cn("h-2.5 w-2.5", feature.included ? "text-success" : "text-muted-foreground/30")} />
                </div>
                <span className={feature.included ? "" : "text-muted-foreground/50 line-through"}>
                  {feature.label}
                </span>
                {feature.highlight && feature.included && (
                  <Badge variant="secondary" className="ml-auto text-[10px] py-0">Actif</Badge>
                )}
              </div>
            ))}
          </div>
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
            { label: "Ouvrir un ticket", icon: ShieldCheck, tab: "support" as BillingTab, color: "text-destructive bg-destructive/10" },
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
