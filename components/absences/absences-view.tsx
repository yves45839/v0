"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { getActiveTenantCode, getAuthSession } from "@/lib/api/auth"
import {
  createLeaveRequest,
  fetchEmployeesDetailed,
  fetchLeaveRequests,
  type EmployeeApiItem,
  type LeaveRequestApiItem,
  type LeaveRequestStatus,
  type LeaveRequestType,
  updateLeaveRequest,
} from "@/lib/api/employees"
import {
  AbsenceRequestCard,
  type AbsenceRequest,
} from "@/components/absences/absence-request-card"
import { TeamAvailability } from "@/components/absences/team-availability"

type Tab = "pending" | "approved" | "refused" | "all"
type LeaveTypeCardKind = AbsenceRequest["kind"]

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NA"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function colorFromId(id: number | string): string {
  const raw = String(id)
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return `oklch(0.62 0.14 ${hue})`
}

function formatShortDate(value: string, locale: "fr" | "en"): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date)
}

function relativeTime(value: string, locale: "fr" | "en"): string {
  const createdAt = Date.parse(value)
  if (Number.isNaN(createdAt)) return locale === "en" ? "recently" : "recentement"
  const minutes = Math.max(0, Math.round((Date.now() - createdAt) / 60000))
  const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en" : "fr", { numeric: "auto" })
  if (minutes < 60) return rtf.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, "hour")
  const days = Math.round(hours / 24)
  return rtf.format(-days, "day")
}

function mapLeaveType(type: LeaveRequestType): LeaveTypeCardKind {
  if (type === "sick") return "sick"
  if (type === "unpaid") return "personal"
  if (type === "special") return "rtt"
  return "paid"
}

function mapLeaveToCard(row: LeaveRequestApiItem, employeeById: Map<number, EmployeeApiItem>): AbsenceRequest {
  const employee = employeeById.get(row.employee)
  const name = employee?.name?.trim() || `#${row.employee}`
  const startMs = Date.parse(`${row.start_date}T00:00:00`)
  const endMs = Date.parse(`${row.end_date}T00:00:00`)
  const dayDiffMs = endMs - startMs
  const days = Number.isFinite(dayDiffMs) ? Math.max(1, Math.floor(dayDiffMs / 86_400_000) + 1) : 1
  return {
    id: row.id,
    name,
    initials: initialsFromName(name),
    avatarColor: colorFromId(row.id),
    kind: mapLeaveType(row.leave_type),
    fromDate: formatShortDate(row.start_date, "fr"),
    toDate: formatShortDate(row.end_date, "fr"),
    days,
    requestedFr: relativeTime(row.created_at, "fr"),
    requestedEn: relativeTime(row.created_at, "en"),
    reasonFr: row.reason || "",
    reasonEn: row.reason || "",
    conflict: false,
    balanceUsed: 0,
    balanceTotal: 25,
  }
}

export function AbsencesView() {
  const { locale } = useI18n()
  const [rows, setRows] = useState<LeaveRequestApiItem[]>([])
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<AbsenceRequest["id"] | null>(null)
  const [tab, setTab] = useState<Tab>("pending")

  const employeeById = useMemo(() => {
    const map = new Map<number, EmployeeApiItem>()
    for (const employee of employees) {
      map.set(employee.id, employee)
    }
    return map
  }, [employees])

  const filteredRows = useMemo(() => {
    if (tab === "all") return rows
    if (tab === "refused") return rows.filter((row) => row.status === "rejected")
    return rows.filter((row) => row.status === tab)
  }, [rows, tab])

  const visibleRequests = useMemo(
    () => filteredRows.map((row) => mapLeaveToCard(row, employeeById)),
    [filteredRows, employeeById]
  )

  const counts = useMemo(() => {
    const pending = rows.filter((row) => row.status === "pending").length
    const approved = rows.filter((row) => row.status === "approved").length
    const refused = rows.filter((row) => row.status === "rejected").length
    return { pending, approved, refused, all: rows.length }
  }, [rows])

  useEffect(() => {
    let mounted = true
    const tenantCode = getActiveTenantCode().trim() || undefined

    async function loadData() {
      try {
        setLoading(true)
        const [leaveRows, employeeRows] = await Promise.all([
          fetchLeaveRequests(tenantCode),
          fetchEmployeesDetailed(tenantCode),
        ])
        if (!mounted) return
        setRows(leaveRows)
        setEmployees(employeeRows)
        setSelectedId(leaveRows[0]?.id ?? null)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        toast.error(locale === "en" ? "Unable to load leave requests" : "Impossible de charger les demandes", {
          description: message,
        })
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadData()
    return () => {
      mounted = false
    }
  }, [locale])

  const patchStatus = async (id: AbsenceRequest["id"], status: LeaveRequestStatus, rejectionReason = "") => {
    const session = getAuthSession()
    if (!session?.user?.id) {
      toast.error(locale === "en" ? "Authentication required" : "Authentification requise")
      return
    }

    try {
      setBusy(true)
      const payload =
        status === "approved"
          ? { status, approved_by: session.user.id, approved_at: new Date().toISOString() }
          : { status, rejection_reason: rejectionReason, approved_by: null, approved_at: null }
      const updated = await updateLeaveRequest(id, payload)
      setRows((prev) => prev.map((row) => (row.id === Number(id) ? updated : row)))
      toast.success(
        status === "approved"
          ? locale === "en"
            ? "Request approved"
            : "Demande validee"
          : locale === "en"
            ? "Request rejected"
            : "Demande rejetee"
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(locale === "en" ? "Action failed" : "Echec de l'action", { description: message })
    } finally {
      setBusy(false)
    }
  }

  const approve = (id: AbsenceRequest["id"]) => {
    void patchStatus(id, "approved")
  }

  const reject = (id: AbsenceRequest["id"]) => {
    const reason = window.prompt(
      locale === "en" ? "Optional rejection reason:" : "Raison du refus (optionnelle):",
      ""
    )
    if (reason === null) return
    void patchStatus(id, "rejected", reason)
  }

  const discuss = (id: AbsenceRequest["id"]) => {
    toast.message(
      locale === "en" ? "Discussion thread coming soon" : "Discussion a venir",
      { description: String(id) },
    )
  }

  const newRequest = async () => {
    const session = getAuthSession()
    const tenantCode = getActiveTenantCode().trim()
    const tenantId = session?.tenants?.find((tenant) => tenant.code === tenantCode)?.id
    if (!tenantId) {
      toast.error(locale === "en" ? "No active tenant selected" : "Aucun tenant actif selectionne")
      return
    }
    if (employees.length === 0) {
      toast.error(locale === "en" ? "No employees available" : "Aucun employe disponible")
      return
    }

    const employeeDefault = String(employees[0].id)
    const employeeInput = window.prompt(
      locale === "en"
        ? `Employee ID (${employees.map((employee) => `${employee.id}:${employee.name}`).join(", ")})`
        : `ID employe (${employees.map((employee) => `${employee.id}:${employee.name}`).join(", ")})`,
      employeeDefault
    )
    if (employeeInput === null) return
    const employeeId = Number(employeeInput)
    if (!Number.isFinite(employeeId)) {
      toast.error(locale === "en" ? "Invalid employee ID" : "ID employe invalide")
      return
    }

    const leaveTypeInput = window.prompt(
      locale === "en" ? "Leave type: paid | sick | unpaid | special" : "Type: paid | sick | unpaid | special",
      "paid"
    )
    if (leaveTypeInput === null) return
    const leaveType = leaveTypeInput.trim().toLowerCase() as LeaveRequestType
    if (!["paid", "sick", "unpaid", "special"].includes(leaveType)) {
      toast.error(locale === "en" ? "Invalid leave type" : "Type de conge invalide")
      return
    }

    const startDate = window.prompt(locale === "en" ? "Start date (YYYY-MM-DD)" : "Date debut (YYYY-MM-DD)")
    if (!startDate) return
    const endDate = window.prompt(locale === "en" ? "End date (YYYY-MM-DD)" : "Date fin (YYYY-MM-DD)")
    if (!endDate) return
    const reason = window.prompt(locale === "en" ? "Reason (optional)" : "Motif (optionnel)", "") ?? ""

    try {
      setBusy(true)
      const created = await createLeaveRequest({
        tenant: tenantId,
        employee: employeeId,
        leave_type: leaveType,
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        reason: reason.trim(),
      })
      setRows((prev) => [created, ...prev])
      setSelectedId(created.id)
      toast.success(locale === "en" ? "Request created" : "Demande creee")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(locale === "en" ? "Creation failed" : "Creation echouee", { description: message })
    } finally {
      setBusy(false)
    }
  }

  const tabs: { key: Tab; labelFr: string; labelEn: string; count: number }[] = [
    { key: "pending", labelFr: "En attente", labelEn: "Pending", count: counts.pending },
    { key: "approved", labelFr: "Validees", labelEn: "Approved", count: counts.approved },
    { key: "refused", labelFr: "Refusees", labelEn: "Refused", count: counts.refused },
    { key: "all", labelFr: "Toutes", labelEn: "All", count: counts.all },
  ]

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "en" ? "Time off requests" : "Demandes de conges"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "en"
              ? `${counts.pending} pending requests`
              : `${counts.pending} demandes en attente`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            {locale === "en" ? "Leave policy" : "Regles de conge"}
          </Button>
          <Button size="sm" className="h-9" onClick={newRequest} disabled={busy}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "New request" : "Nouvelle demande"}
          </Button>
        </div>
      </header>

      <div className="inline-flex w-fit items-center gap-1 overflow-hidden rounded-lg border border-border/70 bg-card p-0.5">
        {tabs.map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => setTab(tabDef.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === tabDef.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {locale === "en" ? tabDef.labelEn : tabDef.labelFr}
            <span className="ml-1 opacity-60">{tabDef.count}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {visibleRequests.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">
                {loading
                  ? locale === "en"
                    ? "Loading requests..."
                    : "Chargement des demandes..."
                  : locale === "en"
                    ? "Nothing to review here."
                    : "Rien a examiner ici."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {locale === "en"
                  ? "Switch to the Pending tab to see the active queue."
                  : "Passez a l'onglet En attente pour voir la file active."}
              </p>
            </div>
          ) : (
            visibleRequests.map((r) => (
              <AbsenceRequestCard
                key={r.id}
                request={r}
                selected={selectedId === r.id}
                onSelect={() => setSelectedId(r.id)}
                onApprove={() => approve(r.id)}
                onReject={() => reject(r.id)}
                onDiscuss={() => discuss(r.id)}
              />
            ))
          )}
        </div>
        <TeamAvailability />
      </div>
    </div>
  )
}
