"use client"

import { useState, useMemo } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Archive,
  BadgeCheck,
  Building2,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  LogIn,
  LogOut,
  MailCheck,
  MapPin,
  Printer,
  QrCode,
  Search,
  Shield,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
  Phone,
  Mail,
  Tag,
} from "lucide-react"
import {
  VISITORS,
  VISITOR_STATS,
  type Visitor,
  type VisitorStatus,
  type BadgeType,
  type VisitPurpose,
} from "@/lib/mock-data/demo-visitors"

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso))
}
function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}
function initials(first: string, last: string) {
  return (first[0] + last[0]).toUpperCase()
}
function avatarColor(id: string) {
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-lime-500"]
  return colors[id.charCodeAt(id.length - 1) % colors.length]
}

const STATUS_CONFIG: Record<VisitorStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  expected:    { label: "Attendu",     color: "text-blue-400",    bg: "bg-blue-500/15",    icon: Clock },
  checked_in:  { label: "Sur site",    color: "text-green-400",   bg: "bg-green-500/15",   icon: UserCheck },
  checked_out: { label: "Parti",       color: "text-slate-400",   bg: "bg-slate-500/15",   icon: LogOut },
  cancelled:   { label: "Annulé",      color: "text-red-400",     bg: "bg-red-500/15",     icon: XCircle },
  no_show:     { label: "Non présenté",color: "text-orange-400",  bg: "bg-orange-500/15",  icon: XCircle },
}

const BADGE_CONFIG: Record<BadgeType, { label: string; color: string; bg: string }> = {
  visitor:    { label: "Visiteur",     color: "text-blue-400",    bg: "bg-blue-500/15" },
  contractor: { label: "Prestataire",  color: "text-orange-400",  bg: "bg-orange-500/15" },
  vip:        { label: "VIP",          color: "text-amber-400",   bg: "bg-amber-500/15" },
  delivery:   { label: "Livraison",    color: "text-purple-400",  bg: "bg-purple-500/15" },
  temporary:  { label: "Temporaire",   color: "text-slate-400",   bg: "bg-slate-500/15" },
}

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  meeting:     "Réunion",
  delivery:    "Livraison",
  maintenance: "Maintenance",
  interview:   "Entretien",
  other:       "Autre",
}

// ── Visitor Row ───────────────────────────────────────────────────────────────
function VisitorRow({ visitor, onView, onCheckIn, onCheckOut }: {
  visitor: Visitor
  onView: (v: Visitor) => void
  onCheckIn: (id: string) => void
  onCheckOut: (id: string) => void
}) {
  const sta = STATUS_CONFIG[visitor.status]
  const badge = BADGE_CONFIG[visitor.badgeType]
  const StaIcon = sta.icon

  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-3.5 transition-all hover:border-border hover:shadow-sm">
      {/* Avatar */}
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", avatarColor(visitor.id))}>
        {initials(visitor.firstName, visitor.lastName)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{visitor.firstName} {visitor.lastName}</span>
          <Badge className={cn("text-[10px]", badge.bg, badge.color)}>{badge.label}</Badge>
          <Badge className={cn("text-[10px]", sta.bg, sta.color)}>
            <StaIcon className="mr-1 h-2.5 w-2.5" />{sta.label}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {visitor.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{visitor.company}</span>}
          <span className="flex items-center gap-1"><User className="h-3 w-3" />Hôte: {visitor.hostName}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
            {visitor.checkedInAt ? formatTime(visitor.checkedInAt) : formatTime(visitor.scheduledAt)}
          </span>
          <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{PURPOSE_LABELS[visitor.purpose]}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {visitor.status === "expected" && (
          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => onCheckIn(visitor.id)}>
            <LogIn className="mr-1 h-3 w-3" /> Check-in
          </Button>
        )}
        {visitor.status === "checked_in" && (
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => onCheckOut(visitor.id)}>
            <LogOut className="mr-1 h-3 w-3" /> Check-out
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onView(visitor)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Visitor Detail Modal ──────────────────────────────────────────────────────
function VisitorDetailModal({ visitor, onClose, onCheckIn, onCheckOut }: {
  visitor: Visitor | null
  onClose: () => void
  onCheckIn: (id: string) => void
  onCheckOut: (id: string) => void
}) {
  if (!visitor) return null
  const sta = STATUS_CONFIG[visitor.status]
  const badge = BADGE_CONFIG[visitor.badgeType]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white", avatarColor(visitor.id))}>
              {initials(visitor.firstName, visitor.lastName)}
            </div>
            {visitor.firstName} {visitor.lastName}
          </DialogTitle>
          <DialogDescription className="flex gap-2">
            <Badge className={cn("text-[10px]", badge.bg, badge.color)}>{badge.label}</Badge>
            <Badge className={cn("text-[10px]", sta.bg, sta.color)}>{sta.label}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
            {visitor.company && <div><span className="text-muted-foreground">Entreprise</span><p className="mt-0.5 font-medium">{visitor.company}</p></div>}
            <div><span className="text-muted-foreground">Hôte</span><p className="mt-0.5 font-medium">{visitor.hostName}</p></div>
            <div><span className="text-muted-foreground">Département</span><p className="mt-0.5 font-medium">{visitor.hostDept}</p></div>
            <div><span className="text-muted-foreground">Objet</span><p className="mt-0.5 font-medium">{PURPOSE_LABELS[visitor.purpose]}</p></div>
            <div><span className="text-muted-foreground">Heure prévue</span><p className="mt-0.5 font-medium">{formatDateTime(visitor.scheduledAt)}</p></div>
            {visitor.checkedInAt && <div><span className="text-muted-foreground">Check-in</span><p className="mt-0.5 font-medium">{formatTime(visitor.checkedInAt)}</p></div>}
            {visitor.checkedOutAt && <div><span className="text-muted-foreground">Check-out</span><p className="mt-0.5 font-medium">{formatTime(visitor.checkedOutAt)}</p></div>}
            {visitor.vehiclePlate && <div><span className="text-muted-foreground">Plaque</span><p className="mt-0.5 font-medium">{visitor.vehiclePlate}</p></div>}
            <div><span className="text-muted-foreground">ID vérifié</span><p className={cn("mt-0.5 font-medium", visitor.idVerified ? "text-green-400" : "text-red-400")}>{visitor.idVerified ? "Oui" : "Non"}</p></div>
            {visitor.badgeNumber && <div><span className="text-muted-foreground">Badge n°</span><p className="mt-0.5 font-mono font-medium text-[10px]">{visitor.badgeNumber}</p></div>}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Zones autorisées</p>
            <div className="flex flex-wrap gap-1.5">
              {visitor.accessZones.map(z => <Badge key={z} variant="secondary" className="text-[10px]"><MapPin className="mr-1 h-2.5 w-2.5" />{z}</Badge>)}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{visitor.email}</span>
              {visitor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{visitor.phone}</span>}
            </div>
          </div>

          {visitor.notes && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Note : </span>{visitor.notes}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Badge PDF
          </Button>
          <Button variant="outline" size="sm">
            <QrCode className="mr-1.5 h-3.5 w-3.5" /> QR Code
          </Button>
          {visitor.status === "expected" && (
            <Button size="sm" onClick={() => { onCheckIn(visitor.id); onClose() }}>
              <LogIn className="mr-1.5 h-3.5 w-3.5" /> Check-in
            </Button>
          )}
          {visitor.status === "checked_in" && (
            <Button size="sm" variant="destructive" onClick={() => { onCheckOut(visitor.id); onClose() }}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Check-out
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Pre-registration Form Modal ───────────────────────────────────────────────
function PreRegisterModal({ onClose, onSave }: { onClose: () => void; onSave: (v: Partial<Visitor>) => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", company: "", email: "", phone: "", purpose: "meeting", badgeType: "visitor", hostName: "", scheduledAt: "", notes: "" })
  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Pré-enregistrer un visiteur
          </DialogTitle>
          <DialogDescription>Renseignez les informations du visiteur attendu</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prénom *</Label>
              <Input placeholder="Prénom" value={form.firstName} onChange={e => update("firstName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nom *</Label>
              <Input placeholder="Nom" value={form.lastName} onChange={e => update("lastName", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Entreprise</Label>
            <Input placeholder="Entreprise (optionnel)" value={form.company} onChange={e => update("company", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input type="email" placeholder="email@exemple.com" value={form.email} onChange={e => update("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Téléphone</Label>
              <Input placeholder="+33 6 …" value={form.phone} onChange={e => update("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Objet de la visite *</Label>
              <Select value={form.purpose} onValueChange={v => update("purpose", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="delivery">Livraison</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="interview">Entretien</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type de badge *</Label>
              <Select value={form.badgeType} onValueChange={v => update("badgeType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitor">Visiteur</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="contractor">Prestataire</SelectItem>
                  <SelectItem value="delivery">Livraison</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hôte responsable *</Label>
              <Input placeholder="Nom de l'hôte" value={form.hostName} onChange={e => update("hostName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date & heure prévue *</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => update("scheduledAt", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes internes</Label>
            <Input placeholder="Informations complémentaires…" value={form.notes} onChange={e => update("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => { onSave(form); onClose() }} disabled={!form.firstName || !form.lastName || !form.email}>
            <MailCheck className="mr-1.5 h-3.5 w-3.5" /> Enregistrer & notifier l'hôte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type VisitorsTab = "today" | "preregistered" | "history" | "badges"

export default function VisitorsPage() {
  const [tab, setTab] = useState<VisitorsTab>("today")
  const [visitors, setVisitors] = useState(VISITORS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [showPreRegister, setShowPreRegister] = useState(false)

  const today = new Date().toDateString()

  const todayVisitors = useMemo(() =>
    visitors.filter(v => new Date(v.scheduledAt).toDateString() === today || v.status === "checked_in"), [visitors])

  const preregistered = useMemo(() =>
    visitors.filter(v => v.status === "expected"), [visitors])

  const history = useMemo(() =>
    visitors.filter(v => v.status === "checked_out" || v.status === "no_show" || v.status === "cancelled"), [visitors])

  const currentOnSite = visitors.filter(v => v.status === "checked_in")

  function applyFilters(list: Visitor[]) {
    return list.filter(v => {
      const matchSearch = !search || (v.firstName + " " + v.lastName).toLowerCase().includes(search.toLowerCase()) || v.company?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || v.status === statusFilter
      return matchSearch && matchStatus
    })
  }

  function checkIn(id: string) {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: "checked_in" as VisitorStatus, checkedInAt: new Date().toISOString(), idVerified: true, badgeNumber: `VBG-${Date.now()}` } : v))
    if (selectedVisitor?.id === id) setSelectedVisitor(prev => prev ? { ...prev, status: "checked_in", checkedInAt: new Date().toISOString() } : prev)
  }

  function checkOut(id: string) {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: "checked_out" as VisitorStatus, checkedOutAt: new Date().toISOString() } : v))
    if (selectedVisitor?.id === id) setSelectedVisitor(prev => prev ? { ...prev, status: "checked_out", checkedOutAt: new Date().toISOString() } : prev)
  }

  function addPreregistered(data: Partial<Visitor>) {
    const newVisitor: Visitor = {
      id: `VIS-${String(visitors.length + 1).padStart(3, "0")}`,
      firstName: data.firstName!,
      lastName: data.lastName!,
      company: data.company || undefined,
      email: data.email!,
      phone: data.phone || undefined,
      badgeType: (data.badgeType as BadgeType) || "visitor",
      purpose: (data.purpose as VisitPurpose) || "meeting",
      hostName: data.hostName!,
      hostDept: "À définir",
      status: "expected",
      scheduledAt: data.scheduledAt || new Date().toISOString(),
      accessZones: ["Accueil"],
      idVerified: false,
      notes: data.notes || undefined,
    }
    setVisitors(prev => [newVisitor, ...prev])
  }

  const displayedList = () => {
    switch (tab) {
      case "today":        return applyFilters(todayVisitors)
      case "preregistered": return applyFilters(preregistered)
      case "history":      return applyFilters(history)
      default:             return []
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Visiteurs</h1>
                <p className="text-sm text-muted-foreground">
                  {currentOnSite.length} visiteur{currentOnSite.length !== 1 ? "s" : ""} actuellement sur site
                </p>
              </div>
            </div>
            <Button onClick={() => setShowPreRegister(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Pré-enregistrer
            </Button>
          </div>

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Attendus aujourd'hui", value: VISITOR_STATS.todayExpected, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Sur site",              value: currentOnSite.length,        icon: UserCheck, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "Repartis",              value: VISITOR_STATS.todayCheckedOut, icon: LogOut, color: "text-slate-400", bg: "bg-slate-500/10" },
              { label: "Cette semaine",         value: VISITOR_STATS.weekTotal,      icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
                  <p className="truncate text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* On-site strip */}
          {currentOnSite.length > 0 && (
            <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-400">Actuellement sur site</p>
              <div className="flex flex-wrap gap-2">
                {currentOnSite.map(v => (
                  <div key={v.id} className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 cursor-pointer hover:bg-green-500/15 transition-colors" onClick={() => setSelectedVisitor(v)}>
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white", avatarColor(v.id))}>
                      {initials(v.firstName, v.lastName)}
                    </div>
                    <span className="text-xs font-medium text-foreground">{v.firstName} {v.lastName}</span>
                    <span className="text-[10px] text-green-400">{v.checkedInAt ? formatTime(v.checkedInAt) : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={tab} onValueChange={v => setTab(v as VisitorsTab)}>
            <TabsList className="mb-5 grid w-full grid-cols-4 gap-1 bg-muted/30 p-1">
              <TabsTrigger value="today" className="gap-1.5 text-xs sm:text-sm">
                <Calendar className="h-3.5 w-3.5" /><span>Aujourd'hui</span>
                <Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{todayVisitors.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="preregistered" className="gap-1.5 text-xs sm:text-sm">
                <Clock className="h-3.5 w-3.5" /><span>Prévus</span>
                <Badge className="ml-1 bg-blue-500/20 text-blue-400 text-[9px] px-1 rounded">{preregistered.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
                <Archive className="h-3.5 w-3.5" /><span>Historique</span>
              </TabsTrigger>
              <TabsTrigger value="badges" className="gap-1.5 text-xs sm:text-sm">
                <BadgeCheck className="h-3.5 w-3.5" /><span>Badges actifs</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Visitor list tabs ── */}
            {(["today", "preregistered", "history"] as VisitorsTab[]).map(t => (
              <TabsContent key={t} value={t} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher un visiteur…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  {t !== "preregistered" && (
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous statuts</SelectItem>
                        <SelectItem value="expected">Attendu</SelectItem>
                        <SelectItem value="checked_in">Sur site</SelectItem>
                        <SelectItem value="checked_out">Parti</SelectItem>
                        <SelectItem value="cancelled">Annulé</SelectItem>
                        <SelectItem value="no_show">Non présenté</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {displayedList().length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                    <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">Aucun visiteur</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t === "today" ? "Aucune visite prévue aujourd'hui" : t === "preregistered" ? "Aucune visite pré-enregistrée" : "Aucun historique de visite"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayedList().map(v => (
                      <VisitorRow key={v.id} visitor={v} onView={setSelectedVisitor} onCheckIn={checkIn} onCheckOut={checkOut} />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}

            {/* ── Badges tab ── */}
            <TabsContent value="badges" className="space-y-4">
              {currentOnSite.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                  <BadgeCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-foreground">Aucun badge actif</p>
                  <p className="mt-1 text-sm text-muted-foreground">Aucun visiteur actuellement sur site</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentOnSite.map(v => {
                    const badge = BADGE_CONFIG[v.badgeType]
                    return (
                      <div key={v.id} className="rounded-xl border border-border/60 bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white", avatarColor(v.id))}>
                              {initials(v.firstName, v.lastName)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{v.firstName} {v.lastName}</p>
                              <Badge className={cn("mt-1 text-[10px]", badge.bg, badge.color)}>{badge.label}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                              <QrCode className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                              <Printer className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {v.badgeNumber && (
                          <p className="mt-3 font-mono text-[10px] text-muted-foreground">{v.badgeNumber}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {v.accessZones.map(z => <Badge key={z} variant="secondary" className="text-[10px]"><MapPin className="mr-1 h-2.5 w-2.5" />{z}</Badge>)}
                        </div>
                        {v.checkedInAt && (
                          <p className="mt-2 text-[11px] text-muted-foreground">Entré à {formatTime(v.checkedInAt)}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {selectedVisitor && (
        <VisitorDetailModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} onCheckIn={checkIn} onCheckOut={checkOut} />
      )}
      {showPreRegister && (
        <PreRegisterModal onClose={() => setShowPreRegister(false)} onSave={addPreregistered} />
      )}
    </div>
  )
}
