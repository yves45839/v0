"use client"

/**
 * Support facturation — il n'existe pas (encore) de backend de tickets.
 * Cet onglet propose un simple point de contact : e-mail du support et
 * renvoi vers le formulaire d'offre sur mesure.
 */
import { Button } from "@/components/ui/button"
import {
  Building2,
  ExternalLink,
  FileText,
  Headphones,
  Mail,
} from "lucide-react"
import type { BillingTab } from "./billing-tabs"

const SUPPORT_EMAIL = "support@label-ci.com"

interface BillingSupportProps {
  onTabChange?: (tab: BillingTab) => void
}

export function BillingSupport({ onTabChange }: BillingSupportProps) {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold">Support facturation</h2>
        <p className="text-sm text-muted-foreground">
          Une question sur une facture, un paiement ou votre abonnement ? Notre équipe vous répond.
        </p>
      </div>

      {/* ── Carte contact ── */}
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8">
        <div className="pointer-events-none absolute top-0 right-0 opacity-10">
          <Headphones className="h-40 w-40 text-primary" />
        </div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Mail className="h-4.5 w-4.5 text-primary" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Contact direct
              </span>
            </div>
            <h3 className="text-xl font-bold">Écrivez-nous, nous répondons rapidement</h3>
            <p className="text-sm text-muted-foreground">
              Pour toute question liée à la facturation (facture manquante,
              paiement refusé, changement de plan, mentions spécifiques sur vos
              factures…), contactez-nous par e-mail en précisant le numéro de
              facture concerné si possible.
            </p>
          </div>
          <div className="shrink-0 space-y-3">
            <Button size="lg" className="w-full gap-2 shadow-md" asChild>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Support facturation LR Time")}`}>
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </a>
            </Button>
            <p className="text-center text-xs text-muted-foreground">Réponse sous 24h ouvrées.</p>
          </div>
        </div>
      </div>

      {/* ── Liens utiles ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => onTabChange?.("invoices")}
          className="group flex items-start gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-sm"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <FileText className="h-4 w-4 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Vos factures</p>
            <p className="text-xs text-muted-foreground">
              Téléchargez vos factures PDF et réglez les factures en attente.
            </p>
          </div>
          <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </button>

        <button
          onClick={() => onTabChange?.("custom")}
          className="group flex items-start gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-sm"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <Building2 className="h-4 w-4 text-violet-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Offre sur mesure</p>
            <p className="text-xs text-muted-foreground">
              Besoins avancés, multi-sites, gros volumes : demandez une proposition personnalisée.
            </p>
          </div>
          <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
