"use client"

/**
 * <UpgradeWall> — paywall plein contenu à afficher À LA PLACE d'une feature
 * que le tenant n'a pas dans son plan.
 *
 *   <UpgradeWall feature="api_access" />
 *   <UpgradeWall requiredTier="pro" title="Cette page est réservée au plan Pro" />
 *
 * Pour gater un sous-arbre, préférez <FeatureGate> qui combine
 * useTenantPlan + UpgradeWall automatiquement.
 */
import Link from "next/link"
import { ArrowRight, Lock, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProBadge } from "@/components/billing/pro-badge"
import {
  FEATURE_META,
  TIER_LABELS,
  minPlanFor,
  type FeatureKey,
  type PlanTier,
} from "@/lib/billing/feature-access"
import { cn } from "@/lib/utils"

type Props = {
  /** Use this when the gate is keyed to a specific feature. */
  feature?: FeatureKey
  /** Use this when gating by tier instead of feature. */
  requiredTier?: PlanTier
  /** Override the headline. */
  title?: string
  /** Override the description. */
  description?: string
  /** Custom CTA target. Defaults to /pricing. */
  ctaHref?: string
  /** Compact mode for inline placement (cards / sidebars). */
  compact?: boolean
  className?: string
}

export function UpgradeWall({
  feature,
  requiredTier,
  title,
  description,
  ctaHref = "/pricing",
  compact = false,
  className,
}: Props) {
  const tier: PlanTier = requiredTier ?? (feature ? minPlanFor(feature) : "pro")
  const meta = feature ? FEATURE_META[feature] : null

  const headline =
    title ??
    (meta?.title
      ? `Débloquez « ${meta.title} »`
      : `Cette fonctionnalité est réservée au plan ${TIER_LABELS[tier]}`)

  const subline =
    description ??
    meta?.description ??
    "Passez au plan supérieur pour activer cette fonctionnalité et bien d'autres."

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        compact ? "p-5" : "p-8 sm:p-12",
        className
      )}
    >
      {/* Decorative background — no actual content blur, just a soft gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-amber-500/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative flex flex-col items-start gap-4 text-left sm:items-center sm:text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          {tier === "enterprise" ? (
            <Sparkles className="h-6 w-6 text-amber-500" />
          ) : (
            <Lock className="h-6 w-6 text-primary" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h2
            className={cn(
              "font-bold tracking-tight",
              compact ? "text-lg" : "text-xl sm:text-2xl"
            )}
          >
            {headline}
          </h2>
          <ProBadge tier={tier} />
        </div>

        <p
          className={cn(
            "max-w-xl text-muted-foreground",
            compact ? "text-sm" : "text-base"
          )}
        >
          {subline}
        </p>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button asChild size={compact ? "sm" : "default"}>
            <Link href={ctaHref}>
              Voir les plans <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          {tier === "enterprise" && (
            <Button asChild variant="outline" size={compact ? "sm" : "default"}>
              <Link href="/billing?tab=custom">Demander un devis</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
