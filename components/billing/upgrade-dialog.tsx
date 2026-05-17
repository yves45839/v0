"use client"

/**
 * <UpgradeDialog> — modal d'upgrade utilisable depuis n'importe quel CTA.
 *
 *   const [open, setOpen] = useState(false)
 *   <Button onClick={() => setOpen(true)} disabled={!hasFeature("api_access")}>
 *     Générer une API key
 *   </Button>
 *   <UpgradeDialog open={open} onOpenChange={setOpen} feature="api_access" />
 *
 * On peut aussi passer `requiredTier="pro"` à la place de `feature`.
 */
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProBadge } from "@/components/billing/pro-badge"
import { fetchPlans, type Plan } from "@/lib/api/billing"
import {
  FEATURE_META,
  TIER_LABELS,
  minPlanFor,
  tierOf,
  type FeatureKey,
  type PlanTier,
} from "@/lib/billing/feature-access"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: FeatureKey
  requiredTier?: PlanTier
  /** Override the headline. */
  title?: string
  /** Override the description. */
  description?: string
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  requiredTier,
  title,
  description,
}: Props) {
  const tier: PlanTier = requiredTier ?? (feature ? minPlanFor(feature) : "pro")
  const meta = feature ? FEATURE_META[feature] : null
  const [plans, setPlans] = useState<Plan[] | null>(null)

  useEffect(() => {
    if (!open) return
    if (plans !== null) return
    fetchPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
  }, [open, plans])

  // Pick the cheapest plan that matches the required tier — used as the
  // featured card in the modal.
  const recommended = (plans ?? [])
    .filter((p) => p.interval !== "one_time" && tierOf(p) === tier)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]

  const headline =
    title ?? (meta ? `Débloquez « ${meta.title} »` : "Passez au plan supérieur")
  const subline =
    description ??
    meta?.description ??
    `Cette fonctionnalité est incluse dans le plan ${TIER_LABELS[tier]}.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {headline}
            <ProBadge tier={tier} className="ml-1" />
          </DialogTitle>
          <DialogDescription>{subline}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-xl border border-border bg-muted/30 p-4">
          {recommended ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{recommended.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {recommended.description ||
                      "Tout ce qu'il faut pour passer en production."}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold leading-none">
                    {formatPrice(recommended.amount, recommended.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {recommended.interval === "year" ? "/an" : "/mois"}
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 text-sm">
                {recommended.has_priority_support && (
                  <Bullet>Support prioritaire</Bullet>
                )}
                {recommended.has_advanced_analytics && (
                  <Bullet>Analytique avancée</Bullet>
                )}
                <Bullet>
                  {recommended.device_quota.toLocaleString("fr-FR")} dispositifs
                </Bullet>
                <Bullet>
                  {recommended.event_quota_per_month.toLocaleString("fr-FR")}{" "}
                  évènements / mois
                </Bullet>
                {recommended.trial_period_days > 0 &&
                  !recommended.trial_requires_card && (
                    <Bullet>
                      Essai {recommended.trial_period_days} jours sans CB
                    </Bullet>
                  )}
              </ul>
            </div>
          ) : plans === null ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Aucun plan {TIER_LABELS[tier]} configuré pour le moment. Contactez
              le support pour une offre sur mesure.
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button asChild>
            <Link href="/pricing">
              Voir tous les plans <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  )
}

function formatPrice(amount: string, currency: string): string {
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
