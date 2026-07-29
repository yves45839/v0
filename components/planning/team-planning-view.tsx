"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { buildWeekdayLabels, planningPageDict } from "@/lib/i18n/pages/planning-page"
import {
  createPlanningAssignment,
  deletePlanningAssignment,
  fetchLeaveRequests,
  fetchPlanningAssignments,
  updatePlanningAssignment,
  type DepartmentApiItem,
  type EmployeeApiItem,
  type LeaveRequestApiItem,
  type LeaveRequestStatus,
  type PlanningApiItem,
  type PlanningAssignmentApiItem,
  type PlanningEntryApiItem,
  type WorkShiftApiItem,
} from "@/lib/api/employees"

type TeamDict = (typeof planningPageDict)["en"]["team"]

type ViewMode = "week" | "month" | "list"

type LeaveStatusFilter = "all" | LeaveRequestStatus

type CellShiftKind = "morning" | "afternoon" | "night"

// Catégories Figma : Matin (06–14), Soir (14–22), Bureau (09–18), Service (08–16), Astreinte (24/7)
type ShiftCategory =
  | "matin"
  | "soir"
  | "bureau"
  | "service"
  | "astreinte"
  | "autre"

type CellInfo = {
  kind: "shift" | "rest" | "empty"
  shiftKind?: CellShiftKind
  category?: ShiftCategory
  shiftId?: number | null
  label: string
  timeRange?: string | null
  source: "assignment" | "planning_entry" | "effective_shift" | "rest_day" | "none"
  assignment?: PlanningAssignmentApiItem | null
}

type LeaveOverlay = {
  request: LeaveRequestApiItem
  label: string
}

type TeamPlanningViewProps = {
  tenantId: number | null
  tenantCode: string
  apiEnabled: boolean
  employees: EmployeeApiItem[]
  departments: DepartmentApiItem[]
  workShifts: WorkShiftApiItem[]
  plannings: PlanningApiItem[]
  departmentsById: Map<number, string>
  onRequestRefreshBase?: () => void
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfWeek(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const offset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - offset)
  return next
}

function startOfMonth(date: Date): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), 1)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfMonth(date: Date): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

function isoDayOfWeek(date: Date): number {
  return (date.getDay() + 6) % 7
}

function rangeForView(anchor: Date, mode: ViewMode): { start: Date; end: Date; days: Date[] } {
  if (mode === "week" || mode === "list") {
    const start = startOfWeek(anchor)
    const days: Date[] = []
    for (let i = 0; i < 7; i += 1) {
      days.push(addDays(start, i))
    }
    return { start, end: addDays(start, 6), days }
  }
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const gridStart = startOfWeek(monthStart)
  const lastDow = isoDayOfWeek(monthEnd)
  const trailing = 6 - lastDow
  const gridEnd = addDays(monthEnd, trailing)
  const days: Date[] = []
  let cursor = new Date(gridStart)
  while (cursor.getTime() <= gridEnd.getTime()) {
    days.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }
  return { start: gridStart, end: gridEnd, days }
}

function formatTime(time: string | null | undefined): string | null {
  if (!time) return null
  return time.slice(0, 5)
}

function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = formatTime(start)
  const e = formatTime(end)
  if (!s || !e) return null
  return `${s} – ${e}`
}

function classifyShiftKind(start: string | null | undefined): CellShiftKind {
  const hours = Number.parseInt(String(start ?? "").slice(0, 2), 10)
  if (!Number.isFinite(hours)) return "afternoon"
  if (hours >= 22 || hours < 6) return "night"
  if (hours < 12) return "morning"
  if (hours < 18) return "afternoon"
  return "night"
}

function shiftKindClasses(kind: CellShiftKind | undefined): string {
  switch (kind) {
    case "morning":
      return "border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-200"
    case "afternoon":
      return "border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-200"
    case "night":
      return "border-violet-500/35 bg-violet-500/12 text-violet-700 dark:text-violet-200"
    default:
      return "border-border/40 bg-muted/30 text-muted-foreground"
  }
}

// Détecte la catégorie Figma à partir du nom/code du shift, fallback sur l'horaire
function classifyShiftCategory(shift: {
  name?: string | null
  code?: string | null
  start_time?: string | null
  end_time?: string | null
} | null | undefined): ShiftCategory {
  if (!shift) return "autre"
  const text = `${shift.name ?? ""} ${shift.code ?? ""}`.toLowerCase()
  if (/(astreinte|on[\s-]?call|24\s*[\/x-]\s*7|garde)/.test(text)) return "astreinte"
  if (/(bureau|office|admin|direction)/.test(text)) return "bureau"
  if (/(service|cantine|restau|kitchen|production)/.test(text)) return "service"
  if (/(matin|morning|aube)/.test(text)) return "matin"
  if (/(soir|evening|after[\s-]?noon|afternoon|nuit|night)/.test(text)) return "soir"

  const startHour = Number.parseInt(String(shift.start_time ?? "").slice(0, 2), 10)
  if (!Number.isFinite(startHour)) return "autre"
  if (startHour >= 22 || startHour < 6) return "soir"
  if (startHour < 8) return "matin"
  if (startHour < 9) return "service"
  if (startHour < 12) return "bureau"
  if (startHour < 18) return "soir"
  return "soir"
}

// Couleurs Figma exactes pour les cartes shift (light + dark fallback)
function shiftCategoryClasses(category: ShiftCategory | undefined): string {
  switch (category) {
    case "matin":
      return "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-200"
    case "soir":
      return "bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-500/15 dark:border-orange-500/30 dark:text-orange-200"
    case "bureau":
      return "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-200"
    case "service":
      return "bg-green-100 border-green-200 text-green-800 dark:bg-green-500/15 dark:border-green-500/30 dark:text-green-200"
    case "astreinte":
      return "bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-500/15 dark:border-gray-500/30 dark:text-gray-200"
    default:
      return "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-500/10 dark:border-slate-500/30 dark:text-slate-200"
  }
}

// Pastille couleur pour la légende
function shiftCategoryDotClasses(category: ShiftCategory): string {
  switch (category) {
    case "matin":
      return "bg-blue-400"
    case "soir":
      return "bg-orange-400"
    case "bureau":
      return "bg-sky-300"
    case "service":
      return "bg-green-400"
    case "astreinte":
      return "bg-gray-400"
    default:
      return "bg-slate-300"
  }
}

// Format Figma : "06–14h" plutôt que "06:00 – 14:00"
function formatTimeRangeShort(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const s = formatTime(start)
  const e = formatTime(end)
  if (!s || !e) return null
  // 06:00 → 06, 09:30 → 09:30 (on garde si non-rond)
  const trim = (t: string) => (t.endsWith(":00") ? t.slice(0, 2) : t)
  return `${trim(s)}–${trim(e)}h`
}

// Durée en minutes d'un shift (utilisé pour les stats footer)
function shiftDurationMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(":").map((v) => Number.parseInt(v, 10))
  const [eh, em] = end.split(":").map((v) => Number.parseInt(v, 10))
  if (![sh, sm, eh, em].every((n) => Number.isFinite(n))) return 0
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60 // shift de nuit
  return mins
}

function leaveTypeLabel(tr: TeamDict, type: LeaveRequestApiItem["leave_type"]): string {
  switch (type) {
    case "paid":
      return tr.leaveTypes.paid
    case "sick":
      return tr.leaveTypes.sick
    case "unpaid":
      return tr.leaveTypes.unpaid
    case "special":
      return tr.leaveTypes.special
    default:
      return tr.leaveTypes.default
  }
}

function leaveStatusLabel(tr: TeamDict, status: LeaveRequestStatus): string {
  return tr.leaveStatus[status]
}

function leaveStatusClasses(status: LeaveRequestStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200"
    case "pending":
      return "border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-200"
    case "rejected":
      return "border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-200"
    case "cancelled":
      return "border-border/40 bg-muted/30 text-muted-foreground"
  }
}

function dayInRange(dayIso: string, fromIso: string, toIso: string | null): boolean {
  if (toIso == null) return dayIso >= fromIso
  return dayIso >= fromIso && dayIso <= toIso
}

function getPlanningForEmployee(
  employee: EmployeeApiItem,
  departmentsById: Map<number, DepartmentApiItem>,
  planningsById: Map<number, PlanningApiItem>
): PlanningApiItem | null {
  if (employee.effective_planning?.id) {
    return planningsById.get(employee.effective_planning.id) ?? null
  }
  if (employee.department) {
    const department = departmentsById.get(employee.department)
    if (department?.effective_planning?.id) {
      return planningsById.get(department.effective_planning.id) ?? null
    }
    if (department?.planning) {
      return planningsById.get(department.planning) ?? null
    }
  }
  return null
}

function resolvePlanningEntry(
  planning: PlanningApiItem | null,
  date: Date
): { entry: PlanningEntryApiItem | null; rest: boolean } {
  if (!planning) return { entry: null, rest: false }
  const dow = isoDayOfWeek(date)
  const iso = toIsoDate(date)

  const dateScoped = (planning.entries ?? []).find((entry) => {
    const start = entry.start_date ?? null
    const end = entry.end_date ?? null
    if (!start && !end) return false
    return dayInRange(iso, start ?? iso, end ?? null)
  })
  if (dateScoped) {
    return { entry: dateScoped, rest: Boolean(dateScoped.is_rest_day) }
  }

  const dowScoped = (planning.entries ?? []).find(
    (entry) =>
      entry.start_date == null &&
      entry.end_date == null &&
      entry.day_of_week != null &&
      entry.day_of_week === dow
  )
  if (dowScoped) {
    return { entry: dowScoped, rest: Boolean(dowScoped.is_rest_day) }
  }

  const dailyRest = (planning.daily_slots ?? []).some(
    (slot) => slot.day_of_week === dow && slot.slot_type === "rest"
  )
  if (dailyRest) {
    return { entry: null, rest: true }
  }
  return { entry: null, rest: false }
}

function resolveCell(
  employee: EmployeeApiItem,
  date: Date,
  options: {
    workShiftsById: Map<number, WorkShiftApiItem>
    planningsById: Map<number, PlanningApiItem>
    departmentsById: Map<number, DepartmentApiItem>
    employeeAssignmentsForDate: PlanningAssignmentApiItem[]
    labels: { shift: string; rest: string }
  }
): CellInfo {
  const iso = toIsoDate(date)

  const directAssignment = options.employeeAssignmentsForDate.find(
    (assignment) =>
      assignment.employee === employee.id && dayInRange(iso, assignment.valid_from, assignment.valid_to ?? null)
  )

  if (directAssignment?.work_shift) {
    const shift = options.workShiftsById.get(directAssignment.work_shift) ?? null
    return {
      kind: "shift",
      shiftKind: classifyShiftKind(shift?.start_time),
      category: classifyShiftCategory(shift),
      shiftId: shift?.id ?? null,
      label: shift?.name ?? options.labels.shift,
      timeRange: formatTimeRangeShort(shift?.start_time, shift?.end_time),
      source: "assignment",
      assignment: directAssignment,
    }
  }

  if (directAssignment?.planning) {
    const planning = options.planningsById.get(directAssignment.planning) ?? null
    const { entry, rest } = resolvePlanningEntry(planning, date)
    if (rest) {
      return {
        kind: "rest",
        label: options.labels.rest,
        source: "planning_entry",
        assignment: directAssignment,
      }
    }
    if (entry?.work_shift) {
      const shift = options.workShiftsById.get(entry.work_shift) ?? null
      return {
        kind: "shift",
        shiftKind: classifyShiftKind(shift?.start_time),
        category: classifyShiftCategory(shift ?? { name: entry.label ?? null }),
        shiftId: shift?.id ?? null,
        label: shift?.name ?? entry.label ?? options.labels.shift,
        timeRange: formatTimeRangeShort(shift?.start_time, shift?.end_time),
        source: "planning_entry",
        assignment: directAssignment,
      }
    }
  }

  const planning = getPlanningForEmployee(employee, options.departmentsById, options.planningsById)
  const { entry, rest } = resolvePlanningEntry(planning, date)
  if (rest) {
    return {
      kind: "rest",
      label: options.labels.rest,
      source: "rest_day",
    }
  }
  if (entry?.work_shift) {
    const shift = options.workShiftsById.get(entry.work_shift) ?? null
    return {
      kind: "shift",
      shiftKind: classifyShiftKind(shift?.start_time),
      category: classifyShiftCategory(shift ?? { name: entry.label ?? null }),
      shiftId: shift?.id ?? null,
      label: shift?.name ?? entry.label ?? options.labels.shift,
      timeRange: formatTimeRangeShort(shift?.start_time, shift?.end_time),
      source: "planning_entry",
    }
  }

  const ongoingShiftId =
    employee.effective_work_shift?.id ?? employee.work_shifts?.[0] ?? employee.work_shift ?? null
  if (ongoingShiftId != null) {
    const shift = options.workShiftsById.get(ongoingShiftId) ?? null
    if (shift) {
      return {
        kind: "shift",
        shiftKind: classifyShiftKind(shift.start_time),
        category: classifyShiftCategory(shift),
        shiftId: shift.id,
        label: shift.name,
        timeRange: formatTimeRangeShort(shift.start_time, shift.end_time),
        source: "effective_shift",
      }
    }
  }

  return { kind: "empty", label: "", source: "none" }
}

type DrawerState = {
  employee: EmployeeApiItem
  date: Date
  cell: CellInfo
  leave: LeaveOverlay | null
}

export function TeamPlanningView({
  tenantId,
  tenantCode,
  apiEnabled,
  employees,
  departments,
  workShifts,
  plannings,
  departmentsById,
  onRequestRefreshBase,
}: TeamPlanningViewProps) {
  const { locale, formatDate } = useI18n()
  const tr = planningPageDict[locale].team
  const weekdayLong = useMemo(() => buildWeekdayLabels(formatDate, "long"), [formatDate])
  const weekdayShort = useMemo(
    () => buildWeekdayLabels(formatDate, "short").map((label) => label.replace(/\.$/, "")),
    [formatDate]
  )
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date())
  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<LeaveStatusFilter>("approved")
  const [assignments, setAssignments] = useState<PlanningAssignmentApiItem[]>([])
  const [leaves, setLeaves] = useState<LeaveRequestApiItem[]>([])
  const [loading, setLoading] = useState(false)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [drawerWorkShiftId, setDrawerWorkShiftId] = useState<string>("")
  const [drawerStartDate, setDrawerStartDate] = useState<string>("")
  const [drawerEndDate, setDrawerEndDate] = useState<string>("")
  const [drawerSaving, setDrawerSaving] = useState(false)
  const [drawerDeleting, setDrawerDeleting] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)

  const range = useMemo(() => rangeForView(anchorDate, viewMode), [anchorDate, viewMode])

  const workShiftsById = useMemo(() => new Map(workShifts.map((shift) => [shift.id, shift])), [workShifts])
  const planningsById = useMemo(() => new Map(plannings.map((planning) => [planning.id, planning])), [plannings])
  const departmentObjectsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  )

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return employees.filter((employee) => {
      if (departmentFilter !== "all") {
        const filterId = Number.parseInt(departmentFilter, 10)
        if (Number.isFinite(filterId) && employee.department !== filterId) {
          return false
        }
      }
      if (!normalizedSearch) return true
      return [employee.name, employee.employee_no, employee.email]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    })
  }, [employees, search, departmentFilter])

  const visibleLeaves = useMemo(() => {
    if (statusFilter === "all") return leaves
    return leaves.filter((leave) => leave.status === statusFilter)
  }, [leaves, statusFilter])

  const leavesByEmployee = useMemo(() => {
    const map = new Map<number, LeaveRequestApiItem[]>()
    for (const leave of visibleLeaves) {
      const list = map.get(leave.employee) ?? []
      list.push(leave)
      map.set(leave.employee, list)
    }
    return map
  }, [visibleLeaves])

  const refreshSchedule = useCallback(async () => {
    if (!apiEnabled || !tenantCode) {
      setAssignments([])
      setLeaves([])
      return
    }
    setLoading(true)
    setBannerError(null)
    try {
      const startIso = toIsoDate(range.start)
      const endIso = toIsoDate(range.end)
      const [assignmentList, leaveList] = await Promise.all([
        fetchPlanningAssignments(tenantCode),
        fetchLeaveRequests(tenantCode, { startFrom: startIso, endTo: endIso }),
      ])
      setAssignments(assignmentList)
      setLeaves(leaveList)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setBannerError(message)
    } finally {
      setLoading(false)
    }
  }, [apiEnabled, tenantCode, range.start, range.end])

  useEffect(() => {
    void refreshSchedule()
  }, [refreshSchedule])

  const monthAnchor = useMemo(() => startOfMonth(anchorDate), [anchorDate])

  // Figma format: "Mon 11 — Sun 17 Mar 2026"
  const weekLabel = useMemo(() => {
    const start = range.days[0]
    const end = range.days[range.days.length - 1]
    if (!start || !end) return ""
    const startDow = weekdayShort[isoDayOfWeek(start)]
    const endDow = weekdayShort[isoDayOfWeek(end)]
    const startDay = String(start.getDate()).padStart(2, "0")
    const endDay = String(end.getDate()).padStart(2, "0")
    const monthYear = formatDate(end, { month: "short", year: "numeric" })
    return `${startDow} ${startDay} — ${endDow} ${endDay} ${monthYear}`
  }, [range.days, weekdayShort, formatDate])

  // Subtitle: "Week 11 · 11-17 Mar 2026 · N departments"
  const planningSubtitle = useMemo(() => {
    const start = range.days[0]
    const end = range.days[range.days.length - 1]
    if (!start || !end) return ""
    // ISO week number
    const tmp = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    const month = formatDate(end, { month: "short" })
    const rangeText = `${start.getDate()}-${end.getDate()} ${month} ${end.getFullYear()}`
    return tr.subtitle(weekNo, rangeText, departments.length)
  }, [range.days, departments.length, formatDate, tr])

  const goToToday = () => setAnchorDate(new Date())

  const goPrevious = () => {
    if (viewMode === "week" || viewMode === "list") {
      setAnchorDate((current) => addDays(startOfWeek(current), -7))
    } else {
      setAnchorDate((current) => {
        const next = startOfMonth(current)
        next.setMonth(next.getMonth() - 1)
        return next
      })
    }
  }

  const goNext = () => {
    if (viewMode === "week" || viewMode === "list") {
      setAnchorDate((current) => addDays(startOfWeek(current), 7))
    } else {
      setAnchorDate((current) => {
        const next = startOfMonth(current)
        next.setMonth(next.getMonth() + 1)
        return next
      })
    }
  }

  const openDrawer = (employee: EmployeeApiItem, date: Date, cell: CellInfo) => {
    const iso = toIsoDate(date)
    const matchingLeave =
      (leavesByEmployee.get(employee.id) ?? []).find((leave) => dayInRange(iso, leave.start_date, leave.end_date)) ?? null
    setDrawer({
      employee,
      date,
      cell,
      leave: matchingLeave
        ? {
            request: matchingLeave,
            label: leaveTypeLabel(tr, matchingLeave.leave_type),
          }
        : null,
    })
    setDrawerWorkShiftId(cell.shiftId ? String(cell.shiftId) : "")
    setDrawerStartDate(iso)
    setDrawerEndDate(iso)
    setBannerError(null)
  }

  const closeDrawer = () => {
    setDrawer(null)
    setDrawerWorkShiftId("")
    setDrawerStartDate("")
    setDrawerEndDate("")
  }

  const isReadonly = !apiEnabled || tenantId == null

  const handleSaveDrawer = async () => {
    if (!drawer) return
    if (isReadonly) {
      toast.error(tr.drawer.demoSaveError)
      return
    }
    if (!tenantId) {
      toast.error(tr.drawer.tenantMissing)
      return
    }
    const shiftId = Number.parseInt(drawerWorkShiftId, 10)
    if (!Number.isFinite(shiftId) || shiftId <= 0) {
      toast.error(tr.drawer.selectShiftError)
      return
    }
    if (!drawerStartDate) {
      toast.error(tr.drawer.startRequired)
      return
    }
    const fallbackEnd = drawerEndDate || drawerStartDate
    if (fallbackEnd < drawerStartDate) {
      toast.error(tr.drawer.endBeforeStart)
      return
    }

    setDrawerSaving(true)
    setBannerError(null)
    try {
      if (drawer.cell.assignment) {
        const updated = await updatePlanningAssignment(drawer.cell.assignment.id, {
          work_shift: shiftId,
          planning: null,
          valid_from: drawerStartDate,
          valid_to: fallbackEnd,
        })
        setAssignments((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
        toast.success(tr.drawer.updated)
      } else {
        const created = await createPlanningAssignment({
          tenant: tenantId,
          employee: drawer.employee.id,
          work_shift: shiftId,
          valid_from: drawerStartDate,
          valid_to: fallbackEnd,
        })
        setAssignments((prev) => [created, ...prev])
        toast.success(tr.drawer.created)
      }
      closeDrawer()
      onRequestRefreshBase?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setBannerError(message)
      toast.error(tr.drawer.saveFailed, { description: message })
    } finally {
      setDrawerSaving(false)
    }
  }

  const handleDeleteDrawer = async () => {
    if (!drawer?.cell.assignment) return
    if (isReadonly) {
      toast.error(tr.drawer.demoDeleteError)
      return
    }
    setDrawerDeleting(true)
    setBannerError(null)
    try {
      await deletePlanningAssignment(drawer.cell.assignment.id)
      setAssignments((prev) => prev.filter((row) => row.id !== drawer.cell.assignment?.id))
      toast.success(tr.drawer.deleted)
      closeDrawer()
      onRequestRefreshBase?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setBannerError(message)
      toast.error(tr.drawer.deleteFailed, { description: message })
    } finally {
      setDrawerDeleting(false)
    }
  }

  const cellByEmployeeAndDay = useMemo(() => {
    const matrix = new Map<number, Map<string, CellInfo>>()
    const employeeAssignments = new Map<number, PlanningAssignmentApiItem[]>()
    for (const assignment of assignments) {
      if (assignment.employee == null) continue
      const list = employeeAssignments.get(assignment.employee) ?? []
      list.push(assignment)
      employeeAssignments.set(assignment.employee, list)
    }

    for (const employee of filteredEmployees) {
      const dayMap = new Map<string, CellInfo>()
      const employeeAssignmentList = employeeAssignments.get(employee.id) ?? []
      for (const day of range.days) {
        const cell = resolveCell(employee, day, {
          workShiftsById,
          planningsById,
          departmentsById: departmentObjectsById,
          employeeAssignmentsForDate: employeeAssignmentList,
          labels: { shift: tr.shiftFallback, rest: tr.rest },
        })
        dayMap.set(toIsoDate(day), cell)
      }
      matrix.set(employee.id, dayMap)
    }
    return matrix
  }, [assignments, filteredEmployees, range.days, workShiftsById, planningsById, departmentObjectsById, tr])

  const todayIso = toIsoDate(new Date())

  const drawerLeaveDescription = drawer?.leave
    ? `${drawer.leave.label} · ${leaveStatusLabel(tr, drawer.leave.request.status)} (${formatDate(`${drawer.leave.request.start_date}T00:00:00`)} → ${formatDate(`${drawer.leave.request.end_date}T00:00:00`)})`
    : null

  const monthDayCount = range.days.length

  const monthHeader = weekdayLong

  return (
    <div className="space-y-4">
      {/* En-tête style Figma : titre + sous-titre */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            {tr.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
            {planningSubtitle}
          </p>
        </div>
      </div>

      {/* Toolbar Figma : nav date à gauche, view-mode + dept à droite */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          {/* Groupe de navigation date (chevron / Aujourd'hui / chevron) */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border/60 dark:bg-card/60">
            <button
              type="button"
              onClick={goPrevious}
              aria-label={tr.prevPeriod}
              className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-50 dark:text-muted-foreground dark:hover:bg-muted/40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="h-5 w-px bg-slate-200 dark:bg-border/60" />
            <button
              type="button"
              onClick={goToToday}
              className="flex h-9 items-center gap-1.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-foreground dark:hover:bg-muted/40"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {tr.today}
            </button>
            <span className="h-5 w-px bg-slate-200 dark:bg-border/60" />
            <button
              type="button"
              onClick={goNext}
              aria-label={tr.nextPeriod}
              className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-50 dark:text-muted-foreground dark:hover:bg-muted/40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Plage hebdo lisible : "Lun 11 — Dim 17 mars 2026" */}
          <div className="flex items-center gap-2 px-3 text-sm font-medium text-slate-700 dark:text-foreground">
            <span>{weekLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Semaine / Mois / Liste */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-border/60 dark:bg-card/60">
            {(
              [
                { value: "week", label: tr.viewWeek },
                { value: "month", label: tr.viewMonth },
                { value: "list", label: tr.viewList },
              ] as const
            ).map((item) => {
              const active = viewMode === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setViewMode(item.value)}
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white shadow-sm dark:bg-foreground dark:text-background"
                      : "text-slate-600 hover:bg-slate-50 dark:text-muted-foreground dark:hover:bg-muted/40",
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Filtre département (cosmétiquement style Figma) */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-9 min-w-[170px] rounded-lg border-slate-200 bg-white text-sm shadow-sm dark:border-border/60 dark:bg-card/60">
              <span className="text-slate-500 dark:text-muted-foreground">{tr.departmentLabel}</span>
              <SelectValue placeholder={tr.all} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr.all}</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={String(department.id)}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bouton refresh discret (sync API) */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 rounded-lg px-2 text-slate-500 hover:bg-slate-100 dark:text-muted-foreground dark:hover:bg-muted/40"
            onClick={() => void refreshSchedule()}
            disabled={loading}
            aria-label={tr.sync}
            title={tr.syncTitle}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Recherche + filtre congés (ligne secondaire, cachée par défaut, déployée à la demande) */}
      <details className="group rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-border/60 dark:bg-card/60">
        <summary className="cursor-pointer list-none text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            {tr.advancedFilters}
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex min-w-[220px] flex-1 items-center md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tr.searchEmployee}
              className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm dark:border-border/60 dark:bg-background/60"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40"
                aria-label={tr.clearSearch}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeaveStatusFilter)}>
            <SelectTrigger className="h-9 w-[180px] rounded-lg border-slate-200 bg-white text-sm dark:border-border/60 dark:bg-background/60">
              <SelectValue placeholder={tr.leavesPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">{tr.leavesApproved}</SelectItem>
              <SelectItem value="pending">{tr.leavesPending}</SelectItem>
              <SelectItem value="rejected">{tr.leavesRejected}</SelectItem>
              <SelectItem value="all">{tr.leavesAll}</SelectItem>
            </SelectContent>
          </Select>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 dark:border-border/40 dark:bg-background/40 dark:text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="tabular-nums">{filteredEmployees.length}</span>{" "}
            {tr.employeesWord(filteredEmployees.length)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {tr.leavesCount(visibleLeaves.length)}
          </span>
        </div>
      </details>

      {bannerError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span className="leading-relaxed">{bannerError}</span>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            className="rounded-md p-1 hover:bg-destructive/15"
            aria-label={tr.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/40 bg-card/40 px-4 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border/40">
            <Users className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold">{tr.emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tr.emptyHint}</p>
        </div>
      ) : viewMode === "week" ? (
        <WeekGrid
          tr={tr}
          days={range.days}
          employees={filteredEmployees}
          cellMatrix={cellByEmployeeAndDay}
          leavesByEmployee={leavesByEmployee}
          departmentsById={departmentsById}
          weekdayLabels={weekdayShort}
          todayIso={todayIso}
          onCellClick={openDrawer}
        />
      ) : viewMode === "list" ? (
        <ListView
          tr={tr}
          days={range.days}
          employees={filteredEmployees}
          cellMatrix={cellByEmployeeAndDay}
          leavesByEmployee={leavesByEmployee}
          departmentsById={departmentsById}
          formatDayLabel={(date) =>
            `${weekdayShort[isoDayOfWeek(date)]} ${date.getDate()} ${formatDate(date, { month: "short" })}`
          }
          todayIso={todayIso}
          onCellClick={openDrawer}
        />
      ) : (
        <MonthGrid
          tr={tr}
          days={range.days}
          anchorMonth={monthAnchor.getMonth()}
          employees={filteredEmployees}
          cellMatrix={cellByEmployeeAndDay}
          leavesByEmployee={leavesByEmployee}
          departmentsById={departmentsById}
          weekdayLabels={monthHeader}
          totalCells={monthDayCount}
          todayIso={todayIso}
          onCellClick={openDrawer}
        />
      )}

      {/* Pied de page Figma : légende couleurs + stats (Heures planifiées · Sous-effectif sam. · Couverture) */}
      {filteredEmployees.length > 0 && viewMode !== "list" ? (
        <PlanningFooter
          tr={tr}
          employees={filteredEmployees}
          cellMatrix={cellByEmployeeAndDay}
          workShiftsById={workShiftsById}
          days={range.days}
          departmentsById={departmentObjectsById}
        />
      ) : null}

      <Sheet open={drawer !== null} onOpenChange={(open) => (open ? null : closeDrawer())}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-border/60 bg-card sm:max-w-md">
          <SheetHeader className="border-b border-border/40 px-6 py-5">
            <SheetTitle className="text-base font-bold">
              {drawer ? `${drawer.employee.name}` : tr.drawer.fallbackTitle}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {drawer
                ? formatDate(drawer.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {drawer ? (
              <div className="space-y-5">
                {drawer.leave ? (
                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs",
                      leaveStatusClasses(drawer.leave.request.status)
                    )}
                  >
                    <p className="font-semibold">{drawer.leave.label}</p>
                    <p className="mt-0.5 text-[11px] opacity-80">{drawerLeaveDescription}</p>
                  </div>
                ) : null}

                <div className="rounded-xl border border-border/40 bg-background/40 p-3 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {tr.drawer.currentShift}
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {drawer.cell.kind === "shift"
                      ? drawer.cell.label
                      : drawer.cell.kind === "rest"
                        ? tr.rest
                        : tr.drawer.noAssignment}
                  </p>
                  {drawer.cell.timeRange ? (
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {drawer.cell.timeRange}
                    </p>
                  ) : null}
                  {drawer.cell.source !== "none" ? (
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {tr.drawer.sourceLabel} {sourceLabel(tr, drawer.cell.source)}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">{tr.drawer.workShift}</label>
                  <Select value={drawerWorkShiftId} onValueChange={setDrawerWorkShiftId}>
                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60 text-sm">
                      <SelectValue placeholder={tr.drawer.selectShift} />
                    </SelectTrigger>
                    <SelectContent>
                      {workShifts.map((shift) => (
                        <SelectItem key={shift.id} value={String(shift.id)}>
                          {shift.name}
                          {shift.start_time && shift.end_time
                            ? ` · ${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">{tr.drawer.from}</label>
                    <Input
                      type="date"
                      value={drawerStartDate}
                      onChange={(event) => setDrawerStartDate(event.target.value)}
                      className="h-10 rounded-xl border-border/60 bg-background/60 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">{tr.drawer.to}</label>
                    <Input
                      type="date"
                      value={drawerEndDate}
                      onChange={(event) => setDrawerEndDate(event.target.value)}
                      className="h-10 rounded-xl border-border/60 bg-background/60 text-sm"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">{tr.drawer.multiDayHint}</p>

                {isReadonly ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                    {tr.drawer.demoBanner}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <SheetFooter className="border-t border-border/40 px-6 py-4">
            <div className="flex w-full items-center justify-between gap-2">
              {drawer?.cell.assignment ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-xl text-destructive hover:bg-destructive/10"
                  onClick={() => void handleDeleteDrawer()}
                  disabled={drawerDeleting || drawerSaving || isReadonly}
                >
                  {drawerDeleting ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  {tr.drawer.delete}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="h-9 rounded-xl border-border/60 text-sm">
                    {tr.drawer.cancel}
                  </Button>
                </SheetClose>
                <Button
                  type="button"
                  className="h-9 rounded-xl text-sm"
                  onClick={() => void handleSaveDrawer()}
                  disabled={drawerSaving || drawerDeleting}
                >
                  {drawerSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
                  {drawer?.cell.assignment ? tr.drawer.update : tr.drawer.save}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function sourceLabel(tr: TeamDict, source: CellInfo["source"]): string {
  switch (source) {
    case "assignment":
      return tr.sources.assignment
    case "planning_entry":
      return tr.sources.planning_entry
    case "effective_shift":
      return tr.sources.effective_shift
    case "rest_day":
      return tr.sources.rest_day
    case "none":
    default:
      return tr.sources.none
  }
}

type WeekGridProps = {
  tr: TeamDict
  days: Date[]
  employees: EmployeeApiItem[]
  cellMatrix: Map<number, Map<string, CellInfo>>
  leavesByEmployee: Map<number, LeaveRequestApiItem[]>
  departmentsById: Map<number, string>
  weekdayLabels: readonly string[]
  todayIso: string
  onCellClick: (employee: EmployeeApiItem, date: Date, cell: CellInfo) => void
}

// Initiales d'un nom : "Aïcha Diallo" → "AD"
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function WeekGrid({ tr, days, employees, cellMatrix, leavesByEmployee, departmentsById, weekdayLabels, todayIso, onCellClick }: WeekGridProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border/60 dark:bg-card/80">
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          {/* En-tête colonnes : EMPLOYÉ + 7 jours (LUN 11, MAR 12, ...) */}
          <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/60 dark:border-border/40 dark:bg-muted/30">
            <div className="px-4 py-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
              {tr.gridEmployee}
            </div>
            {days.map((day, ci) => {
              const iso = toIsoDate(day)
              const isToday = iso === todayIso
              return (
                <div
                  key={`week-head-${iso}`}
                  className={cn(
                    "border-l border-slate-200 px-2 py-2 text-center dark:border-border/40",
                    isToday && "bg-blue-50/60 dark:bg-blue-500/10",
                    ci === 5 || ci === 6 ? "bg-slate-50/40 dark:bg-muted/40" : "",
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    {weekdayLabels[isoDayOfWeek(day)]}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 text-base font-bold tabular-nums",
                      isToday ? "text-blue-600 dark:text-blue-300" : "text-slate-700 dark:text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lignes employés */}
          {employees.map((employee, ri) => {
            const dayMap = cellMatrix.get(employee.id)
            const leaves = leavesByEmployee.get(employee.id) ?? []
            const departmentName = departmentsById.get(employee.department ?? -1) ?? employee.position ?? "—"
            const initials = getInitials(employee.name || employee.employee_no || "??")
            const isLast = ri === employees.length - 1
            return (
              <div
                key={`week-row-${employee.id}`}
                className={cn(
                  "grid grid-cols-[200px_repeat(7,minmax(0,1fr))]",
                  !isLast && "border-b border-slate-200 dark:border-border/40",
                )}
              >
                {/* Cellule employé : avatar + nom + département */}
                <div className="flex items-center gap-3 border-r border-slate-200 bg-white px-4 py-3 dark:border-border/40 dark:bg-card/60">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-muted/60 dark:text-foreground"
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-foreground">
                      {employee.name || employee.employee_no}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-muted-foreground">
                      {departmentName}
                    </p>
                  </div>
                </div>

                {/* 7 cellules journées */}
                {days.map((day, ci) => {
                  const iso = toIsoDate(day)
                  const cell = dayMap?.get(iso) ?? { kind: "empty", label: "", source: "none" as const }
                  const leave = leaves.find((row) => dayInRange(iso, row.start_date, row.end_date)) ?? null
                  const isWeekend = ci === 5 || ci === 6
                  return (
                    <PlanningCell
                      key={`week-cell-${employee.id}-${iso}`}
                      tr={tr}
                      cell={cell}
                      leave={leave}
                      isToday={iso === todayIso}
                      isWeekend={isWeekend}
                      onClick={() => onCellClick(employee, day, cell)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type MonthGridProps = {
  tr: TeamDict
  days: Date[]
  anchorMonth: number
  employees: EmployeeApiItem[]
  cellMatrix: Map<number, Map<string, CellInfo>>
  leavesByEmployee: Map<number, LeaveRequestApiItem[]>
  departmentsById: Map<number, string>
  weekdayLabels: readonly string[]
  totalCells: number
  todayIso: string
  onCellClick: (employee: EmployeeApiItem, date: Date, cell: CellInfo) => void
}

function MonthGrid({
  tr,
  days,
  anchorMonth,
  employees,
  cellMatrix,
  leavesByEmployee,
  departmentsById,
  weekdayLabels,
  todayIso,
  onCellClick,
}: MonthGridProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          <div
            className={cn(
              "grid border-b border-border/40 bg-muted/30 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            )}
            style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(72px, 1fr))` }}
          >
            <div className="px-4 py-3">{tr.gridEmployee}</div>
            {days.map((day) => {
              const iso = toIsoDate(day)
              const isToday = iso === todayIso
              const inMonth = day.getMonth() === anchorMonth
              return (
                <div
                  key={`month-head-${iso}`}
                  className={cn(
                    "border-l border-border/40 px-1 py-2 text-center",
                    !inMonth && "bg-muted/40 text-muted-foreground/60",
                    isToday && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="text-[10px]">{weekdayLabels[isoDayOfWeek(day)].slice(0, 3)}</div>
                  <div className="mt-0.5 text-[11px] font-mono tabular-nums">
                    {day.getDate().toString().padStart(2, "0")}
                  </div>
                </div>
              )
            })}
          </div>
          {employees.map((employee) => {
            const dayMap = cellMatrix.get(employee.id)
            const leaves = leavesByEmployee.get(employee.id) ?? []
            return (
              <div
                key={`month-row-${employee.id}`}
                className="grid border-b border-border/30 last:border-b-0 hover:bg-muted/15"
                style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(72px, 1fr))` }}
              >
                <div className="flex flex-col justify-center gap-0.5 border-r border-border/40 px-4 py-3">
                  <span className="text-sm font-semibold text-foreground">{employee.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {departmentsById.get(employee.department ?? -1) ?? tr.noDepartment}
                  </span>
                </div>
                {days.map((day) => {
                  const iso = toIsoDate(day)
                  const cell = dayMap?.get(iso) ?? { kind: "empty", label: "", source: "none" as const }
                  const leave = leaves.find((row) => dayInRange(iso, row.start_date, row.end_date)) ?? null
                  const inMonth = day.getMonth() === anchorMonth
                  return (
                    <PlanningCell
                      key={`month-cell-${employee.id}-${iso}`}
                      tr={tr}
                      cell={cell}
                      leave={leave}
                      isToday={iso === todayIso}
                      muted={!inMonth}
                      compact
                      onClick={() => onCellClick(employee, day, cell)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type PlanningCellProps = {
  tr: TeamDict
  cell: CellInfo
  leave: LeaveRequestApiItem | null
  isToday: boolean
  muted?: boolean
  compact?: boolean
  isWeekend?: boolean
  onClick: () => void
}

// Cellule planning style Figma : carte arrondie pleine largeur avec bg/border/text
// dépendants de la catégorie (Matin / Soir / Bureau / Service / Astreinte / Congés).
function PlanningCell({ tr, cell, leave, isToday, muted, compact, isWeekend, onClick }: PlanningCellProps) {
  // Si congé approuvé/en attente → on rend une carte "Congés" jaune par-dessus
  const isLeaveCard = leave && (leave.status === "approved" || leave.status === "pending")

  let cardClass = ""
  let title = ""
  let subtitle: string | null = null
  let renderCard = false

  if (isLeaveCard) {
    cardClass = "bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200"
    title = tr.leaveCard
    subtitle = "—"
    renderCard = true
  } else if (cell.kind === "shift") {
    cardClass = shiftCategoryClasses(cell.category)
    // Figma label: show "Morning" / "Evening" / "Office" etc. instead of the long name
    const cat = cell.category
    title =
      cat === "matin"
        ? tr.categories.matin
        : cat === "soir"
          ? tr.categories.soir
          : cat === "bureau"
            ? tr.categories.bureau
            : cat === "service"
              ? tr.categories.service
              : cat === "astreinte"
                ? tr.categories.astreinte
                : cell.label || tr.shiftFallback
    subtitle = cat === "astreinte" ? tr.onCallRange : cell.timeRange ?? null
    renderCard = true
  } else if (cell.kind === "rest") {
    cardClass = "bg-slate-50 border-slate-200 text-slate-500 dark:bg-muted/30 dark:border-border/40 dark:text-muted-foreground"
    title = tr.rest
    subtitle = "—"
    renderCard = true
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-stretch justify-center border-l border-slate-200 p-2 text-left transition-colors hover:bg-slate-50/50 dark:border-border/40 dark:hover:bg-muted/20",
        compact ? "min-h-[60px]" : "min-h-[72px]",
        muted && "bg-slate-50/40 opacity-70 dark:bg-muted/30",
        isWeekend && !muted && "bg-slate-50/30 dark:bg-muted/20",
        isToday && "ring-1 ring-blue-300 ring-inset dark:ring-blue-500/30",
      )}
    >
      {renderCard ? (
        <div
          className={cn(
            "flex w-full flex-col items-center justify-center rounded-md border px-2 py-1.5 text-center",
            cardClass,
          )}
        >
          <span className="text-[12px] font-semibold leading-tight">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 text-[11px] font-medium leading-tight tabular-nums opacity-80">
              {subtitle}
            </span>
          ) : null}
        </div>
      ) : (
        <span className="block text-center text-base font-medium text-slate-300 dark:text-muted-foreground/40">
          —
        </span>
      )}
      {/* Pastille statut congé (en attente / refusé) si elle ne devient pas une carte pleine */}
      {leave && !isLeaveCard ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-md border px-1 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
            leaveStatusClasses(leave.status),
          )}
          title={`${leaveTypeLabel(tr, leave.leave_type)} · ${leaveStatusLabel(tr, leave.status)}`}
        >
          <span className="h-1 w-1 rounded-full bg-current" />
          {leaveStatusLabel(tr, leave.status)}
        </span>
      ) : null}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vue Liste : aplatit la grille en liste lisible (un item = un shift planifié)
// ─────────────────────────────────────────────────────────────────────────────

type ListViewProps = {
  tr: TeamDict
  days: Date[]
  employees: EmployeeApiItem[]
  cellMatrix: Map<number, Map<string, CellInfo>>
  leavesByEmployee: Map<number, LeaveRequestApiItem[]>
  departmentsById: Map<number, string>
  formatDayLabel: (date: Date) => string
  todayIso: string
  onCellClick: (employee: EmployeeApiItem, date: Date, cell: CellInfo) => void
}

function ListView({ tr, days, employees, cellMatrix, leavesByEmployee, departmentsById, formatDayLabel, todayIso, onCellClick }: ListViewProps) {
  type Row = {
    employee: EmployeeApiItem
    date: Date
    cell: CellInfo
    leave: LeaveRequestApiItem | null
  }

  const rows: Row[] = []
  for (const day of days) {
    const iso = toIsoDate(day)
    for (const employee of employees) {
      const cell = cellMatrix.get(employee.id)?.get(iso)
      if (!cell || cell.kind === "empty") continue
      const leave =
        (leavesByEmployee.get(employee.id) ?? []).find((row) => dayInRange(iso, row.start_date, row.end_date)) ?? null
      rows.push({ employee, date: day, cell, leave })
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center dark:border-border/40 dark:bg-card/40">
        <p className="text-sm font-semibold text-slate-700 dark:text-foreground">
          {tr.list.emptyTitle}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
          {tr.list.emptyHint}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border/60 dark:bg-card/80">
      <table className="w-full">
        <thead className="bg-slate-50/60 dark:bg-muted/30">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
            <th className="px-4 py-3">{tr.list.colDate}</th>
            <th className="px-4 py-3">{tr.list.colEmployee}</th>
            <th className="px-4 py-3">{tr.list.colDepartment}</th>
            <th className="px-4 py-3">{tr.list.colShift}</th>
            <th className="px-4 py-3">{tr.list.colRange}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const iso = toIsoDate(row.date)
            const isToday = iso === todayIso
            const cat = row.cell.category
            const dotClass =
              row.leave && (row.leave.status === "approved" || row.leave.status === "pending")
                ? "bg-amber-400"
                : cat
                  ? shiftCategoryDotClasses(cat)
                  : "bg-slate-300"
            const departmentName = departmentsById.get(row.employee.department ?? -1) ?? "—"
            const dateLabel = formatDayLabel(row.date)
            return (
              <tr
                key={`list-${row.employee.id}-${iso}-${idx}`}
                onClick={() => onCellClick(row.employee, row.date, row.cell)}
                className={cn(
                  "cursor-pointer border-t border-slate-100 text-sm hover:bg-slate-50/60 dark:border-border/40 dark:hover:bg-muted/20",
                  isToday && "bg-blue-50/30 dark:bg-blue-500/5",
                )}
              >
                <td className="px-4 py-3 font-medium text-slate-700 tabular-nums dark:text-foreground">
                  {dateLabel}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 dark:bg-muted/60 dark:text-foreground">
                      {getInitials(row.employee.name || row.employee.employee_no || "??")}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-foreground">
                      {row.employee.name || row.employee.employee_no}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-muted-foreground">{departmentName}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", dotClass)} />
                    <span className="font-medium text-slate-700 dark:text-foreground">
                      {row.cell.kind === "rest" ? tr.rest : row.cell.label || tr.shiftFallback}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 tabular-nums dark:text-muted-foreground">
                  {row.cell.timeRange ?? (cat === "astreinte" ? tr.onCallRange : "—")}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pied de page Figma : légende couleurs + 3 stats agrégées
// ─────────────────────────────────────────────────────────────────────────────

type PlanningFooterProps = {
  tr: TeamDict
  employees: EmployeeApiItem[]
  cellMatrix: Map<number, Map<string, CellInfo>>
  workShiftsById: Map<number, WorkShiftApiItem>
  days: Date[]
  departmentsById: Map<number, DepartmentApiItem>
}

function PlanningFooter({ tr, employees, cellMatrix, workShiftsById, days, departmentsById }: PlanningFooterProps) {
  // Heures planifiées totale (somme des durées de shift)
  let totalMinutes = 0
  let plannedCells = 0
  let totalCells = 0
  // Sous-effectif samedi : départements où aucun employé n'a de shift le sam.
  const saturdayIso = days.length >= 6 ? toIsoDate(days[5]) : null
  const saturdayDeptCoverage = new Map<number, number>()
  const allDeptIds = new Set<number>()

  for (const employee of employees) {
    const dayMap = cellMatrix.get(employee.id)
    if (!dayMap) continue
    if (employee.department != null) allDeptIds.add(employee.department)
    for (const day of days) {
      const iso = toIsoDate(day)
      const cell = dayMap.get(iso)
      totalCells += 1
      if (!cell || cell.kind === "empty") continue
      if (cell.kind === "shift") {
        plannedCells += 1
        if (cell.shiftId != null) {
          const shift = workShiftsById.get(cell.shiftId)
          if (shift) {
            const dur =
              cell.category === "astreinte"
                ? 24 * 60
                : shiftDurationMinutes(shift.start_time, shift.end_time)
            totalMinutes += dur
          }
        }
        if (saturdayIso && iso === saturdayIso && employee.department != null) {
          saturdayDeptCoverage.set(employee.department, (saturdayDeptCoverage.get(employee.department) ?? 0) + 1)
        }
      } else if (cell.kind === "rest") {
        plannedCells += 1
      }
    }
  }

  let understaffedSaturday = 0
  if (saturdayIso) {
    for (const deptId of allDeptIds) {
      if ((saturdayDeptCoverage.get(deptId) ?? 0) === 0) understaffedSaturday += 1
    }
  }

  const totalHours = Math.round(totalMinutes / 60)
  const coveragePct = totalCells > 0 ? Math.round((plannedCells / totalCells) * 100) : 0

  const legend: { cat: ShiftCategory; label: string }[] = [
    { cat: "matin", label: tr.categories.matin },
    { cat: "soir", label: tr.categories.soir },
    { cat: "bureau", label: tr.categories.bureau },
    { cat: "service", label: tr.categories.service },
    { cat: "astreinte", label: tr.categories.astreinte },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-border/60 dark:bg-card/80 lg:flex-row lg:items-center lg:justify-between">
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-muted-foreground">
        {legend.map((item) => (
          <span key={item.cat} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", shiftCategoryDotClasses(item.cat))} />
            <span>{item.label}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" />
          <span>{tr.footer.legendLeaves}</span>
        </span>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-700 dark:text-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-slate-500 dark:text-muted-foreground">{tr.footer.plannedHours}</span>
          <span className="font-semibold tabular-nums">{totalHours}h</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              understaffedSaturday > 0 ? "bg-amber-500" : "bg-slate-300",
            )}
          />
          <span className="text-slate-500 dark:text-muted-foreground">{tr.footer.understaffedSaturday}</span>
          <span className="font-semibold tabular-nums">
            {tr.footer.deptCount(understaffedSaturday)}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              coveragePct >= 90 ? "bg-emerald-500" : coveragePct >= 70 ? "bg-amber-500" : "bg-rose-500",
            )}
          />
          <span className="text-slate-500 dark:text-muted-foreground">{tr.footer.coverage}</span>
          <span className="font-semibold tabular-nums">{coveragePct}&nbsp;%</span>
        </span>
      </div>
    </div>
  )
}
