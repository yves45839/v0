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

export function BillingPaymentMethods() {
  const [portalError, setPortalError] = useState<string>("")

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold">Moyens de paiement</h2>
        <p className="text-sm text-muted-foreground">
          Vos moyens de paiement sont gérés en toute sécurité par Stripe.
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
                Portail sécurisé Stripe
              </span>
            </div>
            <h3 className="text-xl font-bold">
              Gérez vos cartes et prélèvements depuis le portail Stripe
            </h3>
            <p className="text-sm text-muted-foreground">
              Pour votre sécurité, aucune donnée bancaire n&apos;est stockée sur
              nos serveurs. L&apos;ajout, la mise à jour ou la suppression d&apos;un
              moyen de paiement s&apos;effectue directement sur le portail client
              Stripe, certifié PCI-DSS.
            </p>
            <ul className="space-y-2 pt-1 text-sm">
              {[
                { icon: CreditCard, label: "Ajouter ou remplacer une carte bancaire" },
                { icon: RefreshCw, label: "Choisir le moyen utilisé pour le renouvellement automatique" },
                { icon: FileText, label: "Retrouver l'historique complet de vos paiements" },
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
                setPortalError(err instanceof Error ? err.message : "Erreur inattendue")
              }
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir le portail Stripe
            </StripePortalButton>
            <p className="text-center text-xs text-muted-foreground">
              Vous serez redirigé vers une page sécurisée Stripe.
            </p>
          </div>
        </div>
      </div>

      {portalError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Impossible d&apos;ouvrir le portail</p>
            <p className="mt-0.5 text-muted-foreground">
              {portalError} — Un abonnement actif est peut-être requis pour accéder au portail.
            </p>
          </div>
        </div>
      )}

      {/* ── Note sécurité ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="text-muted-foreground">
          Les paiements sont traités par <strong className="text-foreground">Stripe</strong>.
          Vos informations bancaires sont chiffrées et ne transitent jamais par
          les serveurs LR&nbsp;Time / SecurePoint.
        </p>
      </div>
    </div>
  )
}
