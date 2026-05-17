"use client"

/**
 * "Live" subscription card — pulls the current tenant's subscription from
 * the backend (`/api/billing/summary/`) and exposes the Stripe Customer
 * Portal button. Drop into the existing billing page wherever convenient.
 *
 *   <LiveSubscriptionCard />
 */
import { useEffect, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"

import { StripePortalButton } from "@/components/billing/stripe-portal-button"
import { fetchBillingSummary, type BillingSummary } from "@/lib/api/billing"

export function LiveSubscriptionCard() {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    fetchBillingSummary()
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="mb-2 h-4 w-4" />
        Impossible de charger l&apos;abonnement&nbsp;: {error}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de l&apos;abonnement…
      </div>
    )
  }

  const sub = summary.subscription

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Abonnement actuel
          </h3>
          {sub ? (
            <>
              <p className="mt-2 text-2xl font-bold">{sub.plan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Statut&nbsp;:{" "}
                <span className="font-medium text-foreground">{translateStatus(sub.status)}</span>
                {sub.cancel_at_period_end && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    Annulation programmée
                  </span>
                )}
              </p>
              {sub.current_period_end && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Prochaine échéance&nbsp;:{" "}
                  {new Date(sub.current_period_end).toLocaleDateString("fr-FR")}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-bold">Aucun abonnement actif</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choisissez un plan sur la page tarifs pour commencer.
              </p>
            </>
          )}
        </div>
        <StripePortalButton variant="outline" size="sm" />
      </div>

      {summary.open_invoices.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {summary.open_invoices.length} facture(s) en attente de règlement.
        </div>
      )}
    </div>
  )
}

function translateStatus(status: string): string {
  switch (status) {
    case "active":
      return "Actif"
    case "trialing":
      return "Période d'essai"
    case "past_due":
      return "Paiement en retard"
    case "canceled":
      return "Annulé"
    case "unpaid":
      return "Impayé"
    case "paused":
      return "En pause"
    case "incomplete":
      return "Incomplet"
    case "incomplete_expired":
      return "Expiré"
    default:
      return status
  }
}
