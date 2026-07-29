"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import {
  PlanningCreationWizardDialog,
  type PlanningCreationWizardDepartment,
  type PlanningCreationWizardEmployee,
  type PlanningCreationWizardPayload,
  type PlanningWizardCase,
} from "@/components/planning/planning-creation-wizard-dialog"
import { TeamPlanningView } from "@/components/planning/team-planning-view"
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
import { getActiveTenantCode } from "@/lib/api/auth"
import { useI18n } from "@/lib/i18n/context"
import {
  buildWeekdayLabels,
  planningPageDict,
  type PlanningPageErrorCode,
} from "@/lib/i18n/pages/planning-page"
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

function getEmployeeTenantCode(): string {
  return getActiveTenantCode()
}
const WEEK_DAY_KEYS = [0, 1, 2, 3, 4, 5, 6]

type PlanningSlotLabels = {
  rest: string
  shift: string
  slot: string
}

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

type PlanningView = "team" | "timetable" | "shift" | "schedule"

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
  workShiftsById: Map<number, WorkShiftApiItem>,
  dayLabels: string[],
  labels: PlanningSlotLabels
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
        label: labels.rest,
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
        label: workShiftsById.get(shiftId)?.name ?? dayLabels[day] ?? labels.shift,
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

function createRestEntry(day: number, restLabel: string): PlanningEntryApiItem {
  return {
    day_of_week: day,
    sequence_index: null,
    start_date: null,
    end_date: null,
    work_shift: null,
    is_rest_day: true,
    label: restLabel,
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
  weekendCaseBindings: WizardShiftBinding[],
  restLabel: string
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

  return WEEK_DAY_KEYS.flatMap((dayKey) =>
    entriesByDay[dayKey].length > 0 ? entriesByDay[dayKey] : [createRestEntry(dayKey, restLabel)]
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
  departmentsById: Map<number, string>,
  noDepartmentLabel: string
) {
  if (!employee?.department) return noDepartmentLabel
  return departmentsById.get(employee.department) ?? noDepartmentLabel
}

function getSlotBadgeClass(slotType: "work" | "shift" | "rest") {
  if (slotType === "rest") return "border-rose-500/30 bg-rose-500/10 text-rose-200"
  if (slotType === "shift") return "border-sky-500/30 bg-sky-500/10 text-sky-200"
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
}

type ShiftKind = "morning" | "afternoon" | "night" | "rest"

const SHIFT_KIND_PIP: Record<ShiftKind, string> = {
  morning: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  afternoon: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  night: "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  rest: "border-dashed border-border/60 bg-transparent text-muted-foreground",
}

const SHIFT_KIND_DOT: Record<ShiftKind, string> = {
  morning: "bg-amber-500",
  afternoon: "bg-sky-500",
  night: "bg-violet-500",
  rest: "bg-muted-foreground/40",
}

// Industrial palette equivalents used in the redesigned planning page.
const SHIFT_KIND_PIP_INDUSTRIAL: Record<ShiftKind, string> = {
  morning: "border-[var(--warning)]/30 bg-[#2a1e06] text-[var(--warning)]",
  afternoon: "border-[var(--info)]/30 bg-[#0d1e2e] text-[var(--info)]",
  night: "border-[#a78bfa]/30 bg-[#1e1530] text-[#a78bfa]",
  rest: "border-dashed border-[#1c2133] bg-transparent text-[#4a5568]",
}

const SHIFT_KIND_DOT_INDUSTRIAL: Record<ShiftKind, string> = {
  morning: "bg-[var(--warning)]",
  afternoon: "bg-[var(--info)]",
  night: "bg-[#a78bfa]",
  rest: "bg-[#4a5568]",
}

type PlanningMetricTone = "green" | "red" | "amber" | "blue" | "violet"

const planningToneClass: Record<PlanningMetricTone, { text: string; bar: string; bg: string; ring: string }> = {
  green: { text: "text-[var(--success)]", bar: "bg-[var(--success)]", bg: "bg-[#0d2a1a]", ring: "ring-[var(--success)]/40" },
  red: { text: "text-[var(--destructive)]", bar: "bg-[var(--destructive)]", bg: "bg-[#2a0e0e]", ring: "ring-[var(--destructive)]/40" },
  amber: { text: "text-[var(--warning)]", bar: "bg-[var(--brand-accent)]", bg: "bg-[#2a1e06]", ring: "ring-[var(--warning)]/40" },
  blue: { text: "text-[var(--info)]", bar: "bg-[var(--info)]", bg: "bg-[#0d1e2e]", ring: "ring-[var(--info)]/40" },
  violet: { text: "text-[#a78bfa]", bar: "bg-[#a78bfa]", bg: "bg-[#1e1530]", ring: "ring-[#a78bfa]/40" },
}

function PlanningMetricCard({
  label,
  value,
  note,
  tone,
  icon: Icon,
}: {
  label: string
  value: number | string
  note: string
  tone: PlanningMetricTone
  icon: typeof Users
}) {
  const styles = planningToneClass[tone]
  return (
    <article className="relative min-h-18 border border-[#1c2133] bg-[#111318] p-2.5">
      <div className={cn("absolute left-0 top-0 h-full w-[3px]", styles.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#4a5568]">{label}</p>
          <p className={cn("mt-1 font-display text-2xl font-bold leading-none tabular-nums", styles.text)}>
            {value}
          </p>
        </div>
        <div className={cn("flex size-6 items-center justify-center", styles.bg, styles.text)}>
          <Icon className="size-3" />
        </div>
      </div>
      <div className={cn("mt-2 inline-flex px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em]", styles.bg, styles.text)}>
        {note}
      </div>
    </article>
  )
}

function PlanningStatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#1c2133] bg-[#0b0d13] px-2 py-1.5">
      <div className="font-display text-sm font-semibold leading-none tabular-nums text-[#e2e8f0]">
        {value}
      </div>
      <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#4a5568]">
        {label}
      </div>
    </div>
  )
}

function PlanningSectionHeader({
  eyebrow,
  title,
  subtitle,
  tone,
  icon: Icon,
  actions,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  tone: PlanningMetricTone
  icon: typeof Users
  actions?: React.ReactNode
}) {
  const styles = planningToneClass[tone]
  return (
    <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center", styles.bg, styles.text)}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">{eyebrow}</p>
          <h2 className="mt-1 font-display text-[15px] font-semibold uppercase leading-none tracking-[0.06em] text-[#e2e8f0]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}
function getShiftKind(slot: PlanningSlotChip): ShiftKind {
  if (slot.slotType === "rest") return "rest"
  const startHour = slot.timeRange ? parseInt(slot.timeRange.slice(0, 2), 10) : NaN
  if (!Number.isFinite(startHour)) return "afternoon"
  if (startHour >= 22 || startHour < 6) return "night"
  if (startHour < 12) return "morning"
  if (startHour < 18) return "afternoon"
  return "night"
}

function slotMinutes(timeRange: string | null) {
  if (!timeRange) return 0
  const [a, b] = timeRange.split("-")
  if (!a || !b) return 0
  const [ah, am] = a.split(":").map((x) => parseInt(x, 10))
  const [bh, bm] = b.split(":").map((x) => parseInt(x, 10))
  if ([ah, am, bh, bm].some((v) => !Number.isFinite(v))) return 0
  let mins = bh * 60 + bm - (ah * 60 + am)
  if (mins < 0) mins += 24 * 60
  return mins
}

function computePlanningStats(
  planning: PlanningApiItem,
  shiftsById: Map<number, WorkShiftApiItem>,
  dayLabels: string[],
  labels: PlanningSlotLabels
) {
  const days = WEEK_DAY_KEYS.map((key) => ({
    key,
    label: dayLabels[key] ?? "",
    slots: getPlanningDayEntries(planning, key, shiftsById, labels),
  }))
  const uniqueShifts = new Set<string>()
  let workingDays = 0
  let restDays = 0
  let totalMinutes = 0
  days.forEach(({ slots }) => {
    const working = slots.filter((s) => s.slotType !== "rest")
    if (working.length) workingDays++
    else if (slots.length) restDays++
    working.forEach((s) => {
      uniqueShifts.add(s.label)
      totalMinutes += slotMinutes(s.timeRange)
    })
  })
  return { days, workingDays, restDays, uniqueShifts: uniqueShifts.size, totalMinutes }
}

function formatHoursLabel(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`
}

function getPlanningDayEntries(
  planning: PlanningApiItem,
  dayOfWeek: number,
  shiftsById: Map<number, WorkShiftApiItem>,
  labels: PlanningSlotLabels
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
          label: labels.rest,
          slotType: "rest" as const,
          timeRange: null,
        }
      }

      const workShiftId = entry.work_shift ?? null
      const shift = workShiftId ? shiftsById.get(workShiftId) : null
      return {
        key: `entry-${entry.id ?? `${dayOfWeek}-${workShiftId ?? "unknown"}`}`,
        label: shift?.name ?? entry.label ?? labels.shift,
        slotType: "shift" as const,
        timeRange: `${formatTime(shift?.start_time)}-${formatTime(shift?.end_time)}`,
      }
    })
  }

  return (planning.daily_slots ?? [])
    .filter((slot) => slot.day_of_week === dayOfWeek)
    .map((slot, index): PlanningSlotChip => ({
      key: `slot-${dayOfWeek}-${index}`,
      label: slot.label || labels.slot,
      slotType: slot.slot_type,
      timeRange: `${formatTime(slot.start_time)}-${formatTime(slot.end_time)}`,
    }))
}

const HOUR_MARKERS_4H = [0, 4, 8, 12, 16, 20, 24]
const HOUR_MARKERS_6H = [0, 6, 12, 18, 24]

type PlanningErrorCode = PlanningPageErrorCode

type PlanningUiError = {
  code: PlanningErrorCode
  // Optional backend detail; when null, the localized message for `code` is shown.
  detail: string | null
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
  const { locale, formatDate, localeTag } = useI18n()
  const tr = planningPageDict[locale]
  const weekDayLabels = useMemo(() => buildWeekdayLabels(formatDate, "long"), [formatDate])
  const weekDays = useMemo(
    () => WEEK_DAY_KEYS.map((key) => ({ key, label: weekDayLabels[key] ?? "" })),
    [weekDayLabels]
  )
  const [activeView, setActiveView] = useState<PlanningView | null>("team")
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

  const teamRef = useRef<HTMLElement | null>(null)
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
        detail: detail && detail.trim().length > 0 ? detail : null,
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
      view === "team"
        ? teamRef.current
        : view === "timetable"
          ? timetableRef.current
          : view === "shift"
            ? shiftRef.current
            : scheduleRef.current
    targetRef?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const planningCards = useMemo(
    () => [
      {
        key: "team" as const,
        label: tr.navCards.team,
        helper: tr.navCards.teamHelper(employees.length),
        icon: Users,
        action: () => focusView("team"),
      },
      {
        key: "schedule" as const,
        label: tr.navCards.schedule,
        helper: tr.navCards.scheduleHelper,
        icon: CalendarRange,
        action: () => focusView("schedule"),
      },
      {
        key: "timetable" as const,
        label: tr.navCards.timetable,
        helper: tr.navCards.timetableHelper(plannings.length),
        icon: Plus,
        action: () => focusView("timetable"),
      },
      {
        key: "shift" as const,
        label: tr.navCards.shift,
        helper: tr.navCards.shiftHelper(workShifts.length),
        icon: Shapes,
        action: () => focusView("shift"),
      },
    ],
    [focusView, employees.length, plannings.length, workShifts.length, tr]
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
        getPlanningDayEntries(planning, day, workShiftsById, tr.labels).some(
          (entry) => entry.slotType !== "rest"
        )
      )
      const weekendModes = WEEKEND_DAY_KEYS.map((day) =>
        getPlanningDayEntries(planning, day, workShiftsById, tr.labels).some(
          (entry) => entry.slotType !== "rest"
        )
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
  }, [employees, plannings, workShiftsById, tr])

  const planningPreviewRecap = useMemo(() => {
    if (!planningPreviewTarget) return null
    return planningRecap.find((item) => item.planning.id === planningPreviewTarget.id) ?? null
  }, [planningPreviewTarget, planningRecap])
  const planningPreviewDayEntries = useMemo(() => {
    if (!planningPreviewTarget) return []

    const weekly = weekDays.map((day) => ({
      day,
      entries: getPlanningDayEntries(planningPreviewTarget, day.key, workShiftsById, tr.labels),
    }))
    const hasWeekly = weekly.some((item) => item.entries.length > 0)
    if (hasWeekly) {
      return weekly
    }

    const derivedByDay = new Map<number, PlanningSlotChip[]>()
    weekDays.forEach((day) => derivedByDay.set(day.key, []))

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
      const label = entry.is_rest_day
        ? tr.labels.rest
        : shift?.name ?? entry.label ?? tr.labels.shift
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

    return weekDays.map((day) => ({
      day,
      entries: derivedByDay.get(day.key) ?? [],
    }))
  }, [planningPreviewTarget, workShiftsById, weekDays, tr])
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
        const label = entry.is_rest_day
          ? tr.labels.rest
          : shift?.name ?? entry.label ?? tr.labels.entry
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
  }, [planningPreviewTarget, workShiftsById, tr])

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

    setLoading(true)
    setError(null)
    try {
      const [employeesData, departmentsData, shiftsData, planningsData] = await Promise.all([
        fetchEmployeesDetailed(getEmployeeTenantCode()),
        fetchDepartments(getEmployeeTenantCode()),
        fetchWorkShifts(getEmployeeTenantCode()),
        fetchPlannings(getEmployeeTenantCode()),
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
      requestedView === "team" ||
      requestedView === "timetable" ||
      requestedView === "shift" ||
      requestedView === "schedule"
        ? requestedView
        : requestedFocus === "team"
          ? "team"
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
    // Durée minimale : au moins 15 minutes
    const shiftDurationMinutes = minutesForward(startTime, endTime)
    if (shiftDurationMinutes < 15) {
      raiseError("SHIFT_DURATION_TOO_SHORT", null, "shift_dialog")
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
    // La pause doit être dans la plage de service
    if (hasBreakStart && hasBreakEnd) {
      const breakStartMin = minutesForward(startTime, breakStart)
      const breakEndMin = minutesForward(startTime, breakEnd)
      if (breakStartMin >= shiftDurationMinutes || breakEndMin > shiftDurationMinutes || breakStartMin >= breakEndMin) {
        raiseError("SHIFT_BREAK_OUTSIDE_SERVICE", null, "shift_dialog")
        return
      }
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
      toast.success(editingShift ? tr.toasts.shiftUpdated : tr.toasts.shiftCreated)
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

    const recurringEntries = buildPlanningEntriesFromDailySlots(
      newPlanning.dailySlots,
      workShiftsById,
      weekDayLabels,
      tr.labels
    )

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
      toast.success(editingPlanning ? tr.toasts.planningUpdated : tr.toasts.planningCreated)
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
          toast.warning(tr.toasts.shiftLinkedWarning)
          return
        }
        throw deleteError
      }

      await loadBaseData()
      await loadSchedule()
      toast.success(tr.toasts.shiftDeleted(shift.name))
      setPendingShiftDelete(null)
      setForceShiftDelete(false)
    } catch (deleteError) {
      raiseError("SHIFT_DELETE_FAILED", getErrorDetail(deleteError))
      toast.error(tr.toasts.shiftDeleteError)
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
          toast.warning(tr.toasts.planningLinkedWarning)
          return
        }
        throw deleteError
      }

      await loadBaseData()
      await loadSchedule()
      toast.success(tr.toasts.planningDeleted(planning.name))
      setPendingPlanningDelete(null)
      setForcePlanningDelete(false)
    } catch (deleteError) {
      raiseError("PLANNING_DELETE_FAILED", getErrorDetail(deleteError))
      toast.error(tr.toasts.planningDeleteError)
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
      toast.success(tr.toasts.planningAssigned)
    } catch (assignError) {
      raiseError("ASSIGN_PLANNING_FAILED", getErrorDetail(assignError))
      toast.error(tr.toasts.planningAssignError)
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
      WEEK_DAY_KEYS.forEach((dayKey) => {
        nextDailySlots[dayKey] = {
          ...nextDailySlots[dayKey],
          shiftIds: nextDailySlots[dayKey].shiftIds.filter((shiftId) => shiftId !== selectedShiftId),
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
      toast.error(tr.toasts.wizardTenantMissing)
      throw new Error(tr.toasts.wizardTenantMissing)
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
              description: tr.wizardShiftDescription(scope),
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

      const entries = buildEntriesFromWizardConfig(
        payload,
        weekdayCaseBindings,
        weekendCaseBindings,
        tr.labels.rest
      )

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
      let assignmentLabel = tr.toasts.scopeUsers

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
          ? tr.toasts.scopeDepartmentsWithSub
          : tr.toasts.scopeDepartments
      }

      if (failedCount > 0) {
        toast.warning(tr.toasts.wizardAssignFailures(failedCount, assignmentLabel))
      }

      await loadBaseData()
      await loadSchedule()

      toast.success(tr.toasts.wizardCreated, {
        description:
          assignedCount > 0
            ? tr.toasts.wizardCreatedAssigned(assignedCount, assignmentLabel)
            : tr.toasts.wizardCreatedReady,
      })
    } catch (wizardError) {
      raiseError("WIZARD_CREATE_FAILED", getErrorDetail(wizardError))
      toast.error(tr.toasts.wizardCreateError)
      throw wizardError
    } finally {
      setIsCreatingWizardPlanning(false)
    }
  }

  return (
    <div className="legacy-theme app-shell bg-[#0b0d13] text-[#e2e8f0]">
      <AppSidebar />
      <div className="app-shell-content">
        <Header
          systemStatus={loading ? "syncing" : isEmployeeApiEnabled() ? "connected" : "disconnected"}
          hideRouteInfo
        />

        <main className="mx-auto w-full max-w-430 space-y-3 px-3 py-3 md:px-4 2xl:max-w-none">
          {/* ── Compact header ── */}
          <section className="flex flex-col gap-3 border border-[#1c2133] bg-[#111318] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">
                {tr.header.eyebrow}
              </p>
              <h1 className="mt-1 font-display text-[22px] font-bold uppercase leading-none tracking-[0.08em] text-[#e2e8f0]">
                {tr.header.title}
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-[#7a8599]">
                {tr.header.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                aria-label={tr.header.sync}
                title={tr.header.sync}
                className="h-8 w-8 rounded-none border-[#1c2133] bg-[#1a1f2e] p-0 text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                onClick={() => void loadBaseData()}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--success)]/60 hover:bg-[#1a1f2e] hover:text-[var(--success)]"
                onClick={openCreateShiftDialog}
              >
                <Shapes className="mr-2 h-4 w-4" />
                {tr.header.shiftButton}
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] shadow-none hover:bg-[var(--brand-accent)]"
                onClick={() => setWizardOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {tr.header.newPlanning}
              </Button>
            </div>
          </section>

          {/* ── Mini stat strip ── */}
          <section className="grid gap-2 sm:grid-cols-3">
            <PlanningMetricCard
              label={tr.metrics.plannings}
              value={plannings.length}
              note={
                plannings.length > 0
                  ? tr.metrics.planningsActive(plannings.length)
                  : tr.metrics.planningsEmpty
              }
              tone="amber"
              icon={CalendarRange}
            />
            <PlanningMetricCard
              label={tr.metrics.shifts}
              value={workShifts.length}
              note={workShifts.length > 0 ? tr.metrics.shiftsReusable : tr.metrics.shiftsNone}
              tone="green"
              icon={Shapes}
            />
            <PlanningMetricCard
              label={tr.metrics.withoutPlanning}
              value={employees.filter((emp) => !emp.effective_planning?.id).length}
              note={tr.metrics.ofPeople(employees.length)}
              tone="red"
              icon={Users}
            />
          </section>

          {/* ── Global error ── */}
          {error?.scope === "global" && (
            <div role="alert" className="border border-[var(--destructive)]/40 bg-[#2a0e0e]/40 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--destructive)]">
                    {error.detail ?? tr.errors[error.code]}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[var(--destructive)]"
                  onClick={() => setError(null)}
                >
                  {tr.close}
                </Button>
              </div>
            </div>
          )}

          {/* ── Segmented nav ── */}
          <nav className="overflow-x-auto border border-[#1c2133] bg-[#0b0d13]">
            <div className="flex min-w-max items-center gap-0">
              {planningCards.map((card) => {
                const Icon = card.icon
                const isActive = activeView === card.key
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={card.action}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                      isActive
                        ? "bg-[var(--brand-accent)] text-[#0b0d13]"
                        : "text-[#7a8599] hover:bg-[#1a1f2e] hover:text-[#e2e8f0]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    <span>{card.label}</span>
                    <span
                      className={cn(
                        "ml-1 px-1.5 py-0.5 font-mono text-[9px] tabular-nums",
                        isActive ? "bg-[#0b0d13]/30 text-[#0b0d13]" : "bg-[#1a1f2e] text-[#4a5568]"
                      )}
                    >
                      {card.helper.match(/\d+/)?.[0] ?? ""}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* ── Single active panel ── */}

          {/* TEAM */}
          <section
            ref={teamRef}
            className={cn("border border-[#1c2133] bg-[#111318]", activeView === "team" ? "block" : "hidden")}
          >
            <div className="h-[2px] w-full bg-[var(--info)]" />
            <div className="p-3">
              <TeamPlanningView
                tenantId={tenantId}
                tenantCode={getEmployeeTenantCode()}
                apiEnabled={isEmployeeApiEnabled()}
                employees={employees}
                departments={departments}
                workShifts={workShifts}
                plannings={plannings}
                departmentsById={departmentsById}
                onRequestRefreshBase={() => void loadBaseData()}
              />
            </div>
          </section>

          {/* TIMETABLE — table compacte */}
          <section
            ref={timetableRef}
            className={cn(
              "border border-[#1c2133] bg-[#111318]",
              activeView === "timetable" ? "block" : "hidden"
            )}
          >
            <div className="h-[2px] w-full bg-[#a78bfa]" />
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-[#1e1530] text-[#a78bfa]">
                  <CalendarRange className="size-4" />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">
                    {tr.timetableSection.eyebrow}
                  </p>
                  <h2 className="mt-1 font-display text-[15px] font-semibold uppercase leading-none tracking-[0.06em] text-[#e2e8f0]">
                    {tr.timetableSection.title}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.timetableSection.hint}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#a78bfa]/60 hover:text-[#a78bfa]"
                  onClick={openCreatePlanningDialog}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {tr.timetableSection.add}
                </Button>
              </div>
            </div>

            <div className="p-3">
              {loading ? (
                <div className="space-y-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 border border-[#1c2133] bg-[#0b0d13]">
                      <div className="h-full w-1/2 bg-[#1c2133]/40" />
                    </div>
                  ))}
                </div>
              ) : planningRecap.length === 0 ? (
                <div className="flex flex-col items-center border border-dashed border-[#1c2133] bg-[#0b0d13] px-4 py-12 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center bg-[#1e1530] text-[#a78bfa]">
                    <CalendarRange className="size-6" />
                  </div>
                  <p className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
                    {tr.timetableSection.emptyTitle}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                    {tr.timetableSection.emptyHint}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto border border-[#1c2133] bg-[#0b0d13]">
                    <table className="w-full min-w-[720px] border-collapse">
                      <thead>
                        <tr className="border-b border-[#1c2133]">
                          <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                            {tr.timetableSection.colPlanning}
                          </th>
                          <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                            {tr.timetableSection.colHoursPerWeek}
                          </th>
                          <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                            {tr.timetableSection.colCoverage}
                          </th>
                          <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                            {tr.timetableSection.colAssigned}
                          </th>
                          <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                            {tr.timetableSection.colActions}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPlanningRecap.map((item) => {
                          const stats = computePlanningStats(
                            item.planning,
                            workShiftsById,
                            weekDayLabels,
                            tr.labels
                          )
                          return (
                            <tr
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
                              className="group cursor-pointer border-b border-[#1c2133] transition hover:bg-[#1a1f2e]/40"
                            >
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <p className="truncate font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                                    {item.planning.name}
                                  </p>
                                  <span className="shrink-0 border border-[#1c2133] bg-[#0d1e2e] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--info)] tabular-nums">
                                    {item.planning.timezone}
                                  </span>
                                </div>
                                <p className="mt-0.5 font-mono text-[10px] tracking-normal text-[#4a5568] normal-case">
                                  {item.planning.code || tr.timetableSection.noCode} &middot;{" "}
                                  {tr.timetableSection.shiftCount(item.shiftCount)}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-[#e2e8f0]">
                                {formatHoursLabel(stats.totalMinutes)}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1">
                                  {stats.days.map((day) => {
                                    const slot = day.slots[0]
                                    const kind = slot ? getShiftKind(slot) : "rest"
                                    const isToday = day.key === ((new Date().getDay() + 6) % 7)
                                    return (
                                      <div
                                        key={`mini-${item.planning.id}-${day.key}`}
                                        title={`${day.label}: ${day.slots.length === 0 ? tr.timetableSection.dayTitleNone : day.slots.map((s) => s.label + (s.timeRange ? " " + s.timeRange : "")).join(", ")}`}
                                        className={cn(
                                          "size-2.5 border",
                                          slot ? SHIFT_KIND_DOT_INDUSTRIAL[kind] : "bg-transparent border-[#1c2133]",
                                          isToday && "ring-1 ring-[var(--brand-accent)]/60",
                                          !slot && "border-[#1c2133]"
                                        )}
                                      />
                                    )
                                  })}
                                </div>
                                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#4a5568] tabular-nums">
                                  {tr.timetableSection.coverageSummary(
                                    item.weekdaysWithProgram,
                                    item.weekendWithProgram
                                  )}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 font-display text-sm font-semibold tabular-nums text-[#e2e8f0]">
                                {item.assignedEmployees}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)]"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openAssignPlanningDialog(item.planning)
                                    }}
                                  >
                                    {tr.timetableSection.assign}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] text-[#7a8599] hover:border-[#a78bfa]/60 hover:text-[#a78bfa]"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openEditPlanningDialog(item.planning)
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] text-[#7a8599] hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleDeletePlanning(item.planning)
                                    }}
                                    disabled={deletingPlanningId === item.planning.id}
                                  >
                                    {deletingPlanningId === item.planning.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {planningListTotalPages > 1 ? (
                    <div className="mt-2 flex items-center justify-between border border-[#1c2133] bg-[#0b0d13] px-3 py-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568] tabular-nums">
                        {tr.timetableSection.planningCount(planningRecap.length)}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 rounded-none border-[#1c2133] bg-[#1a1f2e] p-0 text-[#7a8599] hover:border-[#a78bfa]/60 hover:text-[#a78bfa]"
                          onClick={() => setPlanningListPage((current) => Math.max(1, current - 1))}
                          disabled={planningListPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] tabular-nums">
                          {planningListPage}/{planningListTotalPages}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 rounded-none border-[#1c2133] bg-[#1a1f2e] p-0 text-[#7a8599] hover:border-[#a78bfa]/60 hover:text-[#a78bfa]"
                          onClick={() =>
                            setPlanningListPage((current) => Math.min(planningListTotalPages, current + 1))
                          }
                          disabled={planningListPage >= planningListTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {/* SHIFT — table compacte */}
          <section
            ref={shiftRef}
            className={cn("border border-[#1c2133] bg-[#111318]", activeView === "shift" ? "block" : "hidden")}
          >
            <div className="h-[2px] w-full bg-[var(--success)]" />
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-[#0d2a1a] text-[var(--success)]">
                  <Shapes className="size-4" />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">
                    {tr.shiftSection.eyebrow}
                  </p>
                  <h2 className="mt-1 font-display text-[15px] font-semibold uppercase leading-none tracking-[0.06em] text-[#e2e8f0]">
                    {tr.shiftSection.title}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.shiftSection.hint}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--success)]/60 hover:text-[var(--success)]"
                onClick={openCreateShiftDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                {tr.shiftSection.add}
              </Button>
            </div>

            <div className="p-3">
              {loading ? (
                <div className="space-y-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 border border-[#1c2133] bg-[#0b0d13]" />
                  ))}
                </div>
              ) : workShifts.length === 0 ? (
                <div className="flex flex-col items-center border border-dashed border-[#1c2133] bg-[#0b0d13] px-4 py-12 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center bg-[#0d2a1a] text-[var(--success)]">
                    <Shapes className="size-6" />
                  </div>
                  <p className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
                    {tr.shiftSection.emptyTitle}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                    {tr.shiftSection.emptyHint}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#1c2133] bg-[#0b0d13]">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#1c2133]">
                        <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftSection.colShift}
                        </th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftSection.colTime}
                        </th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftSection.colBreak}
                        </th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftSection.colOvertime}
                        </th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftSection.colLate}
                        </th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftSection.colEarly}
                        </th>
                        <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftSection.colActions}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {workShifts.map((shift) => (
                        <tr
                          key={shift.id}
                          className="group border-b border-[#1c2133] transition hover:bg-[#1a1f2e]/40"
                        >
                          <td className="px-3 py-2.5">
                            <p className="truncate font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                              {shift.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] tracking-normal text-[#4a5568] normal-case">
                              {shift.code || tr.shiftSection.noCode}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="border border-[#1c2133] bg-[#0d2a1a] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--success)] tabular-nums">
                              {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[#7a8599]">
                            {shift.break_start_time || shift.break_end_time
                              ? `${formatTime(shift.break_start_time)} – ${formatTime(shift.break_end_time)}`
                              : <span className="text-[#4a5568]">—</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[#7a8599]">
                            {shift.overtime_minutes ? tr.shiftSection.minutes(shift.overtime_minutes) : <span className="text-[#4a5568]">—</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[#7a8599]">
                            {tr.shiftSection.minutes(shift.late_allowable_minutes ?? 0)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[#7a8599]">
                            {tr.shiftSection.minutes(shift.early_leave_allowable_minutes ?? 0)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] text-[#7a8599] hover:border-[var(--success)]/60 hover:text-[var(--success)]"
                                onClick={() => openEditShiftDialog(shift)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] text-[#7a8599] hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
                                onClick={() => void handleDeleteShift(shift)}
                                disabled={deletingShiftId === shift.id}
                              >
                                {deletingShiftId === shift.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* SCHEDULE (calendrier individuel) */}
          <section
            ref={scheduleRef}
            className={cn(
              "border border-[#1c2133] bg-[#111318]",
              activeView === "schedule" ? "block" : "hidden"
            )}
          >
            <div className="h-[2px] w-full bg-[var(--warning)]" />
            <PlanningSectionHeader
              eyebrow={tr.scheduleSection.eyebrow}
              title={tr.scheduleSection.title}
              subtitle={tr.scheduleSection.subtitle}
              tone="amber"
              icon={CalendarDays}
              actions={
                <div className="grid gap-1.5 sm:grid-cols-[minmax(180px,1fr)_auto_auto]">
                  <select
                    value={selectedEmployeeId ?? ""}
                    onChange={(event) => setSelectedEmployeeId(Number(event.target.value))}
                    className="h-8 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#e2e8f0] outline-none focus:border-[var(--warning)]/60"
                  >
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id} className="bg-[#0b0d13] normal-case">
                        {(employee.name || employee.employee_no) +
                          " – " +
                          getEmployeeDepartment(employee, departmentsById, tr.noDepartment)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 rounded-none border-[#1c2133] bg-[#1a1f2e] p-0 text-[#7a8599] hover:border-[var(--warning)]/60 hover:text-[var(--warning)]"
                      onClick={() => shiftMonth(-1)}
                      aria-label={tr.scheduleSection.prevMonth}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input
                      type="month"
                      value={month ?? ""}
                      onChange={(event) => setMonth(event.target.value)}
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 rounded-none border-[#1c2133] bg-[#1a1f2e] p-0 text-[#7a8599] hover:border-[var(--warning)]/60 hover:text-[var(--warning)]"
                      onClick={() => shiftMonth(1)}
                      aria-label={tr.scheduleSection.nextMonth}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--warning)]/60 hover:text-[var(--warning)]"
                      onClick={goCurrentMonth}
                    >
                      {tr.scheduleSection.today}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] p-0 px-2 text-[#7a8599] hover:border-[var(--warning)]/60 hover:text-[var(--warning)]"
                      onClick={() => void loadSchedule()}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              }
            />
            <div className="p-3">
              {selectedEmployee && (
                <div className="mb-3 grid gap-2 lg:grid-cols-3">
                  <article className="relative border border-[#1c2133] bg-[#0b0d13] p-3">
                    <div className="absolute left-0 top-0 h-full w-[3px] bg-[var(--warning)]" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a5568]">
                      {tr.scheduleSection.employee}
                    </p>
                    <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                      {selectedEmployee.name || selectedEmployee.employee_no}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">
                      {getEmployeeDepartment(selectedEmployee, departmentsById, tr.noDepartment)}
                    </p>
                  </article>
                  <article className="relative border border-[#1c2133] bg-[#0b0d13] p-3">
                    <div className="absolute left-0 top-0 h-full w-[3px] bg-[var(--info)]" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a5568]">
                      {tr.scheduleSection.effectivePlanning}
                    </p>
                    <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                      {schedule?.planning?.name ?? tr.scheduleSection.noPlanning}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">
                      {selectedEmployee.effective_work_shift?.name ?? tr.scheduleSection.noMainShift}
                    </p>
                  </article>
                  <article className="relative border border-[#1c2133] bg-[#0b0d13] p-3">
                    <div className="absolute left-0 top-0 h-full w-[3px] bg-[#a78bfa]" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a5568]">
                      {tr.scheduleSection.summary}
                    </p>
                    <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0] tabular-nums">
                      {schedule?.summary ? formatMinutes(schedule.summary.planned_minutes) : "--"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] tabular-nums">
                      {tr.scheduleSection.workedDays(schedule?.summary?.working_days ?? 0)}
                    </p>
                  </article>
                </div>
              )}

              {loadingSchedule ? (
                <div className="grid gap-2 2xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-7">
                    {Array.from({ length: 35 }, (_, i) => (
                      <div key={i} className="min-h-24 border border-[#1c2133] bg-[#0b0d13] p-1.5">
                        <div className="h-3 w-6 bg-[#1c2133]" />
                        <div className="mt-4 h-5 w-full bg-[#1c2133]" />
                      </div>
                    ))}
                  </div>
                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <div className="h-3 w-24 bg-[#1c2133]" />
                    <div className="mt-3 h-16 bg-[#1c2133]" />
                  </div>
                </div>
              ) : !schedule?.days.length ? (
                <div className="flex flex-col items-center border border-dashed border-[#1c2133] bg-[#0b0d13] px-4 py-12 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center bg-[#2a1e06] text-[var(--warning)]">
                    <CalendarDays className="size-6" />
                  </div>
                  <p className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
                    {tr.scheduleSection.emptyTitle}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                    {tr.scheduleSection.emptyHint}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 2xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0">
                    <div className="mb-2 hidden grid-cols-7 gap-1.5 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-[#4a5568] md:grid">
                      {weekDayLabels.map((label, index) => (
                        <div key={`dow-${index}`} className="border border-[#1c2133] bg-[#0b0d13] px-2 py-2">
                          {label.slice(0, 3)}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-7">
                      {monthGrid.map((day, index) =>
                        day ? (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => setSelectedDate(day.date)}
                            title={
                              day.shifts.length
                                ? day.shifts
                                    .map(
                                      (shift) =>
                                        `${shift.name} ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`
                                    )
                                    .join("\n")
                                : day.is_rest_day
                                  ? tr.labels.rest
                                  : undefined
                            }
                            className={cn(
                              "flex min-h-24 min-w-0 flex-col border p-1.5 text-left transition",
                              selectedDate === day.date
                                ? "border-[var(--warning)]/60 bg-[#2a1e06]/40 ring-1 ring-[var(--warning)]/30"
                                : day.is_rest_day
                                  ? "border-[#1c2133] bg-[#0b0d13] hover:bg-[#1a1f2e]"
                                  : "border-[#1c2133] bg-[#111318] hover:bg-[#1a1f2e]"
                            )}
                          >
                            <div className="flex items-baseline justify-between gap-1">
                              <span
                                className={cn(
                                  "font-display text-sm font-bold leading-none tabular-nums",
                                  selectedDate === day.date ? "text-[var(--warning)]" : "text-[#e2e8f0]"
                                )}
                              >
                                {new Date(`${day.date}T00:00:00`).getDate()}
                              </span>
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#4a5568]">
                                {formatDate(`${day.date}T00:00:00`, { weekday: "long" }).slice(0, 3)}
                              </span>
                            </div>

                            <div className="mt-2 flex min-w-0 flex-col gap-1">
                              {day.shifts.length ? (
                                <>
                                  {day.shifts.slice(0, 2).map((shift) => {
                                    const timeRange = `${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`
                                    const label = shift.code || shift.name
                                    return (
                                      <div
                                        key={`${day.date}-${shift.id}`}
                                        className="flex min-w-0 items-center gap-1 border border-[#1c2133] bg-[#2a1e06]/60 px-1.5 py-0.5"
                                      >
                                        <span className="size-1 shrink-0 rounded-full bg-[var(--warning)]" />
                                        <span className="min-w-0 truncate font-mono text-[9px] tabular-nums text-[var(--warning)] whitespace-nowrap">
                                          {timeRange}
                                        </span>
                                        {label ? (
                                          <span className="ml-auto hidden min-w-0 truncate font-mono text-[9px] uppercase text-[var(--warning)]/70 lg:inline">
                                            {label}
                                          </span>
                                        ) : null}
                                      </div>
                                    )
                                  })}
                                  {day.shifts.length > 2 ? (
                                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#4a5568]">
                                      {tr.scheduleSection.more(day.shifts.length - 2)}
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <div className="pt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#4a5568]">
                                  {day.is_rest_day ? tr.labels.rest : "—"}
                                </div>
                              )}
                            </div>
                          </button>
                        ) : (
                          <div
                            key={`empty-${index}`}
                            className="min-h-24 border border-dashed border-[#1c2133]/60 bg-[#0b0d13]/40"
                          />
                        )
                      )}
                    </div>
                  </div>

                  <aside className="relative border border-[#1c2133] bg-[#0b0d13] p-3">
                    <div className="absolute left-0 top-0 h-full w-[3px] bg-[var(--warning)]" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a5568]">
                      {tr.scheduleSection.selectedDay}
                    </p>
                    {selectedDay ? (
                      <div className="mt-2 space-y-3">
                        <div>
                          <div className="font-display text-base font-bold tabular-nums text-[#e2e8f0]">
                            {formatDate(`${selectedDay.date}T00:00:00`)}
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">
                            {formatDate(`${selectedDay.date}T00:00:00`, { weekday: "long" })}
                          </div>
                        </div>

                        <div className="border border-[#1c2133] bg-[#111318] p-2.5">
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                            {tr.scheduleSection.hours}
                          </p>
                          <p className="mt-1 font-display text-sm font-bold tabular-nums text-[var(--warning)]">
                            {formatMinutes(selectedDay.planned_minutes)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                            {tr.scheduleSection.shifts}
                          </p>
                          {selectedDay.shifts.length ? (
                            selectedDay.shifts.map((shift) => (
                              <div
                                key={`${selectedDay.date}-${shift.id}-detail`}
                                className="border border-[#1c2133] bg-[#111318] p-2.5"
                              >
                                <p className="font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                                  {shift.name}
                                </p>
                                <p className="mt-1 font-mono text-[10px] tabular-nums text-[#7a8599]">
                                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                </p>
                                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#4a5568]">
                                  {tr.scheduleSection.net} {formatMinutes(shift.net_minutes)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="border border-dashed border-[#1c2133] px-3 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                              {tr.scheduleSection.noShiftThisDay}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                        {tr.scheduleSection.pickADay}
                      </p>
                    )}
                  </aside>
                </div>
              )}
            </div>
          </section>

          {/* ── Dialogs ── */}
          <Dialog open={assignPlanningOpen} onOpenChange={closeAssignPlanningDialog}>
            <DialogContent className="max-w-2xl rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {tr.assignDialog.title(assignPlanningTarget?.name ?? "")}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.assignDialog.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {error?.scope === "global" &&
                (error.code === "ASSIGN_PLANNING_FAILED" || error.code === "ASSIGN_DATE_RANGE_INVALID") ? (
                  <div role="alert" className="border border-[var(--destructive)]/40 bg-[#2a0e0e]/40 px-3 py-2">
                    <p className="text-sm text-[var(--destructive)]">{error.detail ?? tr.errors[error.code]}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center border border-[#1c2133] bg-[#0b0d13] p-1">
                    {(["employees", "departments"] as const).map((mode) => {
                      const labels = {
                        employees: tr.assignDialog.people,
                        departments: tr.assignDialog.departments,
                      } as const
                      const isSelected = assignMode === mode
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setAssignMode(mode)}
                          className={cn(
                            "px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors",
                            isSelected ? "bg-[var(--brand-accent)] text-[#0b0d13]" : "text-[#4a5568] hover:text-[#e2e8f0]"
                          )}
                        >
                          {labels[mode]}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                      onClick={() => {
                        if (assignMode === "departments") {
                          setSelectedAssignDepartmentIds(filteredAssignDepartments.map((department) => department.id))
                          return
                        }
                        setSelectedAssignEmployeeIds(filteredAssignEmployees.map((employee) => employee.id))
                      }}
                    >
                      {tr.assignDialog.selectAll}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
                      onClick={() => {
                        if (assignMode === "departments") {
                          setSelectedAssignDepartmentIds([])
                          return
                        }
                        setSelectedAssignEmployeeIds([])
                      }}
                    >
                      {tr.assignDialog.clearAll}
                    </Button>
                  </div>
                </div>

                <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#4a5568]">
                      {tr.assignDialog.dateRange}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:text-[var(--destructive)]"
                      onClick={() => {
                        setAssignStartDate("")
                        setAssignEndDate("")
                      }}
                    >
                      {tr.assignDialog.clear}
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                        {tr.assignDialog.startDate}
                      </label>
                      <Input
                        type="date"
                        value={assignStartDate}
                        onChange={(event) => setAssignStartDate(event.target.value)}
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                        {tr.assignDialog.endDate}
                      </label>
                      <Input
                        type="date"
                        value={assignEndDate}
                        onChange={(event) => setAssignEndDate(event.target.value)}
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0]"
                      />
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                    {tr.assignDialog.emptyRangeHint}
                  </p>
                </div>

                <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                  <Input
                    value={assignSearch}
                    onChange={(event) => setAssignSearch(event.target.value)}
                    placeholder={
                      assignMode === "departments"
                        ? tr.assignDialog.searchDepartment
                        : tr.assignDialog.searchPerson
                    }
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] tabular-nums">
                    {assignMode === "departments"
                      ? tr.assignDialog.selectionSummary(
                          selectedAssignDepartmentIds.length,
                          filteredAssignDepartments.length
                        )
                      : tr.assignDialog.selectionSummary(
                          selectedAssignEmployeeIds.length,
                          filteredAssignEmployees.length
                        )}
                  </p>
                </div>

                {assignMode === "departments" ? (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                      <input
                        type="checkbox"
                        checked={includeSubDepartments}
                        onChange={(event) => setIncludeSubDepartments(event.target.checked)}
                      />
                      {tr.assignDialog.includeSubDepartments}
                    </label>
                    <div className="max-h-72 space-y-1 overflow-y-auto border border-[#1c2133] bg-[#0b0d13] p-2">
                      {filteredAssignDepartments.map((department) => (
                        <label
                          key={`assign-department-${department.id}`}
                          className="flex cursor-pointer items-center gap-2 border border-[#1c2133] bg-[#111318] px-3 py-2 text-sm transition hover:border-[var(--brand-accent)]/60"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignDepartmentIds.includes(department.id)}
                            onChange={(event) => toggleAssignDepartment(department.id, event.target.checked)}
                          />
                          <span className="text-[#e2e8f0]">{department.name}</span>
                        </label>
                      ))}
                      {departments.length === 0 ? (
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                          {tr.assignDialog.noDepartments}
                        </p>
                      ) : filteredAssignDepartments.length === 0 ? (
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                          {tr.assignDialog.noDepartmentMatch}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-72 space-y-1 overflow-y-auto border border-[#1c2133] bg-[#0b0d13] p-2">
                    {filteredAssignEmployees.map((employee) => (
                      <label
                        key={`assign-employee-${employee.id}`}
                        className="flex cursor-pointer items-center gap-2 border border-[#1c2133] bg-[#111318] px-3 py-2 text-sm transition hover:border-[var(--brand-accent)]/60"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignEmployeeIds.includes(employee.id)}
                          onChange={(event) => toggleAssignEmployee(employee.id, event.target.checked)}
                        />
                        <span className="text-[#e2e8f0]">
                          {employee.name || employee.employee_no}
                          <span className="ml-1 font-mono text-[10px] text-[#7a8599]">
                            {tr.assignDialog.currentPlanning(employee.effective_planning?.name ?? null)}
                          </span>
                        </span>
                      </label>
                    ))}
                    {employees.length === 0 ? (
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                        {tr.assignDialog.noPeople}
                      </p>
                    ) : filteredAssignEmployees.length === 0 ? (
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                        {tr.assignDialog.noPersonMatch}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closeAssignPlanningDialog(false)}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                  disabled={isAssigningPlanning}
                >
                  {tr.assignDialog.cancel}
                </Button>
                <Button
                  className="h-9 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--brand-accent)]"
                  onClick={() => void handleAssignPlanning()}
                  disabled={
                    isAssigningPlanning ||
                    !assignPlanningTarget ||
                    (assignMode === "employees" && selectedAssignEmployeeIds.length === 0) ||
                    (assignMode === "departments" && selectedAssignDepartmentIds.length === 0)
                  }
                >
                  {isAssigningPlanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.assignDialog.assignNow}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!planningPreviewTarget} onOpenChange={closePlanningPreviewDialog}>
            <DialogContent className="max-w-3xl rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {tr.previewDialog.title(planningPreviewTarget?.name ?? "")}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.previewDialog.description}
                </DialogDescription>
              </DialogHeader>

              {planningPreviewTarget ? (
                <div className="space-y-3 py-1">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="border border-[#1c2133] bg-[#0b0d13] p-2.5">
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                        {tr.previewDialog.code}
                      </p>
                      <p className="mt-1 font-display text-sm font-semibold text-[#e2e8f0]">
                        {planningPreviewTarget.code || tr.previewDialog.noCode}
                      </p>
                    </div>
                    <div className="border border-[#1c2133] bg-[#0b0d13] p-2.5">
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                        {tr.previewDialog.timezone}
                      </p>
                      <p className="mt-1 font-display text-sm font-semibold text-[#e2e8f0]">
                        {planningPreviewTarget.timezone || "UTC"}
                      </p>
                    </div>
                    <div className="border border-[#1c2133] bg-[#0b0d13] p-2.5">
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                        {tr.previewDialog.weekActive}
                      </p>
                      <p className="mt-1 font-display text-sm font-semibold text-[#e2e8f0] tabular-nums">
                        {planningPreviewRecap ? `${planningPreviewRecap.weekdaysWithProgram}/5` : "--"}
                      </p>
                    </div>
                    <div className="border border-[#1c2133] bg-[#0b0d13] p-2.5">
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                        {tr.previewDialog.weekendActive}
                      </p>
                      <p className="mt-1 font-display text-sm font-semibold text-[#e2e8f0] tabular-nums">
                        {planningPreviewRecap ? `${planningPreviewRecap.weekendWithProgram}/2` : "--"}
                      </p>
                    </div>
                  </div>

                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7a8599]">
                      {tr.previewDialog.shiftsPerDay}
                    </p>
                    {planningPreviewHasWeeklyEntries ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {planningPreviewDayEntries.map(({ day, entries }) => (
                          <div key={`preview-day-${day.key}`} className="border border-[#1c2133] bg-[#111318] px-2.5 py-2">
                            <p className="font-display text-xs font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
                              {day.label}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {entries.length ? (
                                entries.slice(0, 4).map((slot) => {
                                  const kind = getShiftKind(slot)
                                  return (
                                    <span
                                      key={`preview-slot-${day.key}-${slot.key}`}
                                      className={cn(
                                        "border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em]",
                                        SHIFT_KIND_PIP_INDUSTRIAL[kind]
                                      )}
                                    >
                                      {slot.label}
                                      {slot.timeRange ? ` ${slot.timeRange}` : ""}
                                    </span>
                                  )
                                })
                              ) : (
                                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#4a5568]">
                                  {tr.previewDialog.noApplicableShift}
                                </span>
                              )}
                              {entries.length > 4 ? (
                                <span className="border border-[#1c2133] bg-[#2a1e06] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--warning)]">
                                  +{entries.length - 4}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : planningPreviewNonWeeklyEntries.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.previewDialog.cycleIntro}
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {planningPreviewNonWeeklyEntries.slice(0, 12).map((entry) => (
                            <div
                              key={`preview-non-weekly-${entry.key}`}
                              className="border border-[#1c2133] bg-[#111318] px-2.5 py-2"
                            >
                              <p className="font-display text-xs font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
                                {entry.label}
                                {entry.timeRange ? ` ${entry.timeRange}` : ""}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-[#7a8599]">
                                {entry.sequenceIndex != null ? (
                                  <span>
                                    {tr.previewDialog.sequence} {entry.sequenceIndex + 1}
                                  </span>
                                ) : null}
                                {entry.startDate ? (
                                  <span>
                                    {tr.previewDialog.start} {formatDate(`${entry.startDate}T00:00:00`)}
                                  </span>
                                ) : null}
                                {entry.endDate ? (
                                  <span>
                                    {tr.previewDialog.end} {formatDate(`${entry.endDate}T00:00:00`)}
                                  </span>
                                ) : null}
                                {entry.isRestDay ? <span>{tr.previewDialog.rest}</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-[#1c2133] px-3 py-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                        {tr.previewDialog.noCycleData}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closePlanningPreviewDialog(false)}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {tr.previewDialog.close}
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                  onClick={() => {
                    if (!planningPreviewTarget) return
                    const planning = planningPreviewTarget
                    setPlanningPreviewTarget(null)
                    openAssignPlanningDialog(planning)
                  }}
                >
                  {tr.previewDialog.assign}
                </Button>
                <Button
                  className="h-9 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--brand-accent)]"
                  onClick={() => {
                    if (!planningPreviewTarget) return
                    const planning = planningPreviewTarget
                    setPlanningPreviewTarget(null)
                    openEditPlanningDialog(planning)
                  }}
                >
                  {tr.previewDialog.edit}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createShiftOpen} onOpenChange={closeShiftDialog}>
            <DialogContent className="max-w-xl rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {editingShift ? tr.shiftDialog.editTitle : tr.shiftDialog.createTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {editingShift ? tr.shiftDialog.editDesc : tr.shiftDialog.createDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                {error?.scope === "shift_dialog" && (
                  <div role="alert" className="border border-[var(--destructive)]/40 bg-[#2a0e0e]/40 px-3 py-2">
                    <p className="text-sm text-[var(--destructive)]">{error.detail ?? tr.errors[error.code]}</p>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder={tr.shiftDialog.namePlaceholder}
                    value={newShift.name ?? ""}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, name: event.target.value }))}
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                  <Input
                    placeholder={tr.shiftDialog.codePlaceholder}
                    value={newShift.code ?? ""}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, code: event.target.value }))}
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                </div>
                <Input
                  placeholder={tr.shiftDialog.descriptionPlaceholder}
                  value={newShift.description ?? ""}
                  onChange={(event) => setNewShift((prev) => ({ ...prev, description: event.target.value }))}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                      {tr.shiftDialog.serviceStart}
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      lang={localeTag}
                      pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                      placeholder={tr.shiftDialog.startExample}
                      value={newShift.start_time ?? ""}
                      onChange={(event) => setNewShift((prev) => ({ ...prev, start_time: event.target.value }))}
                      onBlur={() => normalizeShiftTimeField("start_time")}
                      className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[#e2e8f0] tabular-nums placeholder:text-[#4a5568]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                      {tr.shiftDialog.serviceEnd}
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      lang={localeTag}
                      pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                      placeholder={tr.shiftDialog.endExample}
                      value={newShift.end_time ?? ""}
                      onChange={(event) => setNewShift((prev) => ({ ...prev, end_time: event.target.value }))}
                      onBlur={() => normalizeShiftTimeField("end_time")}
                      className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[#e2e8f0] tabular-nums placeholder:text-[#4a5568]"
                    />
                  </div>
                </div>
                {/* Night-shift indicator */}
                {newShift.start_time && newShift.end_time && newShift.end_time <= newShift.start_time ? (
                  <p className="flex items-center gap-1.5 font-mono text-[10px] text-[#a78bfa]">
                    <span>↩</span>
                    <span>{tr.shiftDialog.nightShiftNote}</span>
                  </p>
                ) : null}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                      {tr.shiftDialog.break}
                    </p>
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
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftDialog.breakStart}
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang={localeTag}
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          placeholder={tr.shiftDialog.breakStartExample}
                          value={newShift.break_start_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, break_start_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("break_start_time")}
                          className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[#e2e8f0] tabular-nums placeholder:text-[#4a5568]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftDialog.breakEnd}
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang={localeTag}
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          placeholder={tr.shiftDialog.breakEndExample}
                          value={newShift.break_end_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, break_end_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("break_end_time")}
                          className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[#e2e8f0] tabular-nums placeholder:text-[#4a5568]"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                      {tr.shiftDialog.overtime}
                    </p>
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
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftDialog.overtimeStart}
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang={localeTag}
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          value={newShift.overtime_start_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, overtime_start_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("overtime_start_time")}
                          placeholder={tr.shiftDialog.overtimeStartExample}
                          className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[#e2e8f0] tabular-nums placeholder:text-[#4a5568]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                          {tr.shiftDialog.overtimeEnd}
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          lang={localeTag}
                          pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                          value={newShift.overtime_end_time ?? ""}
                          onChange={(event) =>
                            setNewShift((prev) => ({ ...prev, overtime_end_time: event.target.value }))
                          }
                          onBlur={() => normalizeShiftTimeField("overtime_end_time")}
                          placeholder={tr.shiftDialog.overtimeEndExample}
                          className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[#e2e8f0] tabular-nums placeholder:text-[#4a5568]"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                      {tr.shiftDialog.lateTolerance}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="480"
                        step="1"
                        value={newShift.late_allowable_minutes ?? ""}
                        onChange={(event) =>
                          setNewShift((prev) => ({ ...prev, late_allowable_minutes: event.target.value }))
                        }
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] tabular-nums"
                      />
                      <span className="shrink-0 font-mono text-[10px] text-[#7a8599]">
                        {tr.shiftDialog.minutesUnit}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                      {tr.shiftDialog.earlyLeaveMargin}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="480"
                        step="1"
                        value={newShift.early_leave_allowable_minutes ?? ""}
                        onChange={(event) =>
                          setNewShift((prev) => ({ ...prev, early_leave_allowable_minutes: event.target.value }))
                        }
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] tabular-nums"
                      />
                      <span className="shrink-0 font-mono text-[10px] text-[#7a8599]">
                        {tr.shiftDialog.minutesUnit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => closeShiftDialog(false)}
                  disabled={isSavingShift}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {tr.shiftDialog.cancel}
                </Button>
                <Button
                  className="h-9 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--brand-accent)]"
                  onClick={() => void handleSaveShift()}
                  disabled={isSavingShift}
                >
                  {isSavingShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingShift ? tr.shiftDialog.update : tr.shiftDialog.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createPlanningOpen} onOpenChange={closePlanningDialog}>
            <DialogContent className="top-[4vh] w-[min(96vw,1320px)] max-w-[min(96vw,1320px)] max-h-[92vh] translate-y-0 overflow-y-auto rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {editingPlanning ? tr.planningDialog.editTitle : tr.planningDialog.createTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {editingPlanning ? tr.planningDialog.editDesc : tr.planningDialog.createDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                {error?.scope === "planning_dialog" && (
                  <div role="alert" className="border border-[var(--destructive)]/40 bg-[#2a0e0e]/40 px-3 py-2">
                    <p className="text-sm text-[var(--destructive)]">{error.detail ?? tr.errors[error.code]}</p>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  <Input
                    placeholder={tr.planningDialog.namePlaceholder}
                    value={newPlanning.name ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, name: event.target.value }))}
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                  <Input
                    placeholder={tr.planningDialog.codePlaceholder}
                    value={newPlanning.code ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, code: event.target.value }))}
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder={tr.planningDialog.descriptionPlaceholder}
                    value={newPlanning.description ?? ""}
                    onChange={(event) =>
                      setNewPlanning((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                  <select
                    value={newPlanning.timezone ?? ""}
                    onChange={(event) => setNewPlanning((prev) => ({ ...prev, timezone: event.target.value }))}
                    className="h-9 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-3 text-sm text-[#e2e8f0]"
                  >
                    <option value="" disabled>
                      {tr.planningDialog.timezonePlaceholder}
                    </option>
                    {timezoneOptions.map((timezone) => (
                      <option key={timezone.value} value={timezone.value} className="bg-[#0b0d13]">
                        {timezone.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
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
                          "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition",
                          selectedShiftId === shift.id
                            ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent)]/30"
                            : "border-[#1c2133] bg-[#1a1f2e] text-[#7a8599] hover:border-[var(--brand-accent)]/60 hover:text-[#e2e8f0]"
                        )}
                      >
                        {shift.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center border border-[#1c2133] bg-[#0b0d13] p-1">
                      {(["builder", "timeline"] as const).map((mode) => {
                        const labels = {
                          builder: tr.planningDialog.modeBuilder,
                          timeline: tr.planningDialog.modeTimeline,
                        } as const
                        const isSelected = planningEditorMode === mode
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPlanningEditorMode(mode)}
                            className={cn(
                              "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                              isSelected ? "bg-[var(--brand-accent)] text-[#0b0d13]" : "text-[#4a5568] hover:text-[#e2e8f0]"
                            )}
                          >
                            {labels[mode]}
                          </button>
                        )
                      })}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] tabular-nums">
                      {selectedShiftId
                        ? `${workShiftsById.get(selectedShiftId)?.name ?? tr.labels.shift} : ${formatTime(
                            workShiftsById.get(selectedShiftId)?.start_time
                          )} – ${formatTime(workShiftsById.get(selectedShiftId)?.end_time)}`
                        : tr.planningDialog.noShiftSelected}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={deleteSelectedShiftFromDays}
                        disabled={!selectedShiftId}
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] transition hover:text-[var(--destructive)] disabled:opacity-40"
                      >
                        {tr.planningDialog.removeShiftEverywhere}
                      </button>
                      <button
                        type="button"
                        onClick={clearPlanningGrid}
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] transition hover:text-[var(--destructive)]"
                      >
                        {tr.planningDialog.clearWeek}
                      </button>
                    </div>
                  </div>

                  {planningEditorMode === "builder" ? (
                    <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4a5568]">
                        {tr.planningDialog.builderHint}
                      </p>
                      <div className="space-y-1.5">
                        {weekDays.map((day) => {
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
                            <div key={`builder-${day.key}`} className="border border-[#1c2133] bg-[#111318] px-2.5 py-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-11 shrink-0 font-display text-xs font-bold uppercase text-[#e2e8f0]">
                                  {day.label.slice(0, 3)}
                                </div>
                                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-visible">
                                  <div className="relative">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 rounded-none border-[#1c2133] bg-[#1a1f2e] px-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                                      onClick={() =>
                                        setCopyMenuDay((current) => {
                                          if (current === day.key) {
                                            setCopySelectionDays([])
                                            return null
                                          }
                                          setCopySelectionDays(
                                            WEEK_DAY_KEYS.filter((key) => key !== day.key)
                                          )
                                          return day.key
                                        })
                                      }
                                    >
                                      {tr.planningDialog.duplicate}
                                    </Button>
                                    {copyMenuDay === day.key ? (
                                      <div className="absolute left-0 top-8 z-20 w-56 border border-[#1c2133] bg-[#0b0d13] p-2 shadow-xl">
                                        <div className="grid grid-cols-2 gap-1">
                                          {weekDays.map((targetDay) => {
                                            const isSource = targetDay.key === day.key
                                            const checked = copySelectionDays.includes(targetDay.key)
                                            return (
                                              <label
                                                key={`copy-target-${day.key}-${targetDay.key}`}
                                                className={cn(
                                                  "flex items-center gap-1 px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em]",
                                                  isSource ? "opacity-50" : "hover:bg-[#1a1f2e] text-[#7a8599]"
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
                                        <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-[#1c2133] pt-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCopySelectionDays(
                                                WEEK_DAY_KEYS.filter((key) => key !== day.key)
                                              )
                                            }
                                            className="px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599] transition hover:text-[#e2e8f0]"
                                          >
                                            {tr.planningDialog.all}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setCopySelectionDays([0, 1, 2, 3, 4].filter((key) => key !== day.key))}
                                            className="px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599] transition hover:text-[#e2e8f0]"
                                          >
                                            {tr.planningDialog.weekdaysShort}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setCopySelectionDays([5, 6].filter((key) => key !== day.key))}
                                            className="px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599] transition hover:text-[#e2e8f0]"
                                          >
                                            {tr.planningDialog.weekendShort}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => applyCopyDaySelection(day.key)}
                                            className="bg-[var(--brand-accent)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] font-semibold text-[#0b0d13] transition hover:bg-[var(--brand-accent)]"
                                          >
                                            {tr.planningDialog.apply}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599]">
                                    <span>{tr.planningDialog.restInitial}</span>
                                    <Switch
                                      checked={slot.isRestDay}
                                      onCheckedChange={(checked) => setDayRestMode(day.key, checked)}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 rounded-none border-[#1c2133] bg-[#1a1f2e] px-1.5 font-mono text-[10px] text-[#7a8599] hover:border-[var(--success)]/60 hover:text-[var(--success)]"
                                    disabled={!selectedShiftId || slot.isRestDay}
                                    onClick={() => selectedShiftId && addShiftToDay(day.key, selectedShiftId)}
                                  >
                                    +
                                  </Button>
                                  {slot.isRestDay ? (
                                    <span className="border border-[var(--destructive)]/30 bg-[#2a0e0e] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--destructive)]">
                                      {tr.planningDialog.rest}
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
                                          className="min-w-0 border border-[var(--info)]/30 bg-[#0d1e2e] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--info)] transition hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
                                          title={`${shift.name} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)} ${tr.planningDialog.chipRemoveHint}`}
                                        >
                                          <span className="block max-w-47.5 truncate">
                                            {shift.name} {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
                                          </span>
                                        </button>
                                      )
                                    })
                                  ) : (
                                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#4a5568]">
                                      {tr.planningDialog.none}
                                    </span>
                                  )}
                                  {!slot.isRestDay && hiddenShiftIds.length > 0 ? (
                                    <button
                                      type="button"
                                      className="border border-[var(--warning)]/30 bg-[#2a1e06] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--warning)] transition hover:border-[var(--warning)]/60"
                                      title={hiddenShiftDetails || tr.planningDialog.hiddenShifts(hiddenShiftIds.length)}
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
                    <div className="overflow-x-auto border border-[#1c2133] bg-[#0b0d13] p-3">
                      <div className="min-w-0">
                        <div className="mb-2 grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                          <div className="px-1">{tr.planningDialog.hour}</div>
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
                          {weekDays.map((day) => {
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
                                <div className="font-display text-xs font-bold uppercase text-[#e2e8f0]">
                                  {day.label.slice(0, 3)}.
                                </div>
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
                                  className="relative min-w-0 overflow-hidden border border-[#1c2133] bg-[#111318] px-1 py-1"
                                >
                                  <div className="pointer-events-none absolute inset-0 grid grid-cols-48">
                                    {Array.from({ length: 48 }, (_, tick) => (
                                      <div
                                        key={`${day.key}-tick-${tick}`}
                                        className={cn("border-r border-[#1c2133]/40", tick === 47 && "border-r-0")}
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
                                          className="absolute h-4.5 overflow-hidden whitespace-nowrap border border-[var(--info)]/30 bg-[var(--info)] px-2 font-mono text-[10px] font-medium text-[#0b0d13]"
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
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {tr.planningDialog.cancel}
                </Button>
                <Button
                  className="h-9 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--brand-accent)]"
                  onClick={() => void handleSavePlanning()}
                  disabled={isSavingPlanning}
                >
                  {isSavingPlanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPlanning ? tr.planningDialog.update : tr.planningDialog.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!pendingShiftDelete} onOpenChange={(open) => !open && setPendingShiftDelete(null)}>
            <DialogContent className="max-w-lg rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {tr.deleteShiftDialog.title}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.deleteShiftDialog.confirm(pendingShiftDelete?.name ?? null)}
                </DialogDescription>
              </DialogHeader>
              <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">
                  <input
                    type="checkbox"
                    checked={forceShiftDelete}
                    onChange={(event) => setForceShiftDelete(event.target.checked)}
                  />
                  {tr.deleteShiftDialog.force}
                </label>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingShiftDelete(null)}
                  disabled={deletingShiftId !== null}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {tr.deleteShiftDialog.cancel}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDeleteShift()}
                  disabled={!pendingShiftDelete || deletingShiftId !== null}
                  className="h-9 rounded-none border border-[var(--destructive)] bg-[var(--destructive)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--destructive)]"
                >
                  {deletingShiftId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.deleteShiftDialog.delete}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!pendingPlanningDelete} onOpenChange={(open) => !open && setPendingPlanningDelete(null)}>
            <DialogContent className="max-w-lg rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {tr.deletePlanningDialog.title}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.deletePlanningDialog.confirm(pendingPlanningDelete?.name ?? null)}
                </DialogDescription>
              </DialogHeader>
              <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">
                  <input
                    type="checkbox"
                    checked={forcePlanningDelete}
                    onChange={(event) => setForcePlanningDelete(event.target.checked)}
                  />
                  {tr.deletePlanningDialog.force}
                </label>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingPlanningDelete(null)}
                  disabled={deletingPlanningId !== null}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {tr.deletePlanningDialog.cancel}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDeletePlanning()}
                  disabled={!pendingPlanningDelete || deletingPlanningId !== null}
                  className="h-9 rounded-none border border-[var(--destructive)] bg-[var(--destructive)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--destructive)]"
                >
                  {deletingPlanningId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.deletePlanningDialog.delete}
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
          department: departmentsById.get(emp.department ?? -1) ?? tr.noDepartment,
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
          <div className="flex h-10 w-10 items-center justify-center border border-[#1c2133] bg-[#111318] text-[#7a8599] shadow-lg animate-bounce">
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
              