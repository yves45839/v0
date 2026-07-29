"use client"

/**
 * Drop-in button that starts a Stripe-hosted Checkout flow:
 *   - mode="subscription" -> recurring plan checkout (uses plan_code)
 *   - mode="one_time"     -> single payment checkout (uses amount_cents)
 *
 * Usage:
 *   <StripeCheckoutButton mode="subscription" planCode="pro">
 *     Souscrire à Pro
 *   </StripeCheckoutButton>
 *
 *   <StripeCheckoutButton mode="one_time" amountCents={9900} description="Frais d'installation">
 *     Payer 99,00 €
 *   </StripeCheckoutButton>
 */
import { useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  redirectToCheckout,
  startOneTimeCheckout,
  startSubscriptionCheckout,
} from "@/lib/api/billing"
import { useI18n } from "@/lib/i18n/context"
import { billingDict } from "@/lib/i18n/pages/billing"

type ButtonProps = React.ComponentProps<typeof Button>

type Common = {
  children: ReactNode
  successUrl?: string
  cancelUrl?: string
  onError?: (error: Error) => void
} & Omit<ButtonProps, "onClick" | "children">

type SubscriptionProps = Common & {
  mode: "subscription"
  planCode: string
  trialPeriodDays?: number
}

type OneTimeProps = Common & {
  mode: "one_time"
  amountCents: number
  currency?: string
  description?: string
}

export type StripeCheckoutButtonProps = SubscriptionProps | OneTimeProps

export function StripeCheckoutButton(props: StripeCheckoutButtonProps) {
  const { locale } = useI18n()
  const tr = billingDict[locale]
  const { children, successUrl, cancelUrl, onError, ...rest } = props
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const session =
        props.mode === "subscription"
          ? await startSubscriptionCheckout({
              plan_code: props.planCode,
              trial_period_days: props.trialPeriodDays,
              success_url: successUrl,
              cancel_url: cancelUrl,
            })
          : await startOneTimeCheckout({
              amount_cents: props.amountCents,
              currency: props.currency,
              description: props.description,
              success_url: successUrl,
              cancel_url: cancelUrl,
            })
      redirectToCheckout(session)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
      setLoading(false)
    }
  }

  // Strip mode-specific props before forwarding to <Button />
  const buttonProps =
    props.mode === "subscription"
      ? (() => {
          const { planCode: _p, trialPeriodDays: _t, mode: _m, ...rest2 } = rest as SubscriptionProps
          return rest2
        })()
      : (() => {
          const { amountCents: _a, currency: _c, description: _d, mode: _m, ...rest2 } = rest as OneTimeProps
          return rest2
        })()

  return (
    <Button onClick={handleClick} disabled={loading || rest.disabled} {...buttonProps}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {tr.shared.redirecting}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
