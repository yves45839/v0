"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Calendar,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Filter,
  MessageCircle,
  Printer,
  RefreshCw,
  Search,
  X,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Banknote,
} from "lucide-react"
import { invoices as initialInvoices, type Invoice, type InvoiceStatus } from "@/lib/mock-data/demo-billing"
import type { BillingTab } from "./billing-tabs"
import { cn } from "@/lib/utils"

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d))
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  paid: { label: "Payé", color: "bg-success/15 text-success border-success/25", dot: "bg-success", icon: Check },
  pending: { label: "En attente", color: "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400", dot: "bg-amber-500", icon: Clock },
  failed: { label: "Échoué", color: "bg-destructive/15 text-destructive border-destructive/25", dot: "bg-destructive", icon: X },
  refunded: { label: "Remboursé", color: "bg-violet-500/15 text-violet-600 border-violet-500/25 dark:text-violet-400", dot: "bg-violet-500", icon: RefreshCw },
  cancelled: { label: "Annulé", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500", icon: X },
}

interface InvoiceDetailModalProps {
  invoice: Invoice | null
  onClose: () => void
  onRetry: (id: string) => void
  onSupport: () => void
}

function InvoiceDetailModal({ invoice, onClose, onRetry, onSupport }: InvoiceDetailModalProps) {
  const [retrying, setRetrying] = useState(false)
  const [retried, setRetried] = useState(false)

  if (!invoice) return null
  const sCfg = STATUS_CONFIG[invoice.status]
  const SIcon = sCfg.icon

  function handleRetry() {
    setRetrying(true)
    setTimeout(() => {
      setRetrying(false)
      setRetried(true)
      onRetry(invoice.id)
    }, 1600)
  }

  return (
    <Dialog open={!!invoice} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Facture {invoice.number}
          </DialogTitle>
          <DialogDescription>
            Détails complets de la facture — {invoice.period}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Status badge large */}
          <div className={cn("flex items-center gap-2.5 rounded-xl border p-3.5", sCfg.color)}>
            <SIcon className="h-4 w-4" />
            <div>
              <p className="font-semibold text-sm">{sCfg.label}</p>
              {invoice.status === "failed" && <p className="text-xs opacity-80">Ce paiement a échoué. Utilisez "Réessayer" pour relancer.</p>}
              {invoice.status === "paid" && invoice.paidAt && <p className="text-xs opacity-80">Réglé le {formatDate(invoice.paidAt)}</p>}
              {invoice.status === "pending" && <p className="text-xs opacity-80">À régler avant le {formatDate(invoice.dueAt)}</p>}
            </div>
          </div>

          {/* Détails */}
          <div className="rounded-xl border bg-muted/20 divide-y divide-border/60">
            {[
              { label: "Numéro", value: invoice.number },
              { label: "Période", value: invoice.period },
              { label: "Plan", value: invoice.planName },
              { label: "Montant", value: formatAmount(invoice.amount), bold: true },
              { label: "Mode de paiement", value: invoice.paymentMethod },
              { label: "Date d'émission", value: formatDate(invoice.issuedAt) },
              { label: "Date d'échéance", value: formatDate(invoice.dueAt) },
              ...(invoice.paidAt ? [{ label: "Date de règlement", value: formatDate(invoice.paidAt) }] : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-medium tabular-nums", row.bold && "text-lg font-bold")}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={invoice.downloadUrl} download>
                <Download className="h-3.5 w-3.5" />
                Télécharger
              </a>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Imprimer
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={invoice.downloadUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Aperçu
              </a>
            </Button>
            {invoice.status === "failed" && !retried && (
              <Button size="sm" className="gap-1.5 ml-auto" disabled={retrying} onClick={handleRetry}>
                {retrying ? (
                  <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />Traitement…</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" />Réessayer le paiement</>
                )}
              </Button>
            )}
            {retried && (
              <div className="ml-auto flex items-center gap-1.5 text-success text-sm">
                <Check className="h-3.5 w-3.5" /> Tentative lancée
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" className="w-full gap-1.5 border border-dashed text-muted-foreground hover:text-foreground" onClick={() => { onSupport(); onClose() }}>
            <MessageCircle className="h-3.5 w-3.5" />
            Contacter le support pour cette facture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Composant principal ────────────────────────────────────
interface BillingInvoicesProps {
  onTabChange: (tab: BillingTab) => void
}

export function BillingInvoices({ onTabChange }: BillingInvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        search === "" ||
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.period.toLowerCase().includes(search.toLowerCase()) ||
        inv.planName.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || inv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, search, statusFilter])

  function handleRetry(id: string) {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "pending" as InvoiceStatus } : inv))
    )
  }

  // KPI summary
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0)
  const totalFailed = invoices.filter((i) => i.status === "failed").length
  const nextDue = invoices.find((i) => i.status === "pending")

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold">Factures & Historique</h2>
        <p className="text-sm text-muted-foreground">Consultez, téléchargez et gérez vos factures.</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total payé", value: formatAmount(totalPaid), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "En attente", value: totalPending === 0 ? "Aucun" : formatAmount(totalPending), icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Paiements échoués", value: `${totalFailed} facture${totalFailed > 1 ? "s" : ""}`, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Prochaine échéance", value: nextDue ? formatDate(nextDue.dueAt) : "—", icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
        ].map((kpi) => {
          const K = kpi.icon
          return (
            <div key={kpi.label} className="overflow-hidden rounded-xl border bg-card p-4">
              <div className={cn("mb-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", kpi.bg)}>
                <K className={cn("h-4 w-4", kpi.color)} />
              </div>
              <p className="truncate text-base font-bold tabular-nums">{kpi.value}</p>
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
            placeholder="Rechercher par numéro, période…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
          <SelectTrigger className="w-40">
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

      {/* ── Timeline factures ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">Aucune facture trouvée</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Modifiez vos filtres ou votre recherche.</p>
          <Button variant="ghost" size="sm" className="mt-3 gap-2" onClick={() => { setSearch(""); setStatusFilter("all") }}>
            <X className="h-3.5 w-3.5" />
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="relative space-y-0 rounded-2xl border bg-card overflow-hidden">
          {/* Table header */}
          <div className="hidden grid-cols-[1fr_100px_120px_110px_110px_40px] items-center gap-4 border-b bg-muted/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Facture</span>
            <span>Montant</span>
            <span>Statut</span>
            <span>Émise</span>
            <span>Plan</span>
            <span />
          </div>
          {filtered.map((inv, i) => {
            const sCfg = STATUS_CONFIG[inv.status]
            const SIcon = sCfg.icon
            return (
              <div
                key={inv.id}
                className={cn(
                  "group grid cursor-pointer items-center gap-4 border-b border-border/50 px-5 py-4 text-sm transition-colors last:border-0 hover:bg-muted/30",
                  "grid-cols-1 sm:grid-cols-[1fr_100px_120px_110px_110px_40px]"
                )}
                onClick={() => setSelectedInvoice(inv)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">{inv.period}</p>
                  </div>
                </div>
                <span className="font-bold tabular-nums">{formatAmount(inv.amount)}</span>
                <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", sCfg.color)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", sCfg.dot)} />
                  {sCfg.label}
                </span>
                <span className="text-muted-foreground text-xs">{formatDate(inv.issuedAt)}</span>
                <Badge variant="secondary" className="w-fit text-[11px]">{inv.planName}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Alerte paiements échoués ── */}
      {invoices.some((i) => i.status === "failed") && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Paiement(s) en échec</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Régularisez rapidement pour éviter la suspension de votre compte.
            </p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setSelectedInvoice(invoices.find((i) => i.status === "failed") ?? null)}>
            Voir
          </Button>
        </div>
      )}

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onRetry={handleRetry}
        onSupport={() => onTabChange("support")}
      />
    </div>
  )
}
