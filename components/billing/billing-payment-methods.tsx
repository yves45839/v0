"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  Calendar,
  Check,
  CreditCard,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  Star,
  Trash2,
  Wallet,
  Building,
  ArrowRight,
  Info,
  X,
} from "lucide-react"
import {
  paymentMethods as initialMethods,
  autoDebitEnabled as initialAutoDebit,
  autoDebitMethodId as initialAutoDebitMethod,
  nextDebitEstimate,
  type PaymentMethod,
  type PaymentMethodType,
  type PaymentMethodStatus,
} from "@/lib/mock-data/demo-billing"
import { cn } from "@/lib/utils"

const TYPE_CONFIG: Record<PaymentMethodType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  mobile_wallet: { label: "Portefeuille mobile", icon: Wallet, color: "text-violet-500", bg: "bg-violet-500/10" },
  bank_card: { label: "Carte bancaire", icon: CreditCard, color: "text-blue-500", bg: "bg-blue-500/10" },
  bank_transfer: { label: "Virement bancaire", icon: Building, color: "text-amber-500", bg: "bg-amber-500/10" },
  pro_account: { label: "Compte professionnel", icon: Shield, color: "text-success", bg: "bg-success/10" },
  manual: { label: "Paiement manuel", icon: RefreshCw, color: "text-slate-500", bg: "bg-slate-500/10" },
}

const STATUS_STYLE: Record<PaymentMethodStatus, string> = {
  active: "bg-success/15 text-success border-success/25",
  expired: "bg-destructive/15 text-destructive border-destructive/25",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400",
  invalid: "bg-slate-500/15 text-slate-500 border-slate-500/25",
}

const STATUS_LABEL: Record<PaymentMethodStatus, string> = {
  active: "Actif",
  expired: "Expiré",
  pending: "En attente",
  invalid: "Invalide",
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d))
}

// ── Moyen de paiement card ─────────────────────────────────
function PaymentMethodCard({
  method,
  onSetDefault,
  onDelete,
  onEdit,
  autoDebitMethodId,
}: {
  method: PaymentMethod
  onSetDefault: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  autoDebitMethodId: string
}) {
  const cfg = TYPE_CONFIG[method.type]
  const Icon = cfg.icon
  const isAutoDebit = method.id === autoDebitMethodId

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:shadow-md",
        method.isDefault && "ring-2 ring-primary/40 shadow-sm",
        method.status === "expired" && "border-destructive/30",
        method.status === "pending" && "border-amber-400/30"
      )}
    >
      {/* Alerte expiration */}
      {method.status === "expired" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Ce moyen de paiement est expiré. Mettez-le à jour pour éviter toute interruption.
        </div>
      )}
      {method.status === "pending" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Vérification en cours. Ce moyen sera actif sous 24–48h.
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
            <Icon className={cn("h-5 w-5", cfg.color)} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{method.label}</span>
              {method.isDefault && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Star className="h-2.5 w-2.5" />
                  Principal
                </span>
              )}
              {isAutoDebit && (
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-500">
                  Prélèvement auto
                </span>
              )}
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground">{method.detail}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS_STYLE[method.status])}>
                <span className={cn("h-1.5 w-1.5 rounded-full",
                  method.status === "active" ? "bg-success" :
                  method.status === "expired" ? "bg-destructive" :
                  method.status === "pending" ? "bg-amber-500" : "bg-slate-500"
                )} />
                {STATUS_LABEL[method.status]}
              </span>
              {method.isVerified && (
                <span className="flex items-center gap-1 rounded-full border border-success/20 bg-success/8 px-2 py-0.5 text-[10px] text-success">
                  <Shield className="h-2.5 w-2.5" />
                  Vérifié
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Ajouté le {formatDate(method.addedAt)}
              </span>
              {method.expiresAt && (
                <span>Expire {method.expiresAt}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {!method.isDefault && method.status === "active" && (
            <button
              onClick={() => onSetDefault(method.id)}
              className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
            >
              Définir principal
            </button>
          )}
          <button
            onClick={() => onEdit(method.id)}
            className="rounded-lg border p-1.5 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Modifier"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {!method.isDefault && (
            <button
              onClick={() => onDelete(method.id)}
              className="rounded-lg border p-1.5 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal ajout moyen de paiement ─────────────────────────
function AddPaymentMethodModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (method: Omit<PaymentMethod, "id" | "addedAt">) => void
}) {
  const [type, setType] = useState<PaymentMethodType>("mobile_wallet")
  const [label, setLabel] = useState("")
  const [detail, setDetail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<{ label?: string; detail?: string }>({})

  function validate() {
    const e: typeof errors = {}
    if (!label.trim()) e.label = "Le nom est requis"
    if (!detail.trim()) e.detail = "Les détails sont requis"
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
      onAdd({ type, label: label.trim(), detail: detail.trim(), isDefault: false, isVerified: false, status: "pending" })
      setTimeout(() => {
        setSuccess(false)
        onClose()
        setLabel("")
        setDetail("")
        setType("mobile_wallet")
      }, 1500)
    }, 1200)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Ajouter un moyen de paiement
          </DialogTitle>
          <DialogDescription>
            Ajoutez un moyen de paiement générique. La vérification se fait sous 24–48h.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <Check className="h-6 w-6 text-success" />
            </div>
            <p className="font-semibold text-success">Moyen de paiement ajouté !</p>
            <p className="text-sm text-muted-foreground">Il sera actif après vérification.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type de moyen de paiement</Label>
              <Select value={type} onValueChange={(v) => setType(v as PaymentMethodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const Ico = cfg.icon
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Ico className={cn("h-3.5 w-3.5", cfg.color)} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Nom / libellé <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="ex : Portefeuille mobile personnel"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={errors.label ? "border-destructive" : ""}
              />
              {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                Détails <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Numéro, IBAN masqué, référence..."
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className={errors.detail ? "border-destructive" : ""}
              />
              {errors.detail && <p className="text-xs text-destructive">{errors.detail}</p>}
            </div>

            <div className="rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <Info className="mb-0.5 inline h-3 w-3 mr-1" />
              Ce moyen sera en statut "En attente de vérification" jusqu'à validation par notre équipe.
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {loading ? "Ajout en cours…" : "Ajouter le moyen"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Composant principal ────────────────────────────────────
export function BillingPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods)
  const [autoDebit, setAutoDebit] = useState(initialAutoDebit)
  const [autoDebitMethod, setAutoDebitMethod] = useState(initialAutoDebitMethod)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSetDefault(id: string) {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })))
  }

  function handleDelete(id: string) {
    setMethods((prev) => prev.filter((m) => m.id !== id))
    setDeleteConfirm(null)
  }

  function handleAdd(method: Omit<PaymentMethod, "id" | "addedAt">) {
    const newMethod: PaymentMethod = {
      ...method,
      id: `pm-${Date.now()}`,
      addedAt: new Date().toISOString().slice(0, 10),
    }
    setMethods((prev) => [...prev, newMethod])
  }

  function handleSaveAutoDebit() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeMethods = methods.filter((m) => m.status === "active")

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Moyens de paiement</h2>
          <p className="text-sm text-muted-foreground">Gérez vos moyens de paiement et le prélèvement automatique.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Ajouter un moyen
        </Button>
      </div>

      {/* ── Liste des moyens ── */}
      {methods.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <Wallet className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">Aucun moyen de paiement</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Ajoutez votre premier moyen de paiement pour activer la facturation automatique.</p>
          <Button className="mt-4 gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Ajouter un moyen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onSetDefault={handleSetDefault}
              onDelete={(id) => setDeleteConfirm(id)}
              onEdit={setEditId}
              autoDebitMethodId={autoDebitMethod}
            />
          ))}
        </div>
      )}

      {/* ── Prélèvement automatique ── */}
      <div className="overflow-hidden rounded-2xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <RefreshCw className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Prélèvement automatique</h3>
            <p className="text-xs text-muted-foreground">Renouvelez votre abonnement sans intervention.</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium cursor-pointer">Activer le prélèvement automatique</Label>
            <p className="text-xs text-muted-foreground">
              Le renouvellement sera prélevé automatiquement à chaque échéance
            </p>
          </div>
          <Switch
            checked={autoDebit}
            onCheckedChange={setAutoDebit}
            aria-label="Prélèvement automatique"
          />
        </div>

        {autoDebit && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Moyen utilisé pour le prélèvement automatique</Label>
              <Select value={autoDebitMethod} onValueChange={setAutoDebitMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {activeMethods.map((m) => {
                    const Ico = TYPE_CONFIG[m.type].icon
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <Ico className={cn("h-3.5 w-3.5 shrink-0", TYPE_CONFIG[m.type].color)} />
                          <span className="truncate">{m.label}</span>
                          {m.isDefault && <Badge variant="secondary" className="ml-1 text-[10px] py-0">Principal</Badge>}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-primary/5 p-3.5">
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Prochain prélèvement estimé</p>
                  <p className="font-semibold text-sm">
                    {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(nextDebitEstimate))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                <Shield className="h-4 w-4 shrink-0 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Sécurisation</p>
                  <p className="font-semibold text-sm text-success">Prélèvement sécurisé</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-400/20 bg-blue-500/8 px-3.5 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-medium">Comment fonctionne le prélèvement automatique ?</p>
              <p>À chaque échéance, le montant de votre abonnement est prélevé sur le moyen sélectionné. Vous recevez une notification et une facture par email. En cas d'échec, 2 tentatives supplémentaires sont effectuées avant suspension.</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveAutoDebit} className="gap-2" size="sm">
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    Paramètres enregistrés
                  </>
                ) : (
                  <>
                    Enregistrer les paramètres
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {!autoDebit && (
          <div className="rounded-lg border border-amber-400/20 bg-amber-500/8 px-3.5 py-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mb-0.5 inline h-3 w-3 mr-1.5" />
            <strong>Prélèvement automatique désactivé.</strong> Vous devrez renouveler manuellement votre abonnement avant chaque échéance pour éviter toute interruption de service.
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AddPaymentMethodModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />

      {/* Confirm suppression */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Supprimer ce moyen ?
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Ce moyen de paiement sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Édit placeholder */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le moyen de paiement</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de ce moyen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            <p>Fonctionnalité disponible en production avec validation sécurisée côté serveur.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
