"use client"

import { useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  Loader2,
  Plus,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"

type WeekendMode = "same_as_week" | "different" | "rest"
type WizardStepKey = "context" | "weekday_program" | "weekend_program" | "rules_assign" | "review"
type AssignmentScope = "employees" | "departments"

const WEEK_DAYS = [
  { key: 0, label: "Lun", group: "weekday" as const },
  { key: 1, label: "Mar", group: "weekday" as const },
  { key: 2, label: "Mer", group: "weekday" as const },
  { key: 3, label: "Jeu", group: "weekday" as const },
  { key: 4, label: "Ven", group: "weekday" as const },
  { key: 5, label: "Sam", group: "weekend" as const },
  { key: 6, label: "Dim", group: "weekend" as const },
]

const WEEKDAY_DAY_KEYS = [0, 1, 2, 3, 4]
const WEEKEND_DAY_KEYS = [5, 6]

const STEPS: Array<{ key: WizardStepKey; title: string; why: string }> = [
  {
    key: "context",
    title: "Contexte du planning",
    why: "Le nom, fuseau et objectif evitent les plannings ambigus et facilitent la maintenance.",
  },
  {
    key: "weekday_program",
    title: "Programme semaine",
    why: "Definit les quarts de base du lundi au vendredi, y compris la rotation.",
  },
  {
    key: "weekend_program",
    title: "Programme week-end",
    why: "Permet un comportement specifique pour samedi/dimanche sans bricolage posteriori.",
  },
  {
    key: "rules_assign",
    title: "Regles et affectation",
    why: "Parametre les tolerances RH et prepare l'assignation des utilisateurs.",
  },
  {
    key: "review",
    title: "Validation finale",
    why: "Verifie la coherence globale avant de creer le planning.",
  },
]

const STEP_ICONS = [BriefcaseBusiness, CalendarDays, Shuffle, Users, ClipboardCheck]

type TimezoneOption = {
  value: string
  label: string
}

const PINNED_TIMEZONES = ["GMT", "Etc/GMT-2", "UTC", "Africa/Abidjan", "Europe/Paris"]
const FALLBACK_TIMEZONES = [
  "GMT",
  "UTC",
  "Africa/Abidjan",
  "Europe/London",
  "Europe/Paris",
  "Africa/Cairo",
  "Africa/Casablanca",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Etc/GMT-2",
]

function resolveOffsetMinutes(timeZone: string, atDate: Date): number | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const zonePart = formatter.formatToParts(atDate).find((part) => part.type === "timeZoneName")?.value ?? "GMT"
    const match = zonePart.match(/^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/)
    if (!match) {
      return null
    }
    if (!match.groups?.sign) {
      return 0
    }
    const hours = Number.parseInt(match.groups.hours ?? "0", 10)
    const minutes = Number.parseInt(match.groups.minutes ?? "0", 10)
    const total = hours * 60 + minutes
    return match.groups.sign === "-" ? -total : total
  } catch {
    return null
  }
}

function formatGmtOffset(minutes: number | null): string {
  if (minutes == null) {
    return "GMT"
  }
  const sign = minutes >= 0 ? "+" : "-"
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const mins = absolute % 60
  return `GMT${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

function buildTimezoneOptions(): TimezoneOption[] {
  const supportedValuesOf = (Intl as Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
  const zones =
    typeof supportedValuesOf === "function" ? supportedValuesOf("timeZone") : FALLBACK_TIMEZONES

  const merged = Array.from(new Set([...PINNED_TIMEZONES, ...zones]))
  const now = new Date()
  const optionsWithMeta = merged.map((value) => {
    const offsetMinutes = resolveOffsetMinutes(value, now)
    const gmtLabel = formatGmtOffset(offsetMinutes)
    const label = value === "GMT" || value === "UTC" ? `${value} (${gmtLabel})` : `${gmtLabel} - ${value}`
    return {
      value,
      label,
      offsetMinutes: offsetMinutes ?? Number.MAX_SAFE_INTEGER,
    }
  })

  const pinnedSet = new Set(PINNED_TIMEZONES)
  const pinned = PINNED_TIMEZONES.map((value) => optionsWithMeta.find((option) => option.value === value)).filter(
    (option): option is (typeof optionsWithMeta)[number] => Boolean(option)
  )

  const others = optionsWithMeta
    .filter((option) => !pinnedSet.has(option.value))
    .sort(
      (left, right) =>
        left.offsetMinutes - right.offsetMinutes || left.value.localeCompare(right.value)
    )

  return [...pinned, ...others].map(({ value, label }) => ({ value, label }))
}

type EditableWizardCase = {
  localId: number
  name: string
  startTime: string
  endTime: string
  days: number[]
}

export type PlanningCreationWizardEmployee = {
  id: number
  name: string
  employeeNo: string
  department: string
}

export type PlanningCreationWizardDepartment = {
  id: number
  name: string
  code: string
}

export type PlanningWizardCase = {
  name: string
  startTime: string
  endTime: string
  days: number[]
}

export type PlanningCreationWizardPayload = {
  planningName: string
  planningCode: string
  planningDescription: string
  timezone: string
  hasWeekdayProgram: boolean
  weekendMode: WeekendMode
  weekdayRotationEnabled: boolean
  weekendRotationEnabled: boolean
  weekdayCases: PlanningWizardCase[]
  weekendCases: PlanningWizardCase[]
  pauseCounted: boolean
  pauseToleranceMinutes: number
  lateAllowableMinutes: number
  earlyLeaveAllowableMinutes: number
  overtimeEnabled: boolean
  overtimeMinutes: number
  assignmentScope: AssignmentScope
  assignEmployeeIds: number[]
  assignDepartmentIds: number[]
  includeSubDepartments: boolean
}

type PlanningCreationWizardDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSubmitting: boolean
  employees: PlanningCreationWizardEmployee[]
  departments: PlanningCreationWizardDepartment[]
  onSubmit: (payload: PlanningCreationWizardPayload) => Promise<void>
}

function isValidTime24h(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())
}

function toggleDay(days: number[], day: number) {
  if (days.includes(day)) {
    return days.filter((item) => item !== day)
  }
  return [...days, day].sort((left, right) => left - right)
}

function parseInteger(value: string) {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  return Number.parseInt(trimmed, 10)
}

function makeEditableCase(
  localId: number,
  name: string,
  days: number[],
  startTime = "08:00",
  endTime = "17:00"
): EditableWizardCase {
  return {
    localId,
    name,
    startTime,
    endTime,
    days,
  }
}

function caseToPayload(item: EditableWizardCase): PlanningWizardCase {
  return {
    name: item.name.trim(),
    startTime: item.startTime.trim(),
    endTime: item.endTime.trim(),
    days: [...item.days].sort((left, right) => left - right),
  }
}

function formatCaseDays(days: number[]) {
  if (days.length === 0) return "Aucun jour"
  return WEEK_DAYS.filter((day) => days.includes(day.key))
    .map((day) => day.label)
    .join(", ")
}

export function PlanningCreationWizardDialog({
  open,
  onOpenChange,
  isSubmitting,
  employees,
  departments,
  onSubmit,
}: PlanningCreationWizardDialogProps) {
  const caseIdRef = useRef(3)

  const [stepIndex, setStepIndex] = useState(0)
  const [planningName, setPlanningName] = useState("")
  const [timezone, setTimezone] = useState("GMT")
  const [planningDescription, setPlanningDescription] = useState("")
  const [weekdayCases, setWeekdayCases] = useState<EditableWizardCase[]>([
    makeEditableCase(1, "Quart Jour", WEEKDAY_DAY_KEYS),
  ])
  const [weekendMode, setWeekendMode] = useState<WeekendMode>("same_as_week")
  const [weekendCases, setWeekendCases] = useState<EditableWizardCase[]>([
    makeEditableCase(2, "Quart Week-end", WEEKEND_DAY_KEYS),
  ])
  const [weekdayRotationEnabled, setWeekdayRotationEnabled] = useState(false)
  const [weekendRotationEnabled, setWeekendRotationEnabled] = useState(false)
  const [pauseCounted, setPauseCounted] = useState(true)
  const [pauseToleranceMinutes, setPauseToleranceMinutes] = useState("10")
  const [lateAllowableMinutes, setLateAllowableMinutes] = useState("10")
  const [earlyLeaveAllowableMinutes, setEarlyLeaveAllowableMinutes] = useState("10")
  const [overtimeEnabled, setOvertimeEnabled] = useState(false)
  const [overtimeMinutes, setOvertimeMinutes] = useState("60")
  const [assignEnabled, setAssignEnabled] = useState(false)
  const [assignmentScope, setAssignmentScope] = useState<AssignmentScope>("employees")
  const [assignSearch, setAssignSearch] = useState("")
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<number>>(new Set())
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Set<number>>(new Set())
  const [includeSubDepartments, setIncludeSubDepartments] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)

  const currentStep = STEPS[stepIndex]
  const progressValue = useMemo(
    () => Math.round((stepIndex / (STEPS.length - 1)) * 100),
    [stepIndex]
  )
  const timezoneOptions = useMemo(() => buildTimezoneOptions(), [])

  const filteredEmployees = useMemo(() => {
    const query = assignSearch.trim().toLowerCase()
    if (!query) {
      return employees
    }
    return employees.filter((employee) =>
      [employee.name, employee.employeeNo, employee.department]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [assignSearch, employees])

  const filteredDepartments = useMemo(() => {
    const query = assignSearch.trim().toLowerCase()
    if (!query) {
      return departments
    }
    return departments.filter((department) =>
      [department.name, department.code]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [assignSearch, departments])

  const resetWizard = () => {
    setStepIndex(0)
    setPlanningName("")
    setTimezone("GMT")
    setPlanningDescription("")
    setWeekdayCases([makeEditableCase(1, "Quart Jour", WEEKDAY_DAY_KEYS)])
    setWeekendMode("same_as_week")
    setWeekendCases([makeEditableCase(2, "Quart Week-end", WEEKEND_DAY_KEYS)])
    setWeekdayRotationEnabled(false)
    setWeekendRotationEnabled(false)
    setPauseCounted(true)
    setPauseToleranceMinutes("10")
    setLateAllowableMinutes("10")
    setEarlyLeaveAllowableMinutes("10")
    setOvertimeEnabled(false)
    setOvertimeMinutes("60")
    setAssignEnabled(false)
    setAssignmentScope("employees")
    setAssignSearch("")
    setSelectedEmployeeIds(new Set())
    setSelectedDepartmentIds(new Set())
    setIncludeSubDepartments(false)
    setStepError(null)
    caseIdRef.current = 3
  }

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetWizard()
    }
    onOpenChange(nextOpen)
  }

  const addCase = (scope: "weekday" | "weekend") => {
    const id = caseIdRef.current
    caseIdRef.current += 1
    if (scope === "weekday") {
      setWeekdayCases((prev) => [...prev, makeEditableCase(id, `Quart S${prev.length + 1}`, WEEKDAY_DAY_KEYS)])
      return
    }
    setWeekendCases((prev) => [...prev, makeEditableCase(id, `Quart WE${prev.length + 1}`, WEEKEND_DAY_KEYS)])
  }

  const updateCase = (
    scope: "weekday" | "weekend",
    localId: number,
    updater: (item: EditableWizardCase) => EditableWizardCase
  ) => {
    const setter = scope === "weekday" ? setWeekdayCases : setWeekendCases
    setter((prev) => prev.map((item) => (item.localId === localId ? updater(item) : item)))
  }

  const removeCase = (scope: "weekday" | "weekend", localId: number) => {
    const setter = scope === "weekday" ? setWeekdayCases : setWeekendCases
    setter((prev) => prev.filter((item) => item.localId !== localId))
  }

  const toggleEmployee = (employeeId: number) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) {
        next.delete(employeeId)
      } else {
        next.add(employeeId)
      }
      return next
    })
  }

  const selectAllVisibleEmployees = () => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev)
      filteredEmployees.forEach((employee) => next.add(employee.id))
      return next
    })
  }

  const clearEmployeeSelection = () => {
    setSelectedEmployeeIds(new Set())
  }

  const toggleDepartment = (departmentId: number) => {
    setSelectedDepartmentIds((prev) => {
      const next = new Set(prev)
      if (next.has(departmentId)) {
        next.delete(departmentId)
      } else {
        next.add(departmentId)
      }
      return next
    })
  }

  const selectAllVisibleDepartments = () => {
    setSelectedDepartmentIds((prev) => {
      const next = new Set(prev)
      filteredDepartments.forEach((department) => next.add(department.id))
      return next
    })
  }

  const clearDepartmentSelection = () => {
    setSelectedDepartmentIds(new Set())
  }

  const validateCases = (
    items: EditableWizardCase[],
    scopeLabel: string,
    rotationEnabled: boolean
  ): string | null => {
    if (items.length === 0) {
      return `Ajoutez au moins un quart pour ${scopeLabel}.`
    }
    if (rotationEnabled && items.length < 2) {
      return `Ajoutez au moins 2 quarts pour activer une rotation ${scopeLabel}.`
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const linePrefix = `${scopeLabel} - quart ${index + 1}`
      if (!item.name.trim()) {
        return `${linePrefix}: nom obligatoire.`
      }
      if (!isValidTime24h(item.startTime)) {
        return `${linePrefix}: heure de debut invalide (HH:MM).`
      }
      if (!isValidTime24h(item.endTime)) {
        return `${linePrefix}: heure de fin invalide (HH:MM).`
      }
      if (item.startTime === item.endTime) {
        return `${linePrefix}: la fin doit etre differente du debut.`
      }
      if (!rotationEnabled && item.days.length === 0) {
        return `${linePrefix}: selectionnez au moins un jour.`
      }
    }
    return null
  }

  const validateStep = (stepKey: WizardStepKey): string | null => {
    if (stepKey === "context" && !planningName.trim()) {
      return "Renseignez le nom du planning."
    }

    if (stepKey === "weekday_program") {
      return validateCases(weekdayCases, "semaine", weekdayRotationEnabled)
    }

    if (stepKey === "weekend_program") {
      if (weekendMode === "rest") {
        return null
      }
      if (weekendMode === "same_as_week") {
        if (weekdayCases.length === 0) {
          return "Configurez d'abord les quarts semaine."
        }
        if (weekendRotationEnabled && weekdayCases.length < 2) {
          return "La rotation week-end basee sur la semaine exige au moins 2 quarts semaine."
        }
        return null
      }
      return validateCases(weekendCases, "week-end", weekendRotationEnabled)
    }

    if (stepKey === "rules_assign") {
      if (pauseCounted) {
        const pauseTolerance = parseInteger(pauseToleranceMinutes)
        if (pauseTolerance === null) {
          return "Tolerance pause: entier positif attendu."
        }
      }
      const lateTolerance = parseInteger(lateAllowableMinutes)
      if (lateTolerance === null) {
        return "Retard tolere: entier positif attendu."
      }
      const earlyTolerance = parseInteger(earlyLeaveAllowableMinutes)
      if (earlyTolerance === null) {
        return "Marge depart anticipe: entier positif attendu."
      }
      if (overtimeEnabled) {
        const overtime = parseInteger(overtimeMinutes)
        if (overtime === null || overtime <= 0) {
          return "Heures supplementaires: renseignez une valeur strictement positive."
        }
      }
      if (assignEnabled && assignmentScope === "employees" && selectedEmployeeIds.size === 0) {
        return "Selectionnez au moins un utilisateur a affecter."
      }
      if (assignEnabled && assignmentScope === "departments" && selectedDepartmentIds.size === 0) {
        return "Selectionnez au moins un departement a affecter."
      }
    }

    return null
  }

  const goBack = () => {
    if (stepIndex === 0) {
      closeDialog(false)
      return
    }
    setStepError(null)
    setStepIndex((prev) => prev - 1)
  }

  const goNext = () => {
    const error = validateStep(currentStep.key)
    if (error) {
      setStepError(error)
      return
    }
    setStepError(null)
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => prev + 1)
    }
  }

  const buildPayload = (): PlanningCreationWizardPayload => {
    const hasWeekdayProgram = weekdayCases.length > 0
    const effectiveWeekendRotationEnabled = weekendMode === "rest" ? false : weekendRotationEnabled
    const safePauseTolerance = pauseCounted ? parseInteger(pauseToleranceMinutes) ?? 0 : 0
    const safeLateTolerance = parseInteger(lateAllowableMinutes) ?? 0
    const safeEarlyTolerance = parseInteger(earlyLeaveAllowableMinutes) ?? 0
    const safeOvertimeMinutes = overtimeEnabled ? parseInteger(overtimeMinutes) ?? 0 : 0
    const normalizedWeekdayCases = weekdayCases.map(caseToPayload)
    const normalizedWeekendCases = weekendMode === "different" ? weekendCases.map(caseToPayload) : []

    const generatedDescription = [
      `${normalizedWeekdayCases.length} quart(s) semaine`,
      `week-end: ${
        weekendMode === "rest"
          ? "repos"
          : weekendMode === "same_as_week"
            ? "meme programme que semaine"
            : `${normalizedWeekendCases.length} quart(s) dedies`
      }`,
      `rotation semaine: ${weekdayRotationEnabled ? "oui" : "non"}`,
      `rotation week-end: ${effectiveWeekendRotationEnabled ? "oui" : "non"}`,
    ].join(" | ")

    return {
      planningName: planningName.trim(),
      planningCode: "",
      planningDescription: planningDescription.trim() || generatedDescription,
      timezone: timezone.trim() || "GMT",
      hasWeekdayProgram,
      weekendMode,
      weekdayRotationEnabled,
      weekendRotationEnabled: effectiveWeekendRotationEnabled,
      weekdayCases: normalizedWeekdayCases,
      weekendCases: normalizedWeekendCases,
      pauseCounted,
      pauseToleranceMinutes: safePauseTolerance,
      lateAllowableMinutes: safeLateTolerance,
      earlyLeaveAllowableMinutes: safeEarlyTolerance,
      overtimeEnabled,
      overtimeMinutes: safeOvertimeMinutes,
      assignmentScope,
      assignEmployeeIds: assignEnabled && assignmentScope === "employees" ? Array.from(selectedEmployeeIds) : [],
      assignDepartmentIds:
        assignEnabled && assignmentScope === "departments" ? Array.from(selectedDepartmentIds) : [],
      includeSubDepartments: assignEnabled && assignmentScope === "departments" ? includeSubDepartments : false,
    }
  }

  const handleSubmit = async () => {
    const error = validateStep("review")
    if (error) {
      setStepError(error)
      return
    }
    setStepError(null)
    try {
      await onSubmit(buildPayload())
      closeDialog(false)
    } catch {
      // Keep wizard open when parent save fails.
    }
  }

  const renderModeButton = (label: string, selected: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-2.5 text-sm",
        selected
          ? "border-primary/35 bg-primary/10 text-foreground"
          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60"
      )}
    >
      {label}
    </button>
  )

  const renderCaseDays = (
    item: EditableWizardCase,
    scope: "weekday" | "weekend"
  ) => {
    const allowedDays = scope === "weekday" ? WEEK_DAYS : WEEK_DAYS.filter((day) => day.group === "weekend")
    return (
      <div className="flex flex-wrap gap-2">
        {allowedDays.map((day) => {
          const checked = item.days.includes(day.key)
          return (
            <button
              key={`${scope}-day-${item.localId}-${day.key}`}
              type="button"
              onClick={() =>
                updateCase(scope, item.localId, (prev) => ({
                  ...prev,
                  days: toggleDay(prev.days, day.key),
                }))
              }
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs",
                checked
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60"
              )}
            >
              {day.label}
            </button>
          )
        })}
      </div>
    )
  }

  const renderCasesEditor = (
    scope: "weekday" | "weekend",
    items: EditableWizardCase[],
    rotationEnabled: boolean,
    onRotationChange: (next: boolean) => void
  ) => (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  Rotation {scope === "weekday" ? "semaine" : "week-end"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rotationEnabled
                    ? "Detection automatique du quart au pointage: la liste des quarts est appliquee en sequence sur les jours cibles."
                    : "Detection automatique du quart au pointage: chaque quart suit ses jours selectionnes."}
                </p>
              </div>
              <Switch checked={rotationEnabled} onCheckedChange={onRotationChange} />
            </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${scope}-case-${item.localId}`} className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Quart {scope === "weekday" ? "semaine" : "week-end"} {index + 1}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-border/60 bg-background/60"
                onClick={() => removeCase(scope, item.localId)}
                disabled={items.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={item.name}
                onChange={(event) =>
                  updateCase(scope, item.localId, (prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Nom du quart"
                className="h-10 rounded-xl border-border/60 bg-background/60 sm:col-span-3"
              />
              <Input
                type="time"
                value={item.startTime}
                onChange={(event) =>
                  updateCase(scope, item.localId, (prev) => ({
                    ...prev,
                    startTime: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border-border/60 bg-background/60"
              />
              <Input
                type="time"
                value={item.endTime}
                onChange={(event) =>
                  updateCase(scope, item.localId, (prev) => ({
                    ...prev,
                    endTime: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border-border/60 bg-background/60"
              />
              <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                Jours: {formatCaseDays(item.days)}
              </div>
            </div>

            {renderCaseDays(item, scope)}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-9 rounded-xl border-border/60 bg-background/60"
        onClick={() => addCase(scope)}
      >
        <Plus className="h-4 w-4" />
        Ajouter un quart
      </Button>
    </div>
  )

  const renderStepContent = () => {
    if (currentStep.key === "context") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Nom du planning *</p>
            <Input
              value={planningName}
              onChange={(event) => setPlanningName(event.target.value)}
              placeholder="Ex: Planning Agence Abidjan"
              className="h-11 rounded-xl border-border/60 bg-background/60"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Fuseau horaire</p>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background/60">
                <SelectValue placeholder="Choisir un fuseau horaire" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Description (optionnel)</p>
            <Textarea
              value={planningDescription}
              onChange={(event) => setPlanningDescription(event.target.value)}
              placeholder="Contexte operationnel, equipe cible, contraintes..."
              className="min-h-[92px] rounded-xl border-border/60 bg-background/60"
            />
          </div>
        </div>
      )
    }

    if (currentStep.key === "weekday_program") {
      return renderCasesEditor("weekday", weekdayCases, weekdayRotationEnabled, setWeekdayRotationEnabled)
    }

    if (currentStep.key === "weekend_program") {
      return (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {renderModeButton("Meme programme que semaine", weekendMode !== "different", () =>
              setWeekendMode("same_as_week")
            )}
            {renderModeButton("Definir un quart special week-end", weekendMode === "different", () =>
              setWeekendMode("different")
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
            Pour appliquer le meme programme le week-end, cochez Sam et/ou Dim dans l'etape "Programme semaine".
            Si Sam/Dim ne sont pas coches, ces jours restent en repos.
          </div>

          {weekendMode === "same_as_week" ? (
            <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Rotation week-end</p>
                  <p className="text-xs text-muted-foreground">
                    Detection automatique du quart au pointage: continue la rotation des quarts semaine sur samedi/dimanche.
                  </p>
                </div>
                <Switch checked={weekendRotationEnabled} onCheckedChange={setWeekendRotationEnabled} />
              </div>
              <p className="text-xs text-muted-foreground">
                En mode non tournant, le week-end reutilise le quart de reference de la semaine.
              </p>
            </div>
          ) : null}

          {weekendMode === "different"
            ? renderCasesEditor("weekend", weekendCases, weekendRotationEnabled, setWeekendRotationEnabled)
            : null}
        </div>
      )
    }

    if (currentStep.key === "rules_assign") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Pause prise en compte</p>
                <p className="text-xs text-muted-foreground">
                  Conserve une tolerance de pause sur les calculs d'horaires.
                </p>
              </div>
              <Switch checked={pauseCounted} onCheckedChange={setPauseCounted} />
            </div>
            {pauseCounted ? (
              <div className="mt-3">
                <p className="mb-1 text-xs text-muted-foreground">Tolerance pause (minutes)</p>
                <Input
                  value={pauseToleranceMinutes}
                  onChange={(event) => setPauseToleranceMinutes(event.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                  inputMode="numeric"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Retard tolere (minutes)</p>
              <Input
                value={lateAllowableMinutes}
                onChange={(event) => setLateAllowableMinutes(event.target.value)}
                className="h-10 rounded-xl border-border/60 bg-background/60"
                inputMode="numeric"
              />
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Depart anticipe tolere (minutes)</p>
              <Input
                value={earlyLeaveAllowableMinutes}
                onChange={(event) => setEarlyLeaveAllowableMinutes(event.target.value)}
                className="h-10 rounded-xl border-border/60 bg-background/60"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Heures supplementaires</p>
                <p className="text-xs text-muted-foreground">
                  Permet de fixer un seuil standard de depassement.
                </p>
              </div>
              <Switch checked={overtimeEnabled} onCheckedChange={setOvertimeEnabled} />
            </div>
            {overtimeEnabled ? (
              <div className="mt-3">
                <p className="mb-1 text-xs text-muted-foreground">Seuil heures supplementaires (minutes)</p>
                <Input
                  value={overtimeMinutes}
                  onChange={(event) => setOvertimeMinutes(event.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                  inputMode="numeric"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Affecter maintenant</p>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez aussi affecter plus tard depuis la fiche planning.
                </p>
              </div>
              <Switch checked={assignEnabled} onCheckedChange={setAssignEnabled} />
            </div>

            {assignEnabled ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {renderModeButton("Employes", assignmentScope === "employees", () =>
                    setAssignmentScope("employees")
                  )}
                  {renderModeButton("Departements", assignmentScope === "departments", () =>
                    setAssignmentScope("departments")
                  )}
                </div>

                {assignmentScope === "departments" ? (
                  <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Inclure les sous-departements</span>
                      <Switch checked={includeSubDepartments} onCheckedChange={setIncludeSubDepartments} />
                    </label>
                  </div>
                ) : null}

                <Input
                  value={assignSearch}
                  onChange={(event) => setAssignSearch(event.target.value)}
                  placeholder={
                    assignmentScope === "employees"
                      ? "Rechercher un utilisateur"
                      : "Rechercher un departement"
                  }
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-border/60 bg-background/60"
                    onClick={
                      assignmentScope === "employees"
                        ? selectAllVisibleEmployees
                        : selectAllVisibleDepartments
                    }
                  >
                    Tout selectionner
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-border/60 bg-background/60"
                    onClick={
                      assignmentScope === "employees"
                        ? clearEmployeeSelection
                        : clearDepartmentSelection
                    }
                  >
                    Vider
                  </Button>
                </div>
                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-2">
                  {assignmentScope === "employees"
                    ? filteredEmployees.map((employee) => {
                        const checked = selectedEmployeeIds.has(employee.id)
                        return (
                          <button
                            key={`employee-${employee.id}`}
                            type="button"
                            onClick={() => toggleEmployee(employee.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                              checked
                                ? "border-primary/35 bg-primary/10 text-foreground"
                                : "border-border/40 bg-card/60 text-muted-foreground hover:bg-muted/40"
                            )}
                          >
                            <span className="truncate">
                              {employee.name} ({employee.employeeNo}) - {employee.department}
                            </span>
                            <span className="text-xs">{checked ? "OK" : ""}</span>
                          </button>
                        )
                      })
                    : filteredDepartments.map((department) => {
                        const checked = selectedDepartmentIds.has(department.id)
                        return (
                          <button
                            key={`department-${department.id}`}
                            type="button"
                            onClick={() => toggleDepartment(department.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                              checked
                                ? "border-primary/35 bg-primary/10 text-foreground"
                                : "border-border/40 bg-card/60 text-muted-foreground hover:bg-muted/40"
                            )}
                          >
                            <span className="truncate">
                              {department.name} ({department.code})
                            </span>
                            <span className="text-xs">{checked ? "OK" : ""}</span>
                          </button>
                        )
                      })}
                  {assignmentScope === "employees" && filteredEmployees.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Aucun utilisateur trouve.</p>
                  ) : null}
                  {assignmentScope === "departments" && filteredDepartments.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Aucun departement trouve.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-background/50 p-4">
          <p className="text-sm font-semibold">Planning</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {planningName || "Sans nom"} | {timezone || "GMT"}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-4">
          <p className="text-sm font-semibold">Programme semaine</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rotation: {weekdayRotationEnabled ? "oui" : "non"} | {weekdayCases.length} quart(s)
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {weekdayCases.map((item) => (
              <li key={`review-weekday-${item.localId}`}>
                {item.name} ({item.startTime} - {item.endTime}) | {formatCaseDays(item.days)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-4">
          <p className="text-sm font-semibold">Programme week-end</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mode:{" "}
            {weekendMode === "rest"
              ? "Repos"
              : weekendMode === "same_as_week"
                ? "Meme programme que semaine"
                : "Programme dedie"}
            {" | "}
            Rotation: {weekendRotationEnabled ? "oui" : "non"}
          </p>
          {weekendMode === "different" ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {weekendCases.map((item) => (
                <li key={`review-weekend-${item.localId}`}>
                  {item.name} ({item.startTime} - {item.endTime}) | {formatCaseDays(item.days)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary/8 p-4 text-xs text-muted-foreground">
          <p>Pause comptee: {pauseCounted ? `oui (${pauseToleranceMinutes} min)` : "non"}</p>
          <p>Retard tolere: {lateAllowableMinutes} min</p>
          <p>Depart anticipe tolere: {earlyLeaveAllowableMinutes} min</p>
          <p>Heures supplementaires: {overtimeEnabled ? `${overtimeMinutes} min` : "non"}</p>
          <p>
            Affectation immediate:{" "}
            {!assignEnabled
              ? "non"
              : assignmentScope === "employees"
                ? `${selectedEmployeeIds.size} utilisateur(s)`
                : `${selectedDepartmentIds.size} departement(s)${
                    includeSubDepartments ? " (+ sous-departements)" : ""
                  }`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="!left-0 !top-0 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 overflow-hidden rounded-none border-0 p-0">
        <div className="flex h-full flex-col bg-background">
          <div className="border-b border-border/60 px-6 py-5 lg:px-8">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Wizard planning optimise
            </div>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold leading-tight">{currentStep.title}</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground hover:text-foreground"
                    aria-label="Pourquoi cette etape"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="max-w-xs">
                  {currentStep.why}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="mb-2 flex items-center gap-1">
              {STEPS.map((step, index) => {
                const Icon = STEP_ICONS[index]
                return (
                  <div key={`step-${step.key}`} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all",
                        stepIndex === index
                          ? "border-primary bg-primary text-primary-foreground"
                          : stepIndex > index
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                            : "border-border/60 bg-secondary/40 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {index < STEPS.length - 1 ? (
                      <div className={cn("h-0.5 w-full rounded-full", stepIndex > index ? "bg-emerald-500" : "bg-border/50")} />
                    ) : null}
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Etape {stepIndex + 1}/{STEPS.length}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-4xl">{renderStepContent()}</div>
            {stepError ? (
              <div className="mx-auto mt-4 w-full max-w-4xl rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {stepError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border/60 px-6 py-4 lg:px-8">
            <div className="mx-auto w-full max-w-4xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-border/60 bg-background/60"
                  onClick={goBack}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {stepIndex === 0 ? "Annuler" : "Precedent"}
                </Button>
                {stepIndex < STEPS.length - 1 ? (
                  <Button type="button" className="h-10 rounded-xl" onClick={goNext} disabled={isSubmitting}>
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-10 rounded-xl"
                    onClick={() => void handleSubmit()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Creer le planning
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Progression</span>
                  <span>{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="h-2.5" />
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
