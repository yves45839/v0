"use client"

/**
 * Factures — données réelles : GET /api/billing/invoices/ (Stripe, sync
 * webhooks côté Django). PDF et page de paiement hébergés par Stripe
 * (`invoice_pdf` / `hosted_invoice_url`).
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import { fetchInvoices, type Invoice } from "@/lib/api/billing"
import { cn } from "@/lib/utils"

type InvoiceStatus = Invoice["status"]

function formatMoney(amount: string, currency: string): string {
  const value = parseFloat(amount)
  if (!Number.isFinite(value)) return `${amount} ${currency.toUpperCase()}`
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: currency.toLowerCase() === "xof" ? 0 : 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`
  }
}

function formatDate(d: string | null): string {
  if (!d) return "—"
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; dot: string }> = {
  paid: { label: "Payée", color: "bg-success/15 text-success border-success/25", dot: "bg-success" },
  open: { label: "À régler", color: "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400", dot: "bg-amber-500" },
  draft: { label: "Brouillon", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500" },
  uncollectible: { label: "Irrécouvrable", color: "bg-destructive/15 text-destructive border-destructive/25", dot: "bg-destructive" },
  void: { label: "Annulée", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500" },
}

export function BillingInvoices() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [error, setError] = useState<string>("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")

  const load = useCallback(() => {
    setInvoices(null)
    setError("")
    fetchInvoices()
      .then(setInvoices)
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return (invoices ?? []).filter((inv) => {
      const matchSearch =
        search === "" ||
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.stripe_invoice_id.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || inv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, search, statusFilter])

  // ── Erreur ──
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Factures & Historique</h2>
          <p className="text-sm text-muted-foreground">Consultez et téléchargez vos factures.</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <p className="font-semibold">Impossible de charger les factures</p>
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // ── Chargement ──
  if (invoices === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des factures…
      </div>
    )
  }

  // ── Aucune facture ──
  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Factures & Historique</h2>
          <p className="text-sm text-muted-foreground">Consultez et téléchargez vos factures.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">Aucune facture pour le moment</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Vos factures apparaîtront ici dès votre première souscription.
          </p>
        </div>
      </div>
    )
  }

  const openCount = invoices.filter((i) => i.status === "open").length
  const paidCount = invoices.filter((i) => i.status === "paid").length

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Factures & Historique</h2>
          <p className="text-sm text-muted-foreground">Consultez et téléchargez vos factures.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5 self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      {/* ── KPI mini ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: invoices.length, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
          { label: "Payées", value: paidCount, icon: Check, color: "text-success", bg: "bg-success/10" },
          { label: "À régler", value: openCount, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((kpi) => {
          const K = kpi.icon
          return (
            <div key={kpi.label} className="overflow-hidden rounded-xl border bg-card p-4">
              <div className={cn("mb-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", kpi.bg)}>
                <K className={cn("h-4 w-4", kpi.color)} />
              </div>
              <p className="text-base font-bold tabular-nums">{kpi.value}</p>
              <p className="truncate text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-50 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">Aucune facture trouvée</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Modifiez vos filtres ou votre recherche.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => {
              setSearch("")
              setStatusFilter("all")
            }}
          >
            <X className="h-3.5 w-3.5" />
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="relative rounded-2xl border bg-card overflow-hidden">
          <div className="hidden grid-cols-[1fr_120px_120px_110px_150px] items-center gap-4 border-b bg-muted/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Facture</span>
            <span>Date</span>
            <span>Montant</span>
            <span>Statut</span>
            <span className="text-right">Documents</span>
          </div>
          {filtered.map((inv) => {
            const sCfg = STATUS_CONFIG[inv.status]
            return (
              <div
                key={inv.id}
                className={cn(
                  "grid items-center gap-4 border-b border-border/50 px-5 py-4 text-sm transition-colors last:border-0 hover:bg-muted/30",
                  "grid-cols-1 sm:grid-cols-[1fr_120px_120px_110px_150px]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{inv.number || inv.stripe_invoice_id}</p>
                    {inv.period_start && inv.period_end && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-muted-foreground text-xs">{formatDate(inv.created_at)}</span>
                <span className="font-bold tabular-nums">{formatMoney(inv.amount_due, inv.currency)}</span>
                <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", sCfg.color)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", sCfg.dot)} />
                  {sCfg.label}
                </span>
                <div className="flex items-center gap-1.5 sm:justify-end">
                  {inv.invoice_pdf ? (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" asChild>
                      <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    </Button>
                  ) : null}
                  {inv.hosted_invoice_url ? (
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" asChild>
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {inv.status === "open" ? "Payer" : "Voir"}
                      </a>
                    </Button>
                  ) : null}
                  {!inv.invoice_pdf && !inv.hosted_invoice_url && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
