"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Check,
  X,
  Sparkles,
  Zap,
  Building2,
  Star,
  Crown,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MessageCircle,
} from "lucide-react"
import { PLANS, currentSubscription, type PlanId } from "@/lib/mock-data/demo-billing"
import type { BillingTab } from "./billing-tabs"
import { cn } from "@/lib/utils"

// ── Helpers ──────────────────────────────────────────────
function formatAmount(amount: number) {
  return amount === 0 ? "Gratuit" : new Intl.NumberFormat("fr-FR").format(amount) + " FCFA / mois"
}

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free: Zap,
  essentiel: Star,
  pro: Sparkles,
  enterprise: Crown,
}

const BADGE_STYLES = {
  populaire: "bg-violet-500 text-white border-violet-600",
  recommande: "bg-amber-500 text-white border-amber-600",
  actuel: "bg-primary text-primary-foreground border-primary",
  enterprise: "bg-slate-700 text-white border-slate-800 dark:bg-slate-600",
}

const PLAN_RING = {
  free: "ring-slate-200 dark:ring-slate-700",
  essentiel: "ring-blue-200 dark:ring-blue-800",
  pro: "ring-violet-300 dark:ring-violet-700",
  enterprise: "ring-amber-300 dark:ring-amber-700",
}

const PLAN_HEADER_BG = {
  free: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800",
  essentiel: "bg-gradient-to-br from-blue-50 to-blue-100/70 dark:from-blue-950/60 dark:to-blue-900/40",
  pro: "bg-gradient-to-br from-violet-50 to-purple-100/70 dark:from-violet-950/60 dark:to-purple-900/40",
  enterprise: "bg-gradient-to-br from-amber-50 to-orange-100/70 dark:from-amber-950/60 dark:to-orange-900/40",
}

// ── FAQ ───────────────────────────────────────────────────
const FAQ = [
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. La différence est calculée au prorata de la période restante.",
  },
  {
    q: "Que se passe-t-il si je dépasse les limites de mon plan ?",
    a: "Vous recevrez une alerte avant d'atteindre les limites. Au-delà, certaines fonctionnalités seront restreintes jusqu'au changement de plan.",
  },
  {
    q: "Le renouvellement est-il automatique ?",
    a: "Oui, par défaut le prélèvement automatique est activé sur votre moyen de paiement principal. Vous pouvez le désactiver à tout moment.",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "Vous pouvez annuler depuis les paramètres de votre plan. L'accès reste actif jusqu'à la fin de la période payée.",
  },
  {
    q: "Puis-je obtenir une facture personnalisée ?",
    a: "Oui, contactez le support pour obtenir une facture avec vos mentions spécifiques (numéro TVA, code client, etc.).",
  },
]

interface BillingPlansProps {
  onTabChange: (tab: BillingTab) => void
}

export function BillingPlans({ onTabChange }: BillingPlansProps) {
  const [activePlan, setActivePlan] = useState<PlanId>(currentSubscription.planId)
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [successPlan, setSuccessPlan] = useState<PlanId | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const currentIdx = PLANS.findIndex((p) => p.id === currentSubscription.planId)

  function handleChoosePlan(planId: PlanId) {
    if (planId === activePlan) return
    setLoadingPlan(planId)
    setTimeout(() => {
      setLoadingPlan(null)
      setSuccessPlan(planId)
      setTimeout(() => setSuccessPlan(null), 2200)
    }, 1400)
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          Choisissez votre plan
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Plans & Abonnements</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Des offres adaptées à chaque étape de la croissance de votre entreprise. Changez de plan à tout moment, sans engagement.
        </p>
      </div>

      {/* ── Grille plans ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan, idx) => {
          const PlanIcon = PLAN_ICONS[plan.id]
          const isCurrent = plan.id === currentSubscription.planId
          const isHigher = idx > currentIdx
          const isLoading = loadingPlan === plan.id
          const isSuccess = successPlan === plan.id

          const badge = isCurrent ? "actuel" : plan.badge
          const isPro = plan.id === "pro"

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:shadow-lg",
                isPro && "ring-2 ring-violet-400/60 dark:ring-violet-500/50 shadow-md",
                isCurrent && "ring-2 ring-primary/50 shadow-md"
              )}
            >
              {/* Badge top */}
              {badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm", BADGE_STYLES[badge])}>
                    {badge === "actuel" ? "✦ Plan actuel" : badge === "populaire" ? "⚡ Populaire" : badge === "recommande" ? "★ Recommandé" : "Enterprise"}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={cn("rounded-t-2xl p-5 pt-7", PLAN_HEADER_BG[plan.id])}>
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-inner", plan.id === "free" ? "bg-slate-200/80 dark:bg-slate-700" : plan.id === "essentiel" ? "bg-blue-500/15" : plan.id === "pro" ? "bg-violet-500/15" : "bg-amber-500/15")}>
                    <PlanIcon className={cn("h-5 w-5", plan.color)} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">{plan.description.slice(0, 44)}…</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-extrabold tabular-nums">{formatAmount(plan.price)}</span>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-1 flex-col p-5 space-y-2.5">
                {plan.features.map((f) => (
                  <div key={f.label} className="flex items-start gap-2.5 text-sm">
                    <div className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      f.included ? "bg-success/15" : "bg-muted"
                    )}>
                      {f.included ? (
                        <Check className="h-2.5 w-2.5 text-success" />
                      ) : (
                        <X className="h-2.5 w-2.5 text-muted-foreground/30" />
                      )}
                    </div>
                    <span className={cn(
                      "leading-snug",
                      !f.included && "text-muted-foreground/50",
                      f.highlight && f.included && "font-medium"
                    )}>
                      {f.label}
                    </span>
                  </div>
                ))}

                {/* Limits summary */}
                <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1">
                  {[
                    { label: "Employés", value: plan.limits.employees === "illimite" ? "Illimité" : `${plan.limits.employees} max` },
                    { label: "Appareils", value: plan.limits.devices === "illimite" ? "Illimité" : `${plan.limits.devices} max` },
                    { label: "Sites", value: plan.limits.sites === "illimite" ? "Illimité" : `${plan.limits.sites} max` },
                  ].map((lim) => (
                    <div key={lim.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{lim.label}</span>
                      <span className="font-semibold">{lim.value}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-auto pt-4">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary" disabled>
                      <Check className="h-3.5 w-3.5" />
                      Plan actuel
                    </Button>
                  ) : plan.id === "enterprise" ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => onTabChange("custom")}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Contacter le support
                    </Button>
                  ) : (
                    <Button
                      className={cn("w-full gap-2", isPro && "bg-violet-600 hover:bg-violet-700 text-white shadow-md")}
                      variant={isHigher ? "default" : "outline"}
                      disabled={isLoading}
                      onClick={() => handleChoosePlan(plan.id)}
                    >
                      {isLoading ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Traitement…
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" />
                          Demande envoyée !
                        </>
                      ) : isHigher ? (
                        <>
                          Passer au plan {plan.name}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>Revenir au plan {plan.name}</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Encart Super Entreprises ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-linear-to-br from-amber-50/80 via-orange-50/60 to-background dark:from-amber-950/30 dark:via-orange-950/20 dark:to-background p-6 md:p-8">
        <div className="pointer-events-none absolute top-0 right-0 opacity-10">
          <Building2 className="h-40 w-40 text-amber-500" />
        </div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Super Entreprises / Besoins avancés</span>
            </div>
            <h3 className="text-xl font-bold">Vous avez des besoins au-delà du plan Enterprise ?</h3>
            <p className="text-sm text-muted-foreground">
              Pour les structures avec plus de 100 employés, des déploiements multi-sites étendus, des intégrations spécifiques ou un accompagnement dédié, nous établissons une proposition personnalisée sur mesure.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Plus d'employés", "Plus d'appareils", "Plus de sites", "Besoins spécifiques", "Déploiement étendu", "Accompagnement dédié"].map((tag) => (
                <span key={tag} className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 space-y-3">
            <Button
              size="lg"
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25"
              onClick={() => onTabChange("custom")}
            >
              <Sparkles className="h-4 w-4" />
              Demander une offre sur mesure
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Proposition personnalisée sous 48h
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="mb-5 font-semibold text-base">Questions fréquentes</h3>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
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
