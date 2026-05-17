/**
 * <ProBadge> — petit tag "Pro" / "Enterprise" à coller à côté d'un libellé
 * de feature pour signaler qu'elle est premium.
 *
 *   <h3>Webhooks <ProBadge tier="pro" /></h3>
 *
 * Affiche rien si tier === "free".
 */
import { Crown, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PlanTier } from "@/lib/billing/feature-access"
import { TIER_LABELS } from "@/lib/billing/feature-access"

const TIER_STYLES: Record<Exclude<PlanTier, "free">, string> = {
  pro: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  enterprise:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

const TIER_ICON: Record<Exclude<PlanTier, "free">, React.ElementType> = {
  pro: Sparkles,
  enterprise: Crown,
}

export function ProBadge({
  tier = "pro",
  className,
}: {
  tier?: PlanTier
  className?: string
}) {
  if (tier === "free") return null
  const Icon = TIER_ICON[tier]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        TIER_STYLES[tier],
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {TIER_LABELS[tier]}
    </span>
  )
}
