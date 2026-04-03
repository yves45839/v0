"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import {
  HrPlanningGuideDialog,
  type HrQuickAssignPayload,
} from "@/components/planning/hr-planning-guide-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  assignEmployeePlanning,
  assignDepartmentPlanning,
  createPlanning,
  createWorkShift,
  deletePlanning,
  deleteWorkShift,
  fetchDepartments,
  fetchEmployeeSchedule,
  fetchEmployeesDetailed,
  fetchPlannings,
  fetchWorkShifts,
  isEmployeeApiEnabled,
  type CreatePlanningPayload,
  type DepartmentApiItem,
  type EmployeeApiItem,
  type EmployeeScheduleApiResponse,
  type PlanningApiItem,
  type PlanningEntryApiItem,
  type WorkShiftApiItem,
  updatePlanning,
  updateWorkShift,
} from "@/lib/api/employees"
import {
  CalendarDays,
  CalendarRange,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Shapes,
  Sparkles,
  Trash2,
} from "lucide-react"

const EMPLOYEE_TENANT_CODE = process.env.NEXT_PUBLIC_EMPLOYEE_TENANT_CODE ?? "HQ-CASA"
const WEEK_DAYS = [
  { key: 0, label: "Lundi" },
  { key: 1, label: "Mardi" },
  { key: 2, label: "Mercredi" },
  { key: 3, label: "Jeudi" },
  { key: 4, label: "Vendredi" },
  { key: 5, label: "Samedi" },
  { key: 6, label: "Dimanche" },
]
const ASSISTANT_AUTO_SHIFT_NAME = "Quart Standard RH"
const ASSISTANT_AUTO_PLANNING_NAME = "Planning Standard RH"

type PlanningView = "timetable" | "shift" | "schedule"

type WeeklySlotForm = {
  shiftIds: number[]
  isRestDay: boolean
}

type PlanningSlotChip = {
  key: string
  label: string
  slotType: "work" | "shift" | "rest"
  timeRange: string | null
}

function getCurrentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function buildDefaultWeek(): Record<number, WeeklySlotForm> {
  return {
    0: { shiftIds: [], isRestDay: false },
    1: { shiftIds: [], isRestDay: false },
    2: { shiftIds: [], isRestDay: false },
    3: { shiftIds: [], isRestDay: false },
    4: { shiftIds: [], isRestDay: false },
    5: { shiftIds: [], isRestDay: false },
    6: { shiftIds: [], isRestDay: false },
  }
}

function buildDefaultShiftForm() {
  const defaultStart = "08:00"
  const defaultEnd = "17:00"
  return {
    name: "",
    code: "",
    description: "",
    start_time: defaultStart,
    end_time: defaultEnd,
    break_enabled: false,
    break_start_time: "",
    break_end_time: "",
    overtime_enabled: false,
    overtime_start_time: "",
    overtime_end_time: "",
    late_allowable_minutes: "10",
    early_leave_allowable_minutes: "10",
  }
}

function isValidTime24h(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())
}

function normalizeTimeInput(value: string) {
  const raw = value.trim()
  if (!raw) {
    return ""
  }
  if (isValidTime24h(raw)) {
    return raw
  }

  const compact = raw.replace(/\s+/g, "")
  if (/^\d{1,2}$/.test(compact)) {
    const hours = Number(compact)
    if (Number.isInteger(hours) && hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, "0")}:00`
    }
  }
  if (/^\d{3,4}$/.test(compact)) {
    const padded = compact.padStart(4, "0")
    const hours = Number(padded.slice(0, 2))
    const minutes = Number(padded.slice(2, 4))
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    }
  }

  const delimiterMatch = compact.match(/^(\d{1,2})[:hH](\d{1,2})$/)
  if (delimiterMatch) {
    const hours = Number(delimiterMatch[1])
    const minutes = Number(delimiterMatch[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    }
  }

  return raw
}

function addMinutesToClock(time: string, deltaMinutes: number) {
  const total = (timeToMinutes(time) + deltaMinutes + 1440 * 10) % 1440
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function minutesForward(fromTime: string, toTime: string) {
  const from = timeToMinutes(fromTime)
  const to = timeToMinutes(toTime)
  return (to - from + 1440) % 1440
}

function buildDefaultPlanningForm() {
  return {
    name: "",
    code: "",
    description: "",
    timezone: "Africa/Abidjan",
    dailySlots: buildDefaultWeek(),
  }
}

function pickLatestPlanning(planningList: PlanningApiItem[]) {
  return [...planningList].sort((left, right) => right.id - left.id)[0] ?? null
}

function pickPrimaryShift(shiftList: WorkShiftApiItem[]) {
  return (
    [...shiftList].sort(
      (left, right) =>
        (left.start_time ?? "99:99").localeCompare(right.start_time ?? "99:99") || left.id - right.id
    )[0] ?? null
  )
}

function buildPlanningEntriesFromDailySlots(
  dailySlots: Record<number, WeeklySlotForm>,
  workShiftsById: Map<number, WorkShiftApiItem>
): PlanningEntryApiItem[] {
  const entries: PlanningEntryApiItem[] = []

  Object.entries(dailySlots).forEach(([dayOfWeek, slot]) => {
    const day = Number(dayOfWeek)
    if (slot.isRestDay) {
      entries.push({
        day_of_week: day,
        sequence_index: null,
        start_date: null,
        end_date: null,
        work_shift: null,
        is_rest_day: true,
        label: "Repos",
        metadata: {},
      })
      return
    }

    slot.shiftIds.forEach((shiftId) => {
      entries.push({
        day_of_week: day,
        sequence_index: null,
        start_date: null,
        end_date: null,
        work_shift: shiftId,
        is_rest_day: false,
        label: workShiftsById.get(shiftId)?.name ?? WEEK_DAYS[day]?.label ?? "Shift",
        metadata: {},
      })
    })
  })

  return entries
}

function buildDailySlotsFromPlanning(planning: PlanningApiItem): Record<number, WeeklySlotForm> {
  const next = buildDefaultWeek()
  const recurringEntries = (planning.entries ?? []).filter(
    (entry) =>
      entry.day_of_week !== null &&
      entry.sequence_index == null &&
      entry.start_date == null &&
      entry.end_date == null
  )

  for (const entry of recurringEntries) {
    const day = entry.day_of_week
    if (day == null || !(day in next)) {
      continue
    }
    if (entry.is_rest_day || !entry.work_shift) {
      next[day] = { shiftIds: [], isRestDay: true }
      continue
    }
    if (next[day].isRestDay || next[day].shiftIds.includes(entry.work_shift)) {
      continue
    }
    next[day] = {
      ...next[day],
      shiftIds: [...next[day].shiftIds, entry.work_shift],
    }
  }

  return next
}

function buildNonWeeklyEntries(planning: PlanningApiItem | null): PlanningEntryApiItem[] {
  if (!planning) {
    return []
  }

  return (planning.entries ?? [])
    .filter(
      (entry) =>
        entry.day_of_week == null ||
        entry.sequence_index != null ||
        entry.start_date != null ||
        entry.end_date != null
    )
    .map((entry) => ({
      day_of_week: entry.day_of_week,
      sequence_index: entry.sequence_index ?? null,
      start_date: entry.start_date ?? null,
      end_date: entry.end_date ?? null,
      work_shift: entry.work_shift ?? null,
      is_rest_day: Boolean(entry.is_rest_day),
      label: entry.label ?? "",
      metadata: entry.metadata ?? {},
    }))
}

function formatTime(time: string | null | undefined) {
  return time ? time.slice(0, 5) : "--:--"
}

function timeToMinutes(time: string | null | undefined) {
  if (!time) return 0
  const [hours, minutes] = time.split(":").map(Number)
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type TimelineSegment = {
  left: number
  width: number
  dayOffset: 0 | 1
}

function toTimelineSegments(startTime: string | null | undefined, endTime: string | null | undefined): TimelineSegment[] {
  const start = clamp(timeToMinutes(startTime), 0, 1440)
  const end = clamp(timeToMinutes(endTime), 0, 1440)

  if (start === end) {
    return [{ left: 0, width: 100, dayOffset: 0 }]
  }

  const ranges: Array<{ from: number; to: number; dayOffset: 0 | 1 }> =
    end > start
      ? [{ from: start, to: end, dayOffset: 0 }]
      : [
          { from: start, to: 1440, dayOffset: 0 },
          { from: 0, to: end, dayOffset: 1 },
        ]

  return ranges
    .map(({ from, to, dayOffset }) => {
      const left = clamp((from / 1440) * 100, 0, 100)
      const right = clamp((to / 1440) * 100, 0, 100)
      const width = Math.max(0, right - left)
      if (width === 0) {
        return null
      }
      const minVisualWidth = 1.6
      const displayWidth = width < minVisualWidth ? minVisualWidth : width
      const displayLeft = clamp(left, 0, Math.max(0, 100 - displayWidth))
      return { left: displayLeft, width: displayWidth, dayOffset }
    })
    .filter((segment): segment is TimelineSegment => Boolean(segment))
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (!hours) return `${mins} min`
  if (!mins) return `${hours} h`
  return `${hours} h ${String(mins).padStart(2, "0")}`
}

function getMonthGrid(days: EmployeeScheduleApiResponse["days"]) {
  if (!days.length) return []
  const firstDate = new Date(`${days[0].date}T00:00:00`)
  const offset = (firstDate.getDay() + 6) % 7
  return [...Array.from({ length: offset }, () => null), ...days]
}

function getEmployeeDepartment(
  employee: EmployeeApiItem | null,
  departmentsById: Map<number, string>
) {
  if (!employee?.department) return "Sans departement"
  return departmentsById.get(employee.department) ?? "Sans departement"
}

function getSlotBadgeClass(slotType: "work" | "shift" | "rest") {
  if (slotType === "rest") return "border-rose-500/30 bg-rose-500/10 text-rose-200"
  if (slotType === "shift") return "border-sky-500/30 bg-sky-500/10 text-sky-200"
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
}

function getPlanningDayEntries(
  planning: PlanningApiItem,
  dayOfWeek: number,
  shiftsById: Map<number, WorkShiftApiItem>
): PlanningSlotChip[] {
  const weeklyEntries = (planning.entries ?? [])
    .filter(
      (entry) =>
        entry.day_of_week === dayOfWeek &&
        entry.sequence_index == null &&
        entry.start_date == null &&
        entry.end_date == null
    )
    .sort((left, right) => {
      const leftShift = left.work_shift ? shiftsById.get(left.work_shift) : null
      const rightShift = right.work_shift ? shiftsById.get(right.work_shift) : null
      return (leftShift?.start_time ?? "99:99").localeCompare(rightShift?.start_time ?? "99:99")
    })

  if (weeklyEntries.length > 0) {
    return weeklyEntries.map((entry): PlanningSlotChip => {
      if (entry.is_rest_day || !entry.work_shift) {
        return {
          key: `entry-${entry.id ?? `${dayOfWeek}-rest`}`,
          label: entry.label || "Repos",
          slotType: "rest" as const,
          timeRange: null,
        }
      }

      const shift = shiftsById.get(entry.work_shift)
      return {
        key: `entry-${entry.id ?? `${dayOfWeek}-${entry.work_shift}`}`,
        label: shift?.name ?? entry.label ?? "Shift",
        slotType: "shift" as const,
        timeRange: `${formatTime(shift?.start_time)}-${formatTime(shift?.end_time)}`,
      }
    })
  }

  return (planning.daily_slots ?? [])
    .filter((slot) => slot.day_of_week === dayOfWeek)
    .map((slot, index): PlanningSlotChip => ({
      key: `slot-${dayOfWeek}-${index}`,
      label: slot.label || "Slot",
      slotType: slot.slot_type,
      timeRange: `${formatTime(slot.start_time)}-${formatTime(slot.end_time)}`,
    }))
}

const HOUR_MARKERS_4H = [0, 4, 8, 12, 16, 20, 24]
const HOUR_MARKERS_6H = [0, 6, 12, 18, 24]

const PLANNING_ERROR_MESSAGES = {
  EMP_API_DISABLED: "L'API employees n'est pas active.",
  LOAD_BASE_FAILED: "Erreur de chargement du planning.",
  LOAD_SCHEDULE_FAILED: "Erreur de chargement du calendrier.",
  SHIFT_TENANT_MISSING: "Tenant introuvable pour creer le quart.",
  SHIFT_NAME_REQUIRED: "Le nom du quart est obligatoire.",
  SHIFT_SERVICE_TIME_INVALID: "Les heures de service doivent etre au format 24h HH:MM.",
  SHIFT_BREAK_INCOMPLETE: "Renseigne la pause complete: debut et fin.",
  SHIFT_BREAK_TIME_INVALID: "Les heures de pause doivent etre au format 24h HH:MM.",
  SHIFT_OVERTIME_INCOMPLETE: "Renseigne les heures sup completes: debut et fin.",
  SHIFT_OVERTIME_TIME_INVALID: "Les heures sup doivent etre au format 24h HH:MM.",
  SHIFT_LATE_ALLOWABLE_INVALID: "Le retard tolere doit etre un entier positif.",
  SHIFT_EARLY_LEAVE_ALLOWABLE_INVALID: "La marge de depart anticipe doit etre un entier positif.",
  SHIFT_CREATE_FAILED: "Erreur de creation du quart.",
  SHIFT_UPDATE_FAILED: "Erreur de modification du quart.",
  PLANNING_TENANT_MISSING: "Tenant introuvable pour creer le planning.",
  PLANNING_NAME_REQUIRED: "Le nom du planning est obligatoire.",
  PLANNING_ENTRIES_REQUIRED: "Ajoute au moins un shift ou un jour de repos dans le timetable.",
  PLANNING_CREATE_FAILED: "Erreur de creation du planning.",
  PLANNING_UPDATE_FAILED: "Erreur de modification du planning.",
  SHIFT_DELETE_FAILED: "Erreur de suppression du shift.",
  ASSIGN_PLANNING_FAILED: "Erreur d'assignation du planning.",
  GUIDE_ASSIGN_PREPARE_FAILED: "Impossible de preparer l'attribution rapide depuis l'assistant RH.",
  PLANNING_DELETE_FAILED: "Erreur de suppression du timetable.",
  GUIDE_ASSIGN_REQUIRES_PLANNING: "Creez d'abord un planning, puis relancez l'attribution.",
} as const

type PlanningErrorCode = keyof typeof PLANNING_ERROR_MESSAGES

type PlanningUiError = {
  code: PlanningErrorCode
  message: string
  scope: "global" | "shift_dialog" | "planning_dialog"
}

function getErrorDetail(error: unknown) {
  if (error instanceof Error) {
    const detail = error.message.trim()
    return detail.length > 0 ? detail : null
  }
  return null
}

export default function PlanningPage() {
  const [activeView, setActiveView] = useState<PlanningView>("timetable")
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([])
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([])
  const [departmentsById, setDepartmentsById] = useState<Map<number, string>>(new Map())
  const [workShifts, setWorkShifts] = useState<WorkShiftApiItem[]>([])
  const [plannings, setPlannings] = useState<PlanningApiItem[]>([])
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [month, setMonth] = useState(getCurrentMonthValue)
  const [schedule, setSchedule] = useState<EmployeeScheduleApiResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [error, setError] = useState<PlanningUiError | null>(null)
  const [createShiftOpen, setCreateShiftOpen] = useState(false)
  const [createPlanningOpen, setCreatePlanningOpen] = useState(false)
  const [isSavingShift, setIsSavingShift] = useState(false)
  const [isSavingPlanning, setIsSavingPlanning] = useState(false)
  const [deletingShiftId, setDeletingShiftId] = useState<number | null>(null)
  const [deletingPlanningId, setDeletingPlanningId] = useState<number | null>(null)
  const [editingShift, setEditingShift] = useState<WorkShiftApiItem | null>(null)
  const [editingPlanning, setEditingPlanning] = useState<PlanningApiItem | null>(null)
  const [isAssigningPlanning, setIsAssigningPlanning] = useState(false)
  const [assignPlanningOpen, setAssignPlanningOpen] = useState(false)
  const [assignPlanningTarget, setAssignPlanningTarget] = useState<PlanningApiItem | null>(null)
  const [hrGuideOpen, setHrGuideOpen] = useState(false)
  const [assignMode, setAssignMode] = useState<"departments" | "employees">("employees")
  const [selectedAssignEmployeeIds, setSelectedAssignEmployeeIds] = useState<number[]>([])
  const [selectedAssignDepartmentIds, setSelectedAssignDepartmentIds] = useState<number[]>([])
  const [includeSubDepartments, setIncludeSubDepartments] = useState(false)
  const [assignSearch, setAssignSearch] = useState("")
  const [isPreparingGuideAssign, setIsPreparingGuideAssign] = useState(false)

  const timetableRef = useRef<HTMLElement | null>(null)
  const shiftRef = useRef<HTMLElement | null>(null)
  const scheduleRef = useRef<HTMLElement | null>(null)

  const [newShift, setNewShift] = useState(buildDefaultShiftForm)
  const [newPlanning, setNewPlanning] = useState(buildDefaultPlanningForm)
  const [draggedShiftId, setDraggedShiftId] = useState<number | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [planningEditorMode, setPlanningEditorMode] = useState<"builder" | "timeline">("builder")
  const [copyMenuDay, setCopyMenuDay] = useState<number | null>(null)
  const raiseError = useCallback(
    (
      code: PlanningErrorCode,
      detail?: string | null,
      scope: PlanningUiError["scope"] = "global"
    ) => {
      setError({
        code,
        message: detail && detail.trim().length > 0 ? detail : PLANNING_ERROR_MESSAGES[code],
        scope,
      })
    },
    []
  )

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  )
  const workShiftsById = useMemo(() => new Map(workShifts.map((shift) => [shift.id, shift])), [workShifts])

  const monthGrid = useMemo(() => getMonthGrid(schedule?.days ?? []), [schedule?.days])

  const selectedDay = useMemo(
    () => schedule?.days.find((day) => day.date === selectedDate) ?? null,
    [schedule?.days, selectedDate]
  )
  const normalizedAssignSearch = assignSearch.trim().toLowerCase()
  const filteredAssignEmployees = useMemo(() => {
    if (!normalizedAssignSearch) return employees
    return employees.filter((employee) =>
      [employee.name, employee.employee_no]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedAssignSearch))
    )
  }, [employees, normalizedAssignSearch])
  const filteredAssignDepartments = useMemo(() => {
    if (!normalizedAssignSearch) return departments
    return departments.filter((department) =>
      [department.name, department.code]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedAssignSearch))
    )
  }, [departments, normalizedAssignSearch])

  const planningCards = useMemo(
    () => [
      {
        key: "timetable" as const,
        label: "Timetable",
        helper: `${plannings.length} existant${plannings.length > 1 ? "s" : ""}`,
        icon: Plus,
        action: () => {
          setActiveView("timetable")
          timetableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        },
      },
      {
        key: "shift" as const,
        label: "Shift",
        helper: `${workShifts.length} existant${workShifts.length > 1 ? "s" : ""}`,
        icon: Shapes,
        action: () => {
          setActiveView("shift")
          shiftRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        },
      },
      {
        key: "schedule" as const,
        label: "Shift Schedule",
        helper: "Calendrier mensuel",
        icon: CalendarRange,
        action: () => {
          setActiveView("schedule")
          scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        },
      },
    ],
    [plannings.length, workShifts.length]
  )

  const hrGuideStats = useMemo(() => {
    const assignedEmployeeCount = employees.filter((employee) => Boolean(employee.effective_planning?.id)).length
    return {
      shiftCount: workShifts.length,
      planningCount: plannings.length,
      employeeCount: employees.length,
      assignedEmployeeCount,
    }
  }, [employees, plannings.length, workShifts.length])

  const loadBaseData = useCallback(async () => {
    if (!isEmployeeApiEnabled()) {
      raiseError("EMP_API_DISABLED")
      setLoading(false)
      return null
    }

    setLoading(true)
    setError(null)
    try {
      const [employeesData, departmentsData, shiftsData, planningsData] = await Promise.all([
        fetchEmployeesDetailed(EMPLOYEE_TENANT_CODE),
        fetchDepartments(EMPLOYEE_TENANT_CODE),
        fetchWorkShifts(EMPLOYEE_TENANT_CODE),
        fetchPlannings(EMPLOYEE_TENANT_CODE),
      ])

      setEmployees(employeesData)
      setDepartments(departmentsData)
      setWorkShifts(shiftsData)
      setPlannings(planningsData)
      setTenantId(
        employeesData[0]?.tenant ??
          departmentsData[0]?.tenant ??
          shiftsData[0]?.tenant ??
          planningsData[0]?.tenant ??
          null
      )
      setDepartmentsById(new Map(departmentsData.map((department) => [department.id, department.name])))
      if (!selectedEmployeeId && employeesData.length > 0) {
        setSelectedEmployeeId(employeesData[0].id)
      }
      return {
        employeesData,
        departmentsData,
        shiftsData,
        planningsData,
      }
    } catch (loadError) {
      raiseError("LOAD_BASE_FAILED", getErrorDetail(loadError))
      return null
    } finally {
      setLoading(false)
    }
  }, [raiseError, selectedEmployeeId])

  const loadSchedule = useCallback(async () => {
    if (!selectedEmployeeId) {
      setSchedule(null)
      return
    }

    setLoadingSchedule(true)
    setError(null)
    try {
      const payload = await fetchEmployeeSchedule(selectedEmployeeId, month)
      setSchedule(payload)
    } catch (loadError) {
      raiseError("LOAD_SCHEDULE_FAILED", getErrorDetail(loadError))
    } finally {
      setLoadingSchedule(false)
    }
  }, [month, raiseError, selectedEmployeeId])

  useEffect(() => {
    void loadBaseData()
  }, [loadBaseData])

  useEffect(() => {
    void loadSchedule()
  }, [loadSchedule])

  useEffect(() => {
    if (!schedule?.days.length) {
      setSelectedDate(null)
      return
    }
    setSelectedDate((current) => {
      if (current && schedule.days.some((day) => day.date === current)) return current
      return schedule.days[0].date
    })
  }, [schedule])

  const openCreateShiftDialog = () => {
    setError(null)
    setEditingShift(null)
    setNewShift(buildDefaultShiftForm())
    setCreateShiftOpen(true)
  }

  const openEditShiftDialog = (shift: WorkShiftApiItem) => {
    setError(null)
    const overtimeBefore = Number(shift.metadata?.overtime_before_minutes ?? 0)
    const overtimeAfterFromMeta = Number(shift.metadata?.overtime_after_minutes ?? NaN)
    const overtimeAfter = Number.isFinite(overtimeAfterFromMeta)
      ? overtimeAfterFromMeta
      : Math.max(shift.overtime_minutes - overtimeBefore, 0)
    const overtimeStartFromMeta = String(shift.metadata?.overtime_start_time ?? "").trim()
    const overtimeEndFromMeta = String(shift.metadata?.overtime_end_time ?? "").trim()
    const shiftStart = shift.start_time ?? "08:00"
    const shiftEnd = shift.end_time ?? "17:00"
    const overtimeStart = isValidTime24h(overtimeStartFromMeta)
      ? overtimeStartFromMeta
      : overtimeBefore > 0
        ? addMinutesToClock(shiftStart, -overtimeBefore)
        : ""
    const overtimeEnd = isValidTime24h(overtimeEndFromMeta)
      ? overtimeEndFromMeta
      : overtimeAfter > 0
        ? addMinutesToClock(shiftEnd, overtimeAfter)
        : ""

    setEditingShift(shift)
    setNewShift({
      name: shift.name,
      code: shift.code ?? "",
      description: shift.description ?? "",
      start_time: shiftStart,
      end_time: shiftEnd,
      break_enabled: Boolean((shift.break_start_time ?? "").trim() || (shift.break_end_time ?? "").trim()),
      break_start_time: shift.break_start_time ?? "",
      break_end_time: shift.break_end_time ?? "",
      overtime_enabled: Boolean(overtimeStart || overtimeEnd),
      overtime_start_time: overtimeStart,
      overtime_end_time: overtimeEnd,
      late_allowable_minutes: String(shift.late_allowable_minutes ?? 10),
      early_leave_allowable_minutes: String(shift.early_leave_allowable_minutes ?? 10),
    })
    setCreateShiftOpen(true)
  }

  const closeShiftDialog = (open: boolean) => {
    setCreateShiftOpen(open)
    if (!open) {
      setError(null)
      setEditingShift(null)
      setNewShift(buildDefaultShiftForm())
    }
  }

  const openCreatePlanningDialog = () => {
    setError(null)
    setEditingPlanning(null)
    setSelectedShiftId(null)
    setPlanningEditorMode("builder")
    setCopyMenuDay(null)
    setNewPlanning(buildDefaultPlanningForm())
    setCreatePlanningOpen(true)
  }

  const openEditPlanningDialog = (planning: PlanningApiItem) => {
    setError(null)
    setEditingPlanning(planning)
    setSelectedShiftId(null)
    setPlanningEditorMode("builder")
    setCopyMenuDay(null)
    setNewPlanning({
      name: planning.name,
      code: planning.code ?? "",
      description: planning.description ?? "",
      timezone: planning.timezone ?? "Africa/Abidjan",
      dailySlots: buildDailySlotsFromPlanning(planning),
    })
    setCreatePlanningOpen(true)
  }

  const closePlanningDialog = (open: boolean) => {
    setCreatePlanningOpen(open)
    if (!open) {
      setError(null)
      setEditingPlanning(null)
      setSelectedShiftId(null)
      setPlanningEditorMode("builder")
      setCopyMenuDay(null)
      setNewPlanning(buildDefaultPlanningForm())
    }
  }

  const ensureGuidePlanningReady = useCallback(async (guidePayload: HrQuickAssignPayload) => {
    const existingPlanning = pickLatestPlanning(plannings)
    if (!guidePayload.createFromScratch && existingPlanning) {
      return existingPlanning
    }

    const resolvedTenantId =
      tenantId ??
      employees[0]?.tenant ??
      departments[0]?.tenant ??
      workShifts[0]?.tenant ??
      existingPlanning?.tenant ??
      null
    if (!resolvedTenantId) {
      throw new Error("Aucun tenant disponible pour preparer une attribution automatique.")
    }

    const serviceStart = normalizeTimeInput(guidePayload.serviceStart || "08:00")
    const serviceEnd = normalizeTimeInput(guidePayload.serviceEnd || "17:00")
    if (!isValidTime24h(serviceStart) || !isValidTime24h(serviceEnd)) {
      throw new Error("Les heures de service sont invalides (format attendu HH:MM).")
    }

    const breakStart = guidePayload.breakEnabled ? normalizeTimeInput(guidePayload.breakStart || "") : ""
    const breakEnd = guidePayload.breakEnabled ? normalizeTimeInput(guidePayload.breakEnd || "") : ""
    if (guidePayload.breakEnabled && (!breakStart || !breakEnd)) {
      throw new Error("Pause incomplete: renseignez l'heure de debut et l'heure de fin.")
    }
    if (
      guidePayload.breakEnabled &&
      ((!isValidTime24h(breakStart) && breakStart.length > 0) || (!isValidTime24h(breakEnd) && breakEnd.length > 0))
    ) {
      throw new Error("Les heures de pause sont invalides (format attendu HH:MM).")
    }

    const weekendStart = normalizeTimeInput(guidePayload.weekendStart || "")
    const weekendEnd = normalizeTimeInput(guidePayload.weekendEnd || "")
    if (guidePayload.weekendMode === "different") {
      if (!isValidTime24h(weekendStart) || !isValidTime24h(weekendEnd)) {
        throw new Error("Les heures week-end sont invalides (format attendu HH:MM).")
      }
    }

    const safeLate = Math.max(0, Number(guidePayload.lateAllowableMinutes || 0))
    const safeEarly = Math.max(0, Number(guidePayload.earlyLeaveAllowableMinutes || 0))
    const stamp = Date.now().toString().slice(-6)

    const shiftBaseName = guidePayload.shiftName.trim() || ASSISTANT_AUTO_SHIFT_NAME
    const planningBaseName = guidePayload.planningName.trim() || ASSISTANT_AUTO_PLANNING_NAME
    const timezoneValue = guidePayload.timezone.trim() || "Africa/Abidjan"

    const weekdayShift = await createWorkShift({
      tenant: resolvedTenantId,
      name: `${shiftBaseName} ${stamp}`,
      code: `AUTO-SHIFT-${stamp}`,
      description: "Cree automatiquement par l'assistant RH (a partir de zero).",
      start_time: serviceStart,
      end_time: serviceEnd,
      break_start_time: guidePayload.breakEnabled ? breakStart : null,
      break_end_time: guidePayload.breakEnabled ? breakEnd : null,
      overtime_minutes: 0,
      late_allowable_minutes: safeLate,
      early_leave_allowable_minutes: safeEarly,
      metadata: {
        auto_created_by: "hr_assistant",
        assistant_flow: "from_scratch",
      },
    })

    let weekendShiftId: number | null = null
    if (guidePayload.weekendMode === "same") {
      weekendShiftId = weekdayShift.id
    } else if (guidePayload.weekendMode === "different") {
      const weekendShift = await createWorkShift({
        tenant: resolvedTenantId,
        name: `${shiftBaseName} Weekend ${stamp}`,
        code: `AUTO-SHIFT-WE-${stamp}`,
        description: "Quart week-end cree automatiquement par l'assistant RH.",
        start_time: weekendStart,
        end_time: weekendEnd,
        break_start_time: guidePayload.breakEnabled ? breakStart : null,
        break_end_time: guidePayload.breakEnabled ? breakEnd : null,
        overtime_minutes: 0,
        late_allowable_minutes: safeLate,
        early_leave_allowable_minutes: safeEarly,
        metadata: {
          auto_created_by: "hr_assistant",
          assistant_flow: "from_scratch_weekend",
        },
      })
      weekendShiftId = weekendShift.id
    }

    const entryDays = WEEK_DAYS.map((day): PlanningEntryApiItem => {
      const isWeekend = day.key >= 5
      const targetShiftId = isWeekend ? weekendShiftId : weekdayShift.id
      if (!targetShiftId) {
        return {
          day_of_week: day.key,
          sequence_index: null,
          start_date: null,
          end_date: null,
          work_shift: null,
          is_rest_day: true,
          label: "Repos",
          metadata: {},
        }
      }
      return {
        day_of_week: day.key,
        sequence_index: null,
        start_date: null,
        end_date: null,
        work_shift: targetShiftId,
        is_rest_day: false,
        label: isWeekend && guidePayload.weekendMode === "different" ? `${shiftBaseName} Weekend` : shiftBaseName,
        metadata: {
          source: "hr_assistant_auto",
        },
      }
    })

    const autoPlanning = await createPlanning({
      tenant: resolvedTenantId,
      name: `${planningBaseName} ${stamp}`,
      code: `AUTO-PLN-${stamp}`,
      description: "Planning genere automatiquement depuis l'assistant RH.",
      timezone: timezoneValue,
      entries: entryDays,
      metadata: {
        auto_created_by: "hr_assistant",
        assistant_flow: "from_scratch",
        scope: guidePayload.scope,
      },
    })

    const refreshed = await loadBaseData()
    if (refreshed?.planningsData?.length) {
      return refreshed.planningsData.find((planning) => planning.id === autoPlanning.id) ?? autoPlanning
    }
    return autoPlanning
  }, [departments, employees, loadBaseData, plannings, tenantId, workShifts])

  const openAssignPlanningDialog = (
    planning: PlanningApiItem,
    mode: "employees" | "departments" = "employees",
    options?: { preselectAll?: boolean }
  ) => {
    setError(null)
    setAssignPlanningTarget(planning)
    setAssignMode(mode)
    setAssignSearch("")
    if (mode === "departments") {
      setSelectedAssignDepartmentIds(options?.preselectAll ? departments.map((department) => department.id) : [])
      setSelectedAssignEmployeeIds([])
    } else {
      setSelectedAssignEmployeeIds(options?.preselectAll ? employees.map((employee) => employee.id) : [])
      setSelectedAssignDepartmentIds([])
    }
    setIncludeSubDepartments(false)
    setAssignPlanningOpen(true)
  }

  const openAssignPlanningFromGuide = async (guidePayload: HrQuickAssignPayload) => {
    setIsPreparingGuideAssign(true)
    setError(null)
    try {
      const readyPlanning = await ensureGuidePlanningReady(guidePayload)
      if (!readyPlanning) {
        raiseError("GUIDE_ASSIGN_REQUIRES_PLANNING")
        return
      }
      openAssignPlanningDialog(
        readyPlanning,
        guidePayload.scope === "department" ? "departments" : "employees",
        { preselectAll: true }
      )
    } catch (prepareError) {
      raiseError("GUIDE_ASSIGN_PREPARE_FAILED", getErrorDetail(prepareError))
    } finally {
      setIsPreparingGuideAssign(false)
    }
  }

  const closeAssignPlanningDialog = (open: boolean) => {
    setAssignPlanningOpen(open)
    if (!open) {
      setAssignPlanningTarget(null)
      setAssignMode("employees")
      setSelectedAssignEmployeeIds([])
      setSelectedAssignDepartmentIds([])
      setIncludeSubDepartments(false)
      setAssignSearch("")
    }
  }

  const normalizeShiftTimeField = useCallback(
    (field: "start_time" | "end_time" | "break_start_time" | "break_end_time" | "overtime_start_time" | "overtime_end_time") => {
      setNewShift((prev) => ({ ...prev, [field]: normalizeTimeInput(prev[field]) }))
    },
    []
  )

  const handleSaveShift = async () => {
    if (!tenantId) {
      raiseError("SHIFT_TENANT_MISSING", null, "shift_dialog")
      return
    }
    if (!newShift.name.trim()) {
      raiseError("SHIFT_NAME_REQUIRED", null, "shift_dialog")
      return
    }
    const startTime = normalizeTimeInput(newShift.start_time)
    const endTime = normalizeTimeInput(newShift.end_time)
    const breakStart = newShift.break_enabled ? normalizeTimeInput(newShift.break_start_time) : ""
    const breakEnd = newShift.break_enabled ? normalizeTimeInput(newShift.break_end_time) : ""
    const hasBreakStart = breakStart.length > 0
    const hasBreakEnd = breakEnd.length > 0

    if (!isValidTime24h(startTime) || !isValidTime24h(endTime)) {
      raiseError("SHIFT_SERVICE_TIME_INVALID", null, "shift_dialog")
      return
    }
    if (hasBreakStart !== hasBreakEnd) {
      raiseError("SHIFT_BREAK_INCOMPLETE", null, "shift_dialog")
      return
    }
    if ((hasBreakStart && !isValidTime24h(breakStart)) || (hasBreakEnd && !isValidTime24h(breakEnd))) {
      raiseError("SHIFT_BREAK_TIME_INVALID", null, "shift_dialog")
      return
    }
    const overtimeStart = newShift.overtime_enabled ? normalizeTimeInput(newShift.overtime_start_time) : ""
    const overtimeEnd = newShift.overtime_enabled ? normalizeTimeInput(newShift.overtime_end_time) : ""
    const hasOvertimeStart = overtimeStart.length > 0
    const hasOvertimeEnd = overtimeEnd.length > 0
    if (hasOvertimeStart !== hasOvertimeEnd) {
      raiseError("SHIFT_OVERTIME_INCOMPLETE", null, "shift_dialog")
      return
    }
    if ((hasOvertimeStart && !isValidTime24h(overtimeStart)) || (hasOvertimeEnd && !isValidTime24h(overtimeEnd))) {
      raiseError("SHIFT_OVERTIME_TIME_INVALID", null, "shift_dialog")
      return
    }
    const lateAllowableRaw = newShift.late_allowable_minutes.trim()
    const earlyLeaveAllowableRaw = newShift.early_leave_allowable_minutes.trim()
    const lateAllowable = Number(lateAllowableRaw)
    const earlyLeaveAllowable = Number(earlyLeaveAllowableRaw)
    const hasInvalidLateAllowable =
      !lateAllowableRaw || !Number.isInteger(lateAllowable) || lateAllowable < 0
    const hasInvalidEarlyLeaveAllowable =
      !earlyLeaveAllowableRaw || !Number.isInteger(earlyLeaveAllowable) || earlyLeaveAllowable < 0
    if (hasInvalidLateAllowable) {
      raiseError("SHIFT_LATE_ALLOWABLE_INVALID", null, "shift_dialog")
      return
    }
    if (hasInvalidEarlyLeaveAllowable) {
      raiseError("SHIFT_EARLY_LEAVE_ALLOWABLE_INVALID", null, "shift_dialog")
      return
    }

    setIsSavingShift(true)
    setError(null)
    try {
      const overtimeBefore = hasOvertimeStart ? minutesForward(overtimeStart, startTime) : 0
      const overtimeAfter = hasOvertimeEnd ? minutesForward(endTime, overtimeEnd) : 0

      const payload = {
        tenant: tenantId,
        name: newShift.name.trim(),
        code: newShift.code.trim() || undefined,
        description: newShift.description.trim(),
        start_time: startTime,
        end_time: endTime,
        break_start_time: hasBreakStart ? breakStart : null,
        break_end_time: hasBreakEnd ? breakEnd : null,
        overtime_minutes: overtimeBefore + overtimeAfter,
        late_allowable_minutes: lateAllowable,
        early_leave_allowable_minutes: earlyLeaveAllowable,
        metadata: {
          overtime_start_time: hasOvertimeStart ? overtimeStart : "",
          overtime_end_time: hasOvertimeEnd ? overtimeEnd : "",
          overtime_before_minutes: overtimeBefore,
          overtime_after_minutes: overtimeAfter,
        },
      }

      if (editingShift) {
        await updateWorkShift(editingShift.id, payload)
      } else {
        await createWorkShift(payload)
      }

      closeShiftDialog(false)
      await loadBaseData()
    } catch (saveError) {
      raiseError(
        editingShift ? "SHIFT_UPDATE_FAILED" : "SHIFT_CREATE_FAILED",
        getErrorDetail(saveError),
        "shift_dialog"
      )
    } finally {
      setIsSavingShift(false)
    }
  }

  const handleSavePlanning = async () => {
    if (!tenantId) {
      raiseError("PLANNING_TENANT_MISSING", null, "planning_dialog")
      return
    }
    if (!newPlanning.name.trim()) {
      raiseError("PLANNING_NAME_REQUIRED", null, "planning_dialog")
      return
    }

    const recurringEntries = buildPlanningEntriesFromDailySlots(newPlanning.dailySlots, workShiftsById)

    const codeFromInput = newPlanning.code.trim()
    const generatedCode = `PLN-${newPlanning.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "AUTO"}-${Date.now().toString().slice(-5)}`

    const payload: CreatePlanningPayload = {
      tenant: tenantId,
      name: newPlanning.name.trim(),
      code: codeFromInput || generatedCode,
      description: newPlanning.description.trim(),
      timezone: newPlanning.timezone.trim() || "Africa/Abidjan",
      entries: recurringEntries,
    }

    if ((payload.entries?.length ?? 0) === 0) {
      raiseError("PLANNING_ENTRIES_REQUIRED", null, "planning_dialog")
      return
    }

    setIsSavingPlanning(true)
    setError(null)
    try {
      if (editingPlanning) {
        const editPayload: Partial<CreatePlanningPayload> = {
          name: payload.name,
          code: codeFromInput || editingPlanning.code || generatedCode,
          description: payload.description,
          timezone: payload.timezone,
          entries: [...buildNonWeeklyEntries(editingPlanning), ...recurringEntries],
        }
        await updatePlanning(editingPlanning.id, editPayload)
      } else {
        await createPlanning(payload)
      }

      closePlanningDialog(false)
      await loadBaseData()
      await loadSchedule()
    } catch (saveError) {
      raiseError(
        editingPlanning ? "PLANNING_UPDATE_FAILED" : "PLANNING_CREATE_FAILED",
        getErrorDetail(saveError),
        "planning_dialog"
      )
    } finally {
      setIsSavingPlanning(false)
    }
  }

  const handleDeleteShift = async (shift: WorkShiftApiItem) => {
    const confirmed = window.confirm(`Supprimer le shift "${shift.name}" ?`)
    if (!confirmed) {
      return
    }

    setDeletingShiftId(shift.id)
    setError(null)
    try {
      try {
        await deleteWorkShift(shift.id)
      } catch (deleteError) {
        const detail = deleteError instanceof Error ? deleteError.message : ""
        if (!detail.includes("force=true")) {
          throw deleteError
        }
        const forceConfirmed = window.confirm(
          "Ce shift est encore lie a des employes/departements/plannings. Voulez-vous forcer la suppression ?"
        )
        if (!forceConfirmed) {
          return
        }
        await deleteWorkShift(shift.id, { force: true })
      }

      await loadBaseData()
      await loadSchedule()
    } catch (deleteError) {
      raiseError("SHIFT_DELETE_FAILED", getErrorDetail(deleteError))
    } finally {
      setDeletingShiftId(null)
    }
  }

  const handleDeletePlanning = async (planning: PlanningApiItem) => {
    const confirmed = window.confirm(`Supprimer le timetable "${planning.name}" ?`)
    if (!confirmed) {
      return
    }

    setDeletingPlanningId(planning.id)
    setError(null)
    try {
      try {
        await deletePlanning(planning.id)
      } catch (deleteError) {
        const detail = deleteError instanceof Error ? deleteError.message : ""
        if (!detail.includes("force=true")) {
          throw deleteError
        }
        const forceConfirmed = window.confirm(
          "Ce timetable est encore lie a des employes/departements/groupes. Voulez-vous forcer la suppression ?"
        )
        if (!forceConfirmed) {
          return
        }
        await deletePlanning(planning.id, { force: true })
      }

      await loadBaseData()
      await loadSchedule()
    } catch (deleteError) {
      raiseError("PLANNING_DELETE_FAILED", getErrorDetail(deleteError))
    } finally {
      setDeletingPlanningId(null)
    }
  }

  const toggleAssignEmployee = (employeeId: number, checked: boolean) => {
    setSelectedAssignEmployeeIds((prev) => {
      if (checked) {
        if (prev.includes(employeeId)) return prev
        return [...prev, employeeId]
      }
      return prev.filter((id) => id !== employeeId)
    })
  }

  const toggleAssignDepartment = (departmentId: number, checked: boolean) => {
    setSelectedAssignDepartmentIds((prev) => {
      if (checked) {
        if (prev.includes(departmentId)) return prev
        return [...prev, departmentId]
      }
      return prev.filter((id) => id !== departmentId)
    })
  }

  const handleAssignPlanning = async () => {
    if (!assignPlanningTarget) return
    const planningId = assignPlanningTarget.id

    setIsAssigningPlanning(true)
    setError(null)
    try {
      if (assignMode === "employees") {
        if (!selectedAssignEmployeeIds.length) return
        const updatedEmployees = await Promise.all(
          selectedAssignEmployeeIds.map((employeeId) => assignEmployeePlanning(employeeId, planningId))
        )
        const byId = new Map(updatedEmployees.map((employee) => [employee.id, employee]))
        setEmployees((prev) => prev.map((employee) => byId.get(employee.id) ?? employee))
        if (selectedEmployeeId && byId.has(selectedEmployeeId)) {
          await loadSchedule()
        }
      } else {
        if (!selectedAssignDepartmentIds.length) return
        await Promise.all(
          selectedAssignDepartmentIds.map((departmentId) =>
            assignDepartmentPlanning(departmentId, planningId, includeSubDepartments)
          )
        )
        await loadBaseData()
      }
      closeAssignPlanningDialog(false)
    } catch (assignError) {
      raiseError("ASSIGN_PLANNING_FAILED", getErrorDetail(assignError))
    } finally {
      setIsAssigningPlanning(false)
    }
  }

  const addShiftToDay = (dayKey: number, shiftId: number) => {
    setNewPlanning((prev) => {
      const currentDay = prev.dailySlots[dayKey]
      if (currentDay.isRestDay || currentDay.shiftIds.includes(shiftId)) {
        return prev
      }
      return {
        ...prev,
        dailySlots: {
          ...prev.dailySlots,
          [dayKey]: {
            ...currentDay,
            shiftIds: [...currentDay.shiftIds, shiftId],
          },
        },
      }
    })
  }

  const removeShiftFromDay = (dayKey: number, shiftId: number) => {
    setNewPlanning((prev) => ({
      ...prev,
      dailySlots: {
        ...prev.dailySlots,
        [dayKey]: {
          ...prev.dailySlots[dayKey],
          shiftIds: prev.dailySlots[dayKey].shiftIds.filter((currentShiftId) => currentShiftId !== shiftId),
        },
      },
    }))
  }

  const handleDayClick = (dayKey: number) => {
    if (!selectedShiftId) return
    addShiftToDay(dayKey, selectedShiftId)
  }

  const clearPlanningGrid = () => {
    setNewPlanning((prev) => ({
      ...prev,
      dailySlots: buildDefaultWeek(),
    }))
  }

  const deleteSelectedShiftFromDays = () => {
    if (!selectedShiftId) return
    setNewPlanning((prev) => {
      const nextDailySlots = { ...prev.dailySlots }
      WEEK_DAYS.forEach((day) => {
        nextDailySlots[day.key] = {
          ...nextDailySlots[day.key],
          shiftIds: nextDailySlots[day.key].shiftIds.filter((shiftId) => shiftId !== selectedShiftId),
        }
      })
      return {
        ...prev,
        dailySlots: nextDailySlots,
      }
    })
  }

  const setDayRestMode = (dayKey: number, isRestDay: boolean) => {
    setNewPlanning((prev) => ({
      ...prev,
      dailySlots: {
        ...prev.dailySlots,
        [dayKey]: {
          ...prev.dailySlots[dayKey],
          isRestDay,
          shiftIds: isRestDay ? [] : prev.dailySlots[dayKey].shiftIds,
        },
      },
    }))
  }

  const copyDayToTargets = (sourceDay: number, targetDays: number[]) => {
    if (targetDays.length === 0) return
    setNewPlanning((prev) => {
      const source = prev.dailySlots[sourceDay]
      const nextDailySlots = { ...prev.dailySlots }
      targetDays.forEach((targetDay) => {
        if (targetDay === sourceDay) return
        nextDailySlots[targetDay] = {
          ...nextDailySlots[targetDay],
          isRestDay: source.isRestDay,
          shiftIds: source.isRestDay ? [] : [...source.shiftIds],
        }
      })
      return {
        ...prev,
        dailySlots: nextDailySlots,
      }
    })
  }

  const copyDayWithPreset = (sourceDay: number, preset: "next" | "weekdays" | "weekend" | "all") => {
    const allDays = WEEK_DAYS.map((day) => day.key)
    const targets =
      preset === "next"
        ? [((sourceDay + 1) % 7)]
        : preset === "weekdays"
          ? [0, 1, 2, 3, 4].filter((day) => day !== sourceDay)
          : preset === "weekend"
            ? [5, 6].filter((day) => day !== sourceDay)
            : allDays.filter((day) => day !== sourceDay)
    copyDayToTargets(sourceDay, targets)
    setCopyMenuDay(null)
  }

  return (
    <div className="min-h-screen bg-[#2b2d33] text-white">
      <AppSidebar />
      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="space-y-6 p-4 md:p-6">
          <PageContextBar
            title="Planning"
            description="Pilotez les quarts, timetables et affectations en un flux operationnel unique."
            className="border-white/10 bg-[#2f3138]"
            stats={[
              { value: plannings.length, label: "Timetables actifs", tone: "neutral" },
              { value: workShifts.length, label: "Shifts disponibles", tone: "neutral" },
              { value: employees.length, label: "Employes suivis", tone: "neutral" },
            ]}
            actions={
              <>
                <Button
                  variant="outline"
                  className="border-[#ffd37a]/30 bg-[#ffd37a]/10 text-[#ffe5a7] hover:bg-[#ffd37a]/20 hover:text-[#fff0ca]"
                  onClick={() => setHrGuideOpen(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Assistant RH
                </Button>
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => void loadBaseData()}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Recharger
                </Button>
                <Button className="bg-[#7f8cff] text-white hover:bg-[#98a2ff]" onClick={openCreatePlanningDialog}>
                  <Plus className="h-4 w-4" />
                  Nouveau timetable
                </Button>
                <Button className="bg-[#5cc0a8] text-[#13211d] hover:bg-[#77d3bc]" onClick={openCreateShiftDialog}>
                  <Plus className="h-4 w-4" />
                  Nouveau shift
                </Button>
              </>
            }
          />

          <section className="rounded-[6px] border border-white/10 bg-[#2f3138] p-4 md:p-6">

            {error?.scope === "global" && (
              <div
                role="alert"
                className="mt-4 rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-rose-200/80">
                      Code: {error.code}
                    </p>
                    <p className="mt-1">{error.message}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
                    onClick={() => setError(null)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-10 py-4">
                {planningCards.map((card) => {
                  const Icon = card.icon
                  const isActive = activeView === card.key
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={card.action}
                      className={cn(
                        "group flex w-[140px] flex-col items-center rounded-[4px] border px-4 py-6 text-center transition-all",
                        isActive
                          ? "border-white/30 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]"
                      )}
                    >
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-white/5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                        <Icon className="h-7 w-7" strokeWidth={1.5} />
                      </div>
                      <div className="text-[15px] text-white">{card.label}</div>
                      <div className="mt-1 text-[11px] text-white/45">{card.helper}</div>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-6">
                <section
                  ref={timetableRef}
                  className={cn(
                    "rounded-[4px] border p-4",
                    activeView === "timetable" ? "border-[#7f8cff]/50 bg-[#343845]" : "border-white/10 bg-[#31343c]"
                  )}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5">
                        <Plus className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-white">Timetable</h2>
                        <p className="text-sm text-white/55">Emplois du temps deja existants</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      onClick={openCreatePlanningDialog}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des timetables...
                    </div>
                  ) : plannings.length === 0 ? (
                    <div className="rounded-[4px] border border-dashed border-white/15 px-4 py-6 text-sm text-white/55">
                      Aucun emploi du temps trouve.
                    </div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {plannings.map((planning) => (
                        <article
                          key={planning.id}
                          className="rounded-[4px] border border-white/10 bg-black/10 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-medium text-white">{planning.name}</div>
                              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                                {planning.code || "Sans code"}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="rounded-full border border-[#7f8cff]/35 bg-[#7f8cff]/12 px-2.5 py-1 text-[11px] text-[#d7dcff]">
                                {planning.timezone}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 border border-white/15 px-2 text-white/80 hover:bg-white/10 hover:text-white"
                                onClick={() => openAssignPlanningDialog(planning)}
                              >
                                Assigner
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                                onClick={() => openEditPlanningDialog(planning)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
                                onClick={() => void handleDeletePlanning(planning)}
                                disabled={deletingPlanningId === planning.id}
                              >
                                {deletingPlanningId === planning.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-white/60">
                            {planning.description || "Aucune description renseignee."}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {WEEK_DAYS.flatMap((day) => getPlanningDayEntries(planning, day.key, workShiftsById)).length ? (
                              WEEK_DAYS.flatMap((day) => getPlanningDayEntries(planning, day.key, workShiftsById)).map((slot) => (
                                <span
                                  key={`${planning.id}-${slot.key}`}
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-[11px]",
                                    getSlotBadgeClass(slot.slotType)
                                  )}
                                >
                                  {slot.label} {slot.timeRange ? slot.timeRange : ""}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-white/45">Aucun slot defini</span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                </section>

                <section
                  ref={shiftRef}
                  className={cn(
                    "rounded-[4px] border p-4",
                    activeView === "shift" ? "border-[#5cc0a8]/50 bg-[#303f3a]" : "border-white/10 bg-[#31343c]"
                  )}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-white/20 bg-white/5">
                        <Shapes className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-white">Shift</h2>
                        <p className="text-sm text-white/55">Quarts de travail deja existants</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      onClick={openCreateShiftDialog}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des shifts...
                    </div>
                  ) : workShifts.length === 0 ? (
                    <div className="rounded-[4px] border border-dashed border-white/15 px-4 py-6 text-sm text-white/55">
                      Aucun quart de travail trouve.
                    </div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {workShifts.map((shift) => (
                        <article
                          key={shift.id}
                          className="rounded-[4px] border border-white/10 bg-black/10 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-medium text-white">{shift.name}</div>
                              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                                {shift.code || "Sans code"}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="rounded-full border border-[#5cc0a8]/30 bg-[#5cc0a8]/10 px-2.5 py-1 text-[11px] text-[#d3fff3]">
                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                                onClick={() => openEditShiftDialog(shift)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
                                onClick={() => void handleDeleteShift(shift)}
                                disabled={deletingShiftId === shift.id}
                              >
                                {deletingShiftId === shift.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-white/60">
                            {shift.description || "Aucune description renseignee."}
                          </p>

                          <div className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-[4px] border border-white/10 bg-white/5 px-3 py-2">
                              Pause: {formatTime(shift.break_start_time)} - {formatTime(shift.break_end_time)}
                            </div>
                            <div className="rounded-[4px] border border-white/10 bg-white/5 px-3 py-2">
                              Heures supp.: {shift.overtime_minutes} min
                            </div>
                            <div className="rounded-[4px] border border-white/10 bg-white/5 px-3 py-2">
                              Retard tolere: {shift.late_allowable_minutes ?? 0} min
                            </div>
                            <div className="rounded-[4px] border border-white/10 bg-white/5 px-3 py-2">
                              Depart anticipe: {shift.early_leave_allowable_minutes ?? 0} min
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section
                  ref={scheduleRef}
                  className={cn(
                    "rounded-[4px] border p-4",
                    activeView === "schedule" ? "border-[#f7d37a]/50 bg-[#403a2f]" : "border-white/10 bg-[#31343c]"
                  )}
                >
                  <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-white/20 bg-white/5">
                        <CalendarDays className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-white">Shift Schedule</h2>
                        <p className="text-sm text-white/55">Calendrier mensuel de l&apos;employe selectionne</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_auto]">
                      <select
                        value={selectedEmployeeId ?? ""}
                        onChange={(event) => setSelectedEmployeeId(Number(event.target.value))}
                        className="h-10 rounded-[4px] border border-white/10 bg-black/15 px-3 text-sm text-white outline-none"
                      >
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id} className="bg-[#2f3138]">
                            {(employee.name || employee.employee_no) +
                              " - " +
                              getEmployeeDepartment(employee, departmentsById)}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="month"
                        value={month ?? ""}
                        onChange={(event) => setMonth(event.target.value)}
                        className="border-white/10 bg-black/15 text-white"
                      />
                      <Button
                        variant="outline"
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => void loadSchedule()}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Afficher
                      </Button>
                    </div>
                  </div>

                  {selectedEmployee && (
                    <div className="mb-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[4px] border border-white/10 bg-black/10 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Employe</div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {selectedEmployee.name || selectedEmployee.employee_no}
                        </div>
                        <div className="mt-1 text-sm text-white/55">
                          {getEmployeeDepartment(selectedEmployee, departmentsById)}
                        </div>
                      </div>
                      <div className="rounded-[4px] border border-white/10 bg-black/10 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Planning effectif</div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {schedule?.planning?.name ?? "Aucun planning"}
                        </div>
                        <div className="mt-1 text-sm text-white/55">
                          {selectedEmployee.effective_work_shift?.name ?? "Aucun quart principal"}
                        </div>
                      </div>
                      <div className="rounded-[4px] border border-white/10 bg-black/10 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Resume</div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {schedule?.summary ? formatMinutes(schedule.summary.planned_minutes) : "--"}
                        </div>
                        <div className="mt-1 text-sm text-white/55">
                          {schedule?.summary?.working_days ?? 0} jour(s) travailles
                        </div>
                      </div>
                    </div>
                  )}

                  {loadingSchedule ? (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement du calendrier...
                    </div>
                  ) : !schedule?.days.length ? (
                    <div className="rounded-[4px] border border-dashed border-white/15 px-4 py-6 text-sm text-white/55">
                      Aucun calendrier disponible pour cet employe.
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                      <div>
                        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.14em] text-white/40">
                          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((label) => (
                            <div key={label} className="rounded-[4px] border border-white/10 bg-black/10 px-2 py-2">
                              {label}
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-2 md:grid-cols-7">
                          {monthGrid.map((day, index) =>
                            day ? (
                              <button
                                key={day.date}
                                type="button"
                                onClick={() => setSelectedDate(day.date)}
                                className={cn(
                                  "min-h-[120px] rounded-[4px] border p-2 text-left transition-colors",
                                  selectedDate === day.date
                                    ? "border-[#f7d37a] bg-[#f7d37a]/12"
                                    : day.is_rest_day
                                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                                      : "border-white/10 bg-black/10 hover:bg-white/10"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-semibold text-white">
                                    {new Date(`${day.date}T00:00:00`).getDate()}
                                  </span>
                                  <span className="text-[10px] text-white/45">{day.day_name.slice(0, 3)}</span>
                                </div>

                                <div className="mt-3 space-y-1">
                                  {day.shifts.length ? (
                                    day.shifts.slice(0, 2).map((shift) => (
                                      <div
                                        key={`${day.date}-${shift.id}`}
                                        className="rounded-[4px] bg-[#f7d37a]/12 px-2 py-1 text-[11px] text-[#fbe8b5]"
                                      >
                                        <div className="truncate">{shift.name}</div>
                                        <div className="text-[10px] text-[#fbe8b5]/75">
                                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="pt-5 text-[11px] text-white/45">
                                      {day.is_rest_day ? "Repos" : "Aucune affectation"}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <div
                                key={`empty-${index}`}
                                className="min-h-[120px] rounded-[4px] border border-dashed border-white/10 bg-black/10"
                              />
                            )
                          )}
                        </div>
                      </div>

                      <aside className="rounded-[4px] border border-white/10 bg-black/10 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Jour selectionne</div>
                        {selectedDay ? (
                          <div className="mt-3 space-y-4">
                            <div>
                              <div className="text-base font-medium text-white">{selectedDay.date}</div>
                              <div className="text-sm text-white/55">{selectedDay.day_name}</div>
                            </div>

                            <div className="rounded-[4px] border border-white/10 bg-white/5 p-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Heures</div>
                              <div className="mt-1 text-sm text-white">
                                {formatMinutes(selectedDay.planned_minutes)}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Shifts</div>
                              {selectedDay.shifts.length ? (
                                selectedDay.shifts.map((shift) => (
                                  <div
                                    key={`${selectedDay.date}-${shift.id}-detail`}
                                    className="rounded-[4px] border border-white/10 bg-white/5 p-3"
                                  >
                                    <div className="font-medium text-white">{shift.name}</div>
                                    <div className="mt-1 text-sm text-white/60">
                                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                    </div>
                                    <div className="mt-1 text-sm text-white/45">
                                      Net: {formatMinutes(shift.net_minutes)}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-[4px] border border-dashed border-white/10 px-3 py-4 text-sm text-white/45">
                                  Aucun shift ce jour.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-white/45">Selectionnez un jour dans le calendrier.</div>
                        )}
                      </aside>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </section>

          <Dialog open={assignPlanningOpen} onOpenChange={closeAssignPlanningDialog}>
            <DialogContent className="max-w-2xl rounded-[4px] border-white/10 bg-[#2f3138] text-white">
              <DialogHeader>
                <DialogTitle>
                  Assigner le planning {assignPlanningTarget ? `"${assignPlanningTarget.name}"` : ""}
                </DialogTitle>
                <DialogDescription className="text-white/55">
                  Choisissez des departements entiers ou des personnes, puis confirmez.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {error?.scope === "global" &&
                (error.code === "ASSIGN_PLANNING_FAILED" || error.code === "GUIDE_ASSIGN_PREPARE_FAILED") ? (
                  <div
                    role="alert"
                    className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-rose-200/80">
                      Code: {error.code}
                    </p>
                    <p className="mt-1">{error.message}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={assignMode === "employees" ? "default" : "outline"}
                      className={assignMode === "employees" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                      onClick={() => setAssignMode("employees")}
                    >
                      Personnes
                    </Button>
                    <Button
                      type="button"
                      variant={assignMode === "departments" ? "default" : "outline"}
                      className={assignMode === "departments" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                      onClick={() => setAssignMode("departments")}
                    >
                      Departements
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => {
                        if (assignMode === "departments") {
                          setSelectedAssignDepartmentIds(filteredAssignDepartments.map((department) => department.id))
                          return
                        }
                        setSelectedAssignEmployeeIds(filteredAssignEmployees.map((employee) => employee.id))
                      }}
                    >
                      Tout selectionner
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => {
                        if (assignMode === "departments") {
                          setSelectedAssignDepartmentIds([])
                          return
                        }
                        setSelectedAssignEmployeeIds([])
                      }}
                    >
                      Tout vider
                    </Button>
                  </div>
                </div>

                <div className="rounded-[4px] border border-white/10 bg-black/10 p-3">
                  <Input
                    value={assignSearch}
                    onChange={(event) => setAssignSearch(event.target.value)}
                    placeholder={
                      assignMode === "departments"
                        ? "Rechercher un departement..."
                        : "Rechercher une personne..."
                    }
                    className="border-white/10 bg-black/20 text-white"
                  />
                  <p className="mt-2 text-xs text-white/55">
                    {assignMode === "departments"
                      ? `${selectedAssignDepartmentIds.length} selectionne(s) / ${filteredAssignDepartments.length} affiche(s)`
                      : `${selectedAssignEmployeeIds.length} selectionne(s) / ${filteredAssignEmployees.length} affiche(s)`}
                  </p>
                </div>

                {assignMode === "departments" ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={includeSubDepartments}
                        onChange={(event) => setIncludeSubDepartments(event.target.checked)}
                      />
                      Inclure les sous-departements
                    </label>
                    <div className="max-h-72 space-y-2 overflow-y-auto rounded-[4px] border border-white/10 bg-black/10 p-3">
                      {filteredAssignDepartments.map((department) => (
                        <label
                          key={`assign-department-${department.id}`}
                          className="flex cursor-pointer items-center gap-2 rounded-[4px] border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignDepartmentIds.includes(department.id)}
                            onChange={(event) => toggleAssignDepartment(department.id, event.target.checked)}
                          />
                          <span>{department.name}</span>
                        </label>
                      ))}
                      {departments.length === 0 ? (
                        <p className="text-sm text-white/45">Aucun departement disponible.</p>
                      ) : filteredAssignDepartments.length === 0 ? (
                        <p className="text-sm text-white/45">Aucun departement ne correspond a la recherche.</p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-[4px] border border-white/10 bg-black/10 p-3">
                    {filteredAssignEmployees.map((employee) => (
                      <label
                        key={`assign-employee-${employee.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-[4px] border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignEmployeeIds.includes(employee.id)}
                          onChange={(event) => toggleAssignEmployee(employee.id, event.target.checked)}
                        />
                        <span>
                          {employee.name || employee.employee_no}
                          {employee.effective_planning?.name
                            ? ` (actuel: ${employee.effective_planning.name})`
                            : " (actuel: aucun)"}
                        </span>
                      </label>
                    ))}
                    {employees.length === 0 ? (
                      <p className="text-sm text-white/45">Aucune personne disponible.</p>
                    ) : filteredAssignEmployees.length === 0 ? (
                      <p className="text-sm text-white/45">Aucune personne ne correspond a la recherche.</p>
                    ) : null}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closeAssignPlanningDialog(false)}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  disabled={isAssigningPlanning}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => void handleAssignPlanning()}
                  disabled={
                    isAssigningPlanning ||
                    !assignPlanningTarget ||
                    (assignMode === "employees" && selectedAssignEmployeeIds.length === 0) ||
                    (assignMode === "departments" && selectedAssignDepartmentIds.length === 0)
                  }
                >
                  {isAssigningPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Attribuer maintenant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createShiftOpen} onOpenChange={closeShiftDialog}>
            <DialogContent className="max-w-xl rounded-[4px] border-white/10 bg-[#2f3138] text-white">
              <DialogHeader>
                <DialogTitle>{editingShift ? "Modifier un quart de travail" : "Creer un quart de travail"}</DialogTitle>
                <DialogDescription className="text-white/55">
                  {editingShift
                    ? "Met a jour ce quart reutilisable pour les equipes et les employes."
                    : "Ajoute un quart reutilisable pour les equipes et les employes."}
                </DialogDescription>
              </DialogHeader>
                <div className="grid gap-3 py-2">
                {error?.scope === "shift_dialog" && (
                  <div
                    role="alert"
                    className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-rose-200/80">
                      Code: {error.code}
                    </p>
                    <p className="mt-1">{error.message}</p>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Nom du quart"
                    value={newShift.name ?? ""}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, name: event.target.value }))}
                    className="border-white/10 bg-black/15 text-white"
                  />
                  <Input
                    placeholder="Code"
                    value={newShift.code ?? ""}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, code: event.target.value }))}
                    className="border-white/10 bg-black/15 text-white"
                  />
                </div>
                <Input
                  placeholder="Description"
                  value={newShift.description ?? ""}
                  onChange={(event) => setNewShift((prev) => ({ ...prev, description: event.target.value }))}
                  className="border-white/10 bg-black/15 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-white/70">Heure de debut de service</p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      lang="fr-FR"
                      pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                      placeholder="Ex: 22, 2200, 22:30"
                      value={newShift.start_time ?? ""}
                      onChange={(event) => setNewShift((prev) => ({ ...prev, start_time: event.target.value }))}
                      onBlur={() => normalizeShiftTimeField("start_time")}
                      className="border-white/10 bg-black/15 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white/70">Heure de fin de service</p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      lang="fr-FR"
                      pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                      placeholder="Ex: 6, 0600, 06:00"
                      value={newShift.end_time ?? ""}
                      onChange={(event) => setNewShift((prev) => ({ ...prev, end_time: event.target.value }))}
                      onBlur={() => normalizeShiftTimeField("end_time")}
                      className="border-white/10 bg-black/15 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/70">Pause</p>
                    <Switch
                      checked={newShift.break_enabled}
                      onCheckedChange={(checked) =>
                        setNewShift((prev) => ({
                          ...prev,
                          break_enabled: checked,
                          break_start_time: checked ? prev.break_start_time || "12:00" : "",
                          break_end_time: checked ? prev.break_end_time || "13:00" : "",
                        }))
                      }
                    />
                  </div>
                  {newShift.break_enabled ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-xs text-white/70">Heure de debut de pause (optionnel)</p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang="fr-FR"
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          placeholder="Ex: 12, 1230, 12:30"
                          value={newShift.break_start_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, break_start_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("break_start_time")}
                          className="border-white/10 bg-black/15 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-white/70">Heure de fin de pause (optionnel)</p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang="fr-FR"
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          placeholder="Ex: 13, 1300, 13:00"
                          value={newShift.break_end_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, break_end_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("break_end_time")}
                          className="border-white/10 bg-black/15 text-white"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/70">Heures supplementaires</p>
                    <Switch
                      checked={newShift.overtime_enabled}
                      onCheckedChange={(checked) =>
                        setNewShift((prev) => ({
                          ...prev,
                          overtime_enabled: checked,
                          overtime_start_time: checked
                            ? prev.overtime_start_time || addMinutesToClock(prev.end_time, 60)
                            : "",
                          overtime_end_time: checked
                            ? prev.overtime_end_time || addMinutesToClock(prev.end_time, 120)
                            : "",
                        }))
                      }
                    />
                  </div>
                  {newShift.overtime_enabled ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-xs text-white/70">Heure sup de debut (optionnel)</p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang="fr-FR"
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          value={newShift.overtime_start_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, overtime_start_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("overtime_start_time")}
                          placeholder="Ex: 18, 1830, 18:30"
                          className="border-white/10 bg-black/15 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-white/70">Heure sup de fin (optionnel)</p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang="fr-FR"
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          value={newShift.overtime_end_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, overtime_end_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("overtime_end_time")}
                          placeholder="Ex: 20, 2000, 20:00"
                          className="border-white/10 bg-black/15 text-white"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-white/70">Retard tolere (min)</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={newShift.late_allowable_minutes ?? ""}
                      onChange={(event) =>
                        setNewShift((prev) => ({ ...prev, late_allowable_minutes: event.target.value }))
                      }
                      className="border-white/10 bg-black/15 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white/70">Marge depart anticipe (min)</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={newShift.early_leave_allowable_minutes ?? ""}
                      onChange={(event) =>
                        setNewShift((prev) => ({ ...prev, early_leave_allowable_minutes: event.target.value }))
                      }
                      className="border-white/10 bg-black/15 text-white"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closeShiftDialog(false)}
                  disabled={isSavingShift}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  Annuler
                </Button>
                <Button onClick={() => void handleSaveShift()} disabled={isSavingShift}>
                  {isSavingShift && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingShift ? "Mettre a jour" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createPlanningOpen} onOpenChange={closePlanningDialog}>
            <DialogContent className="top-[4vh] w-[min(96vw,1320px)] max-w-[min(96vw,1320px)] max-h-[92vh] translate-y-0 overflow-y-auto rounded-[4px] border-white/10 bg-[#2f3138] text-white">
              <DialogHeader>
                <DialogTitle>{editingPlanning ? "Modifier un planning" : "Creer un planning"}</DialogTitle>
                <DialogDescription className="text-white/55">
                  {editingPlanning
                    ? "Mets a jour le cycle hebdomadaire de ce timetable."
                    : "Definis un cycle hebdomadaire qui servira de base aux timetables."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-1">
                {error?.scope === "planning_dialog" && (
                  <div
                    role="alert"
                    className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-rose-200/80">
                      Code: {error.code}
                    </p>
                    <p className="mt-1">{error.message}</p>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  <Input
                    placeholder="Nom du planning"
                    value={newPlanning.name ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, name: event.target.value }))}
                    className="border-white/10 bg-black/15 text-white"
                  />
                  <Input
                    placeholder="Code"
                    value={newPlanning.code ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, code: event.target.value }))}
                    className="border-white/10 bg-black/15 text-white"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Description"
                    value={newPlanning.description ?? ""}
                    onChange={(event) =>
                      setNewPlanning((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="border-white/10 bg-black/15 text-white"
                  />
                  <Input
                    placeholder="Timezone"
                    value={newPlanning.timezone ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, timezone: event.target.value }))}
                    className="border-white/10 bg-black/15 text-white"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {workShifts.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", String(shift.id))
                          setDraggedShiftId(shift.id)
                        }}
                        onDragEnd={() => setDraggedShiftId(null)}
                        onClick={() => setSelectedShiftId((current) => (current === shift.id ? null : shift.id))}
                        className={cn(
                          "rounded-[4px] border px-3 py-2 text-sm font-medium transition-colors",
                          selectedShiftId === shift.id
                            ? "border-[#ff3f61] bg-[#2e3440] text-white"
                            : "border-white/20 bg-[#2b3039] text-white/90 hover:bg-[#343a45]"
                        )}
                      >
                        {shift.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-white/75">
                      <Button
                        type="button"
                        variant={planningEditorMode === "builder" ? "default" : "outline"}
                        size="sm"
                        className={planningEditorMode === "builder" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                        onClick={() => setPlanningEditorMode("builder")}
                      >
                        Edition par jour
                      </Button>
                      <Button
                        type="button"
                        variant={planningEditorMode === "timeline" ? "default" : "outline"}
                        size="sm"
                        className={planningEditorMode === "timeline" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                        onClick={() => setPlanningEditorMode("timeline")}
                      >
                        Apercu timeline
                      </Button>
                    </div>
                    <div className="text-white/70">
                      {selectedShiftId
                        ? `${workShiftsById.get(selectedShiftId)?.name ?? "Shift"} : ${formatTime(
                            workShiftsById.get(selectedShiftId)?.start_time
                          )} - ${formatTime(workShiftsById.get(selectedShiftId)?.end_time)}`
                        : "Aucun shift selectionne"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-4 text-white/75">
                      <button
                        type="button"
                        onClick={deleteSelectedShiftFromDays}
                        disabled={!selectedShiftId}
                        className="text-white/80 transition-colors hover:text-white disabled:opacity-40"
                      >
                        Supprimer le shift selectionne partout
                      </button>
                      <button
                        type="button"
                        onClick={clearPlanningGrid}
                        className="text-white/80 transition-colors hover:text-white"
                      >
                        Vider la semaine
                      </button>
                    </div>
                  </div>

                  {planningEditorMode === "builder" ? (
                    <div className="rounded-[4px] border border-white/10 bg-[#30343d] p-3">
                      <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/50">
                        Edition stable: ajoute/supprime par jour, sans decalage visuel
                      </div>
                      <div className="space-y-1.5">
                        {WEEK_DAYS.map((day) => {
                          const slot = newPlanning.dailySlots[day.key]
                          const MAX_VISIBLE_DAY_SHIFTS = 2
                          const visibleShiftIds = slot.shiftIds.slice(0, MAX_VISIBLE_DAY_SHIFTS)
                          const hiddenShiftIds = slot.shiftIds.slice(MAX_VISIBLE_DAY_SHIFTS)
                          const hiddenShiftDetails = hiddenShiftIds
                            .map((shiftId) => {
                              const shift = workShiftsById.get(shiftId)
                              if (!shift) return null
                              return `${shift.name} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`
                            })
                            .filter((item): item is string => Boolean(item))
                            .join("\n")
                          return (
                            <div key={`builder-${day.key}`} className="rounded-[4px] border border-white/10 bg-black/10 px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-[52px] shrink-0 text-xs font-semibold text-white">{day.label.slice(0, 3)}</div>
                                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                                  <div className="relative">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 border-white/15 bg-white/5 px-1.5 text-[10px] text-white hover:bg-white/10"
                                      onClick={() => setCopyMenuDay((current) => (current === day.key ? null : day.key))}
                                    >
                                      Dup
                                    </Button>
                                    {copyMenuDay === day.key ? (
                                      <div className="absolute left-0 top-8 z-20 w-[150px] rounded-[4px] border border-white/15 bg-[#242933] p-1.5 shadow-xl">
                                        <button
                                          type="button"
                                          onClick={() => copyDayWithPreset(day.key, "next")}
                                          className="block w-full rounded-[4px] px-2 py-1 text-left text-[11px] text-white/85 hover:bg-white/10"
                                        >
                                          Vers jour suivant
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => copyDayWithPreset(day.key, "weekdays")}
                                          className="mt-1 block w-full rounded-[4px] px-2 py-1 text-left text-[11px] text-white/85 hover:bg-white/10"
                                        >
                                          Vers Lun-Ven
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => copyDayWithPreset(day.key, "weekend")}
                                          className="mt-1 block w-full rounded-[4px] px-2 py-1 text-left text-[11px] text-white/85 hover:bg-white/10"
                                        >
                                          Vers Week-end
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => copyDayWithPreset(day.key, "all")}
                                          className="mt-1 block w-full rounded-[4px] px-2 py-1 text-left text-[11px] text-white/85 hover:bg-white/10"
                                        >
                                          Vers tous les jours
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-white/70">
                                    <span>R</span>
                                    <Switch
                                      checked={slot.isRestDay}
                                      onCheckedChange={(checked) => setDayRestMode(day.key, checked)}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 border-white/15 bg-white/5 px-1.5 text-[10px] text-white hover:bg-white/10"
                                    disabled={!selectedShiftId || slot.isRestDay}
                                    onClick={() => selectedShiftId && addShiftToDay(day.key, selectedShiftId)}
                                  >
                                    +
                                  </Button>
                                  {slot.isRestDay ? (
                                    <span className="rounded-[4px] border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-200">
                                      Repos
                                    </span>
                                  ) : slot.shiftIds.length ? (
                                    visibleShiftIds.map((shiftId) => {
                                      const shift = workShiftsById.get(shiftId)
                                      if (!shift) return null
                                      return (
                                        <button
                                          key={`builder-chip-${day.key}-${shiftId}`}
                                          type="button"
                                          onClick={() => removeShiftFromDay(day.key, shiftId)}
                                          className="min-w-0 rounded-[4px] border border-sky-400/35 bg-[#5da2ff]/20 px-1.5 py-0.5 text-[10px] text-sky-100 hover:bg-[#5da2ff]/30"
                                          title={`${shift.name} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)} (clic pour retirer)`}
                                        >
                                          <span className="block max-w-[190px] truncate">
                                            {shift.name} {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
                                          </span>
                                        </button>
                                      )
                                    })
                                  ) : (
                                    <span className="text-[10px] text-white/45">Aucun</span>
                                  )}
                                  {!slot.isRestDay && hiddenShiftIds.length > 0 ? (
                                    <button
                                      type="button"
                                      className="rounded-[4px] border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[10px] text-amber-100 hover:bg-amber-300/20"
                                      title={hiddenShiftDetails || `${hiddenShiftIds.length} quart(s) supplementaire(s)`}
                                    >
                                      +{hiddenShiftIds.length}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[4px] border border-white/10 bg-[#30343d] p-3 overflow-x-hidden">
                      <div className="min-w-0">
                        <div className="mb-2 grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 text-[11px] text-white/65">
                          <div className="px-1">Time</div>
                          <div>
                            <div className="flex items-center justify-between md:hidden">
                              {HOUR_MARKERS_6H.map((hour) => (
                                <span key={`mobile-${hour}`} className="text-center text-white/80">
                                  {String(hour).padStart(2, "0")}:00
                                </span>
                              ))}
                            </div>
                            <div className="hidden items-center justify-between md:flex">
                              {HOUR_MARKERS_4H.map((hour) => (
                                <span key={`desktop-${hour}`} className="text-center text-white/80">
                                  {String(hour).padStart(2, "0")}:00
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {WEEK_DAYS.map((day) => {
                            const slot = newPlanning.dailySlots[day.key]
                            const previousDayKey = day.key === 0 ? 6 : day.key - 1
                            const previousSlot = newPlanning.dailySlots[previousDayKey]
                            const rowBlocks: Array<{
                              key: string
                              shiftId: number
                              sourceDayKey: number
                              left: number
                              width: number
                              label: string
                              startMinutes: number
                              endMinutes: number
                            }> = []

                            slot.shiftIds.forEach((shiftId, index) => {
                              const shift = workShiftsById.get(shiftId)
                              if (!shift) return
                              const segments = toTimelineSegments(shift.start_time, shift.end_time).filter(
                                (segment) => segment.dayOffset === 0
                              )
                              segments.forEach((segment, segmentIndex) => {
                                const shiftStart = timeToMinutes(shift.start_time)
                                const shiftEnd = timeToMinutes(shift.end_time)
                                const isOvernight = shiftEnd <= shiftStart
                                const effectiveStart = segmentIndex === 0 ? shiftStart : 0
                                const effectiveEnd = isOvernight ? 1440 : shiftEnd
                                rowBlocks.push({
                                  key: `${day.key}-${shiftId}-own-${index}-${segmentIndex}`,
                                  shiftId,
                                  sourceDayKey: day.key,
                                  left: segment.left,
                                  width: segment.width,
                                  label: `${shift.name} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`,
                                  startMinutes: effectiveStart,
                                  endMinutes: effectiveEnd > effectiveStart ? effectiveEnd : effectiveStart + 1,
                                })
                              })
                            })

                            previousSlot.shiftIds.forEach((shiftId, index) => {
                              const shift = workShiftsById.get(shiftId)
                              if (!shift) return
                              const carrySegments = toTimelineSegments(shift.start_time, shift.end_time).filter(
                                (segment) => segment.dayOffset === 1
                              )
                              carrySegments.forEach((segment, segmentIndex) => {
                                const effectiveEnd = timeToMinutes(shift.end_time)
                                rowBlocks.push({
                                  key: `${day.key}-${shiftId}-carry-${index}-${segmentIndex}`,
                                  shiftId,
                                  sourceDayKey: previousDayKey,
                                  left: segment.left,
                                  width: segment.width,
                                  label: `${shift.name} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`,
                                  startMinutes: 0,
                                  endMinutes: effectiveEnd > 0 ? effectiveEnd : 1,
                                })
                              })
                            })

                            const sortedBlocks = [...rowBlocks].sort((a, b) => {
                              if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
                              if (a.endMinutes !== b.endMinutes) return b.endMinutes - a.endMinutes
                              return a.key.localeCompare(b.key)
                            })

                            const laneEnds: number[] = []
                            const laidOutBlocks = sortedBlocks.map((block) => {
                              let lane = 0
                              while (lane < laneEnds.length && block.startMinutes < laneEnds[lane]) {
                                lane += 1
                              }
                              if (lane === laneEnds.length) {
                                laneEnds.push(block.endMinutes)
                              } else {
                                laneEnds[lane] = block.endMinutes
                              }
                              return { ...block, lane }
                            })

                            return (
                              <div key={day.key} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2">
                                <div className="text-sm text-white/90">{day.label.slice(0, 3)}.</div>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleDayClick(day.key)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault()
                                      handleDayClick(day.key)
                                    }
                                  }}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    event.preventDefault()
                                    const shiftId = Number(event.dataTransfer.getData("text/plain")) || draggedShiftId
                                    if (shiftId) addShiftToDay(day.key, shiftId)
                                    setDraggedShiftId(null)
                                  }}
                                  className="relative min-w-0 overflow-hidden rounded-[3px] border border-white/10 bg-[#262b33] px-1 py-1"
                                >
                                  <div className="pointer-events-none absolute inset-0 grid grid-cols-48">
                                    {Array.from({ length: 48 }, (_, tick) => (
                                      <div
                                        key={`${day.key}-tick-${tick}`}
                                        className={cn("border-r border-white/8", tick === 47 && "border-r-0")}
                                      />
                                    ))}
                                  </div>
                                  <div
                                    className="relative"
                                    style={{ minHeight: `${Math.max(22, laneEnds.length * 20)}px` }}
                                  >
                                    {laidOutBlocks.map((block) => {
                                      const showLabel = block.width >= 8
                                      return (
                                        <button
                                          key={block.key}
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            removeShiftFromDay(block.sourceDayKey, block.shiftId)
                                          }}
                                          className="absolute h-[18px] overflow-hidden whitespace-nowrap rounded-[3px] border border-sky-400/35 bg-[#5da2ff] px-2 text-[11px] text-white"
                                          style={{
                                            left: `${block.left}%`,
                                            width: `${block.width}%`,
                                            top: `${block.lane * 20}px`,
                                          }}
                                          title={block.label}
                                        >
                                          {showLabel ? <span className="block truncate">{block.label}</span> : null}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closePlanningDialog(false)}
                  disabled={isSavingPlanning}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  Annuler
                </Button>
                <Button onClick={() => void handleSavePlanning()} disabled={isSavingPlanning}>
                  {isSavingPlanning && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingPlanning ? "Mettre a jour" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <HrPlanningGuideDialog
            open={hrGuideOpen}
            onOpenChange={setHrGuideOpen}
            onOpenCreateShiftDialog={openCreateShiftDialog}
            onOpenCreatePlanningDialog={openCreatePlanningDialog}
            onRunQuickAssignFlow={openAssignPlanningFromGuide}
            isPreparingAssign={isPreparingGuideAssign}
            stats={hrGuideStats}
          />
        </main>
      </div>
    </div>
  )
}
