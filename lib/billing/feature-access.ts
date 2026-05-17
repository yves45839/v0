/**
 * Feature-access helpers — single source of truth for "what can the current
 * tenant do, given its plan?". The frontend FeatureGate / UpgradeWall use
 * these helpers to decide what to render.
 *
 * Two ways to gate something:
 *   1. By **plan tier**       — `<FeatureGate requiredPlan="pro">…</FeatureGate>`
 *   2. By **feature key**     — `<FeatureGate feature="api_access">…</FeatureGate>`
 *
 * Tier comparison falls back to plan code matching: any plan whose `code`
 * starts with one of the known prefixes is mapped to a tier (free=0, pro=1,
 * enterprise=2). Anything unknown is treated as the lowest tier.
 *
 * Feature lookup reads `plan.features[key]` first; if undefined, it falls back
 * to the legacy boolean fields (`has_advanced_analytics`, etc.) so existing
 * Stripe data without the `feat.*` metadata keeps working.
 */
import type { Plan } from "@/lib/api/billing"

export type PlanTier = "free" | "pro" | "enterprise"

const TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

/** Feature keys we know about — extend freely as the product grows. */
export type FeatureKey =
  | "api_access"
  | "advanced_analytics"
  | "priority_support"
  | "multi_site"
  | "white_label"
  | "sso"
  | "custom_alerts"
  | "scheduled_reports"
  | "audit_log"
  | "webhooks"
  | "retention_long"

/**
 * Human-readable metadata for each feature — used by <UpgradeWall> to render
 * a nice headline ("Unlock Advanced Analytics") rather than the raw key.
 */
export const FEATURE_META: Record<
  FeatureKey,
  { title: string; description: string; minPlan: PlanTier }
> = {
  api_access: {
    title: "Accès API",
    description: "Pilotez vos dispositifs et événements depuis votre code.",
    minPlan: "pro",
  },
  advanced_analytics: {
    title: "Analytique avancée",
    description: "Heatmaps de fréquentation, top utilisateurs, tendances 12 mois.",
    minPlan: "pro",
  },
  priority_support: {
    title: "Support prioritaire",
    description: "Réponse sous 24h ouvrées par e-mail dédié.",
    minPlan: "pro",
  },
  multi_site: {
    title: "Multi-sites",
    description: "Gérez plusieurs bâtiments dans un seul tableau de bord.",
    minPlan: "pro",
  },
  webhooks: {
    title: "Webhooks temps réel",
    description: "Notifications push vers Slack, Teams, ou votre backend.",
    minPlan: "pro",
  },
  custom_alerts: {
    title: "Alertes personnalisées",
    description: "Règles email / SMS / WhatsApp sur les événements critiques.",
    minPlan: "pro",
  },
  scheduled_reports: {
    title: "Rapports planifiés",
    description: "Recevez vos rapports PDF automatiquement chaque semaine.",
    minPlan: "pro",
  },
  audit_log: {
    title: "Journal d'audit",
    description: "Traçabilité complète des actions admin pour la conformité.",
    minPlan: "pro",
  },
  retention_long: {
    title: "Rétention longue durée",
    description: "Conservez vos événements jusqu'à 12 mois (vs 7 jours).",
    minPlan: "pro",
  },
  white_label: {
    title: "White-label",
    description: "Logo et domaine personnalisés.",
    minPlan: "enterprise",
  },
  sso: {
    title: "SSO / SAML",
    description: "Authentification d'entreprise via votre IdP.",
    minPlan: "enterprise",
  },
}

// ─────────────────────────────────────────────────── Plan tier resolution ─

/** Map a Plan or Plan code to a normalized tier. */
export function tierOf(plan: Plan | null | undefined | string): PlanTier {
  const code = (typeof plan === "string" ? plan : plan?.code ?? "")
    .toLowerCase()
    .trim()
  if (!code) return "free"
  if (code.startsWith("enterprise") || code.startsWith("ent")) return "enterprise"
  if (
    code.startsWith("pro") ||
    code.startsWith("premium") ||
    code.startsWith("standard") ||
    code.startsWith("essentiel") ||
    code.startsWith("business")
  ) {
    return "pro"
  }
  return "free"
}

/** Returns true if `current` is at least as high a tier as `required`. */
export function tierMeets(current: PlanTier, required: PlanTier): boolean {
  return TIER_ORDER[current] >= TIER_ORDER[required]
}

// ───────────────────────────────────────────────────── Feature resolution ─

/** Read a feature flag from a plan, with sensible fallbacks. */
export function planHasFeature(
  plan: Plan | null | undefined,
  feature: FeatureKey
): boolean {
  if (!plan) return false

  // 1. Explicit value in features dict wins.
  const explicit = plan.features?.[feature]
  if (explicit !== undefined) {
    if (typeof explicit === "boolean") return explicit
    if (typeof explicit === "number") return explicit > 0
    if (typeof explicit === "string") {
      return ["1", "true", "yes", "on"].includes(explicit.toLowerCase())
    }
  }

  // 2. Legacy boolean fields.
  if (feature === "advanced_analytics") return !!plan.has_advanced_analytics
  if (feature === "priority_support") return !!plan.has_priority_support

  // 3. Fall back to the plan tier vs the feature's minPlan.
  const tier = tierOf(plan)
  const minPlan = FEATURE_META[feature]?.minPlan ?? "pro"
  return tierMeets(tier, minPlan)
}

/** Read a numeric feature value (e.g. retention_days). */
export function planFeatureValue(
  plan: Plan | null | undefined,
  feature: string,
  fallback = 0
): number {
  if (!plan) return fallback
  const v = plan.features?.[feature]
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

/**
 * Returns the lowest plan tier that unlocks `feature`. Used by <UpgradeWall>
 * to phrase the call-to-action ("Upgrade to Pro to unlock X").
 */
export function minPlanFor(feature: FeatureKey): PlanTier {
  return FEATURE_META[feature]?.minPlan ?? "pro"
}

/** Pretty label for a tier (used in CTAs). */
export const TIER_LABELS: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
}
