"use client"

/**
 * Button that opens the Stripe Customer Portal — the hosted page where users
 * can update payment methods, see invoices, and cancel their subscription.
 *
 * Stripe handles the entire UI; we just need a server-issued portal session.
 */
import { useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { redirectToPortal } from "@/lib/api/billing"

type ButtonProps = React.ComponentProps<typeof Button>

type Props = Omit<ButtonProps, "onClick"> & {
  returnUrl?: string
  children?: ReactNode
  onError?: (error: Error) => void
}

export function StripePortalButton({
  returnUrl,
  children = "Gérer mon abonnement",
  onError,
  ...rest
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await redirectToPortal(returnUrl)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading || rest.disabled} {...rest}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirection…
        </>
      ) : (
        children
      )}
    </Button>
  )
}
