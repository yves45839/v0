"use client"

import { useMemo, useState } from "react"
import { addDays, addMonths, format, getDay, getDaysInMonth, isSameMonth, startOfMonth } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { absencesDict } from "@/lib/i18n/pages/absences"
import type { LeaveRequestApiItem, LeaveRequestType } from "@/lib/api/employees"

interface TeamAvailabilityProps {
  requests: LeaveRequestApiItem[]
  loading?: boolean
}

function parseDay(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Nombre de jours de la demande compris dans l'année donnée. */
function daysInYear(request: LeaveRequestApiItem, year: number): number {
  const start = parseDay(request.start_date)
  const end = parseDay(request.end_date)
  if (!start || !end) return 0
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const from = start > yearStart ? start : yearStart
  const to = end < yearEnd ? end : yearEnd
  if (to < from) return 0
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1
}

const LEAVE_TYPE_KEYS: LeaveRequestType[] = ["paid", "sick", "unpaid", "special"]

export function TeamAvailability({ requests, loading = false }: TeamAvailabilityProps) {
  const { locale } = useI18n()
  const tr = absencesDict[locale]
  const dateLocale = locale === "en" ? enUS : fr
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))

  // Initiales des jours (semaine commençant lundi) via date-fns — le 2024-01-01 est un lundi.
  const headers = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(2024, 0, 1), i), "EEEEE", { locale: dateLocale }).toUpperCase()
  )

  const approved = useMemo(
    () => requests.filter((request) => request.status === "approved"),
    [requests]
  )

  const daysInMonth = getDaysInMonth(month)
  const monthOffset = (getDay(month) + 6) % 7 // lundi = 0
  const cellCount = Math.ceil((monthOffset + daysInMonth) / 7) * 7

  const dayCounts = useMemo(() => {
    const counts = new Array<number>(daysInMonth + 1).fill(0)
    for (const request of approved) {
      const start = parseDay(request.start_date)
      const end = parseDay(request.end_date)
      if (!start || !end) continue
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(month.getFullYear(), month.getMonth(), day)
        if (date >= start && date <= end) counts[day] += 1
      }
    }
    return counts
  }, [approved, month, daysInMonth])

  const today = new Date()
  const todayDay = isSameMonth(today, month) ? today.getDate() : null

  const yearTotals = useMemo(() => {
    const year = new Date().getFullYear()
    const totals = new Map<LeaveRequestType, number>()
    for (const request of approved) {
      const days = daysInYear(request, year)
      if (days <= 0) continue
      totals.set(request.leave_type, (totals.get(request.leave_type) ?? 0) + days)
    }
    return LEAVE_TYPE_KEYS
      .map((type) => ({ type, days: totals.get(type) ?? 0 }))
      .filter((entry) => entry.days > 0)
  }, [approved])

  const monthLabelRaw = format(month, "MMMM yyyy", { locale: dateLocale })
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1)

  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold tracking-tight">
            {tr.teamAvailability}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label={tr.prevMonth}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label={tr.nextMonth}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{monthLabel}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {tr.loadingAvailability}
          </p>
        ) : (
          <>
            <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {headers.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {Array.from({ length: cellCount }).map((_, i) => {
                const day = i - monthOffset + 1
                const inMonth = day >= 1 && day <= daysInMonth
                const count = inMonth ? dayCounts[day] : 0
                const isToday = inMonth && day === todayDay
                const isLeave = count >= 1
                const isConflict = count >= 2
                return (
                  <div
                    key={i}
                    title={inMonth && isLeave ? tr.personsOnLeave(count) : undefined}
                    className={cn(
                      "grid aspect-square place-items-center rounded-md font-medium tabular-nums",
                      isConflict
                        ? "border border-destructive bg-destructive/12 font-bold text-destructive"
                        : isLeave
                          ? "bg-destructive/8 font-bold text-destructive/80"
                          : "bg-secondary/60 text-muted-foreground",
                      isToday && "outline outline-2 outline-primary -outline-offset-2",
                      !inMonth && "opacity-30",
                    )}
                  >
                    {inMonth ? day : ""}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-destructive/8 outline outline-1 outline-destructive/30" />
                {tr.approvedLeave}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-destructive bg-destructive/12" />
                {tr.overlap}
              </span>
            </div>

            <div className="mt-4 border-t border-border/70 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tr.approvedDaysIn(today.getFullYear())}
              </p>
              {yearTotals.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {tr.noApprovedThisYear}
                </p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {yearTotals.map((entry) => (
                    <li key={entry.type} className="flex items-center justify-between py-1">
                      <span className="text-foreground">{tr.leaveTypes[entry.type]}</span>
                      <span>
                        <strong className="font-mono tabular-nums text-foreground">
                          {entry.days}
                        </strong>{" "}
                        <span className="text-muted-foreground">{tr.days}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
