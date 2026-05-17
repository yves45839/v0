"use client"

/**
 * Embedded Stripe Payment Element for one-time payments.
 *
 * Usage:
 *   <StripePaymentElement
 *     amountCents={1500}
 *     description="Frais d'installation"
 *     onSuccess={(paymentIntentId) => router.push(`/billing?payment=success`)}
 *   />
 *
 * Calls POST /api/billing/payment-intent/ to obtain a `client_secret`, then
 * mounts the Stripe Payment Element. On submit, confirms the payment without
 * leaving the dashboard.
 */
import { useEffect, useMemo, useState } from "react"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import type { Appearance } from "@stripe/stripe-js"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  createPaymentIntent,
  type PaymentIntentResponse,
} from "@/lib/api/billing"
import { getStripePromise } from "@/lib/stripe-client"

type Props = {
  amountCents: number
  currency?: string
  description?: string
  metadata?: Record<string, string>
  onSuccess?: (paymentIntentId: string) => void
  onError?: (error: Error) => void
}

const APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#0ea5e9",
    borderRadius: "8px",
  },
}

export function StripePaymentElement({
  amountCents,
  currency = "eur",
  description,
  metadata,
  onSuccess,
  onError,
}: Props) {
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    setIntent(null)
    setError("")
    createPaymentIntent({
      amount_cents: amountCents,
      currency,
      description,
      metadata,
    })
      .then((response) => {
        if (!cancelled) setIntent(response)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          onError?.(err)
        }
      })
    return () => {
      cancelled = true
    }
  }, [amountCents, currency, description, JSON.stringify(metadata ?? {})])

  const stripePromise = useMemo(() => {
    return getStripePromise(intent?.publishable_key)
  }, [intent?.publishable_key])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Impossible d&apos;initialiser le paiement&nbsp;: {error}
      </div>
    )
  }
  if (!intent || !intent.client_secret) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Préparation du formulaire de paiement…
      </div>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret: intent.client_secret, appearance: APPEARANCE }}
    >
      <CheckoutForm
        amountLabel={formatAmount(amountCents, currency)}
        onSuccess={onSuccess}
      />
    </Elements>
  )
}

function CheckoutForm({
  amountLabel,
  onSuccess,
}: {
  amountLabel: string
  onSuccess?: (paymentIntentId: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setErrorMessage("")

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/billing?payment=success`,
      },
    })

    if (error) {
      setErrorMessage(error.message ?? "Le paiement a échoué.")
      setSubmitting(false)
      return
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess?.(paymentIntent.id)
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Traitement…
          </>
        ) : (
          <>Payer {amountLabel}</>
        )}
      </Button>
    </form>
  )
}

function formatAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}
