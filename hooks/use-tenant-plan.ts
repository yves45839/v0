"use client"

/**
 * useTenantPlan — hook React qui expose le plan du tenant courant.
 *
 * Récupère `/api/billing/summary/` une seule fois et le partage entre tous
 * les composants de l'app via un cache module-level + un BroadcastChannel
 * pour invalider le cache quand l'utilisateur revient de Stripe Checkout.
 *
 * Utilisation :
 *   const { plan, tier, loading, refresh } = useTenantPlan()
 *   const { hasFeature } = useTenantPlan()
 *   if (hasFeature("api_access")) { ... }
 */
import { useCallback, useEffect, useState } from "react"

import {
  fetchBillingSummary,
  type BillingSummary,
  type Plan,
} from "@/lib/api/billing"
import {
  planHasFeature,
  tierOf,
  type FeatureKey,
  type PlanTier,
} from "@/lib/billing/feature-access"
import { hasAuthSession } from "@/lib/api/auth"

// ───────────────────────────────────────────────── module-level cache ─

type CacheEntry = {
  summary: BillingSummary | null
  fetchedAt: number
}

const CACHE_TTL_MS = 60_000 // 1 minute — generous; can refresh manually after Checkout
let cache: CacheEntry | null = null
let inflight: Promise<BillingSummary | null> | null = null
const listeners = new Set<(s: BillingSummary | null) => void>()

function notify(s: BillingSummary | null) {
  cache = { summary: s, fetchedAt: Date.now() }
  listeners.forEach((cb) => {
    try {
      cb(s)
    } catch {
      /* ignore */
    }
  })
}

async function fetchOnce(force = false): Promise<BillingSummary | null> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.summary
  }
  if (inflight) return inflight

  if (!hasAuthSession()) {
    notify(null)
    return null
  }

  inflight = (async () => {
    try {
      const summary = await fetchBillingSummary()
      notify(summary)
      return summary
    } catch {
      notify(null)
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

// ───────────────────────────────────────────────────── public hook ─

export type TenantPlanState = {
  /** The active plan (from the most recent subscription). Null if Free / no sub. */
  plan: Plan | null
  /** Normalized tier — "free" by default. */
  tier: PlanTier
  /** True if the API call is in-flight. */
  loading: boolean
  /** Tenant payment status from the backend (e.g. "active", "past_due"). */
  paymentStatus: string
  /** True if there's an active subscription regardless of plan. */
  hasActiveSubscription: boolean
  /** Plan code shortcut. */
  planCode: string
  /** Helper: does this tenant have access to a feature? */
  hasFeature: (feature: FeatureKey | string) => boolean
  /** Force refresh from the backend (e.g. after returning from Stripe). */
  refresh: () => Promise<void>
}

export function useTenantPlan(): TenantPlanState {
  const [summary, setSummary] = useState<BillingSummary | null>(
    cache?.summary ?? null
  )
  const [loading, setLoading] = useState<boolean>(!cache)

  useEffect(() => {
    let mounted = true
    listeners.add(setSummary)

    fetchOnce().finally(() => {
      if (mounted) setLoading(false)
    })

    // Refresh when the tab regains focus — covers the Stripe Checkout return.
    const onFocus = () => {
      fetchOnce(true)
    }
    window.addEventListener("focus", onFocus)

    return () => {
      mounted = false
      listeners.delete(setSummary)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await fetchOnce(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const plan = summary?.subscription?.plan ?? null
  const tier = tierOf(plan)
  const hasActiveSubscription = Boolean(
    summary?.subscription &&
      ["active", "trialing", "past_due"].includes(summary.subscription.status)
  )

  return {
    plan,
    tier,
    loading,
    paymentStatus: summary?.tenant.payment_status ?? "unknown",
    hasActiveSubscription,
    planCode: plan?.code ?? "free",
    hasFeature: (feature) => planHasFeature(plan, feature as FeatureKey),
    refresh,
  }
}
