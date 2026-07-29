"use client"

/**
 * Plans & Abonnements — catalogue réel :
 *   - Plans      : GET /api/billing/plans/
 *   - Plan actif : GET /api/billing/summary/
 * La souscription passe par Stripe Checkout (StripeCheckoutButton) et la
 * gestion de l'abonnement existant par le portail Stripe (StripePortalButton).
 * La FAQ est du contenu éditorial statique.
 */
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import {
  fetchBillingSummary,
  fetchPlans,
  type BillingSummary,
  type Plan,
} from "@/lib/api/billing"
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button"
import { StripePortalButton } from "@/components/billing/stripe-portal-button"
import { useI18n } from "@/lib/i18n/context"
import { billingDict, formatMoney } from "@/lib/i18n/pages/billing"
import type { BillingTab } from "./billing-tabs"
import { cn } from "@/lib/utils"

interface BillingPlansProps {
  onTabChange: (tab: BillingTab) => void
}

export function BillingPlans({ onTabChange }: BillingPlansProps) {
  const { locale, t, localeTag, formatNumber } = useI18n()
  const tr = billingDict[locale]
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [error, setError] = useState<string>("")
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [checkoutError, setCheckoutError] = useState<string>("")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const load = useCallback(() => {
    setPlans(null)
    setError("")
    fetchPlans()
      .then((data) =>
        setPlans(
          [...data].sort((a, b) => {
            if (a.interval === "one_time" && b.interval !== "one_time") return 1
            if (b.interval === "one_time" && a.interval !== "one_time") return -1
            return a.sort_order - b.sort_order
          })
        )
      )
      .catch((err: Error) => setError(err.message))
    // Le plan actif est optionnel : un échec ici ne bloque pas le catalogue.
    fetchBillingSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const currentPlanCode = summary?.subscription?.plan.code ?? null
  const hasSubscription = Boolean(
    summary?.subscription &&
      ["active", "trialing", "past_due"].includes(summary.subscription.status)
  )

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          {tr.plans.badge}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{tr.plans.title}</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          {tr.plans.subtitle}
        </p>
        {hasSubscription && (
          <div className="pt-1">
            <StripePortalButton variant="outline" size="sm" className="gap-1.5">
              {tr.plans.manageCurrent}
            </StripePortalButton>
          </div>
        )}
      </div>

      {/* ── Erreur checkout ── */}
      {checkoutError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">{tr.plans.checkoutErrorTitle}</p>
            <p className="mt-0.5 text-muted-foreground">{checkoutError}</p>
          </div>
        </div>
      )}

      {/* ── Erreur catalogue ── */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <p className="font-semibold">{tr.plans.catalogErrorTitle}</p>
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t.common.retry}
          </Button>
        </div>
      )}

      {/* ── Chargement ── */}
      {!plans && !error && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr.plans.loading}
        </div>
      )}

      {/* ── Catalogue vide ── */}
      {plans && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">{tr.plans.emptyTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground/70">
            {tr.plans.emptyDesc}
          </p>
        </div>
      )}

      {/* ── Grille plans (données réelles) ── */}
      {plans && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => {
            const isCurrent = currentPlanCode !== null && plan.code === currentPlanCode
            const highlighted = !isCurrent && index === 1
            const hasFreeTrial = plan.interval !== "one_time" && plan.trial_period_days > 0

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-200 hover:shadow-lg",
                  highlighted && "ring-2 ring-violet-400/60 dark:ring-violet-500/50 shadow-md",
                  isCurrent && "ring-2 ring-primary/50 shadow-md"
                )}
              >
                {(isCurrent || highlighted) && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                    <span
                      className={cn(
                        "rounded-b-lg px-3 py-1 text-[11px] font-semibold shadow-sm",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-violet-500 text-white"
                      )}
                    >
                      {isCurrent ? tr.plans.currentBadge : tr.plans.popularBadge}
                    </span>
                  </div>
                )}

                <div className="pt-3">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {plan.description && (
                    <p className="mt-1 text-xs text-muted-foreground leading-tight">{plan.description}</p>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold tabular-nums">
                    {formatMoney(plan.amount, plan.currency, localeTag)}
                  </span>
                  <span className="text-sm text-muted-foreground">{tr.shared.interval[plan.interval]}</span>
                </div>
                {plan.is_metered && plan.metered_unit_label && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tr.shared.meteredNote(plan.metered_unit_label)}
                  </p>
                )}

                {hasFreeTrial && (
                  <div
                    className={cn(
                      "mt-3 inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium",
                      plan.trial_requires_card
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    {plan.trial_requires_card
                      ? tr.shared.trialWithCard(plan.trial_period_days)
                      : tr.shared.trialNoCard(plan.trial_period_days)}
                  </div>
                )}

                {/* Caractéristiques réelles du plan */}
                <div className="mt-5 flex flex-1 flex-col space-y-2.5">
                  {[
                    { label: tr.shared.devicesIncluded(formatNumber(plan.device_quota)), included: plan.device_quota > 0 },
                    { label: tr.shared.eventsPerMonth(formatNumber(plan.event_quota_per_month)), included: plan.event_quota_per_month > 0 },
                    { label: tr.shared.prioritySupport, included: plan.has_priority_support },
                    { label: tr.shared.advancedAnalytics, included: plan.has_advanced_analytics },
                  ].map((f) => (
                    <div key={f.label} className="flex items-start gap-2.5 text-sm">
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          f.included ? "bg-success/15" : "bg-muted"
                        )}
                      >
                        <Check className={cn("h-2.5 w-2.5", f.included ? "text-success" : "text-muted-foreground/30")} />
                      </div>
                      <span className={cn("leading-snug", !f.included && "text-muted-foreground/50")}>{f.label}</span>
                    </div>
                  ))}

                  {/* CTA */}
                  <div className="mt-auto pt-4">
                    {isCurrent ? (
                      <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary" disabled>
                        <Check className="h-3.5 w-3.5" />
                        {tr.plans.currentPlan}
                      </Button>
                    ) : plan.interval === "one_time" ? (
                      <StripeCheckoutButton
                        mode="one_time"
                        amountCents={Math.round(parseFloat(plan.amount) * 100)}
                        currency={plan.currency}
                        description={plan.name}
                        variant="outline"
                        className="w-full"
                        onError={(err) =>
                          setCheckoutError(err instanceof Error ? err.message : tr.shared.unexpectedError)
                        }
                      >
                        {tr.shared.buy}
                      </StripeCheckoutButton>
                    ) : (
                      <StripeCheckoutButton
                        mode="subscription"
                        planCode={plan.code}
                        trialPeriodDays={plan.trial_period_days || undefined}
                        variant={highlighted ? "default" : "outline"}
                        className={cn("w-full", highlighted && "bg-violet-600 hover:bg-violet-700 text-white shadow-md")}
                        onError={(err) =>
                          setCheckoutError(err instanceof Error ? err.message : tr.shared.unexpectedError)
                        }
                      >
                        {hasFreeTrial && !hasSubscription
                          ? tr.shared.startFreeTrial
                          : tr.plans.choosePlan(plan.name)}
                      </StripeCheckoutButton>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Encart offre sur mesure (éditorial) ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-linear-to-br from-amber-50/80 via-orange-50/60 to-background dark:from-amber-950/30 dark:via-orange-950/20 dark:to-background p-6 md:p-8">
        <div className="pointer-events-none absolute top-0 right-0 opacity-10">
          <Building2 className="h-40 w-40 text-amber-500" />
        </div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {tr.plans.customKicker}
              </span>
            </div>
            <h3 className="text-xl font-bold">{tr.plans.customTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {tr.plans.customDesc}
            </p>
          </div>
          <div className="shrink-0 space-y-3">
            <Button
              size="lg"
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25"
              onClick={() => onTabChange("custom")}
            >
              <MessageCircle className="h-4 w-4" />
              {tr.plans.customCta}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{tr.plans.customTurnaround}</p>
          </div>
        </div>
      </div>

      {/* ── FAQ (statique) ── */}
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="mb-5 font-semibold text-base">{tr.plans.faqTitle}</h3>
        <div className="space-y-2">
          {tr.plans.faq.map((item, i) => (
            <div key={i} className="rounded-xl border border-border/70 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-left hover:bg-muted/40 transition-colors"
              >
                {item.q}
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {openFaq === i && (
                <div className="border-t border-border/60 bg-muted/20 px-4 py-3.5 text-sm text-muted-foreground">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
