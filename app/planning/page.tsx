"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  DEMO_DEPARTMENTS_DATA,
  DEMO_EMPLOYEES_RAW,
  DEMO_WORK_SHIFTS_DATA,
} from "@/lib/mock-data/demo-employees"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  PlanningCreationWizardDialog,
  type PlanningCreationWizardDepartment,
  type PlanningCreationWizardEmployee,
  type PlanningCreationWizardPayload,
  type PlanningWizardCase,
} from "@/components/planning/planning-creation-wizard-dialog"
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
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Shapes,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

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

const COMMON_TIMEZONES = [
  "UTC",
  "Africa/Abidjan",
  "Africa/Casablanca",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
]

function getUtcOffsetLabel(timeZone: string, referenceDate = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const parts = formatter.formatToParts(referenceDate)
    const tzPart = parts.find((part) => part.type === "timeZoneName")?.value ?? ""
    const normalized = tzPart.replace(/\s+/g, "").toUpperCase()

    if (normalized === "GMT" || normalized === "UTC") {
      return "+00:00"
    }

    const match = normalized.match(/(?:GMT|UTC)?([+-]\d{1,2})(?::?(\d{2}))?/)
    if (!match) {
      return "+00:00"
    }

    const hoursRaw = Number.parseInt(match[1] ?? "0", 10)
    const sign = hoursRaw < 0 ? "-" : "+"
    const hours = String(Math.abs(hoursRaw)).padStart(2, "0")
    const minutes = String(Number.parseInt(match[2] ?? "0", 10)).padStart(2, "0")
    return `${sign}${hours}:${minutes}`
  } catch {
    return "+00:00"
  }
}

function utcOffsetToMinutes(offset: string) {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) {
    return 0
  }
  const sign = match[1] === "-" ? -1 : 1
  const hours = Number.parseInt(match[2] ?? "0", 10)
  const minutes = Number.parseInt(match[3] ?? "0", 10)
  return sign * (hours * 60 + minutes)
}

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

type WizardShiftBinding = {
  input: PlanningWizardCase
  workShift: WorkShiftApiItem
  scope: "weekday" | "weekend"
}

const WEEKDAY_DAY_KEYS = [0, 1, 2, 3, 4]
const WEEKEND_DAY_KEYS = [5, 6]

function getCurrentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDefaultAssignDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(start.getFullYear() + 10, start.getMonth(), start.getDate())
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  }
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

function normalizeWeekDayIndex(value: number) {
  return ((value % 7) + 7) % 7
}

function resolveRecurringEntryDay(entry: PlanningEntryApiItem): number | null {
  if (entry.day_of_week != null) {
    return normalizeWeekDayIndex(entry.day_of_week)
  }
  if (entry.sequence_index != null) {
    return normalizeWeekDayIndex(entry.sequence_index)
  }
  return null
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
        label: workShiftsById.get(shiftId)?.name ?? WEEK_DAYS[day]?.label ?? "Quart",
        metadata: {},
      })
    })
  })

  return entries
}

function buildDailySlotsFromPlanning(
  planning: PlanningApiItem,
  workShiftsById: Map<number, WorkShiftApiItem>
): Record<number, WeeklySlotForm> {
  const next = buildDefaultWeek()
  let hasWeeklyEntries = false
  const recurringEntries = (planning.entries ?? []).filter(
    (entry) =>
      entry.start_date == null &&
      entry.end_date == null &&
      (entry.day_of_week != null || entry.sequence_index != null)
  )

  for (const entry of recurringEntries) {
    const day = resolveRecurringEntryDay(entry)
    if (day == null || !(day in next)) {
      continue
    }
    if (entry.is_rest_day) {
      next[day] = { shiftIds: [], isRestDay: true }
      hasWeeklyEntries = true
      continue
    }
    const shiftId = entry.work_shift ?? null
    if (!shiftId || !workShiftsById.has(shiftId)) {
      continue
    }
    if (next[day].isRestDay || next[day].shiftIds.includes(shiftId)) {
      continue
    }
    next[day] = {
      ...next[day],
      shiftIds: [...next[day].shiftIds, shiftId],
    }
    hasWeeklyEntries = true
  }

  if (hasWeeklyEntries) {
    return next
  }

  const shifts = [...workShiftsById.values()]
  const resolveSlotShiftId = (slot: PlanningApiItem["daily_slots"][number]) => {
    const start = slot.start_time ?? ""
    const end = slot.end_time ?? ""
    const label = (slot.label ?? "").trim().toLowerCase()
    const byTime = shifts.filter((shift) => shift.start_time === start && shift.end_time === end)
    if (byTime.length === 0) {
      return null
    }
    if (!label) {
      return byTime[0]?.id ?? null
    }
    const strictLabelMatch = byTime.find((shift) => shift.name.trim().toLowerCase() === label)
    if (strictLabelMatch) {
      return strictLabelMatch.id
    }
    return byTime[0]?.id ?? null
  }

  for (const slot of planning.daily_slots ?? []) {
    const day = slot.day_of_week
    if (!(day in next)) {
      continue
    }
    if (slot.slot_type === "rest") {
      next[day] = { shiftIds: [], isRestDay: true }
      continue
    }
    if (next[day].isRestDay) {
      continue
    }
    const matchedShiftId = resolveSlotShiftId(slot)
    if (!matchedShiftId || next[day].shiftIds.includes(matchedShiftId)) {
      continue
    }
    next[day] = {
      ...next[day],
      shiftIds: [...next[day].shiftIds, matchedShiftId],
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

function buildWizardPlanningCode(name: string) {
  const baseCode =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "PLANNING"
  return `${baseCode}-${Date.now().toString().slice(-5)}`
}

function createRestEntry(day: number): PlanningEntryApiItem {
  return {
    day_of_week: day,
    sequence_index: null,
    start_date: null,
    end_date: null,
    work_shift: null,
    is_rest_day: true,
    label: "Repos",
    metadata: {},
  }
}

function createShiftEntry(
  day: number,
  shiftBinding: WizardShiftBinding,
  rotating: boolean
): PlanningEntryApiItem {
  return {
    day_of_week: day,
    sequence_index: null,
    start_date: null,
    end_date: null,
    work_shift: shiftBinding.workShift.id,
    is_rest_day: false,
    label: shiftBinding.input.name,
    metadata: {
      source: "planning_wizard",
      scope: shiftBinding.scope,
      rotating,
    },
  }
}

function applyCaseBindingsToDays(
  entriesByDay: Record<number, PlanningEntryApiItem[]>,
  caseBindings: WizardShiftBinding[],
  targetDays: number[],
  rotating: boolean,
  rotationStartOffset = 0
) {
  if (caseBindings.length === 0) {
    return
  }

  if (rotating) {
    targetDays.forEach((day, index) => {
      const binding = caseBindings[(rotationStartOffset + index) % caseBindings.length]
      entriesByDay[day].push(createShiftEntry(day, binding, true))
    })
    return
  }

  caseBindings.forEach((binding) => {
    binding.input.days
      .filter((day) => targetDays.includes(day))
      .forEach((day) => entriesByDay[day].push(createShiftEntry(day, binding, false)))
  })
}

function buildEntriesFromWizardConfig(
  payload: PlanningCreationWizardPayload,
  weekdayCaseBindings: WizardShiftBinding[],
  weekendCaseBindings: WizardShiftBinding[]
) {
  const entriesByDay: Record<number, PlanningEntryApiItem[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  }

  if (payload.hasWeekdayProgram) {
    applyCaseBindingsToDays(
      entriesByDay,
      weekdayCaseBindings,
      WEEKDAY_DAY_KEYS,
      payload.weekdayRotationEnabled
    )
  }

  if (payload.weekendMode === "different") {
    applyCaseBindingsToDays(
      entriesByDay,
      weekendCaseBindings,
      WEEKEND_DAY_KEYS,
      payload.weekendRotationEnabled
    )
  } else if (payload.weekendMode === "same_as_week" && payload.hasWeekdayProgram && weekdayCaseBindings.length > 0) {
    const weekendDaysSelectedInWeekConfig = Array.from(
      new Set(
        weekdayCaseBindings.flatMap((binding) =>
          binding.input.days.filter((day) => WEEKEND_DAY_KEYS.includes(day))
        )
      )
    ).sort((left, right) => left - right)

    if (payload.weekendRotationEnabled) {
      if (weekendDaysSelectedInWeekConfig.length > 0) {
        applyCaseBindingsToDays(
          entriesByDay,
          weekdayCaseBindings,
          weekendDaysSelectedInWeekConfig,
          true,
          WEEKDAY_DAY_KEYS.length
        )
      }
    } else {
      applyCaseBindingsToDays(
        entriesByDay,
        weekdayCaseBindings,
        WEEKEND_DAY_KEYS,
        false
      )
    }
  }

  return WEEK_DAYS.flatMap((day) =>
    entriesByDay[day.key].length > 0 ? entriesByDay[day.key] : [createRestEntry(day.key)]
  )
}

function formatTime(time: string | null | undefined) {
  return time ? time.slice(0, 5) : "--:--"
}

function normalizePlanningLookupValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
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
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
}

function getPlanningDayEntries(
  planning: PlanningApiItem,
  dayOfWeek: number,
  shiftsById: Map<number, WorkShiftApiItem>
): PlanningSlotChip[] {
  const weeklyEntries = (planning.entries ?? [])
    .filter(
      (entry) =>
        resolveRecurringEntryDay(entry) === dayOfWeek &&
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
      if (entry.is_rest_day) {
        return {
          key: `entry-${entry.id ?? `${dayOfWeek}-rest`}`,
          label: entry.label || "Repos",
          slotType: "rest" as const,
          timeRange: null,
        }
      }

      const workShiftId = entry.work_shift ?? null
      const shift = workShiftId ? shiftsById.get(workShiftId) : null
      return {
        key: `entry-${entry.id ?? `${dayOfWeek}-${workShiftId ?? "unknown"}`}`,
        label: shift?.name ?? entry.label ?? "Quart",
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
  PLANNING_ENTRIES_REQUIRED: "Ajoute au moins un quart ou un jour de repos dans l'emploi de temps.",
  PLANNING_CREATE_FAILED: "Erreur de creation du planning.",
  PLANNING_UPDATE_FAILED: "Erreur de modification du planning.",
  SHIFT_DELETE_FAILED: "Erreur de suppression du quart.",
  ASSIGN_PLANNING_FAILED: "Erreur d'assignation du planning.",
  ASSIGN_DATE_RANGE_INVALID: "La date de fin doit etre superieure ou egale a la date de debut.",
  PLANNING_DELETE_FAILED: "Erreur de suppression de l'emploi de temps.",
  WIZARD_TENANT_MISSING: "Tenant introuvable pour creer le planning depuis le wizard.",
  WIZARD_CREATE_FAILED: "Erreur lors de la creation du planning depuis le wizard.",
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
  const searchParams = useSearchParams()
  const [activeView, setActiveView] = useState<PlanningView | null>("schedule")
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
  const [showScrollCue, setShowScrollCue] = useState(true)
  const [createShiftOpen, setCreateShiftOpen] = useState(false)
  const [createPlanningOpen, setCreatePlanningOpen] = useState(false)
  const [isSavingShift, setIsSavingShift] = useState(false)
  const [isSavingPlanning, setIsSavingPlanning] = useState(false)
  const [deletingShiftId, setDeletingShiftId] = useState<number | null>(null)
  const [deletingPlanningId, setDeletingPlanningId] = useState<number | null>(null)
  const [pendingShiftDelete, setPendingShiftDelete] = useState<WorkShiftApiItem | null>(null)
  const [pendingPlanningDelete, setPendingPlanningDelete] = useState<PlanningApiItem | null>(null)
  const [forceShiftDelete, setForceShiftDelete] = useState(false)
  const [forcePlanningDelete, setForcePlanningDelete] = useState(false)
  const [editingShift, setEditingShift] = useState<WorkShiftApiItem | null>(null)
  const [editingPlanning, setEditingPlanning] = useState<PlanningApiItem | null>(null)
  const [isAssigningPlanning, setIsAssigningPlanning] = useState(false)
  const [assignPlanningOpen, setAssignPlanningOpen] = useState(false)
  const [assignPlanningTarget, setAssignPlanningTarget] = useState<PlanningApiItem | null>(null)
  const [planningPreviewTarget, setPlanningPreviewTarget] = useState<PlanningApiItem | null>(null)
  const [assignMode, setAssignMode] = useState<"departments" | "employees">("employees")
  const [selectedAssignEmployeeIds, setSelectedAssignEmployeeIds] = useState<number[]>([])
  const [selectedAssignDepartmentIds, setSelectedAssignDepartmentIds] = useState<number[]>([])
  const [assignStartDate, setAssignStartDate] = useState(() => getDefaultAssignDateRange().startDate)
  const [assignEndDate, setAssignEndDate] = useState(() => getDefaultAssignDateRange().endDate)
  const [includeSubDepartments, setIncludeSubDepartments] = useState(false)
  const [assignSearch, setAssignSearch] = useState("")
  const [wizardOpen, setWizardOpen] = useState(false)
  const [isCreatingWizardPlanning, setIsCreatingWizardPlanning] = useState(false)
  const [planningListPage, setPlanningListPage] = useState(1)

  const timetableRef = useRef<HTMLElement | null>(null)
  const shiftRef = useRef<HTMLElement | null>(null)
  const scheduleRef = useRef<HTMLElement | null>(null)
  const handledQueryActionRef = useRef<string | null>(null)

  const [newShift, setNewShift] = useState(buildDefaultShiftForm)
  const [newPlanning, setNewPlanning] = useState(buildDefaultPlanningForm)
  const [draggedShiftId, setDraggedShiftId] = useState<number | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [planningEditorMode, setPlanningEditorMode] = useState<"builder" | "timeline">("builder")
  const [copyMenuDay, setCopyMenuDay] = useState<number | null>(null)
  const [copySelectionDays, setCopySelectionDays] = useState<number[]>([])
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
  const focusView = useCallback((view: PlanningView) => {
    setActiveView(view)
    const targetRef =
      view === "timetable" ? timetableRef.current : view === "shift" ? shiftRef.current : scheduleRef.current
    targetRef?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const planningCards = useMemo(
    () => [
      {
        key: "schedule" as const,
        label: "Calendrier des quarts",
        helper: "Calendrier mensuel",
        icon: CalendarRange,
        action: () => focusView("schedule"),
      },
      {
        key: "timetable" as const,
        label: "Emploi de temps",
        helper: `${plannings.length} existant${plannings.length > 1 ? "s" : ""}`,
        icon: Plus,
        action: () => focusView("timetable"),
      },
      {
        key: "shift" as const,
        label: "Quart",
        helper: `${workShifts.length} existant${workShifts.length > 1 ? "s" : ""}`,
        icon: Shapes,
        action: () => focusView("shift"),
      },
    ],
    [focusView, plannings.length, workShifts.length]
  )

  const timezoneOptions = useMemo(() => {
    const options = new Set<string>(COMMON_TIMEZONES)
    const currentTimezone = newPlanning.timezone?.trim()
    if (currentTimezone) {
      options.add(currentTimezone)
    }

    const intlWithSupportedValues = Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[]
    }
    const supportedTimezones = intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? []
    supportedTimezones.forEach((timezone) => options.add(timezone))

    return Array.from(options)
      .map((timezone) => {
        const offset = getUtcOffsetLabel(timezone)
        return {
          value: timezone,
          offset,
          offsetMinutes: utcOffsetToMinutes(offset),
          label: `UTC${offset} - ${timezone}`,
        }
      })
      .sort(
        (left, right) =>
          left.offsetMinutes - right.offsetMinutes || left.value.localeCompare(right.value)
      )
  }, [newPlanning.timezone])

  const planningRecap = useMemo(() => {
    const assignedByPlanning = new Map<number, number>()
    employees.forEach((employee) => {
      const planningId = employee.effective_planning?.id
      if (!planningId) {
        return
      }
      assignedByPlanning.set(planningId, (assignedByPlanning.get(planningId) ?? 0) + 1)
    })

    return plannings.map((planning) => {
      const weekdayModes = WEEKDAY_DAY_KEYS.map((day) =>
        getPlanningDayEntries(planning, day, workShiftsById).some((entry) => entry.slotType !== "rest")
      )
      const weekendModes = WEEKEND_DAY_KEYS.map((day) =>
        getPlanningDayEntries(planning, day, workShiftsById).some((entry) => entry.slotType !== "rest")
      )
      const weekdaysWithProgram = weekdayModes.filter(Boolean).length
      const weekendWithProgram = weekendModes.filter(Boolean).length
      const uniqueShiftIds = new Set(
        (planning.entries ?? [])
          .map((entry) => entry.work_shift)
          .filter((workShift): workShift is number => Boolean(workShift))
      )
      return {
        planning,
        weekdaysWithProgram,
        weekendWithProgram,
        shiftCount: uniqueShiftIds.size,
        assignedEmployees: assignedByPlanning.get(planning.id) ?? 0,
      }
    })
  }, [employees, plannings, workShiftsById])

  const planningPreviewRecap = useMemo(() => {
    if (!planningPreviewTarget) return null
    return planningRecap.find((item) => item.planning.id === planningPreviewTarget.id) ?? null
  }, [planningPreviewTarget, planningRecap])
  const planningPreviewDayEntries = useMemo(() => {
    if (!planningPreviewTarget) return []

    const weekly = WEEK_DAYS.map((day) => ({
      day,
      entries: getPlanningDayEntries(planningPreviewTarget, day.key, workShiftsById),
    }))
    const hasWeekly = weekly.some((item) => item.entries.length > 0)
    if (hasWeekly) {
      return weekly
    }

    const derivedByDay = new Map<number, PlanningSlotChip[]>()
    WEEK_DAYS.forEach((day) => derivedByDay.set(day.key, []))

    const addDerivedSlot = (
      dayKey: number,
      slot: { label: string; timeRange: string | null; slotType: "work" | "shift" | "rest" }
    ) => {
      const current = derivedByDay.get(dayKey) ?? []
      const key = `${slot.slotType}|${slot.label}|${slot.timeRange ?? ""}`
      if (current.some((item) => item.key === key)) {
        return
      }
      current.push({ key, label: slot.label, timeRange: slot.timeRange, slotType: slot.slotType })
      derivedByDay.set(dayKey, current)
    }

    ;(planningPreviewTarget.entries ?? []).forEach((entry, index) => {
      const shift = entry.work_shift ? workShiftsById.get(entry.work_shift) : null
      const label = shift?.name ?? entry.label ?? (entry.is_rest_day ? "Repos" : "Quart")
      const timeRange = shift ? `${formatTime(shift.start_time)}-${formatTime(shift.end_time)}` : null
      const slotType = entry.is_rest_day ? "rest" : "shift"

      if (entry.day_of_week != null && entry.day_of_week >= 0 && entry.day_of_week <= 6) {
        addDerivedSlot(entry.day_of_week, { label, timeRange, slotType })
        return
      }

      if (entry.start_date) {
        const parsed = new Date(`${entry.start_date}T00:00:00`)
        if (!Number.isNaN(parsed.getTime())) {
          const dayKey = (parsed.getDay() + 6) % 7
          addDerivedSlot(dayKey, { label, timeRange, slotType })
          return
        }
      }

      if (entry.sequence_index != null) {
        const normalized = ((entry.sequence_index % 7) + 7) % 7
        addDerivedSlot(normalized, { label, timeRange, slotType })
        return
      }

      const fallbackDay = index % 7
      addDerivedSlot(fallbackDay, { label, timeRange, slotType })
    })

    return WEEK_DAYS.map((day) => ({
      day,
      entries: derivedByDay.get(day.key) ?? [],
    }))
  }, [planningPreviewTarget, workShiftsById])
  const planningPreviewHasWeeklyEntries = useMemo(
    () => planningPreviewDayEntries.some((item) => item.entries.length > 0),
    [planningPreviewDayEntries]
  )
  const planningPreviewNonWeeklyEntries = useMemo(() => {
    if (!planningPreviewTarget) return []
    return (planningPreviewTarget.entries ?? [])
      .filter(
        (entry) =>
          entry.day_of_week == null ||
          entry.sequence_index != null ||
          entry.start_date != null ||
          entry.end_date != null
      )
      .map((entry, index) => {
        const shift = entry.work_shift ? workShiftsById.get(entry.work_shift) : null
        const label = shift?.name ?? entry.label ?? (entry.is_rest_day ? "Repos" : "Entree")
        const timeRange = shift ? `${formatTime(shift.start_time)}-${formatTime(shift.end_time)}` : null
        return {
          key: `${entry.id ?? `non-weekly-${index}`}`,
          label,
          timeRange,
          sequenceIndex: entry.sequence_index,
          startDate: entry.start_date,
          endDate: entry.end_date,
          isRestDay: Boolean(entry.is_rest_day),
        }
      })
      .sort((left, right) => {
        const leftSeq = left.sequenceIndex ?? Number.MAX_SAFE_INTEGER
        const rightSeq = right.sequenceIndex ?? Number.MAX_SAFE_INTEGER
        if (leftSeq !== rightSeq) return leftSeq - rightSeq
        return left.key.localeCompare(right.key)
      })
  }, [planningPreviewTarget, workShiftsById])

  const planningListPageSize = 3
  const planningListTotalPages = Math.max(1, Math.ceil(planningRecap.length / planningListPageSize))
  const paginatedPlanningRecap = useMemo(() => {
    const start = (planningListPage - 1) * planningListPageSize
    return planningRecap.slice(start, start + planningListPageSize)
  }, [planningListPage, planningRecap])

  useEffect(() => {
    setPlanningListPage((current) => Math.min(current, planningListTotalPages))
  }, [planningListTotalPages])

  useEffect(() => {
    if (!planningPreviewTarget) return
    const stillExists = plannings.some((planning) => planning.id === planningPreviewTarget.id)
    if (!stillExists) {
      setPlanningPreviewTarget(null)
    }
  }, [planningPreviewTarget, plannings])

  const shiftMonth = useCallback((delta: number) => {
    const base = new Date(`${month}-01T00:00:00`)
    if (Number.isNaN(base.getTime())) return
    base.setMonth(base.getMonth() + delta)
    const nextMonth = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`
    setMonth(nextMonth)
  }, [month])

  const goCurrentMonth = useCallback(() => {
    setMonth(getCurrentMonthValue())
  }, [])

  const loadBaseData = useCallback(async () => {
    if (!isEmployeeApiEnabled()) {
      // Mode demonstration : charger les donnees fictives
      setEmployees(DEMO_EMPLOYEES_RAW as unknown as EmployeeApiItem[])
      setDepartments(DEMO_DEPARTMENTS_DATA as unknown as DepartmentApiItem[])
      setWorkShifts(DEMO_WORK_SHIFTS_DATA as unknown as WorkShiftApiItem[])
      setPlannings([{
        id: 1,
        tenant: 0,
        name: "Planning Standard RH",
        code: "STD-RH",
        description: "Planning hebdomadaire standard 5j/7",
        timezone: "Africa/Casablanca",
        metadata: {},
        daily_slots: [
          { day_of_week: 0, slot_type: "work", start_time: "08:00", end_time: "17:00", label: "Journee" },
          { day_of_week: 1, slot_type: "work", start_time: "08:00", end_time: "17:00", label: "Journee" },
          { day_of_week: 2, slot_type: "work", start_time: "08:00", end_time: "17:00", label: "Journee" },
          { day_of_week: 3, slot_type: "work", start_time: "08:00", end_time: "17:00", label: "Journee" },
          { day_of_week: 4, slot_type: "work", start_time: "08:00", end_time: "17:00", label: "Journee" },
          { day_of_week: 5, slot_type: "rest", start_time: "00:00", end_time: "00:00", label: "Repos" },
          { day_of_week: 6, slot_type: "rest", start_time: "00:00", end_time: "00:00", label: "Repos" },
        ],
        entries: [],
      } as unknown as PlanningApiItem])
      setTenantId(0)
      setDepartmentsById(new Map(DEMO_DEPARTMENTS_DATA.map((d) => [d.id, d.name])))
      if (!selectedEmployeeId && DEMO_EMPLOYEES_RAW.length > 0) {
        setSelectedEmployeeId(DEMO_EMPLOYEES_RAW[0].id as unknown as number)
      }
      setLoading(false)
      return {
        employeesData: DEMO_EMPLOYEES_RAW as unknown as EmployeeApiItem[],
        departmentsData: DEMO_DEPARTMENTS_DATA as unknown as DepartmentApiItem[],
        shiftsData: DEMO_WORK_SHIFTS_DATA as unknown as WorkShiftApiItem[],
        planningsData: [] as PlanningApiItem[],
      }
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

  useEffect(() => {
    const requestedView = searchParams.get("view")
    const requestedFocus = searchParams.get("focus")
    const nextView =
      requestedView === "timetable" || requestedView === "shift" || requestedView === "schedule"
        ? requestedView
        : requestedFocus === "timetables" || requestedFocus === "planning"
          ? "timetable"
          : requestedFocus === "shifts"
            ? "shift"
            : requestedFocus === "schedule" || requestedFocus === "calendar"
              ? "schedule"
              : null

    if (nextView) {
      focusView(nextView)
    }
  }, [focusView, searchParams])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollCue(window.scrollY < 220)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const requestedMonth = searchParams.get("month")
    if (requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) && requestedMonth !== month) {
      setMonth(requestedMonth)
    }
  }, [month, searchParams])

  useEffect(() => {
    const requestedEmployee = searchParams.get("employee")?.trim()
    if (!requestedEmployee || employees.length === 0) {
      return
    }

    const lookup = normalizePlanningLookupValue(requestedEmployee)
    const matchedEmployee =
      employees.find((employee) => normalizePlanningLookupValue(employee.id) === lookup) ??
      employees.find((employee) => normalizePlanningLookupValue(employee.employee_no) === lookup) ??
      employees.find((employee) => normalizePlanningLookupValue(employee.name).includes(lookup))

    if (!matchedEmployee) {
      return
    }

    if (matchedEmployee.id !== selectedEmployeeId) {
      setSelectedEmployeeId(matchedEmployee.id)
    }
    focusView("schedule")
  }, [employees, focusView, searchParams, selectedEmployeeId])

  useEffect(() => {
    const action = searchParams.get("action")
    if (!action) {
      handledQueryActionRef.current = null
      return
    }

    const signature = [action, searchParams.get("planning") ?? "", searchParams.get("scope") ?? ""].join("|")
    if (handledQueryActionRef.current === signature) {
      return
    }

    if (action === "new-shift") {
      focusView("shift")
      setError(null)
      setEditingShift(null)
      setNewShift(buildDefaultShiftForm())
      setCreateShiftOpen(true)
      handledQueryActionRef.current = signature
      return
    }

    if (action === "new-planning") {
      focusView("timetable")
      setError(null)
      setEditingPlanning(null)
      setSelectedShiftId(null)
      setPlanningEditorMode("builder")
      setCopyMenuDay(null)
      setNewPlanning(buildDefaultPlanningForm())
      setCreatePlanningOpen(true)
      handledQueryActionRef.current = signature
      return
    }

    if (action !== "assign-planning" || plannings.length === 0) {
      return
    }

    const planningLookup = normalizePlanningLookupValue(searchParams.get("planning"))
    const matchedPlanning =
      (planningLookup
        ? plannings.find((planning) => normalizePlanningLookupValue(planning.id) === planningLookup) ??
          plannings.find((planning) => normalizePlanningLookupValue(planning.code) === planningLookup) ??
          plannings.find((planning) => normalizePlanningLookupValue(planning.name).includes(planningLookup))
        : plannings[0]) ?? null

    if (!matchedPlanning) {
      return
    }

    const nextAssignMode = searchParams.get("scope") === "departments" ? "departments" : "employees"
    focusView("timetable")
    setError(null)
    setAssignPlanningTarget(matchedPlanning)
    setAssignMode(nextAssignMode)
    setAssignSearch("")
    setSelectedAssignEmployeeIds([])
    setSelectedAssignDepartmentIds([])
    setIncludeSubDepartments(false)
    setAssignPlanningOpen(true)
    handledQueryActionRef.current = signature
  }, [focusView, plannings, searchParams])

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
    setCopySelectionDays([])
    setNewPlanning(buildDefaultPlanningForm())
    setCreatePlanningOpen(true)
  }

  const openEditPlanningDialog = (planning: PlanningApiItem) => {
    setError(null)
    setEditingPlanning(planning)
    setSelectedShiftId(null)
    setPlanningEditorMode("builder")
    setCopyMenuDay(null)
    setCopySelectionDays([])
    setNewPlanning({
      name: planning.name,
      code: planning.code ?? "",
      description: planning.description ?? "",
      timezone: planning.timezone ?? "Africa/Abidjan",
      dailySlots: buildDailySlotsFromPlanning(planning, workShiftsById),
    })
    setCreatePlanningOpen(true)
  }

  const openPlanningPreviewDialog = (planning: PlanningApiItem) => {
    setError(null)
    setPlanningPreviewTarget(planning)
  }

  const closePlanningPreviewDialog = (open: boolean) => {
    if (!open) {
      setPlanningPreviewTarget(null)
    }
  }

  const closePlanningDialog = (open: boolean) => {
    setCreatePlanningOpen(open)
    if (!open) {
      setError(null)
      setEditingPlanning(null)
      setSelectedShiftId(null)
      setPlanningEditorMode("builder")
      setCopyMenuDay(null)
      setCopySelectionDays([])
      setNewPlanning(buildDefaultPlanningForm())
    }
  }

  const openAssignPlanningDialog = (
    planning: PlanningApiItem,
    mode: "employees" | "departments" = "employees",
    options?: { preselectAll?: boolean }
  ) => {
    const defaultRange = getDefaultAssignDateRange()
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
    setAssignStartDate(defaultRange.startDate)
    setAssignEndDate(defaultRange.endDate)
    setAssignPlanningOpen(true)
  }

  const closeAssignPlanningDialog = (open: boolean) => {
    setAssignPlanningOpen(open)
    if (!open) {
      const defaultRange = getDefaultAssignDateRange()
      setAssignPlanningTarget(null)
      setAssignMode("employees")
      setSelectedAssignEmployeeIds([])
      setSelectedAssignDepartmentIds([])
      setIncludeSubDepartments(false)
      setAssignStartDate(defaultRange.startDate)
      setAssignEndDate(defaultRange.endDate)
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
      toast.success(editingShift ? "Quart de travail modifié" : "Quart de travail créé")
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
      toast.success(editingPlanning ? "Planning modifié" : "Planning créé")
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

  const handleDeleteShift = (shift: WorkShiftApiItem) => {
    setPendingShiftDelete(shift)
    setForceShiftDelete(false)
  }

  const confirmDeleteShift = async () => {
    if (!pendingShiftDelete) return
    const shift = pendingShiftDelete

    setDeletingShiftId(shift.id)
    setError(null)
    try {
      try {
        await deleteWorkShift(shift.id, forceShiftDelete ? { force: true } : undefined)
      } catch (deleteError) {
        const detail = deleteError instanceof Error ? deleteError.message : ""
        if (!forceShiftDelete && detail.includes("force=true")) {
          setForceShiftDelete(true)
          toast.warning("Ce quart est lié à des éléments actifs. Activez la suppression forcée pour continuer.")
          return
        }
        throw deleteError
      }

      await loadBaseData()
      await loadSchedule()
      toast.success(`Quart "${shift.name}" supprimé`)
      setPendingShiftDelete(null)
      setForceShiftDelete(false)
    } catch (deleteError) {
      raiseError("SHIFT_DELETE_FAILED", getErrorDetail(deleteError))
      toast.error("Erreur lors de la suppression du quart")
    } finally {
      setDeletingShiftId(null)
    }
  }

  const handleDeletePlanning = (planning: PlanningApiItem) => {
    setPendingPlanningDelete(planning)
    setForcePlanningDelete(false)
  }

  const confirmDeletePlanning = async () => {
    if (!pendingPlanningDelete) return
    const planning = pendingPlanningDelete

    setDeletingPlanningId(planning.id)
    setError(null)
    try {
      try {
        await deletePlanning(planning.id, forcePlanningDelete ? { force: true } : undefined)
      } catch (deleteError) {
        const detail = deleteError instanceof Error ? deleteError.message : ""
        if (!forcePlanningDelete && detail.includes("force=true")) {
          setForcePlanningDelete(true)
          toast.warning("Ce planning est lié à des affectations. Activez la suppression forcée pour continuer.")
          return
        }
        throw deleteError
      }

      await loadBaseData()
      await loadSchedule()
      toast.success(`Planning "${planning.name}" supprimé`)
      setPendingPlanningDelete(null)
      setForcePlanningDelete(false)
    } catch (deleteError) {
      raiseError("PLANNING_DELETE_FAILED", getErrorDetail(deleteError))
      toast.error("Erreur lors de la suppression du planning")
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
    const startDate = assignStartDate.trim()
    const endDate = assignEndDate.trim()
    if (startDate && endDate && endDate < startDate) {
      raiseError("ASSIGN_DATE_RANGE_INVALID")
      return
    }
    const assignmentPeriod =
      startDate || endDate
        ? {
            startDate: startDate || null,
            endDate: endDate || null,
          }
        : undefined

    setIsAssigningPlanning(true)
    setError(null)
    try {
      if (assignMode === "employees") {
        if (!selectedAssignEmployeeIds.length) return
        const updatedEmployees = await Promise.all(
          selectedAssignEmployeeIds.map((employeeId) =>
            assignEmployeePlanning(employeeId, planningId, assignmentPeriod)
          )
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
            assignDepartmentPlanning(departmentId, planningId, includeSubDepartments, assignmentPeriod)
          )
        )
        await loadBaseData()
      }
      closeAssignPlanningDialog(false)
      toast.success("Planning assigné avec succès")
    } catch (assignError) {
      raiseError("ASSIGN_PLANNING_FAILED", getErrorDetail(assignError))
      toast.error("Erreur lors de l'assignation du planning")
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

  const applyCopyDaySelection = (sourceDay: number) => {
    const targets = copySelectionDays.filter((day) => day !== sourceDay)
    copyDayToTargets(sourceDay, targets)
    setCopyMenuDay(null)
    setCopySelectionDays([])
  }

  const handleCreatePlanningFromWizard = async (payload: PlanningCreationWizardPayload) => {
    const resolvedTenantId =
      tenantId ??
      employees[0]?.tenant ??
      departments[0]?.tenant ??
      workShifts[0]?.tenant ??
      plannings[0]?.tenant ??
      null

    if (!resolvedTenantId) {
      raiseError("WIZARD_TENANT_MISSING")
      toast.error("Impossible de creer le planning: tenant introuvable.")
      throw new Error("Tenant introuvable")
    }

    setIsCreatingWizardPlanning(true)
    setError(null)

    try {
      const stamp = Date.now().toString().slice(-6)
      const basePlanningName = payload.planningName.trim()
      const basePlanningCode = payload.planningCode.trim() || buildWizardPlanningCode(basePlanningName)
      const overtimeMinutes = payload.overtimeEnabled ? payload.overtimeMinutes : 0

      const createShiftBindings = async (
        items: PlanningWizardCase[],
        scope: "weekday" | "weekend"
      ): Promise<WizardShiftBinding[]> => {
        if (items.length === 0) {
          return []
        }

        return Promise.all(
          items.map(async (item, index) => {
            const workShift = await createWorkShift({
              tenant: resolvedTenantId,
              name: `${basePlanningName} - ${item.name.trim()} ${scope === "weekday" ? "S" : "WE"}${index + 1}-${stamp}`,
              code: `WZD-${scope === "weekday" ? "W" : "E"}-${stamp}-${String(index + 1).padStart(2, "0")}`,
              description: `Cas ${scope === "weekday" ? "semaine" : "week-end"} genere via wizard planning.`,
              start_time: item.startTime.trim(),
              end_time: item.endTime.trim(),
              break_start_time: null,
              break_end_time: null,
              overtime_minutes: overtimeMinutes,
              late_allowable_minutes: payload.lateAllowableMinutes,
              early_leave_allowable_minutes: payload.earlyLeaveAllowableMinutes,
              metadata: {
                source: "planning_wizard",
                case_scope: scope,
                case_index: index + 1,
                pause_counted: payload.pauseCounted,
                pause_tolerance_minutes: payload.pauseToleranceMinutes,
                overtime_enabled: payload.overtimeEnabled,
              },
            })

            return {
              input: item,
              workShift,
              scope,
            }
          })
        )
      }

      const weekdayCaseBindings = await createShiftBindings(payload.weekdayCases, "weekday")
      const weekendCaseBindings =
        payload.weekendMode === "different"
          ? await createShiftBindings(payload.weekendCases, "weekend")
          : []

      const entries = buildEntriesFromWizardConfig(payload, weekdayCaseBindings, weekendCaseBindings)

      const createdPlanning = await createPlanning({
        tenant: resolvedTenantId,
        name: basePlanningName,
        code: basePlanningCode,
        description: payload.planningDescription.trim(),
        timezone: payload.timezone.trim() || "Africa/Abidjan",
        entries,
        metadata: {
          source: "planning_wizard",
          has_weekday_program: payload.hasWeekdayProgram,
          weekend_mode: payload.weekendMode,
          rotating_cases: payload.weekdayRotationEnabled || payload.weekendRotationEnabled,
          weekday_rotation_enabled: payload.weekdayRotationEnabled,
          weekend_rotation_enabled: payload.weekendRotationEnabled,
          pause_counted: payload.pauseCounted,
          pause_tolerance_minutes: payload.pauseToleranceMinutes,
          overtime_enabled: payload.overtimeEnabled,
          overtime_minutes: overtimeMinutes,
        },
      })

      let assignedCount = 0
      let failedCount = 0
      let assignmentLabel = "utilisateur(s)"

      if (payload.assignmentScope === "employees" && payload.assignEmployeeIds.length > 0) {
        const assignResults = await Promise.allSettled(
          payload.assignEmployeeIds.map((employeeId) => assignEmployeePlanning(employeeId, createdPlanning.id))
        )
        assignedCount = assignResults.filter((result) => result.status === "fulfilled").length
        failedCount = assignResults.length - assignedCount
      }

      if (payload.assignmentScope === "departments" && payload.assignDepartmentIds.length > 0) {
        const assignResults = await Promise.allSettled(
          payload.assignDepartmentIds.map((departmentId) =>
            assignDepartmentPlanning(departmentId, createdPlanning.id, payload.includeSubDepartments)
          )
        )
        assignedCount = assignResults.filter((result) => result.status === "fulfilled").length
        failedCount = assignResults.length - assignedCount
        assignmentLabel = payload.includeSubDepartments
          ? "departement(s) et sous-departements"
          : "departement(s)"
      }

      if (failedCount > 0) {
        toast.warning(`${failedCount} affectation(s) ${assignmentLabel} n'ont pas pu etre appliquees.`)
      }

      await loadBaseData()
      await loadSchedule()

      toast.success("Planning cree avec succes", {
        description:
          assignedCount > 0
            ? `${assignedCount} ${assignmentLabel} affecte(s) automatiquement.`
            : "Le planning hebdomadaire est pret.",
      })
    } catch (wizardError) {
      raiseError("WIZARD_CREATE_FAILED", getErrorDetail(wizardError))
      toast.error("Erreur lors de la creation du planning via le wizard")
      throw wizardError
    } finally {
      setIsCreatingWizardPlanning(false)
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <main className="app-page space-y-6">
          {/* ── Premium Hero ── */}
          <section className="animate-fade-up relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--color-primary)/0.06,transparent_60%,var(--color-amber-500)/0.04)]" />
            <div className="pointer-events-none absolute inset-0 soft-grid opacity-40" />
            <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/8 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-amber-500/6 blur-2xl" />

            <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
              {/* Left — Title block */}
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
                    <CalendarClock className="h-3 w-3" /> Planning
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                    <Clock className="h-3 w-3" /> Gestion du temps
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Planning</h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Pilotez les quarts, emplois de temps et affectations en un flux opérationnel unique.
                </p>
              </div>

              {/* Right — Actions + Mini stats */}
              <div className="flex flex-col items-end gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/18"
                    onClick={() => setWizardOpen(true)}
                  >
                    <CalendarClock className="h-4 w-4" />
                    Nouveau planning
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl border-border/60 bg-background/60 hover:bg-muted/60"
                    onClick={() => void loadBaseData()}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sync
                  </Button>
                  <Button className="h-10 rounded-xl" onClick={openCreatePlanningDialog}>
                    <Plus className="h-4 w-4" />
                    Emploi de temps
                  </Button>
                  <Button variant="secondary" className="h-10 rounded-xl" onClick={openCreateShiftDialog}>
                    <Plus className="h-4 w-4" />
                    Quart
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-background/40 px-3 py-1.5">
                    <CalendarRange className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold tabular-nums">{plannings.length}</span>
                    <span className="text-[10px] text-muted-foreground">Emplois de temps</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-background/40 px-3 py-1.5">
                    <Shapes className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold tabular-nums">{workShifts.length}</span>
                    <span className="text-[10px] text-muted-foreground">Quarts</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-background/40 px-3 py-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold tabular-nums">{employees.length}</span>
                    <span className="text-[10px] text-muted-foreground">Employés</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <article className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Liste des plannings</p>
                  <p className="text-xs text-muted-foreground">Cliquez une ligne pour modifier, ou assignez directement</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-border/60 bg-background/60 px-2 text-xs"
                    onClick={() => setPlanningListPage((current) => Math.max(1, current - 1))}
                    disabled={planningListPage <= 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {planningListPage}/{planningListTotalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-border/60 bg-background/60 px-2 text-xs"
                    onClick={() =>
                      setPlanningListPage((current) => Math.min(planningListTotalPages, current + 1))
                    }
                    disabled={planningListPage >= planningListTotalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {planningRecap.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/40 px-3 py-6 text-center text-sm text-muted-foreground">
                  Aucun planning a afficher pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedPlanningRecap.map((item) => (
                    <div
                      key={`recap-${item.planning.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPlanningPreviewDialog(item.planning)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openPlanningPreviewDialog(item.planning)
                        }
                      }}
                      className="rounded-xl border border-border/60 bg-background/45 px-3 py-2.5 wow-transition hover:border-border hover:bg-background/60"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.planning.name}</p>
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {item.planning.code || "SANS CODE"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={(event) => {
                            event.stopPropagation()
                            openAssignPlanningDialog(item.planning)
                          }}
                        >
                          Assigner
                        </Button>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-4">
                        <p>Semaine active: {item.weekdaysWithProgram}/5</p>
                        <p>Week-end actif: {item.weekendWithProgram}/2</p>
                        <p>Cas utilises: {item.shiftCount}</p>
                        <p>Utilisateurs: {item.assignedEmployees}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-6">

            {error?.scope === "global" && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-destructive/60">
                      Code: {error.code}
                    </p>
                    <p className="mt-1">{error.message}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-destructive hover:bg-destructive/15"
                    onClick={() => setError(null)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)] animate-fade-up" style={{ animationDelay: "80ms" }}>
              {/* ── View Navigation ── */}
              <nav className="flex flex-row gap-3 xl:flex-col xl:gap-4 xl:py-2">
                {planningCards.map((card) => {
                  const Icon = card.icon
                  const isActive = activeView === card.key
                  const accentMap = { timetable: "from-indigo-500 to-violet-600", shift: "from-emerald-500 to-teal-600", schedule: "from-amber-400 to-orange-500" } as const
                  const ringMap = { timetable: "ring-indigo-500/25", shift: "ring-emerald-500/25", schedule: "ring-amber-400/25" } as const
                  const iconBgMap = { timetable: "bg-indigo-500/15 text-indigo-400", shift: "bg-emerald-500/15 text-emerald-400", schedule: "bg-amber-500/15 text-amber-400" } as const
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={card.action}
                      className={cn(
                        "group relative flex flex-1 flex-col items-center gap-2 overflow-hidden rounded-2xl border px-3 py-4 text-center wow-transition xl:flex-none xl:px-4 xl:py-5",
                        isActive
                          ? `ring-2 ${ringMap[card.key]} border-border/60 bg-card shadow-lg`
                          : "border-border/40 bg-background/40 hover:border-border/60 hover:bg-card/60 hover:shadow-md"
                      )}
                    >
                      <div className={cn("absolute inset-x-0 top-0 h-1 bg-linear-to-r wow-transition", accentMap[card.key], isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50")} />
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl wow-transition group-hover:scale-110", iconBgMap[card.key])}>
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <div className="text-sm font-semibold">{card.label}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">{card.helper}</div>
                    </button>
                  )
                })}
              </nav>

              <div className="space-y-6">
                {!activeView ? (
                  <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 px-4 py-8 text-center text-sm text-muted-foreground">
                    Cliquez sur une carte pour afficher son contenu.
                  </div>
                ) : null}
                <section
                  ref={timetableRef}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-5 wow-transition md:p-6",
                    activeView === "timetable" ? "ring-1 ring-indigo-500/20 border-indigo-400/30 bg-indigo-950/10" : "hidden"
                  )}
                >
                  <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 to-violet-600 wow-transition", activeView === "timetable" ? "opacity-100" : "opacity-0")} />
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/20">
                        <CalendarRange className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold">Emploi de temps</h2>
                        <p className="text-xs text-muted-foreground">Emplois du temps existants</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl border-border/60 bg-background/60 text-sm hover:bg-muted/60"
                      onClick={openCreatePlanningDialog}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>

                  {loading ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl border border-border/40 bg-background/40 p-5">
                          <div className="h-5 w-40 skeleton-shimmer rounded-lg" />
                          <div className="mt-3 h-4 w-24 skeleton-shimmer rounded-lg" />
                          <div className="mt-4 flex gap-2">
                            <div className="h-6 w-20 skeleton-shimmer rounded-full" />
                            <div className="h-6 w-16 skeleton-shimmer rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : plannings.length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/40 px-4 py-14 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border/40">
                        <CalendarRange className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-semibold">Aucun emploi du temps</p>
                      <p className="mt-1 text-xs text-muted-foreground">Créez un emploi de temps pour commencer</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {plannings.map((planning, idx) => (
                        <article
                          key={planning.id}
                          className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] wow-transition hover:border-border hover:shadow-lg"
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 to-violet-500 opacity-60" />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold">{planning.name}</div>
                              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {planning.code || "Sans code"}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300 tabular-nums">
                                {planning.timezone}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-lg border border-border/40 px-2.5 text-xs opacity-0 wow-transition group-hover:opacity-100"
                                onClick={() => openAssignPlanningDialog(planning)}
                              >
                                Assigner
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg opacity-0 wow-transition group-hover:opacity-100"
                                onClick={() => openEditPlanningDialog(planning)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive opacity-0 wow-transition hover:bg-destructive/15 group-hover:opacity-100"
                                onClick={() => void handleDeletePlanning(planning)}
                                disabled={deletingPlanningId === planning.id}
                              >
                                {deletingPlanningId === planning.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {planning.description || "Aucune description renseignée."}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {WEEK_DAYS.flatMap((day) => getPlanningDayEntries(planning, day.key, workShiftsById)).length ? (
                              WEEK_DAYS.flatMap((day) => getPlanningDayEntries(planning, day.key, workShiftsById)).map((slot) => (
                                <span
                                  key={`${planning.id}-${slot.key}`}
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                    getSlotBadgeClass(slot.slotType)
                                  )}
                                >
                                  {slot.label} {slot.timeRange ? slot.timeRange : ""}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">Aucun slot défini</span>
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
                    "relative overflow-hidden rounded-2xl border p-5 wow-transition md:p-6",
                    activeView === "shift" ? "ring-1 ring-emerald-500/20 border-emerald-400/30 bg-emerald-950/10" : "hidden"
                  )}
                >
                  <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-teal-600 wow-transition", activeView === "shift" ? "opacity-100" : "opacity-0")} />
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
                        <Shapes className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold">Quarts</h2>
                        <p className="text-xs text-muted-foreground">Quarts de travail existants</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl border-border/60 bg-background/60 text-sm hover:bg-muted/60"
                      onClick={openCreateShiftDialog}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>

                  {loading ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl border border-border/40 bg-background/40 p-5">
                          <div className="h-5 w-32 skeleton-shimmer rounded-lg" />
                          <div className="mt-3 h-4 w-48 skeleton-shimmer rounded-lg" />
                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[1, 2, 3, 4].map((j) => (
                              <div key={j} className="h-12 skeleton-shimmer rounded-xl" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : workShifts.length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/40 px-4 py-14 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border/40">
                        <Shapes className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-semibold">Aucun quart de travail</p>
                      <p className="mt-1 text-xs text-muted-foreground">Créez un quart pour commencer</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {workShifts.map((shift, idx) => (
                        <article
                          key={shift.id}
                          className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] wow-transition hover:border-border hover:shadow-lg"
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-teal-500 opacity-60" />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold">{shift.name}</div>
                              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {shift.code || "Sans code"}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg opacity-0 wow-transition group-hover:opacity-100"
                                onClick={() => openEditShiftDialog(shift)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive opacity-0 wow-transition hover:bg-destructive/15 group-hover:opacity-100"
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

                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {shift.description || "Aucune description renseignée."}
                          </p>

                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Pause</span>
                              <div className="mt-0.5 text-xs font-semibold tabular-nums">{formatTime(shift.break_start_time)} – {formatTime(shift.break_end_time)}</div>
                            </div>
                            <div className="rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Heures sup.</span>
                              <div className="mt-0.5 text-xs font-semibold tabular-nums">{shift.overtime_minutes} min</div>
                            </div>
                            <div className="rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Retard</span>
                              <div className="mt-0.5 text-xs font-semibold tabular-nums">{shift.late_allowable_minutes ?? 0} min</div>
                            </div>
                            <div className="rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Départ</span>
                              <div className="mt-0.5 text-xs font-semibold tabular-nums">{shift.early_leave_allowable_minutes ?? 0} min</div>
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
                    "relative overflow-hidden rounded-2xl border p-5 wow-transition md:p-6",
                    activeView === "schedule" ? "ring-1 ring-amber-400/20 border-amber-400/30 bg-amber-950/10" : "hidden"
                  )}
                >
                  <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-orange-500 wow-transition", activeView === "schedule" ? "opacity-100" : "opacity-0")} />
                  <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/20">
                        <CalendarDays className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold">Calendrier des quarts</h2>
                        <p className="text-xs text-muted-foreground">Calendrier mensuel de l&apos;employé sélectionné</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_auto]">
                      <select
                        value={selectedEmployeeId ?? ""}
                        onChange={(event) => setSelectedEmployeeId(Number(event.target.value))}
                        className="h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-sm outline-none focus:ring-1 focus:ring-amber-400/30"
                      >
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id} className="bg-card">
                            {(employee.name || employee.employee_no) +
                              " – " +
                              getEmployeeDepartment(employee, departmentsById)}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-[auto_1fr_auto] gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl border-border/60 bg-background/60 px-2.5"
                          onClick={() => shiftMonth(-1)}
                          aria-label="Mois précédent"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Input
                          type="month"
                          value={month ?? ""}
                          onChange={(event) => setMonth(event.target.value)}
                          className="h-10 rounded-xl border-border/60 bg-background/60"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl border-border/60 bg-background/60 px-2.5"
                          onClick={() => shiftMonth(1)}
                          aria-label="Mois suivant"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl border-border/60 bg-background/60 hover:bg-muted/60"
                          onClick={goCurrentMonth}
                        >
                          Aujourd&apos;hui
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl border-border/60 bg-background/60 hover:bg-muted/60"
                          onClick={() => void loadSchedule()}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Afficher
                        </Button>
                      </div>
                    </div>
                  </div>

                  {selectedEmployee && (
                    <div className="mb-5 grid gap-3 lg:grid-cols-3">
                      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4">
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-orange-500 opacity-60" />
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Employé</div>
                        <div className="mt-1.5 text-sm font-bold">
                          {selectedEmployee.name || selectedEmployee.employee_no}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {getEmployeeDepartment(selectedEmployee, departmentsById)}
                        </div>
                      </div>
                      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4">
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-sky-400 to-blue-500 opacity-60" />
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Planning effectif</div>
                        <div className="mt-1.5 text-sm font-bold">
                          {schedule?.planning?.name ?? "Aucun planning"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {selectedEmployee.effective_work_shift?.name ?? "Aucun quart principal"}
                        </div>
                      </div>
                      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4">
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-400 to-purple-500 opacity-60" />
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Résumé</div>
                        <div className="mt-1.5 text-sm font-bold tabular-nums">
                          {schedule?.summary ? formatMinutes(schedule.summary.planned_minutes) : "--"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                          {schedule?.summary?.working_days ?? 0} jour(s) travaillés
                        </div>
                      </div>
                    </div>
                  )}

                  {loadingSchedule ? (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                        {Array.from({ length: 35 }, (_, i) => (
                          <div key={i} className="min-h-28 rounded-xl border border-border/40 bg-background/40 p-2.5">
                            <div className="h-4 w-6 skeleton-shimmer rounded" />
                            <div className="mt-5 h-6 w-full skeleton-shimmer rounded-lg" />
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl border border-border/40 bg-background/40 p-4">
                        <div className="h-4 w-24 skeleton-shimmer rounded" />
                        <div className="mt-4 h-20 skeleton-shimmer rounded-xl" />
                      </div>
                    </div>
                  ) : !schedule?.days.length ? (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/40 px-4 py-14 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border/40">
                        <CalendarDays className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-semibold">Aucun calendrier disponible</p>
                      <p className="mt-1 text-xs text-muted-foreground">Sélectionnez un employé et un mois</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                      <div>
                        <div className="mb-2 hidden grid-cols-7 gap-2 text-center text-[9px] font-semibold uppercase tracking-widest text-muted-foreground md:grid">
                          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((label) => (
                            <div key={label} className="rounded-lg border border-border/40 bg-background/40 px-2 py-2">
                              {label}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                          {monthGrid.map((day, index) =>
                            day ? (
                              <button
                                key={day.date}
                                type="button"
                                onClick={() => setSelectedDate(day.date)}
                                className={cn(
                                  "group/cell min-h-28 rounded-xl border p-2.5 text-left wow-transition",
                                  selectedDate === day.date
                                    ? "ring-2 ring-amber-400/30 border-amber-400/40 bg-amber-500/8"
                                    : day.is_rest_day
                                      ? "border-border/40 bg-muted/20 hover:bg-muted/40"
                                      : "border-border/40 bg-background/30 hover:bg-muted/30"
                                )}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className={cn("text-sm font-bold tabular-nums", selectedDate === day.date && "text-amber-400")}>
                                    {new Date(`${day.date}T00:00:00`).getDate()}
                                  </span>
                                  <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{day.day_name.slice(0, 3)}</span>
                                </div>

                                <div className="mt-2.5 space-y-1">
                                  {day.shifts.length ? (
                                    day.shifts.slice(0, 2).map((shift) => (
                                      <div
                                        key={`${day.date}-${shift.id}`}
                                        className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px]"
                                      >
                                        <div className="truncate font-semibold text-amber-700 dark:text-amber-300">{shift.name}</div>
                                        <div className="text-[9px] text-amber-300/60 tabular-nums">
                                          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="pt-4 text-[10px] text-muted-foreground">
                                      {day.is_rest_day ? "Repos" : "—"}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <div
                                key={`empty-${index}`}
                                className="min-h-28 rounded-xl border border-dashed border-border/30 bg-background/20"
                              />
                            )
                          )}
                        </div>
                      </div>

                      <aside className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-orange-500 opacity-50" />
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Jour sélectionné</div>
                        {selectedDay ? (
                          <div className="mt-3 space-y-4">
                            <div>
                              <div className="text-base font-bold tabular-nums">{selectedDay.date}</div>
                              <div className="text-xs text-muted-foreground">{selectedDay.day_name}</div>
                            </div>

                            <div className="rounded-xl border border-border/40 bg-background/40 p-3">
                              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Heures</div>
                              <div className="mt-1 text-sm font-bold tabular-nums">
                                {formatMinutes(selectedDay.planned_minutes)}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Quarts</div>
                              {selectedDay.shifts.length ? (
                                selectedDay.shifts.map((shift) => (
                                  <div
                                    key={`${selectedDay.date}-${shift.id}-detail`}
                                    className="rounded-xl border border-border/40 bg-background/40 p-3"
                                  >
                                    <div className="text-sm font-bold">{shift.name}</div>
                                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                                      {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Net : {formatMinutes(shift.net_minutes)}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-xl border border-dashed border-border/40 px-3 py-4 text-xs text-muted-foreground">
                                  Aucun quart ce jour.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-muted-foreground">Sélectionnez un jour dans le calendrier.</div>
                        )}
                      </aside>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </section>

          <Dialog open={assignPlanningOpen} onOpenChange={closeAssignPlanningDialog}>
            <DialogContent className="max-w-2xl rounded-2xl border-border/60 bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Assigner le planning {assignPlanningTarget ? `"${assignPlanningTarget.name}"` : ""}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Choisissez des départements entiers ou des personnes, puis confirmez.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {error?.scope === "global" &&
                (error.code === "ASSIGN_PLANNING_FAILED" || error.code === "ASSIGN_DATE_RANGE_INVALID") ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-widest text-destructive/70">
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
                      className={cn("h-9 rounded-xl", assignMode !== "employees" && "border-border/60 bg-background/60")}
                      onClick={() => setAssignMode("employees")}
                    >
                      Personnes
                    </Button>
                    <Button
                      type="button"
                      variant={assignMode === "departments" ? "default" : "outline"}
                      className={cn("h-9 rounded-xl", assignMode !== "departments" && "border-border/60 bg-background/60")}
                      onClick={() => setAssignMode("departments")}
                    >
                      Départements
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl border-border/60 bg-background/60"
                      onClick={() => {
                        if (assignMode === "departments") {
                          setSelectedAssignDepartmentIds(filteredAssignDepartments.map((department) => department.id))
                          return
                        }
                        setSelectedAssignEmployeeIds(filteredAssignEmployees.map((employee) => employee.id))
                      }}
                    >
                      Tout sélectionner
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl border-border/60 bg-background/60"
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

                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Plage d'assignation
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-xs"
                      onClick={() => {
                        setAssignStartDate("")
                        setAssignEndDate("")
                      }}
                    >
                      Vider la plage
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Date debut</label>
                      <Input
                        type="date"
                        value={assignStartDate}
                        onChange={(event) => setAssignStartDate(event.target.value)}
                        className="h-10 rounded-xl border-border/60 bg-background/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Date fin</label>
                      <Input
                        type="date"
                        value={assignEndDate}
                        onChange={(event) => setAssignEndDate(event.target.value)}
                        className="h-10 rounded-xl border-border/60 bg-background/60"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Laissez vide pour une assignation immediate sans borne.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <Input
                    value={assignSearch}
                    onChange={(event) => setAssignSearch(event.target.value)}
                    placeholder={
                      assignMode === "departments"
                        ? "Rechercher un département..."
                        : "Rechercher une personne..."
                    }
                    className="h-10 rounded-xl border-border/60 bg-background/60"
                  />
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {assignMode === "departments"
                      ? `${selectedAssignDepartmentIds.length} sélectionné(s) / ${filteredAssignDepartments.length} affiché(s)`
                      : `${selectedAssignEmployeeIds.length} sélectionné(s) / ${filteredAssignEmployees.length} affiché(s)`}
                  </p>
                </div>

                {assignMode === "departments" ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeSubDepartments}
                        onChange={(event) => setIncludeSubDepartments(event.target.checked)}
                      />
                      Inclure les sous-départements
                    </label>
                    <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-3">
                      {filteredAssignDepartments.map((department) => (
                        <label
                          key={`assign-department-${department.id}`}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-sm wow-transition hover:bg-muted/40"
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
                        <p className="text-xs text-muted-foreground">Aucun département disponible.</p>
                      ) : filteredAssignDepartments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun département ne correspond à la recherche.</p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-3">
                    {filteredAssignEmployees.map((employee) => (
                      <label
                        key={`assign-employee-${employee.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-sm wow-transition hover:bg-muted/40"
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
                      <p className="text-xs text-muted-foreground">Aucune personne disponible.</p>
                    ) : filteredAssignEmployees.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Aucune personne ne correspond à la recherche.</p>
                    ) : null}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closeAssignPlanningDialog(false)}
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                  disabled={isAssigningPlanning}
                >
                  Annuler
                </Button>
                <Button
                  className="h-10 rounded-xl"
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

          <Dialog open={!!planningPreviewTarget} onOpenChange={closePlanningPreviewDialog}>
            <DialogContent className="max-w-3xl rounded-2xl border-border/60 bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Apercu du planning {planningPreviewTarget ? `"${planningPreviewTarget.name}"` : ""}
                </DialogTitle>
                <DialogDescription className="text-foreground/80">
                  Verifiez les details avant de modifier ou d'assigner.
                </DialogDescription>
              </DialogHeader>

              {planningPreviewTarget ? (
                <div className="space-y-3 py-1">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-foreground/70">Code</p>
                      <p className="mt-1 text-sm font-semibold">{planningPreviewTarget.code || "SANS CODE"}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-foreground/70">Fuseau</p>
                      <p className="mt-1 text-sm font-semibold">{planningPreviewTarget.timezone || "UTC"}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-foreground/70">Semaine active</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {planningPreviewRecap ? `${planningPreviewRecap.weekdaysWithProgram}/5` : "--"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-foreground/70">Week-end actif</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {planningPreviewRecap ? `${planningPreviewRecap.weekendWithProgram}/2` : "--"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/55 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-foreground/75">
                      Quarts applicables par jour
                    </p>
                    {planningPreviewHasWeeklyEntries ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {planningPreviewDayEntries.map(({ day, entries }) => (
                          <div key={`preview-day-${day.key}`} className="rounded-lg border border-border/70 bg-card/80 px-2.5 py-2">
                            <p className="text-xs font-semibold">{day.label}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {entries.length ? (
                                <>
                                  {entries.slice(0, 2).map((slot) => (
                                    <span
                                      key={`preview-slot-${day.key}-${slot.key}`}
                                      className={cn(
                                        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                        getSlotBadgeClass(slot.slotType),
                                        slot.slotType === "shift" &&
                                          "border-sky-400/70 bg-sky-100 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100",
                                        slot.slotType === "work" &&
                                          "border-emerald-400/70 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
                                        slot.slotType === "rest" &&
                                          "border-rose-400/70 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100"
                                      )}
                                    >
                                      {slot.label} {slot.timeRange ? slot.timeRange : ""}
                                    </span>
                                  ))}
                                  {entries.length > 2 ? (
                                    <div className="relative inline-flex">
                                      <button
                                        type="button"
                                        className="group rounded-full border border-amber-300/50 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200"
                                        aria-label={`Afficher ${entries.length - 2} quart(s) supplementaire(s)`}
                                      >
                                        +{entries.length - 2}
                                        <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden min-w-52 rounded-lg border border-border/70 bg-popover px-2 py-1.5 text-left text-[10px] font-normal text-popover-foreground shadow-xl group-hover:block group-focus-visible:block">
                                          {entries.map((slot) => (
                                            <span key={`preview-more-${day.key}-${slot.key}`} className="block leading-5">
                                              {slot.label}
                                              {slot.timeRange ? ` ${slot.timeRange}` : ""}
                                            </span>
                                          ))}
                                        </span>
                                      </button>
                                    </div>
                                  ) : null}
                                </>
                              ) : <span className="text-[11px] text-foreground/70">Aucun quart applicable</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : planningPreviewNonWeeklyEntries.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-foreground/75">
                          Ce planning fonctionne en cycle/periode. Apercu des entrees:
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {planningPreviewNonWeeklyEntries.slice(0, 12).map((entry) => (
                            <div key={`preview-non-weekly-${entry.key}`} className="rounded-lg border border-border/70 bg-card/80 px-2.5 py-2">
                              <p className="text-xs font-semibold">
                                {entry.label}
                                {entry.timeRange ? ` ${entry.timeRange}` : ""}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-foreground/75">
                                {entry.sequenceIndex != null ? <span>Sequence: {entry.sequenceIndex + 1}</span> : null}
                                {entry.startDate ? <span>Debut: {entry.startDate}</span> : null}
                                {entry.endDate ? <span>Fin: {entry.endDate}</span> : null}
                                {entry.isRestDay ? <span>Repos</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/70 bg-card/60 px-3 py-4 text-xs text-foreground/75">
                        Aucune donnee de cycle disponible pour ce planning.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closePlanningPreviewDialog(false)}
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                >
                  Fermer
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                  onClick={() => {
                    if (!planningPreviewTarget) return
                    const planning = planningPreviewTarget
                    setPlanningPreviewTarget(null)
                    openAssignPlanningDialog(planning)
                  }}
                >
                  Assigner
                </Button>
                <Button
                  className="h-10 rounded-xl"
                  onClick={() => {
                    if (!planningPreviewTarget) return
                    const planning = planningPreviewTarget
                    setPlanningPreviewTarget(null)
                    openEditPlanningDialog(planning)
                  }}
                >
                  Modifier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createShiftOpen} onOpenChange={closeShiftDialog}>
            <DialogContent className="max-w-xl rounded-2xl border-border/60 bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">{editingShift ? "Modifier un quart de travail" : "Créer un quart de travail"}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingShift
                    ? "Met à jour ce quart réutilisable pour les équipes et les employés."
                    : "Ajoute un quart réutilisable pour les équipes et les employés."}
                </DialogDescription>
              </DialogHeader>
                <div className="grid gap-3 py-2">
                {error?.scope === "shift_dialog" && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-widest text-destructive/70">
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
                    className="h-10 rounded-xl border-border/60 bg-background/60"
                  />
                  <Input
                    placeholder="Code"
                    value={newShift.code ?? ""}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, code: event.target.value }))}
                    className="h-10 rounded-xl border-border/60 bg-background/60"
                  />
                </div>
                <Input
                  placeholder="Description"
                  value={newShift.description ?? ""}
                  onChange={(event) => setNewShift((prev) => ({ ...prev, description: event.target.value }))}
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Début de service</p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      lang="fr-FR"
                      pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                      placeholder="Ex: 22, 2200, 22:30"
                      value={newShift.start_time ?? ""}
                      onChange={(event) => setNewShift((prev) => ({ ...prev, start_time: event.target.value }))}
                      onBlur={() => normalizeShiftTimeField("start_time")}
                      className="h-10 rounded-xl border-border/60 bg-background/60 font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Fin de service</p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      lang="fr-FR"
                      pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                      placeholder="Ex: 6, 0600, 06:00"
                      value={newShift.end_time ?? ""}
                      onChange={(event) => setNewShift((prev) => ({ ...prev, end_time: event.target.value }))}
                      onBlur={() => normalizeShiftTimeField("end_time")}
                      className="h-10 rounded-xl border-border/60 bg-background/60 font-mono tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Pause</p>
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
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Début pause</p>
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
                          className="h-10 rounded-xl border-border/60 bg-background/60 font-mono tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Fin pause</p>
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
                          className="h-10 rounded-xl border-border/60 bg-background/60 font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Heures supplémentaires</p>
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
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Début H.S.</p>
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
                          className="h-10 rounded-xl border-border/60 bg-background/60 font-mono tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Fin H.S.</p>
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
                          className="h-10 rounded-xl border-border/60 bg-background/60 font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Retard toléré (min)</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={newShift.late_allowable_minutes ?? ""}
                      onChange={(event) =>
                        setNewShift((prev) => ({ ...prev, late_allowable_minutes: event.target.value }))
                      }
                      className="h-10 rounded-xl border-border/60 bg-background/60 tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Marge départ (min)</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={newShift.early_leave_allowable_minutes ?? ""}
                      onChange={(event) =>
                        setNewShift((prev) => ({ ...prev, early_leave_allowable_minutes: event.target.value }))
                      }
                      className="h-10 rounded-xl border-border/60 bg-background/60 tabular-nums"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closeShiftDialog(false)}
                  disabled={isSavingShift}
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                >
                  Annuler
                </Button>
                <Button className="h-10 rounded-xl" onClick={() => void handleSaveShift()} disabled={isSavingShift}>
                  {isSavingShift && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingShift ? "Mettre à jour" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createPlanningOpen} onOpenChange={closePlanningDialog}>
            <DialogContent className="top-[4vh] w-[min(96vw,1320px)] max-w-[min(96vw,1320px)] max-h-[92vh] translate-y-0 overflow-y-auto rounded-2xl border-border/60 bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">{editingPlanning ? "Modifier un planning" : "Créer un planning"}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingPlanning
                    ? "Mets à jour le cycle hebdomadaire de cet emploi de temps."
                    : "Définis un cycle hebdomadaire qui servira de base aux emplois de temps."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                {error?.scope === "planning_dialog" && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-widest text-destructive/70">
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
                    className="h-10 rounded-xl border-border/60 bg-background/60"
                  />
                  <Input
                    placeholder="Code"
                    value={newPlanning.code ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, code: event.target.value }))}
                    className="h-10 rounded-xl border-border/60 bg-background/60"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Description"
                    value={newPlanning.description ?? ""}
                    onChange={(event) =>
                      setNewPlanning((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="h-10 rounded-xl border-border/60 bg-background/60"
                  />
                  <select
                    value={newPlanning.timezone ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, timezone: event.target.value }))}
                    className="h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-sm"
                  >
                    <option value="" disabled>
                      Sélectionner un fuseau horaire
                    </option>
                    {timezoneOptions.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </option>
                    ))}
                  </select>
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
                          "rounded-xl border px-3 py-2 text-sm font-medium wow-transition",
                          selectedShiftId === shift.id
                            ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/25"
                            : "border-border/60 bg-background/60 hover:bg-muted/60"
                        )}
                      >
                        {shift.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={planningEditorMode === "builder" ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 rounded-xl", planningEditorMode !== "builder" && "border-border/60 bg-background/60")}
                        onClick={() => setPlanningEditorMode("builder")}
                      >
                        Édition par jour
                      </Button>
                      <Button
                        type="button"
                        variant={planningEditorMode === "timeline" ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 rounded-xl", planningEditorMode !== "timeline" && "border-border/60 bg-background/60")}
                        onClick={() => setPlanningEditorMode("timeline")}
                      >
                        Aperçu timeline
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {selectedShiftId
                        ? `${workShiftsById.get(selectedShiftId)?.name ?? "Quart"} : ${formatTime(
                            workShiftsById.get(selectedShiftId)?.start_time
                          )} – ${formatTime(workShiftsById.get(selectedShiftId)?.end_time)}`
                        : "Aucun quart sélectionné"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={deleteSelectedShiftFromDays}
                        disabled={!selectedShiftId}
                        className="text-xs text-muted-foreground wow-transition hover:text-foreground disabled:opacity-40"
                      >
                        Supprimer le quart sélectionné partout
                      </button>
                      <button
                        type="button"
                        onClick={clearPlanningGrid}
                        className="text-xs text-muted-foreground wow-transition hover:text-foreground"
                      >
                        Vider la semaine
                      </button>
                    </div>
                  </div>

                  {planningEditorMode === "builder" ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Édition par jour — ajoute/supprime sans décalage
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
                            <div key={`builder-${day.key}`} className="rounded-xl border border-border/40 bg-card/60 px-2.5 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-11 shrink-0 text-xs font-bold">{day.label.slice(0, 3)}</div>
                                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-visible">
                                  <div className="relative">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 rounded-lg border-border/40 bg-background/60 px-1.5 text-[10px]"
                                      onClick={() =>
                                        setCopyMenuDay((current) => {
                                          if (current === day.key) {
                                            setCopySelectionDays([])
                                            return null
                                          }
                                          setCopySelectionDays(WEEK_DAYS.map((item) => item.key).filter((key) => key !== day.key))
                                          return day.key
                                        })
                                      }
                                    >
                                      Dup
                                    </Button>
                                    {copyMenuDay === day.key ? (
                                      <div className="absolute left-0 top-8 z-20 w-56 rounded-xl border border-border/60 bg-card p-2 shadow-xl">
                                        <div className="grid grid-cols-2 gap-1">
                                          {WEEK_DAYS.map((targetDay) => {
                                            const isSource = targetDay.key === day.key
                                            const checked = copySelectionDays.includes(targetDay.key)
                                            return (
                                              <label
                                                key={`copy-target-${day.key}-${targetDay.key}`}
                                                className={cn(
                                                  "flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px]",
                                                  isSource ? "opacity-50" : "hover:bg-muted/60"
                                                )}
                                              >
                                                <input
                                                  type="checkbox"
                                                  disabled={isSource}
                                                  checked={isSource ? false : checked}
                                                  onChange={(event) => {
                                                    const isChecked = event.target.checked
                                                    setCopySelectionDays((prev) => {
                                                      if (isChecked) {
                                                        if (prev.includes(targetDay.key)) return prev
                                                        return [...prev, targetDay.key]
                                                      }
                                                      return prev.filter((key) => key !== targetDay.key)
                                                    })
                                                  }}
                                                />
                                                <span>{targetDay.label.slice(0, 3)}</span>
                                              </label>
                                            )
                                          })}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-border/50 pt-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCopySelectionDays(WEEK_DAYS.map((item) => item.key).filter((key) => key !== day.key))
                                            }
                                            className="rounded-lg px-1.5 py-1 text-[10px] wow-transition hover:bg-muted/60"
                                          >
                                            Tout
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setCopySelectionDays([0, 1, 2, 3, 4].filter((key) => key !== day.key))}
                                            className="rounded-lg px-1.5 py-1 text-[10px] wow-transition hover:bg-muted/60"
                                          >
                                            Lun-Ven
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setCopySelectionDays([5, 6].filter((key) => key !== day.key))}
                                            className="rounded-lg px-1.5 py-1 text-[10px] wow-transition hover:bg-muted/60"
                                          >
                                            Week-end
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => applyCopyDaySelection(day.key)}
                                            className="rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground wow-transition hover:opacity-90"
                                          >
                                            Appliquer
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
                                    className="h-6 rounded-lg border-border/40 bg-background/60 px-1.5 text-[10px]"
                                    disabled={!selectedShiftId || slot.isRestDay}
                                    onClick={() => selectedShiftId && addShiftToDay(day.key, selectedShiftId)}
                                  >
                                    +
                                  </Button>
                                  {slot.isRestDay ? (
                                    <span className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
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
                                          className="min-w-0 rounded-lg border border-sky-400/30 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 wow-transition hover:bg-sky-500/25"
                                          title={`${shift.name} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)} (clic pour retirer)`}
                                        >
                                          <span className="block max-w-47.5 truncate">
                                            {shift.name} {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
                                          </span>
                                        </button>
                                      )
                                    })
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">Aucun</span>
                                  )}
                                  {!slot.isRestDay && hiddenShiftIds.length > 0 ? (
                                    <button
                                      type="button"
                                      className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 wow-transition hover:bg-amber-500/20"
                                      title={hiddenShiftDetails || `${hiddenShiftIds.length} quart(s) supplémentaire(s)`}
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
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3 overflow-x-auto">
                      <div className="min-w-0">
                        <div className="mb-2 grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 text-[10px] text-muted-foreground">
                          <div className="px-1 font-semibold uppercase tracking-widest">Time</div>
                          <div>
                            <div className="flex items-center justify-between md:hidden">
                              {HOUR_MARKERS_6H.map((hour) => (
                                <span key={`mobile-${hour}`} className="text-center tabular-nums">
                                  {String(hour).padStart(2, "0")}:00
                                </span>
                              ))}
                            </div>
                            <div className="hidden items-center justify-between md:flex">
                              {HOUR_MARKERS_4H.map((hour) => (
                                <span key={`desktop-${hour}`} className="text-center tabular-nums">
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
                                <div className="text-xs font-bold">{day.label.slice(0, 3)}.</div>
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
                                  className="relative min-w-0 overflow-hidden rounded-lg border border-border/40 bg-background/30 px-1 py-1"
                                >
                                  <div className="pointer-events-none absolute inset-0 grid grid-cols-48">
                                    {Array.from({ length: 48 }, (_, tick) => (
                                      <div
                                        key={`${day.key}-tick-${tick}`}
                                        className={cn("border-r border-border/20", tick === 47 && "border-r-0")}
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
                                          className="absolute h-4.5 overflow-hidden whitespace-nowrap rounded-md border border-sky-400/30 bg-sky-500 px-2 text-[11px] font-medium text-white"
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
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                >
                  Annuler
                </Button>
                <Button className="h-10 rounded-xl" onClick={() => void handleSavePlanning()} disabled={isSavingPlanning}>
                  {isSavingPlanning && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingPlanning ? "Mettre à jour" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!pendingShiftDelete} onOpenChange={(open) => !open && setPendingShiftDelete(null)}>
            <DialogContent className="max-w-lg rounded-2xl border-border/60 bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Supprimer le quart</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Voulez-vous vraiment supprimer {pendingShiftDelete ? `"${pendingShiftDelete.name}"` : "ce quart"} ?
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={forceShiftDelete}
                    onChange={(event) => setForceShiftDelete(event.target.checked)}
                  />
                  Forcer la suppression (si lié à des employés/plannings)
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingShiftDelete(null)} disabled={deletingShiftId !== null}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDeleteShift()}
                  disabled={!pendingShiftDelete || deletingShiftId !== null}
                >
                  {deletingShiftId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!pendingPlanningDelete} onOpenChange={(open) => !open && setPendingPlanningDelete(null)}>
            <DialogContent className="max-w-lg rounded-2xl border-border/60 bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Supprimer le planning</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Voulez-vous vraiment supprimer {pendingPlanningDelete ? `"${pendingPlanningDelete.name}"` : "ce planning"} ?
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={forcePlanningDelete}
                    onChange={(event) => setForcePlanningDelete(event.target.checked)}
                  />
                  Forcer la suppression (si lié à des départements/employés)
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingPlanningDelete(null)} disabled={deletingPlanningId !== null}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDeletePlanning()}
                  disabled={!pendingPlanningDelete || deletingPlanningId !== null}
                >
                  {deletingPlanningId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>

      {/* Planning Creation Wizard */}
      <PlanningCreationWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        isSubmitting={isCreatingWizardPlanning}
        employees={employees.map((emp) => ({
          id: emp.id,
          name: emp.name,
          employeeNo: emp.employee_no,
          department: departmentsById.get(emp.department ?? -1) ?? "Sans département",
        })) satisfies PlanningCreationWizardEmployee[]}
        departments={departments.map((department) => ({
          id: department.id,
          name: department.name,
          code: department.code,
        })) satisfies PlanningCreationWizardDepartment[]}
        onSubmit={handleCreatePlanningFromWizard}
      />

      {showScrollCue ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-lg backdrop-blur-xs animate-bounce">
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
