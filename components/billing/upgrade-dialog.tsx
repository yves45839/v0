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
  minPlanFor,
  tierOf,
  type FeatureKey,
  type PlanTier,
} from "@/lib/billing/feature-access"
import { useI18n } from "@/lib/i18n/context"
import { billingDict, formatMoney } from "@/lib/i18n/pages/billing"

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
  const { locale, localeTag, formatNumber } = useI18n()
  const tr = billingDict[locale]
  const tier: PlanTier = requiredTier ?? (feature ? minPlanFor(feature) : "pro")
  const meta = feature ? tr.upgrade.featureMeta[feature] : null
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
    title ?? (meta ? tr.upgrade.unlock(meta.title) : tr.upgrade.upgradeTitle)
  const subline =
    description ??
    meta?.description ??
    tr.upgrade.includedIn(tr.upgrade.tierLabels[tier])

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
                    {recommended.description || tr.upgrade.defaultPlanDesc}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold leading-none">
                    {formatMoney(recommended.amount, recommended.currency, localeTag)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tr.shared.intervalShort[recommended.interval]}
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 text-sm">
                {recommended.has_priority_support && (
                  <Bullet>{tr.shared.prioritySupport}</Bullet>
                )}
                {recommended.has_advanced_analytics && (
                  <Bullet>{tr.shared.advancedAnalytics}</Bullet>
                )}
                <Bullet>
                  {tr.upgrade.devices(formatNumber(recommended.device_quota))}
                </Bullet>
                <Bullet>
                  {tr.shared.eventsPerMonth(formatNumber(recommended.event_quota_per_month))}
                </Bullet>
                {recommended.trial_period_days > 0 &&
                  !recommended.trial_requires_card && (
                    <Bullet>
                      {tr.upgrade.trialNoCardBullet(recommended.trial_period_days)}
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
              {tr.upgrade.noPlanConfigured(tr.upgrade.tierLabels[tier])}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tr.upgrade.later}
          </Button>
          <Button asChild>
            <Link href="/pricing">
              {tr.upgrade.seeAllPlans} <ArrowRight className="ml-1.5 h-4 w-4" />
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
