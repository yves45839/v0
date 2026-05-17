/**
 * Lazy loader for Stripe.js — keeps the Stripe SDK out of the initial bundle
 * and ensures we only call `loadStripe` once.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js"

let cached: Promise<Stripe | null> | null = null

export function getStripePromise(publishableKey?: string): Promise<Stripe | null> {
  if (cached) return cached
  const key =
    publishableKey ??
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    ""
  if (!key) {
    cached = Promise.resolve(null)
    return cached
  }
  cached = loadStripe(key)
  return cached
}

/**
 * Reset the cached promise — useful when the publishable key changes between
 * test and live mode at runtime (rare).
 */
export function resetStripeClient(): void {
  cached = null
}
