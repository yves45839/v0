"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  fetchAvailableCurrencies,
  fetchPlans,
  type Plan,
} from "@/lib/api/billing"
import { cn } from "@/lib/utils"
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button"
import { hasAuthSession } from "@/lib/api/auth"

const INTERVAL_LABELS: Record<Plan["interval"], string> = {
  month: "/mois",
  year: "/an",
  one_time: "",
}

/** Display label for ISO 4217 / Stripe currency codes. */
const CURRENCY_LABELS: Record<string, string> = {
  eur: "EUR — Euro",
  usd: "USD — Dollar US",
  gbp: "GBP — Livre",
  xof: "XOF — Franc CFA",
  mad: "MAD — Dirham",
  cad: "CAD — Dollar CA",
}

const DEFAULT_CURRENCIES = ["eur", "usd"]

export function PricingPageClient() {
  const [currencies, setCurrencies] = useState<string[]>(DEFAULT_CURRENCIES)
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === "undefined") return "eur"
    return window.localStorage.getItem("pricing.currency") || "eur"
  })
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [error, setError] = useState<string>("")
  const [authed, setAuthed] = useState(false)

  // Persist currency choice across sessions
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pricing.currency", currency)
    }
  }, [currency])

  // Available currencies (one HTTP call, cached server-side)
  useEffect(() => {
    fetchAvailableCurrencies()
      .then((codes) => {
        if (codes.length > 0) setCurrencies(codes)
      })
      .catch(() => {
        /* fall back to DEFAULT_CURRENCIES */
      })
  }, [])

  // Auth state — only sniff on the client
  useEffect(() => {
    setAuthed(hasAuthSession())
  }, [])

  // Plans — refetch when the user changes currency
  useEffect(() => {
    setPlans(null)
    setError("")
    fetchPlans(currency)
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
  }, [currency])

  const subscriptionPlans = useMemo(
    () => (plans ?? []).filter((p) => p.interval !== "one_time"),
    [plans]
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choisissez votre plan
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tarification transparente. Sans engagement. Annulez à tout moment.
          </p>

          {/* Trial highlight */}
          {subscriptionPlans.some((p) => p.trial_period_days > 0 && !p.trial_requires_card) && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Essai gratuit 14 jours · Sans carte bancaire
            </div>
          )}
        </div>

        {/* ── Currency selector ── */}
        <div className="mt-8 flex justify-center">
          <CurrencySelector
            value={currency}
            options={currencies}
            onChange={setCurrency}
          />
        </div>

        {/* ── Errors ── */}
        {error && (
          <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Impossible de charger les plans&nbsp;: {error}
          </div>
        )}

        {/* ── Loading ── */}
        {!plans && !error && (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Empty ── */}
        {plans && plans.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            Aucun plan n&apos;est encore configuré pour cette devise.
            Synchronisez le catalogue depuis Stripe avec&nbsp;
            <code className="rounded bg-muted px-1.5 py-0.5">
              python manage.py sync_stripe_plans
            </code>
            .
          </div>
        )}

        {/* ── Plan cards ── */}
        {plans && plans.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                highlighted={index === 1}
                authed={authed}
              />
            ))}
          </div>
        )}

        {/* ── Footnote ── */}
        <p className="mt-12 text-center text-xs text-muted-foreground">
          Paiements sécurisés par Stripe. TVA appliquée selon votre pays. Vous
          pourrez gérer ou annuler votre abonnement à tout moment depuis votre
          espace Facturation.
        </p>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────── PlanCard ─

function PlanCard({
  plan,
  highlighted,
  authed,
}: {
  plan: Plan
  highlighted: boolean
  authed: boolean
}) {
  const intervalLabel = INTERVAL_LABELS[plan.interval]
  const hasFreeTrial = plan.interval !== "one_time" && plan.trial_period_days > 0
  const trialNoCard = hasFreeTrial && !plan.trial_requires_card

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all",
        highlighted
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/40"
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground shadow">
          Le plus populaire
        </span>
      )}

      <div>
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {plan.description && (
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
        )}
      </div>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-3xl font-bold">
          {formatPrice(plan.amount, plan.currency)}
        </span>
        <span className="text-sm text-muted-foreground">{intervalLabel}</span>
      </div>
      {plan.is_metered && plan.metered_unit_label && (
        <p className="mt-1 text-xs text-muted-foreground">
          Facturé à l&apos;usage&nbsp;: par {plan.metered_unit_label}
        </p>
      )}

      {hasFreeTrial && (
        <div
          className={cn(
            "mt-3 inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium",
            trialNoCard
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          )}
        >
          <Sparkles className="h-3 w-3" />
          {trialNoCard
            ? `Essai ${plan.trial_period_days} jours · Sans CB`
            : `Essai ${plan.trial_period_days} jours · CB requise`}
        </div>
      )}

      <ul className="mt-6 space-y-2 text-sm">
        <Feature label={`${plan.device_quota.toLocaleString("fr-FR")} dispositifs inclus`} />
        <Feature label={`${plan.event_quota_per_month.toLocaleString("fr-FR")} évènements / mois`} />
        {plan.has_priority_support && <Feature label="Support prioritaire" />}
        {plan.has_advanced_analytics && <Feature label="Analytique avancée" />}
      </ul>

      <div className="mt-auto pt-6">
        {plan.interval === "one_time" ? (
          authed ? (
            <StripeCheckoutButton
              mode="one_time"
              amountCents={Math.round(parseFloat(plan.amount) * 100)}
              currency={plan.currency}
              description={plan.name}
              variant={highlighted ? "default" : "outline"}
              className="w-full"
            >
              Acheter
            </StripeCheckoutButton>
          ) : (
            <Button asChild variant={highlighted ? "default" : "outline"} className="w-full">
              <a href={`/login?next=/pricing`}>Connectez-vous pour acheter</a>
            </Button>
          )
        ) : authed ? (
          <StripeCheckoutButton
            mode="subscription"
            planCode={plan.code}
            trialPeriodDays={plan.trial_period_days || undefined}
            variant={highlighted ? "default" : "outline"}
            className="w-full"
          >
            {hasFreeTrial ? "Démarrer l'essai gratuit" : "Choisir ce plan"}
          </StripeCheckoutButton>
        ) : (
          <Button asChild variant={highlighted ? "default" : "outline"} className="w-full">
            <a href={`/signup?plan=${encodeURIComponent(plan.code)}`}>
              {hasFreeTrial ? "Démarrer l'essai gratuit" : "S'inscrire"}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────── CurrencySelector ─

function CurrencySelector({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  if (options.length <= 1) return null
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card p-1 text-sm shadow-sm">
      <span className="px-2 text-xs font-medium text-muted-foreground">Devise</span>
      {options.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition",
            value === c
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={CURRENCY_LABELS[c] ?? c.toUpperCase()}
        >
          {c.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────── helpers ─

function Feature({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="text-foreground/90">{label}</span>
    </li>
  )
}

function formatPrice(amount: string, currency: string): string {
  const value = parseFloat(amount)
  if (!Number.isFinite(value)) return `${amount} ${currency.toUpperCase()}`
  // XOF is supported by Intl in most environments; fallback to manual format if not.
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
