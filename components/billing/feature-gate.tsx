"use client"

/**
 * <FeatureGate> — composant de gating central.
 *
 * Trois modes :
 *
 *   // 1. Par feature key — la plus expressive
 *   <FeatureGate feature="api_access">
 *     <ApiKeysPanel />
 *   </FeatureGate>
 *
 *   // 2. Par tier de plan
 *   <FeatureGate requiredTier="pro">
 *     <ProOnlyDashboard />
 *   </FeatureGate>
 *
 *   // 3. Inline avec children-as-render (pour blur-mode "preview")
 *   <FeatureGate feature="advanced_analytics" mode="preview">
 *     <BigChart />
 *   </FeatureGate>
 *
 * Modes:
 *   - "replace" (défaut) → remplace les children par <UpgradeWall />
 *   - "preview"          → empile <UpgradeWall /> par-dessus un aperçu flou
 *   - "hide"             → ne rend rien (pour menus ou liens secondaires)
 */
import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { useTenantPlan } from "@/hooks/use-tenant-plan"
import { UpgradeWall } from "@/components/billing/upgrade-wall"
import {
  tierMeets,
  type FeatureKey,
  type PlanTier,
} from "@/lib/billing/feature-access"
import { cn } from "@/lib/utils"

type GateMode = "replace" | "preview" | "hide"

type Props = {
  feature?: FeatureKey
  requiredTier?: PlanTier
  mode?: GateMode
  /** Override the wall (e.g. inline compact card instead of full page). */
  fallback?: ReactNode
  /** Tighten the whole gate's spacing. */
  compact?: boolean
  /** Custom title / description forwarded to UpgradeWall. */
  title?: string
  description?: string
  children: ReactNode
  /** While we don't know the plan yet, render this (defaults to a spinner). */
  loadingFallback?: ReactNode
  className?: string
}

export function FeatureGate({
  feature,
  requiredTier,
  mode = "replace",
  fallback,
  compact,
  title,
  description,
  children,
  loadingFallback,
  className,
}: Props) {
  const { plan, tier, loading, hasFeature } = useTenantPlan()

  if (loading && !plan) {
    return (
      <div className={cn("flex items-center justify-center p-6", className)}>
        {loadingFallback ?? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  const allowed = (() => {
    if (feature) return hasFeature(feature)
    if (requiredTier) return tierMeets(tier, requiredTier)
    // No criterion → fail-open (always render). Caller probably misused it.
    return true
  })()

  if (allowed) {
    return <>{children}</>
  }

  // ── Not allowed ─────────────────────────────────────────────────────────

  if (mode === "hide") return null

  const wall =
    fallback ??
    (
      <UpgradeWall
        feature={feature}
        requiredTier={requiredTier}
        title={title}
        description={description}
        compact={compact}
      />
    )

  if (mode === "preview") {
    return (
      <div className={cn("relative", className)}>
        <div
          aria-hidden
          className="pointer-events-none select-none blur-sm opacity-60"
        >
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {wall}
        </div>
      </div>
    )
  }

  // mode === "replace"
  return <div className={className}>{wall}</div>
}
