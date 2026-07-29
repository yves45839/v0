"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { absencesDict } from "@/lib/i18n/pages/absences"
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

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}`
}

function relativeTime(value: string, locale: "fr" | "en"): string {
  const createdAt = Date.parse(value)
  if (Number.isNaN(createdAt)) return absencesDict[locale].recently
  const minutes = Math.max(0, Math.round((Date.now() - createdAt) / 60000))
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
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

function requestDays(row: Pick<LeaveRequestApiItem, "start_date" | "end_date">): number {
  const startMs = Date.parse(`${row.start_date}T00:00:00`)
  const endMs = Date.parse(`${row.end_date}T00:00:00`)
  const dayDiffMs = endMs - startMs
  return Number.isFinite(dayDiffMs) ? Math.max(1, Math.floor(dayDiffMs / 86_400_000) + 1) : 1
}

function mapLeaveToCard(
  row: LeaveRequestApiItem,
  employeeById: Map<number, EmployeeApiItem>,
  allRows: LeaveRequestApiItem[]
): AbsenceRequest {
  const employee = employeeById.get(row.employee)
  const name = employee?.name?.trim() || `#${row.employee}`
  const days = requestDays(row)

  // Conflit réel : chevauchement avec une autre demande active (en attente ou validée).
  const conflict = allRows.some(
    (other) =>
      other.id !== row.id &&
      (other.status === "pending" || other.status === "approved") &&
      other.start_date <= row.end_date &&
      other.end_date >= row.start_date
  )

  // Solde utilisé : jours de congés payés déjà validés cette année pour cet employé.
  const currentYear = new Date().getFullYear()
  const balanceUsed = allRows
    .filter(
      (other) =>
        other.id !== row.id &&
        other.employee === row.employee &&
        other.status === "approved" &&
        other.leave_type === "paid" &&
        new Date(`${other.start_date}T00:00:00`).getFullYear() === currentYear
    )
    .reduce((acc, other) => acc + requestDays(other), 0)

  return {
    id: row.id,
    name,
    initials: initialsFromName(name),
    avatarColor: colorFromId(row.id),
    kind: mapLeaveType(row.leave_type),
    fromDate: formatShortDate(row.start_date),
    toDate: formatShortDate(row.end_date),
    days,
    requestedFr: relativeTime(row.created_at, "fr"),
    requestedEn: relativeTime(row.created_at, "en"),
    reasonFr: row.reason || "",
    reasonEn: row.reason || "",
    conflict,
    balanceUsed,
    balanceTotal: 25,
  }
}

export function AbsencesView() {
  const { locale } = useI18n()
  const tr = absencesDict[locale]
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
    () => filteredRows.map((row) => mapLeaveToCard(row, employeeById, rows)),
    [filteredRows, employeeById, rows]
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
        toast.error(absencesDict[locale].loadFailed, {
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
      toast.error(tr.authRequired)
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
      toast.success(status === "approved" ? tr.requestApproved : tr.requestRejected)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(tr.actionFailed, { description: message })
    } finally {
      setBusy(false)
    }
  }

  const approve = (id: AbsenceRequest["id"]) => {
    void patchStatus(id, "approved")
  }

  const reject = (id: AbsenceRequest["id"]) => {
    const reason = window.prompt(tr.rejectReasonPrompt, "")
    if (reason === null) return
    void patchStatus(id, "rejected", reason)
  }

  const discuss = (id: AbsenceRequest["id"]) => {
    toast.message(tr.discussSoon, { description: String(id) })
  }

  const newRequest = async () => {
    const session = getAuthSession()
    const tenantCode = getActiveTenantCode().trim()
    const tenantId = session?.tenants?.find((tenant) => tenant.code === tenantCode)?.id
    if (!tenantId) {
      toast.error(tr.noTenant)
      return
    }
    if (employees.length === 0) {
      toast.error(tr.noEmployeesAvailable)
      return
    }

    const employeeDefault = String(employees[0].id)
    const employeeInput = window.prompt(
      tr.employeeIdPrompt(employees.map((employee) => `${employee.id}:${employee.name}`).join(", ")),
      employeeDefault
    )
    if (employeeInput === null) return
    const employeeId = Number(employeeInput)
    if (!Number.isFinite(employeeId)) {
      toast.error(tr.invalidEmployeeId)
      return
    }

    const leaveTypeInput = window.prompt(tr.leaveTypePrompt, "paid")
    if (leaveTypeInput === null) return
    const leaveType = leaveTypeInput.trim().toLowerCase() as LeaveRequestType
    if (!["paid", "sick", "unpaid", "special"].includes(leaveType)) {
      toast.error(tr.invalidLeaveType)
      return
    }

    const startDate = window.prompt(tr.startDatePrompt)
    if (!startDate) return
    const endDate = window.prompt(tr.endDatePrompt)
    if (!endDate) return
    const reason = window.prompt(tr.reasonPrompt, "") ?? ""

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
      toast.success(tr.requestCreated)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(tr.creationFailed, { description: message })
    } finally {
      setBusy(false)
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: tr.tabPending, count: counts.pending },
    { key: "approved", label: tr.tabApproved, count: counts.approved },
    { key: "refused", label: tr.tabRefused, count: counts.refused },
    { key: "all", label: tr.tabAll, count: counts.all },
  ]

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tr.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr.pendingCount(counts.pending)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            {tr.leavePolicy}
          </Button>
          <Button size="sm" className="h-9" onClick={newRequest} disabled={busy}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {tr.newRequest}
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
            {tabDef.label}
            <span className="ml-1 opacity-60">{tabDef.count}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {visibleRequests.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">
                {loading ? tr.loadingRequests : tr.emptyTitle}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{tr.emptyHint}</p>
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
        <TeamAvailability requests={rows} loading={loading} />
      </div>
    </div>
  )
}
