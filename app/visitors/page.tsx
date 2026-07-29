"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { toast } from "sonner"
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Clock,
  CreditCard,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react"
import {
  createVisitor,
  deleteVisitor,
  deriveVisitorStatus,
  fetchVisitorAccessGroups,
  fetchVisitors,
  updateVisitor,
  TENANT_UNRESOLVED_ERROR,
  type VisitorAccessGroup,
  type VisitorItem,
  type VisitorStatus,
} from "@/lib/api/visitors"
import { fetchHikEvents, type HikEvent } from "@/lib/api/access-logs"
import { ApiError } from "@/lib/api/client"
import { useI18n } from "@/lib/i18n/context"
import { visitorsDict } from "@/lib/i18n/pages/visitors"

type VisitorsDict = (typeof visitorsDict)["en"]
type DateTimeFormatter = (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatValidity(iso: string | null, formatDateTime: DateTimeFormatter) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return formatDateTime(date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function initialsOf(visitor: VisitorItem) {
  const first = visitor.firstName || visitor.name
  const last = visitor.lastName
  const a = first.trim().charAt(0)
  const b = last.trim().charAt(0) || first.trim().charAt(1)
  return `${a}${b}`.toUpperCase() || "?"
}

function avatarColor(id: number) {
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-lime-500"]
  return colors[Math.abs(id) % colors.length]
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function errorMessage(error: unknown, fallback: string, tr: VisitorsDict): string {
  if (error instanceof Error && error.message === TENANT_UNRESOLVED_ERROR) return tr.tenantUnresolved
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

const STATUS_META: Record<VisitorStatus, { labelKey: "statusExpected" | "statusOnSite" | "statusCheckedOut" | "statusExpired"; color: string; bg: string; icon: React.ElementType }> = {
  expected:    { labelKey: "statusExpected",   color: "text-blue-400",  bg: "bg-blue-500/15",  icon: Clock },
  on_site:     { labelKey: "statusOnSite",     color: "text-green-400", bg: "bg-green-500/15", icon: UserCheck },
  checked_out: { labelKey: "statusCheckedOut", color: "text-slate-400", bg: "bg-slate-500/15", icon: LogOut },
  expired:     { labelKey: "statusExpired",    color: "text-red-400",   bg: "bg-red-500/15",   icon: XCircle },
}

// ── Form ──────────────────────────────────────────────────────────────────────
type VisitorFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  cardNo: string
  validFrom: string
  validTo: string
  accessGroup: string
}

const EMPTY_FORM: VisitorFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  cardNo: "",
  validFrom: "",
  validTo: "",
  accessGroup: "none",
}

function formFromVisitor(visitor: VisitorItem): VisitorFormState {
  return {
    firstName: visitor.firstName,
    lastName: visitor.lastName,
    email: visitor.email,
    phone: visitor.phone,
    cardNo: visitor.cardNo ?? "",
    validFrom: toLocalInput(visitor.validFrom),
    validTo: toLocalInput(visitor.validTo),
    accessGroup: visitor.accessGroups.length > 0 ? String(visitor.accessGroups[0]) : "none",
  }
}

function VisitorFormDialog({ title, description, submitLabel, initial, accessGroups, saving, onClose, onSubmit }: {
  title: string
  description: string
  submitLabel: string
  initial: VisitorFormState
  accessGroups: VisitorAccessGroup[]
  saving: boolean
  onClose: () => void
  onSubmit: (form: VisitorFormState) => void
}) {
  const { locale } = useI18n()
  const tr = visitorsDict[locale]
  const [form, setForm] = useState<VisitorFormState>(initial)
  function update(key: keyof VisitorFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }
  const isValid = form.firstName.trim().length > 0 || form.lastName.trim().length > 0

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tr.firstName} *</Label>
              <Input placeholder={tr.firstNamePlaceholder} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tr.lastName} *</Label>
              <Input placeholder={tr.lastNamePlaceholder} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tr.email}</Label>
              <Input type="email" placeholder={tr.emailPlaceholder} value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tr.phone}</Label>
              <Input placeholder={tr.phonePlaceholder} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tr.cardNo}</Label>
            <Input placeholder={tr.cardNoPlaceholder} value={form.cardNo} onChange={(e) => update("cardNo", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tr.validFrom}</Label>
              <Input type="datetime-local" value={form.validFrom} onChange={(e) => update("validFrom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tr.validTo}</Label>
              <Input type="datetime-local" value={form.validTo} onChange={(e) => update("validTo", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tr.accessGroup}</Label>
            <Select value={form.accessGroup} onValueChange={(v) => update("accessGroup", v)}>
              <SelectTrigger><SelectValue placeholder={tr.none} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tr.none}</SelectItem>
                {accessGroups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{tr.cancel}</Button>
          <Button onClick={() => onSubmit(form)} disabled={!isValid || saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Visitor Row ───────────────────────────────────────────────────────────────
function VisitorRow({ visitor, status, onEdit, onEndVisit, onDelete, busy }: {
  visitor: VisitorItem
  status: VisitorStatus
  onEdit: (v: VisitorItem) => void
  onEndVisit: (v: VisitorItem) => void
  onDelete: (v: VisitorItem) => void
  busy: boolean
}) {
  const { locale, formatDateTime } = useI18n()
  const tr = visitorsDict[locale]
  const sta = STATUS_META[status]
  const StaIcon = sta.icon

  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-3.5 transition-all hover:border-border hover:shadow-sm">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", avatarColor(visitor.id))}>
        {initialsOf(visitor)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{visitor.name}</span>
          <Badge className={cn("text-[10px]", sta.bg, sta.color)}>
            <StaIcon className="mr-1 h-2.5 w-2.5" />{tr[sta.labelKey]}
          </Badge>
          {visitor.cardNo && (
            <Badge variant="secondary" className="text-[10px] font-mono">
              <CreditCard className="mr-1 h-2.5 w-2.5" />{visitor.cardNo}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {visitor.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{visitor.email}</span>}
          {visitor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{visitor.phone}</span>}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatValidity(visitor.validFrom, formatDateTime)} → {formatValidity(visitor.validTo, formatDateTime)}
          </span>
          {visitor.accessGroups.length > 0 && (
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{tr.accessGroupsCount(visitor.accessGroups.length)}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {(status === "on_site" || status === "expected") && (
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busy} onClick={() => onEndVisit(visitor)}>
            <LogOut className="mr-1 h-3 w-3" /> {tr.endVisit}
          </Button>
        )}
        <Button size="sm" variant="ghost" aria-label={tr.editVisitorAria} className="h-7 w-7 p-0" disabled={busy} onClick={() => onEdit(visitor)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" aria-label={tr.deleteVisitorAria} className="h-7 w-7 p-0 text-red-400 hover:text-red-400" disabled={busy} onClick={() => onDelete(visitor)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
type VisitorsTab = "all" | "onsite" | "badges"

export default function VisitorsPage() {
  const { locale, formatDateTime } = useI18n()
  const tr = visitorsDict[locale]
  const trRef = useRef(tr)
  trRef.current = tr

  const [tab, setTab] = useState<VisitorsTab>("all")
  const [visitors, setVisitors] = useState<VisitorItem[]>([])
  const [events, setEvents] = useState<HikEvent[]>([])
  const [accessGroups, setAccessGroups] = useState<VisitorAccessGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [editVisitor, setEditVisitor] = useState<VisitorItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadData = useCallback(async (withSpinner = true) => {
    if (withSpinner) setLoading(true)
    setLoadError(null)
    try {
      const [rows, eventsResponse] = await Promise.all([
        fetchVisitors(),
        fetchHikEvents({ limit: 200 }).catch(() => null),
      ])
      setVisitors(rows)
      setEvents(eventsResponse?.results ?? [])
    } catch (error) {
      setLoadError(errorMessage(error, trRef.current.loadFailed, trRef.current))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
    fetchVisitorAccessGroups()
      .then(setAccessGroups)
      .catch(() => setAccessGroups([]))
  }, [loadData])

  const statusById = useMemo(() => {
    const now = new Date()
    const map = new Map<number, VisitorStatus>()
    for (const visitor of visitors) {
      map.set(visitor.id, deriveVisitorStatus(visitor, events, now))
    }
    return map
  }, [visitors, events])

  const statusOf = useCallback((visitor: VisitorItem): VisitorStatus => statusById.get(visitor.id) ?? "expected", [statusById])

  const onSite = useMemo(() => visitors.filter((v) => statusOf(v) === "on_site"), [visitors, statusOf])
  const activeBadges = useMemo(() => onSite.filter((v) => Boolean(v.cardNo)), [onSite])
  const counts = useMemo(() => {
    const result = { expected: 0, on_site: 0, checked_out: 0, expired: 0 }
    for (const visitor of visitors) result[statusOf(visitor)] += 1
    return result
  }, [visitors, statusOf])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return visitors.filter((visitor) => {
      const status = statusOf(visitor)
      const matchSearch =
        !query ||
        visitor.name.toLowerCase().includes(query) ||
        visitor.email.toLowerCase().includes(query) ||
        visitor.employeeNo.toLowerCase().includes(query) ||
        (visitor.cardNo ?? "").toLowerCase().includes(query)
      const matchStatus = statusFilter === "all" || status === statusFilter
      return matchSearch && matchStatus
    })
  }, [visitors, search, statusFilter, statusOf])

  const displayed = tab === "onsite" ? filtered.filter((v) => statusOf(v) === "on_site") : filtered

  async function handleCreate(form: VisitorFormState) {
    setSaving(true)
    try {
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
      const cardNo = form.cardNo.trim()
      const result = await createVisitor({
        name,
        first_name: form.firstName.trim() || undefined,
        last_name: form.lastName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        employee_no: `9${String(Date.now()).slice(-8)}`,
        valid_from: fromLocalInput(form.validFrom) ?? undefined,
        valid_to: fromLocalInput(form.validTo) ?? undefined,
        cards: cardNo ? [{ card_no: cardNo }] : undefined,
        access_groups: form.accessGroup !== "none" ? [Number(form.accessGroup)] : undefined,
      })
      if (result.gatewayPartial) {
        toast.warning(tr.createdWithWarning(result.gatewayWarning ?? tr.gatewayNoDetail))
      } else {
        toast.success(tr.created(result.visitor.name))
      }
      setShowCreate(false)
      await loadData(false)
    } catch (error) {
      toast.error(errorMessage(error, tr.createFailed, tr))
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(form: VisitorFormState) {
    if (!editVisitor) return
    setSaving(true)
    try {
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
      const cardNo = form.cardNo.trim()
      const result = await updateVisitor(editVisitor.id, {
        name,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        valid_from: fromLocalInput(form.validFrom),
        valid_to: fromLocalInput(form.validTo),
        cards: cardNo ? [{ card_no: cardNo }] : [],
        access_groups: form.accessGroup !== "none" ? [Number(form.accessGroup)] : [],
      })
      if (result.gatewayPartial) {
        toast.warning(tr.updatedWithWarning(result.gatewayWarning ?? tr.gatewayNoDetail))
      } else {
        toast.success(tr.updated)
      }
      setEditVisitor(null)
      await loadData(false)
    } catch (error) {
      toast.error(errorMessage(error, tr.updateFailed, tr))
    } finally {
      setSaving(false)
    }
  }

  async function handleEndVisit(visitor: VisitorItem) {
    setBusyId(visitor.id)
    try {
      const result = await updateVisitor(visitor.id, { valid_to: new Date().toISOString() })
      if (result.gatewayPartial) {
        toast.warning(tr.visitEndedWithWarning(result.gatewayWarning ?? tr.gatewayNoDetail))
      } else {
        toast.success(tr.visitEnded(visitor.name))
      }
      await loadData(false)
    } catch (error) {
      toast.error(errorMessage(error, tr.endVisitFailed, tr))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(visitor: VisitorItem) {
    if (typeof window !== "undefined" && !window.confirm(tr.deleteConfirm(visitor.name))) {
      return
    }
    setBusyId(visitor.id)
    try {
      await deleteVisitor(visitor.id)
      toast.success(tr.deleted(visitor.name))
      await loadData(false)
    } catch (error) {
      toast.error(errorMessage(error, tr.deleteFailed, tr))
    } finally {
      setBusyId(null)
    }
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
      <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="font-medium text-foreground">{tr.emptyTitle}</p>
      <p className="mt-1 text-sm text-muted-foreground">{tr.emptyDescription}</p>
      <Button className="mt-4" size="sm" onClick={() => setShowCreate(true)}>
        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> {tr.newVisitor}
      </Button>
    </div>
  )

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
                <h1 className="text-xl font-bold tracking-tight text-foreground">{tr.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {tr.onSiteSubtitle(onSite.length)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label={tr.refresh} onClick={() => void loadData()} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> {tr.newVisitor}
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: tr.kpiExpected,   value: counts.expected,    icon: Clock,      color: "text-blue-400",   bg: "bg-blue-500/10" },
              { label: tr.kpiOnSite,     value: counts.on_site,     icon: UserCheck,  color: "text-green-400",  bg: "bg-green-500/10" },
              { label: tr.kpiCheckedOut, value: counts.checked_out, icon: LogOut,     color: "text-slate-400",  bg: "bg-slate-500/10" },
              { label: tr.kpiExpired,    value: counts.expired,     icon: XCircle,    color: "text-red-400",    bg: "bg-red-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : value}</p>
                  <p className="truncate text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Loading / error states */}
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">{tr.loadingVisitors}</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 py-16 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-red-400" />
              <p className="font-medium text-foreground">{tr.loadErrorTitle}</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{loadError}</p>
              <Button className="mt-4" size="sm" variant="outline" onClick={() => void loadData()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {tr.retry}
              </Button>
            </div>
          ) : (
            <>
              {/* On-site strip */}
              {onSite.length > 0 && (
                <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-400">{tr.currentlyOnSite}</p>
                  <div className="flex flex-wrap gap-2">
                    {onSite.map((visitor) => (
                      <div key={visitor.id} className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 cursor-pointer hover:bg-green-500/15 transition-colors" onClick={() => setEditVisitor(visitor)}>
                        <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white", avatarColor(visitor.id))}>
                          {initialsOf(visitor)}
                        </div>
                        <span className="text-xs font-medium text-foreground">{visitor.name}</span>
                        {visitor.cardNo && <span className="font-mono text-[10px] text-green-400">{visitor.cardNo}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <Tabs value={tab} onValueChange={(value) => setTab(value as VisitorsTab)}>
                <TabsList className="mb-5 grid w-full grid-cols-3 gap-1 bg-muted/30 p-1">
                  <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
                    <Users className="h-3.5 w-3.5" /><span>{tr.tabAll}</span>
                    <Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{visitors.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="onsite" className="gap-1.5 text-xs sm:text-sm">
                    <UserCheck className="h-3.5 w-3.5" /><span>{tr.tabOnSite}</span>
                    <Badge className="ml-1 bg-green-500/20 text-green-400 text-[9px] px-1 rounded">{onSite.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="badges" className="gap-1.5 text-xs sm:text-sm">
                    <BadgeCheck className="h-3.5 w-3.5" /><span>{tr.tabBadges}</span>
                    <Badge className="ml-1 bg-muted text-[9px] px-1 rounded">{activeBadges.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* ── Visitor list tabs ── */}
                {(["all", "onsite"] as VisitorsTab[]).map((t) => (
                  <TabsContent key={t} value={t} className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder={tr.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                      </div>
                      {t === "all" && (
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-40"><SelectValue placeholder={tr.statusPlaceholder} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{tr.allStatuses}</SelectItem>
                            <SelectItem value="expected">{tr.statusExpected}</SelectItem>
                            <SelectItem value="on_site">{tr.statusOnSite}</SelectItem>
                            <SelectItem value="checked_out">{tr.statusCheckedOut}</SelectItem>
                            <SelectItem value="expired">{tr.statusExpired}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {visitors.length === 0 ? (
                      emptyState
                    ) : displayed.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                        <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">{tr.noResults}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t === "onsite" ? tr.noOnSite : tr.noMatchFilters}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {displayed.map((visitor) => (
                          <VisitorRow
                            key={visitor.id}
                            visitor={visitor}
                            status={statusOf(visitor)}
                            onEdit={setEditVisitor}
                            onEndVisit={(v) => void handleEndVisit(v)}
                            onDelete={(v) => void handleDelete(v)}
                            busy={busyId === visitor.id}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}

                {/* ── Badges tab ── */}
                <TabsContent value="badges" className="space-y-4">
                  {activeBadges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
                      <BadgeCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">{tr.noBadgesTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{tr.noBadgesDescription}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activeBadges.map((visitor) => (
                        <div key={visitor.id} className="rounded-xl border border-border/60 bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white", avatarColor(visitor.id))}>
                                {initialsOf(visitor)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{visitor.name}</p>
                                <Badge className={cn("mt-1 text-[10px]", STATUS_META.on_site.bg, STATUS_META.on_site.color)}>
                                  <UserCheck className="mr-1 h-2.5 w-2.5" />{tr.statusOnSite}
                                </Badge>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busyId === visitor.id} onClick={() => void handleEndVisit(visitor)}>
                              <LogOut className="mr-1 h-3 w-3" /> {tr.end}
                            </Button>
                          </div>
                          <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                            <CreditCard className="h-3 w-3" />{visitor.cardNo}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {tr.validity(formatValidity(visitor.validFrom, formatDateTime), formatValidity(visitor.validTo, formatDateTime))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>

      {showCreate && (
        <VisitorFormDialog
          title={tr.createTitle}
          description={tr.createDescription}
          submitLabel={tr.createSubmit}
          initial={EMPTY_FORM}
          accessGroups={accessGroups}
          saving={saving}
          onClose={() => setShowCreate(false)}
          onSubmit={(form) => void handleCreate(form)}
        />
      )}
      {editVisitor && (
        <VisitorFormDialog
          key={editVisitor.id}
          title={tr.editTitle}
          description={tr.editDescription(editVisitor.name)}
          submitLabel={tr.editSubmit}
          initial={formFromVisitor(editVisitor)}
          accessGroups={accessGroups}
          saving={saving}
          onClose={() => setEditVisitor(null)}
          onSubmit={(form) => void handleEdit(form)}
        />
      )}
    </div>
  )
}
