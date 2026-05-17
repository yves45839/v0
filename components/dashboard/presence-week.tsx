"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoTooltip } from "@/components/dashboard/info-tooltip"
import { useI18n } from "@/lib/i18n/context"
import type { PresenceWeekData } from "@/components/dashboard/types"

interface PresenceWeekProps {
  data: PresenceWeekData
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function PresenceWeek({ data }: PresenceWeekProps) {
  const { locale } = useI18n()
  const days = locale === "en" ? DAYS_EN : DAYS_FR

  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold tracking-tight">
            {locale === "en"
              ? "Team presence · this week"
              : "Présence équipe · semaine"}
          </CardTitle>
          <InfoTooltip
            side="top"
            content={
              locale === "en"
                ? "Daily attendance rate for the current week, calculated from check-in records on access terminals. Weekends are shown in grey."
                : "Taux de présence journalier de la semaine courante, calculé à partir des pointages d'entrée sur les terminaux. Les week-ends apparaissent en gris."
            }
          />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {locale === "en"
            ? `Avg. ${data.averagePct}% on-site`
            : `Moy. ${data.averagePct}% sur site`}
        </p>
        {data.isPartial ? (
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            {locale === "en"
              ? "Partial data: event window does not cover the full week."
              : "Données partielles : la fenêtre d'événements ne couvre pas la semaine entière."}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {data.days.map((d, i) => {
            const isWeekend = i >= 5
            const showValue = !d.isFuture && d.covered
            const barClass = !d.covered || d.isFuture
              ? "bg-muted-foreground/20"
              : isWeekend
                ? "bg-muted-foreground/40"
                : "bg-primary"
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {days[i]}
                </span>
                <div className="relative h-16 w-full overflow-hidden rounded-md bg-secondary/60">
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-b-md transition-all duration-500 ${barClass}`}
                    style={{ height: `${showValue ? d.value : 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {showValue ? `${d.value}%` : "—"}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
