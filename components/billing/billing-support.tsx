"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Tag,
  X,
  Zap,
} from "lucide-react"
import {
  supportTickets as initialTickets,
  invoices,
  TICKET_CATEGORIES,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/mock-data/demo-billing"
import { cn } from "@/lib/utils"

function formatDatetime(dt: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(dt))
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; dot: string }> = {
  open: { label: "Ouvert", color: "bg-primary/15 text-primary border-primary/25", dot: "bg-primary" },
  pending: { label: "En attente", color: "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400", dot: "bg-amber-500" },
  resolved: { label: "Résolu", color: "bg-success/15 text-success border-success/25", dot: "bg-success" },
  closed: { label: "Fermé", color: "bg-slate-500/15 text-slate-500 border-slate-500/25", dot: "bg-slate-500" },
  urgent: { label: "Urgent", color: "bg-destructive/15 text-destructive border-destructive/25", dot: "bg-destructive" },
}

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Faible", color: "text-slate-500" },
  normal: { label: "Normal", color: "text-primary" },
  high: { label: "Élevé", color: "text-amber-600 dark:text-amber-400" },
  urgent: { label: "Urgent", color: "text-destructive" },
}

// ── Modal détail ticket ────────────────────────────────────
function TicketDetailModal({
  ticket,
  onClose,
  onStatusChange,
}: {
  ticket: SupportTicket | null
  onClose: () => void
  onStatusChange: (id: string, status: TicketStatus) => void
}) {
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!ticket) return null
  const sCfg = STATUS_CONFIG[ticket.status]

  function handleSend() {
    if (!reply.trim()) return
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      setReply("")
      setTimeout(() => setSent(false), 2000)
    }, 1000)
  }

  return (
    <Dialog open={!!ticket} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            {ticket.number}
          </DialogTitle>
          <DialogDescription>{ticket.subject}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", sCfg.color)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", sCfg.dot)} />
              {sCfg.label}
            </span>
            <span className={cn("text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60", PRIORITY_CONFIG[ticket.priority].color)}>
              <AlertTriangle className="h-3 w-3" />
              {PRIORITY_CONFIG[ticket.priority].label}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1">
              <Clock className="h-3 w-3" />
              {formatDatetime(ticket.createdAt)}
            </span>
            {ticket.invoiceRef && (
              <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                <FileText className="h-3 w-3 text-muted-foreground" />
                {ticket.invoiceRef}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="rounded-xl border bg-muted/20 p-4 text-sm">{ticket.description}</div>

          {/* Messages */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Échanges</h4>
            {ticket.messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.isSupport ? "flex-row" : "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  msg.isSupport ? "bg-primary/15 text-primary" : "bg-muted"
                )}>
                  {msg.author.charAt(0).toUpperCase()}
                </div>
                <div className={cn("max-w-[80%] space-y-1", msg.isSupport ? "" : "items-end flex flex-col")}>
                  <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm",
                    msg.isSupport ? "rounded-tl-sm bg-muted/60" : "rounded-tr-sm bg-primary/10"
                  )}>
                    {msg.text}
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">{msg.author} · {formatDatetime(msg.at)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply */}
          {(ticket.status === "open" || ticket.status === "pending") && (
            <div className="space-y-2">
              <Textarea
                placeholder="Répondre à ce ticket…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  Joindre un fichier
                </button>
                <Button size="sm" disabled={sending || !reply.trim()} onClick={handleSend} className="gap-1.5">
                  {sending ? (
                    <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />Envoi…</>
                  ) : sent ? (
                    <><Check className="h-3.5 w-3.5 text-success" />Envoyé !</>
                  ) : (
                    <><Send className="h-3.5 w-3.5" />Envoyer</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Actions status */}
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            {ticket.status === "open" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onStatusChange(ticket.id, "closed")}>
                Fermer le ticket
              </Button>
            )}
            {ticket.status === "closed" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onStatusChange(ticket.id, "open")}>
                <RefreshCw className="h-3.5 w-3.5" />
                Rouvrir le ticket
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal création ticket ──────────────────────────────────
function CreateTicketModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (ticket: SupportTicket) => void
}) {
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState("")
  const [invoiceRef, setInvoiceRef] = useState("none")
  const [priority, setPriority] = useState<TicketPriority>("normal")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!subject.trim()) e.subject = "L'objet est requis"
    if (!category) e.category = "La catégorie est requise"
    if (!description.trim()) e.description = "La description est requise"
    return e
  }

  function handleSubmit() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      const newTicket: SupportTicket = {
        id: `tkt-${Date.now()}`,
        number: `TKT-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
        subject: subject.trim(),
        category,
        status: "open",
        priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        invoiceRef: invoiceRef !== "none" ? invoiceRef : undefined,
        description: description.trim(),
        messages: [],
      }
      onCreate(newTicket)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        setSubject(""); setCategory(""); setInvoiceRef("none"); setPriority("normal"); setDescription("")
      }, 1800)
    }, 1200)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Ouvrir un ticket de support
          </DialogTitle>
          <DialogDescription>
            Décrivez votre problème lié à la facturation ou au paiement.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
              <Check className="h-7 w-7 text-success" />
            </div>
            <p className="font-bold text-success text-lg">Ticket ouvert !</p>
            <p className="text-sm text-muted-foreground">Notre équipe support vous répondra dans les plus brefs délais.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Objet <span className="text-destructive">*</span></Label>
              <Input placeholder="ex : Paiement de mars non confirmé" value={subject} onChange={(e) => setSubject(e.target.value)} className={errors.subject ? "border-destructive" : ""} />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
            </div>

            <div className="space-y-2">
              <Label>Catégorie du problème <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Sélectionner une catégorie…" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Facture concernée</Label>
                <Select value={invoiceRef} onValueChange={setInvoiceRef}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.number}>{inv.number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className={cfg.color}>{cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description détaillée <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Décrivez précisément le problème rencontré…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={cn("resize-none", errors.description ? "border-destructive" : "")}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip className="h-4 w-4" />
              Joindre une pièce justificative
            </button>
          </div>
        )}

        {!success && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {loading ? "Envoi…" : "Ouvrir le ticket"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Composant principal ────────────────────────────────────
export function BillingSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all")
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch = search === "" || t.subject.toLowerCase().includes(search.toLowerCase()) || t.number.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || t.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [tickets, search, statusFilter])

  function handleStatusChange(id: string, status: TicketStatus) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)))
    setSelectedTicket((prev) => prev && prev.id === id ? { ...prev, status } : prev)
  }

  function handleCreate(ticket: SupportTicket) {
    setTickets((prev) => [ticket, ...prev])
  }

  const openCount = tickets.filter((t) => t.status === "open" || t.status === "urgent").length

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Tickets & Support paiement</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos demandes liées à la facturation et aux paiements.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Ouvrir un ticket
        </Button>
      </div>

      {/* ── KPI mini ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ouverts", value: tickets.filter((t) => t.status === "open").length, color: "text-primary", bg: "bg-primary/10" },
          { label: "En attente", value: tickets.filter((t) => t.status === "pending").length, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Résolus", value: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length, color: "text-success", bg: "bg-success/10" },
        ].map((k) => (
          <div key={k.label} className="overflow-hidden rounded-xl border bg-card p-4 text-center">
            <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-50 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un ticket…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
          <SelectTrigger className="w-37.5">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Liste tickets ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">Aucun ticket trouvé</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Créez votre premier ticket ou modifiez vos filtres.</p>
          <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Ouvrir un ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const sCfg = STATUS_CONFIG[ticket.status]
            const pCfg = PRIORITY_CONFIG[ticket.priority]
            return (
              <div
                key={ticket.id}
                className="group flex cursor-pointer items-center gap-4 overflow-hidden rounded-xl border bg-card px-5 py-4 transition-all hover:shadow-md hover:border-primary/20"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", sCfg.color.includes("primary") ? "bg-primary/10" : sCfg.color.includes("success") ? "bg-success/10" : sCfg.color.includes("amber") ? "bg-amber-500/10" : "bg-muted")}>
                  <Tag className={cn("h-4 w-4", pCfg.color)} />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm truncate">{ticket.subject}</span>
                    {ticket.priority === "urgent" && (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                        <Zap className="h-2.5 w-2.5" /> Urgent
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{ticket.number}</span>
                    <span>{ticket.category}</span>
                    {ticket.invoiceRef && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {ticket.invoiceRef}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDatetime(ticket.updatedAt)}
                    </span>
                  </div>
                </div>
                <span className={cn("hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shrink-0", sCfg.color)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", sCfg.dot)} />
                  {sCfg.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
              </div>
            )
          })}
        </div>
      )}

      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onStatusChange={handleStatusChange}
      />
      <CreateTicketModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
