"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface TeamAvailabilityProps {
  monthLabel?: { fr: string; en: string }
  todayDay?: number
  leaveDays?: number[]
  conflictDays?: number[]
  monthOffset?: number
  balanceSummary?: { fr: string; en: string; value: string; unitFr: string; unitEn: string }[]
}

const DEFAULT_BALANCE = [
  { fr: "Congés payés", en: "Paid leave", value: "+3.2", unitFr: "j/pers.", unitEn: "d/person" },
  { fr: "RTT", en: "RTT", value: "1.8", unitFr: "j/pers.", unitEn: "d/person" },
  { fr: "Maladie (cumul)", en: "Sick (YTD)", value: "12", unitFr: "jours", unitEn: "days" },
]

export function TeamAvailability({
  monthLabel = { fr: "Mai 2026", en: "May 2026" },
  todayDay = 3,
  leaveDays = [6, 7, 8, 9, 10],
  conflictDays = [6, 7, 8],
  monthOffset = 3,
  balanceSummary = DEFAULT_BALANCE,
}: TeamAvailabilityProps) {
  const { locale } = useI18n()
  const headers = locale === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["L", "M", "M", "J", "V", "S", "D"]

  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">
          {locale === "en" ? "Team availability" : "Disponibilité équipe"}
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {locale === "en" ? monthLabel.en : monthLabel.fr}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {headers.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - monthOffset
            const inMonth = day >= 1 && day <= 31
            const isToday = day === todayDay
            const isLeave = leaveDays.includes(day)
            const isConflict = conflictDays.includes(day)
            return (
              <div
                key={i}
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

        <div className="mt-4 border-t border-border/70 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {locale === "en" ? "Balance summary" : "Soldes équipe"}
          </p>
          <ul className="space-y-1 text-xs">
            {balanceSummary.map((s, i) => (
              <li key={i} className="flex items-center justify-between py-1">
                <span className="text-foreground">{locale === "en" ? s.en : s.fr}</span>
                <span>
                  <strong className="font-mono tabular-nums text-foreground">{s.value}</strong>{" "}
                  <span className="text-muted-foreground">{locale === "en" ? s.unitEn : s.unitFr}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
