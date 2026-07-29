"use client"

import { useEffect, useMemo, useState } from "react"
import { addDays, addWeeks, format, startOfWeek } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { weeklyDict } from "@/lib/i18n/pages/weekly"
import { getActiveTenantCode } from "@/lib/api/auth"
import {
  fetchEmployeesDetailed,
  fetchEmployeeSchedule,
  fetchLeaveRequests,
  type EmployeeApiItem,
  type EmployeeScheduleDay,
  type LeaveRequestApiItem,
} from "@/lib/api/employees"

const MAX_DISPLAYED = 25

type ShiftKind = "morning" | "day" | "evening" | "night" | "leave"

interface ShiftSpec {
  bg: string
  border: string
  text: string
}

const SHIFT_SPECS: Record<ShiftKind, ShiftSpec> = {
  morning: {
    bg: "color-mix(in oklab, var(--primary) 14%, var(--card))",
    border: "color-mix(in oklab, var(--primary) 35%, transparent)",
    text: "color-mix(in oklab, var(--primary) 70%, var(--foreground))",
  },
  day: {
    bg: "color-mix(in oklab, oklch(0.6 0.12 240) 14%, var(--card))",
    border: "color-mix(in oklab, oklch(0.6 0.12 240) 35%, transparent)",
    text: "color-mix(in oklab, oklch(0.35 0.1 240) 80%, var(--foreground))",
  },
  evening: {
    bg: "color-mix(in oklab, oklch(0.72 0.15 75) 16%, var(--card))",
    border: "color-mix(in oklab, oklch(0.72 0.15 75) 38%, transparent)",
    text: "color-mix(in oklab, oklch(0.4 0.12 70) 80%, var(--foreground))",
  },
  night: {
    bg: "color-mix(in oklab, oklch(0.5 0.12 290) 14%, var(--card))",
    border: "color-mix(in oklab, oklch(0.5 0.12 290) 35%, transparent)",
    text: "color-mix(in oklab, oklch(0.35 0.1 290) 80%, var(--foreground))",
  },
  leave: {
    bg: "color-mix(in oklab, var(--destructive) 12%, var(--card))",
    border: "color-mix(in oklab, var(--destructive) 35%, transparent)",
    text: "color-mix(in oklab, var(--destructive) 75%, var(--foreground))",
  },
}

type CellEntry = {
  kind: ShiftKind
  start: string
  end: string
  minutes: number
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function colorFromId(id: number | string): string {
  const raw = String(id)
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return `oklch(0.58 0.13 ${hash % 360})`
}

function classifyShift(startTime: string | null): Exclude<ShiftKind, "leave"> {
  const hour = Number.parseInt((startTime ?? "").slice(0, 2), 10)
  if (Number.isNaN(hour)) return "day"
  if (hour < 7) return "morning"
  if (hour < 12) return "day"
  if (hour < 18) return "evening"
  return "night"
}

function trimTime(value: string | null): string {
  return value ? value.slice(0, 5) : "—"
}

function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  return rest > 0 ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`
}

function entriesForDay(day: EmployeeScheduleDay | undefined): CellEntry[] {
  if (!day || day.is_rest_day) return []
  if (day.shifts.length > 0) {
    return day.shifts.map((shift) => ({
      kind: classifyShift(shift.start_time),
      start: trimTime(shift.start_time),
      end: trimTime(shift.end_time),
      minutes: shift.net_minutes || shift.total_minutes || 0,
    }))
  }
  return day.slots
    .filter((slot) => slot.slot_type !== "rest" && slot.start_time)
    .map((slot) => ({
      kind: classifyShift(slot.start_time),
      start: trimTime(slot.start_time),
      end: trimTime(slot.end_time),
      minutes: slot.duration_minutes || 0,
    }))
}

function ShiftLegend() {
  const { locale } = useI18n()
  const tr = weeklyDict[locale]
  const kinds: ShiftKind[] = ["morning", "day", "evening", "night", "leave"]
  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
      {kinds.map((kind) => {
        const spec = SHIFT_SPECS[kind]
        return (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm border"
              style={{ background: spec.bg, borderColor: spec.border }}
            />
            <span>{tr.legend[kind]}</span>
          </span>
        )
      })}
    </div>
  )
}

export function WeeklyPlanningGrid() {
  const { locale } = useI18n()
  const tr = weeklyDict[locale]
  const dateLocale = locale === "en" ? enUS : fr
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([])
  const [totalActive, setTotalActive] = useState(0)
  const [scheduleByEmployee, setScheduleByEmployee] = useState<
    Map<number, Record<string, EmployeeScheduleDay>>
  >(new Map())
  const [leaves, setLeaves] = useState<LeaveRequestApiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const weekStartStr = format(weekStart, "yyyy-MM-dd")

  useEffect(() => {
    let mounted = true
    const start = new Date(`${weekStartStr}T00:00:00`)
    const end = addDays(start, 6)

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const tenantCode = getActiveTenantCode().trim() || undefined
        const [allEmployees, approvedLeaves] = await Promise.all([
          fetchEmployeesDetailed(tenantCode),
          fetchLeaveRequests(tenantCode, { status: "approved" }).catch(
            () => [] as LeaveRequestApiItem[]
          ),
        ])
        if (!mounted) return

        const active = allEmployees.filter((employee) => employee.is_active)
        const displayed = active.slice(0, MAX_DISPLAYED)

        const months = Array.from(
          new Set([format(start, "yyyy-MM"), format(end, "yyyy-MM")])
        )
        const results = await Promise.allSettled(
          displayed.map(async (employee) => {
            const perDay: Record<string, EmployeeScheduleDay> = {}
            for (const month of months) {
              const schedule = await fetchEmployeeSchedule(employee.id, month)
              for (const day of schedule.days) {
                perDay[day.date] = day
              }
            }
            return { id: employee.id, perDay }
          })
        )
        if (!mounted) return

        const scheduleMap = new Map<number, Record<string, EmployeeScheduleDay>>()
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            scheduleMap.set(result.value.id, result.value.perDay)
          }
        })

        setEmployees(displayed)
        setTotalActive(active.length)
        setScheduleByEmployee(scheduleMap)
        setLeaves(approvedLeaves)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [weekStartStr, reloadKey])

  const weekDates = useMemo(() => {
    const start = new Date(`${weekStartStr}T00:00:00`)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [weekStartStr])
  const weekDateStrs = useMemo(
    () => weekDates.map((date) => format(date, "yyyy-MM-dd")),
    [weekDates]
  )

  const leaveByEmployee = useMemo(() => {
    const map = new Map<number, Set<string>>()
    for (const leave of leaves) {
      if (leave.status !== "approved") continue
      for (const dateStr of weekDateStrs) {
        if (leave.start_date <= dateStr && dateStr <= leave.end_date) {
          if (!map.has(leave.employee)) map.set(leave.employee, new Set())
          map.get(leave.employee)?.add(dateStr)
        }
      }
    }
    return map
  }, [leaves, weekDateStrs])

  const rows = useMemo(
    () =>
      employees.map((employee) => {
        const perDay = scheduleByEmployee.get(employee.id) ?? {}
        const onLeave = leaveByEmployee.get(employee.id) ?? new Set<string>()
        const cells = weekDateStrs.map((dateStr) => {
          if (onLeave.has(dateStr)) {
            return { leave: true as const, entries: [] as CellEntry[] }
          }
          return { leave: false as const, entries: entriesForDay(perDay[dateStr]) }
        })
        const weekMinutes = weekDateStrs.reduce((acc, dateStr, i) => {
          if (cells[i].leave) return acc
          return acc + (perDay[dateStr]?.planned_minutes ?? 0)
        }, 0)
        return { employee, cells, weekMinutes }
      }),
    [employees, scheduleByEmployee, leaveByEmployee, weekDateStrs]
  )

  const coverage = useMemo(
    () =>
      weekDateStrs.map((_, i) =>
        rows.reduce(
          (acc, row) => acc + (!row.cells[i].leave && row.cells[i].entries.length > 0 ? 1 : 0),
          0
        )
      ),
    [rows, weekDateStrs]
  )

  const weekEnd = weekDates[6]
  const weekLabel = `${format(weekDates[0], "d MMM", { locale: dateLocale })} — ${format(weekEnd, "d MMM yyyy", { locale: dateLocale })}`
  // Noms de jours localisés via date-fns (jamais de tableau codé en dur).
  const days = weekDates.map((date) => {
    const label = format(date, "EEE", { locale: dateLocale }).replace(/\.$/, "")
    return label.charAt(0).toUpperCase() + label.slice(1)
  })
  const isCurrentWeek =
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd") === weekStartStr

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tr.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? tr.loadingSubtitle
              : `${tr.scheduledCount(rows.length)}${totalActive > MAX_DISPLAYED ? tr.displayLimited(MAX_DISPLAYED, totalActive) : ""}`}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
            aria-label={tr.prevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p
            className="px-2 text-sm font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tr.weekOf} {weekLabel}
          </p>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            aria-label={tr.nextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-8"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              {tr.thisWeek}
            </Button>
          )}
        </div>
        <ShiftLegend />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card px-6 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr.loadingGrid}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-destructive">
            {tr.loadError}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-8"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            {tr.retry}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card px-6 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">
            {tr.emptyTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{tr.emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
          <div
            className="min-w-[940px] grid"
            style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}
          >
            <div className="border-b border-r border-border/70 bg-secondary/40 px-3.5 py-3 text-xs font-semibold text-muted-foreground">
              {tr.teamMember}
            </div>
            {weekDates.map((date, i) => (
              <div
                key={i}
                className={cn(
                  "border-b border-border/70 bg-secondary/40 px-3 py-2.5 text-center",
                  i < 6 && "border-r",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {days[i]}
                </p>
                <p
                  className="mt-0.5 text-sm font-semibold tabular-nums"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {format(date, "dd")}
                </p>
              </div>
            ))}

            {rows.map((row, ri) => (
              <div key={row.employee.id} className="contents">
                <div
                  className={cn(
                    "flex items-center gap-2.5 border-r border-border/70 bg-secondary/30 px-3.5 py-3",
                    ri < rows.length - 1 && "border-b",
                  )}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback
                      className="text-[10px] font-semibold text-white"
                      style={{ background: colorFromId(row.employee.id) }}
                    >
                      {initialsFromName(row.employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {row.employee.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {row.employee.position ||
                        row.employee.effective_planning?.name ||
                        tr.noRole}{" "}
                      · <span className="font-mono">{formatDuration(row.weekMinutes)}</span>
                    </p>
                  </div>
                </div>
                {row.cells.map((cell, ci) => {
                  const isLastRow = ri === rows.length - 1
                  const isLastCol = ci === 6
                  const isWeekend = ci >= 5
                  return (
                    <div
                      key={ci}
                      className={cn(
                        "min-h-[88px] space-y-1 p-1.5",
                        !isLastRow && "border-b border-border/70",
                        !isLastCol && "border-r border-border/70",
                        isWeekend ? "bg-secondary/25" : "bg-card",
                      )}
                    >
                      {cell.leave ? (
                        <div
                          className="rounded-md border px-2 py-1.5 text-[11px] font-semibold leading-tight"
                          style={{
                            background: SHIFT_SPECS.leave.bg,
                            borderColor: SHIFT_SPECS.leave.border,
                            color: SHIFT_SPECS.leave.text,
                          }}
                        >
                          {tr.leave}
                        </div>
                      ) : cell.entries.length > 0 ? (
                        cell.entries.map((entry, ei) => (
                          <div
                            key={ei}
                            className="rounded-md border px-2 py-1.5 text-[11px] font-semibold leading-tight"
                            style={{
                              background: SHIFT_SPECS[entry.kind].bg,
                              borderColor: SHIFT_SPECS[entry.kind].border,
                              color: SHIFT_SPECS[entry.kind].text,
                            }}
                          >
                            {entry.start}–{entry.end}
                            <p className="mt-0.5 font-mono text-[10px] opacity-80">
                              {formatDuration(entry.minutes)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="px-1 py-2 text-center text-xs text-muted-foreground/60">—</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            <div className="flex items-center gap-2 border-r border-border/70 bg-secondary/40 px-3.5 py-3 text-xs font-semibold text-foreground">
              {tr.coverage(rows.length)}
            </div>
            {coverage.map((c, i) => {
              const total = rows.length || 1
              const ratio = c / total
              const tone =
                ratio >= 0.6
                  ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                  : ratio >= 0.3
                    ? "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300"
                    : "border-destructive/40 bg-destructive/12 text-destructive"
              return (
                <div
                  key={i}
                  className={cn(
                    "bg-secondary/40 px-2 py-3 text-center",
                    i < 6 && "border-r border-border/70",
                    i >= 5 && "bg-secondary/55",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                      tone,
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {c}/{rows.length}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
