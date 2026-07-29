"use client"

/**
 * Moyens de paiement — il n'existe pas d'API de liste des moyens de paiement
 * côté backend : ils sont entièrement gérés par le portail client Stripe
 * (ajout / mise à jour de carte, moyen par défaut, historique). Cet onglet
 * explique et redirige vers le portail sécurisé.
 */
import { useState } from "react"
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  FileText,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { StripePortalButton } from "@/components/billing/stripe-portal-button"
import { useI18n } from "@/lib/i18n/context"
import { billingDict } from "@/lib/i18n/pages/billing"

export function BillingPaymentMethods() {
  const { locale } = useI18n()
  const tr = billingDict[locale]
  const [portalError, setPortalError] = useState<string>("")

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold">{tr.payment.title}</h2>
        <p className="text-sm text-muted-foreground">
          {tr.payment.subtitle}
        </p>
      </div>

      {/* ── Carte principale ── */}
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8">
        <div className="pointer-events-none absolute top-0 right-0 opacity-10">
          <CreditCard className="h-40 w-40 text-primary" />
        </div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Lock className="h-4.5 w-4.5 text-primary" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                {tr.payment.kicker}
              </span>
            </div>
            <h3 className="text-xl font-bold">
              {tr.payment.heading}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tr.payment.desc}
            </p>
            <ul className="space-y-2 pt-1 text-sm">
              {[
                { icon: CreditCard, label: tr.payment.bulletAddCard },
                { icon: RefreshCw, label: tr.payment.bulletDefault },
                { icon: FileText, label: tr.payment.bulletHistory },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.label} className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span>{item.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="shrink-0 space-y-3">
            <StripePortalButton
              size="lg"
              className="w-full gap-2 shadow-md"
              onError={(err) =>
                setPortalError(err instanceof Error ? err.message : tr.shared.unexpectedError)
              }
            >
              <ExternalLink className="h-4 w-4" />
              {tr.payment.openPortal}
            </StripePortalButton>
            <p className="text-center text-xs text-muted-foreground">
              {tr.payment.redirectNote}
            </p>
          </div>
        </div>
      </div>

      {portalError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">{tr.payment.portalErrorTitle}</p>
            <p className="mt-0.5 text-muted-foreground">
              {portalError} — {tr.payment.portalErrorHint}
            </p>
          </div>
        </div>
      )}

      {/* ── Note sécurité ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="text-muted-foreground">
          {tr.payment.securityBefore}<strong className="text-foreground">Stripe</strong>{tr.payment.securityAfter}
        </p>
      </div>
    </div>
  )
}
