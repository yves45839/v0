"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

type LeaveKind = "paid" | "sick" | "personal"

interface LeaveEntry {
  day: string
  monthFr: string
  monthEn: string
  name: string
  duration: string
  kind: LeaveKind
}

const DEFAULT_LEAVES: LeaveEntry[] = [
  { day: "06", monthFr: "MAI", monthEn: "MAY", name: "Salim Ouhmane", duration: "5 j", kind: "paid" },
  { day: "12", monthFr: "MAI", monthEn: "MAY", name: "Yasmina El Bahri", duration: "1 j", kind: "personal" },
  { day: "18", monthFr: "MAI", monthEn: "MAY", name: "N'Guessan Anderson", duration: "3 j", kind: "paid" },
  { day: "22", monthFr: "MAI", monthEn: "MAY", name: "Léa Maréchal", duration: "10 j", kind: "sick" },
]

const KIND_LABEL: Record<LeaveKind, { fr: string; en: string }> = {
  paid: { fr: "Congés payés", en: "Paid leave" },
  sick: { fr: "Maladie", en: "Sick leave" },
  personal: { fr: "Personnel", en: "Personal" },
}

interface UpcomingLeaveProps {
  leaves?: LeaveEntry[]
}

export function UpcomingLeave({ leaves = DEFAULT_LEAVES }: UpcomingLeaveProps) {
  const { locale } = useI18n()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-semibold tracking-tight">
            {locale === "en" ? "Upcoming leave" : "Congés à venir"}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {locale === "en" ? "Next 30 days" : "30 prochains jours"}
          </p>
        </div>
        <Button asChild variant="ghost" size="icon" className="h-7 w-7">
          <Link href="/planning" aria-label={locale === "en" ? "View leave" : "Voir les congés"}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {leaves.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {locale === "en" ? "No upcoming leave." : "Aucun congé prévu."}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {leaves.map((l, i) => (
              <li key={`${l.name}-${i}`} className="flex items-center gap-3 py-2.5">
                <div
                  className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/8 text-destructive"
                  style={{ background: "color-mix(in oklab, var(--destructive) 8%, var(--card))" }}
                >
                  <span
                    className="text-base font-bold leading-none tabular-nums"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {l.day}
                  </span>
                  <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider">
                    {locale === "en" ? l.monthEn : l.monthFr}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {l.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {KIND_LABEL[l.kind][locale]} · {l.duration}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
