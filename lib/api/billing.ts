/**
 * Frontend client for the Django billing API (`/api/billing/...`).
 *
 * All authenticated calls go through the unified HTTP client
 * (`lib/api/client.ts`), which handles JWT refresh and the
 * `X-Tenant-Code` header shared with the rest of the app.
 */
import { API_BASE_URL, apiJson, toApiError, unwrapList } from "@/lib/api/client"

// ---------- Types ----------

export type PlanInterval = "month" | "year" | "one_time"

export type Plan = {
  id: number
  code: string
  name: string
  description: string
  amount: string
  currency: string
  interval: PlanInterval
  device_quota: number
  event_quota_per_month: number
  has_priority_support: boolean
  has_advanced_analytics: boolean
  is_metered: boolean
  metered_unit_label: string
  /** Free trial length in days. 0 = no trial. */
  trial_period_days: number
  /** When false and trial_period_days > 0, no card is required to start trial. */
  trial_requires_card: boolean
  /**
   * Free-form feature flags (set per plan in the Django admin or via
   * `feat.*` metadata on the Stripe Product).
   * Examples: { api_access: true, multi_site: true, retention_days: 365 }
   */
  features: Record<string, boolean | number | string>
  is_active: boolean
  sort_order: number
}

export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused"

export type Subscription = {
  id: number
  stripe_subscription_id: string
  plan: Plan
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  trial_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: number
  stripe_invoice_id: string
  number: string
  status: "draft" | "open" | "paid" | "uncollectible" | "void"
  amount_due: string
  amount_paid: string
  amount_remaining: string
  currency: string
  hosted_invoice_url: string
  invoice_pdf: string
  period_start: string | null
  period_end: string | null
  paid_at: string | null
  created_at: string
}

export type Payment = {
  id: number
  stripe_payment_intent_id: string
  amount: string
  currency: string
  status: string
  description: string
  receipt_url: string
  created_at: string
}

export type BillingSummary = {
  tenant: {
    id: number
    code: string
    name: string
    payment_status: string
    device_quota: number
  }
  subscription: Subscription | null
  open_invoices: Invoice[]
  publishable_key: string
}

export type CheckoutSessionResponse = {
  session_id: string
  url: string
  publishable_key: string
}

export type PaymentIntentResponse = {
  payment_id: number
  stripe_payment_intent_id: string
  client_secret: string
  amount: string
  currency: string
  publishable_key: string
}

// ---------- DRF list shape helper ----------

type ListResponse<T> = { count?: number; results?: T[] } | T[]

// ---------- Internal HTTP helpers ----------

async function authJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiJson<T>(path, init)
}

// ---------- Public catalog (no auth) ----------

export async function fetchPlans(currency?: string): Promise<Plan[]> {
  const qs = currency ? `?currency=${encodeURIComponent(currency)}` : ""
  const response = await fetch(`${API_BASE_URL}/api/billing/plans/${qs}`, {
    cache: "no-store",
  })
  if (!response.ok) {
    throw await toApiError(response)
  }
  return unwrapList<Plan>(await response.json())
}

export async function fetchAvailableCurrencies(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/billing/plans/currencies/`, {
    cache: "no-store",
  })
  if (!response.ok) {
    throw await toApiError(response)
  }
  const data = await response.json()
  return Array.isArray(data) ? data.map((c: string) => c.toLowerCase()) : []
}

// ---------- Tenant-scoped reads ----------

export async function fetchBillingSummary(): Promise<BillingSummary> {
  return authJson<BillingSummary>("/api/billing/summary/")
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const payload = await authJson<ListResponse<Subscription>>("/api/billing/subscriptions/")
  return unwrapList<Subscription>(payload)
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const payload = await authJson<ListResponse<Invoice>>("/api/billing/invoices/")
  return unwrapList<Invoice>(payload)
}

export async function fetchPayments(): Promise<Payment[]> {
  const payload = await authJson<ListResponse<Payment>>("/api/billing/payments/")
  return unwrapList<Payment>(payload)
}

// ---------- Actions: subscription lifecycle ----------

export async function startSubscriptionCheckout(input: {
  plan_code: string
  trial_period_days?: number
  success_url?: string
  cancel_url?: string
}): Promise<CheckoutSessionResponse> {
  return authJson<CheckoutSessionResponse>("/api/billing/checkout/subscription/", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function startOneTimeCheckout(input: {
  amount_cents: number
  currency?: string
  description?: string
  success_url?: string
  cancel_url?: string
}): Promise<CheckoutSessionResponse> {
  return authJson<CheckoutSessionResponse>("/api/billing/checkout/one-time/", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createPaymentIntent(input: {
  amount_cents: number
  currency?: string
  description?: string
  metadata?: Record<string, string>
}): Promise<PaymentIntentResponse> {
  return authJson<PaymentIntentResponse>("/api/billing/payment-intent/", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function openBillingPortal(returnUrl?: string): Promise<{ url: string }> {
  return authJson<{ url: string }>("/api/billing/portal/", {
    method: "POST",
    body: JSON.stringify(returnUrl ? { return_url: returnUrl } : {}),
  })
}

export async function cancelSubscription(id: number): Promise<Subscription> {
  return authJson<Subscription>(`/api/billing/subscriptions/${id}/cancel/`, {
    method: "POST",
  })
}

export async function resumeSubscription(id: number): Promise<Subscription> {
  return authJson<Subscription>(`/api/billing/subscriptions/${id}/resume/`, {
    method: "POST",
  })
}

// ---------- Convenience helpers ----------

/**
 * Redirect the browser to Stripe-hosted Checkout.
 * Throws if the popup is blocked or the URL is invalid.
 */
export function redirectToCheckout(session: CheckoutSessionResponse): void {
  if (!session?.url) {
    throw new Error("Checkout session has no redirect URL.")
  }
  window.location.assign(session.url)
}

/**
 * Open the Stripe Customer Portal in the same tab.
 */
export async function redirectToPortal(returnUrl?: string): Promise<void> {
  const { url } = await openBillingPortal(returnUrl)
  if (!url) throw new Error("Portal session has no URL.")
  window.location.assign(url)
}
