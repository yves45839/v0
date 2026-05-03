"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/context"

interface PresenceWeekProps {
  data?: Array<{ value: number; count: number }>
  averagePct?: number
}

const DEFAULT_DATA = [
  { value: 92, count: 41 },
  { value: 95, count: 43 },
  { value: 89, count: 40 },
  { value: 91, count: 41 },
  { value: 87, count: 39 },
  { value: 36, count: 16 },
  { value: 22, count: 10 },
]

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function PresenceWeek({
  data = DEFAULT_DATA,
  averagePct,
}: PresenceWeekProps) {
  const { locale } = useI18n()
  const days = locale === "en" ? DAYS_EN : DAYS_FR
  const avg =
    averagePct ??
    Math.round(data.reduce((acc, d) => acc + d.value, 0) / data.length)

  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">
          {locale === "en"
            ? "Team presence · this week"
            : "Présence équipe · semaine"}
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {locale === "en" ? `Avg. ${avg}% on-site` : `Moy. ${avg}% sur site`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {data.map((d, i) => {
            const isWeekend = i >= 5
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {days[i]}
                </span>
                <div className="relative h-16 w-full overflow-hidden rounded-md bg-secondary/60">
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-b-md transition-all duration-500 ${
                      isWeekend ? "bg-muted-foreground/40" : "bg-primary"
                    }`}
                    style={{ height: `${d.value}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {d.value}%
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
