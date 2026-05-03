"use client"

import { useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

type ShiftKind = "morning" | "day" | "evening" | "night" | "leave" | "off"

interface ShiftSpec {
  bg: string
  border: string
  text: string
  label: string
}

const SHIFT_SPECS: Record<Exclude<ShiftKind, "off">, ShiftSpec> = {
  morning: {
    bg: "color-mix(in oklab, var(--primary) 14%, var(--card))",
    border: "color-mix(in oklab, var(--primary) 35%, transparent)",
    text: "color-mix(in oklab, var(--primary) 70%, var(--foreground))",
    label: "06–14",
  },
  day: {
    bg: "color-mix(in oklab, oklch(0.6 0.12 240) 14%, var(--card))",
    border: "color-mix(in oklab, oklch(0.6 0.12 240) 35%, transparent)",
    text: "color-mix(in oklab, oklch(0.35 0.1 240) 80%, var(--foreground))",
    label: "08–16",
  },
  evening: {
    bg: "color-mix(in oklab, oklch(0.72 0.15 75) 16%, var(--card))",
    border: "color-mix(in oklab, oklch(0.72 0.15 75) 38%, transparent)",
    text: "color-mix(in oklab, oklch(0.4 0.12 70) 80%, var(--foreground))",
    label: "14–22",
  },
  night: {
    bg: "color-mix(in oklab, oklch(0.5 0.12 290) 14%, var(--card))",
    border: "color-mix(in oklab, oklch(0.5 0.12 290) 35%, transparent)",
    text: "color-mix(in oklab, oklch(0.35 0.1 290) 80%, var(--foreground))",
    label: "22–06",
  },
  leave: {
    bg: "color-mix(in oklab, var(--destructive) 12%, var(--card))",
    border: "color-mix(in oklab, var(--destructive) 35%, transparent)",
    text: "color-mix(in oklab, var(--destructive) 75%, var(--foreground))",
    label: "Leave",
  },
}

interface TeamMember {
  id: number
  name: string
  initials: string
  avatarColor: string
  roleFr: string
  roleEn: string
  hours: number
  days: ShiftKind[]
}

const DEFAULT_TEAM: TeamMember[] = [
  { id: 1, name: "Salim Ouhmane", initials: "SO", avatarColor: "oklch(0.6 0.13 25)", roleFr: "Agent senior", roleEn: "Lead guard", hours: 40, days: ["morning", "morning", "off", "morning", "morning", "off", "off"] },
  { id: 2, name: "Yasmina El Bahri", initials: "YE", avatarColor: "oklch(0.55 0.12 280)", roleFr: "Hôtesse", roleEn: "Receptionist", hours: 36, days: ["day", "day", "leave", "leave", "leave", "off", "off"] },
  { id: 3, name: "N'Guessan Anderson", initials: "NA", avatarColor: "oklch(0.5 0.11 165)", roleFr: "Chef site", roleEn: "Site sup.", hours: 40, days: ["evening", "evening", "evening", "off", "evening", "evening", "off"] },
  { id: 4, name: "Karim Benhaddou", initials: "KB", avatarColor: "oklch(0.55 0.13 220)", roleFr: "Agent nuit", roleEn: "Night guard", hours: 40, days: ["night", "off", "night", "night", "off", "night", "night"] },
  { id: 5, name: "Aïcha Diop", initials: "AD", avatarColor: "oklch(0.5 0.12 305)", roleFr: "Opératrice", roleEn: "Operator", hours: 32, days: ["day", "day", "off", "day", "day", "off", "off"] },
  { id: 6, name: "Marc Belkacem", initials: "MB", avatarColor: "oklch(0.55 0.13 130)", roleFr: "Stagiaire", roleEn: "Trainee", hours: 40, days: ["morning", "morning", "morning", "morning", "off", "off", "off"] },
]

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_NUMBERS = ["04", "05", "06", "07", "08", "09", "10"]

function ShiftLegend() {
  const { locale } = useI18n()
  const items: { kind: Exclude<ShiftKind, "off" | "leave">; label: string }[] = [
    { kind: "morning", label: "06–14" },
    { kind: "day", label: "08–16" },
    { kind: "evening", label: "14–22" },
    { kind: "night", label: "22–06" },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
      {items.map((it) => {
        const spec = SHIFT_SPECS[it.kind]
        return (
          <span key={it.kind} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm border"
              style={{ background: spec.bg, borderColor: spec.border }}
            />
            <span>{it.label}</span>
          </span>
        )
      })}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm border"
          style={{
            background: SHIFT_SPECS.leave.bg,
            borderColor: SHIFT_SPECS.leave.border,
          }}
        />
        <span>{locale === "en" ? "Leave" : "Congé"}</span>
      </span>
    </div>
  )
}

export function WeeklyPlanningGrid({
  team = DEFAULT_TEAM,
}: {
  team?: TeamMember[]
}) {
  const { locale } = useI18n()
  const [weekOffset, setWeekOffset] = useState(0)

  const days = locale === "en" ? DAYS_EN : DAYS_FR
  const coverage = useMemo(() => {
    const totals = Array.from({ length: 7 }, () => 0)
    team.forEach((m) => {
      m.days.forEach((s, i) => {
        if (s !== "off" && s !== "leave") totals[i] += 1
      })
    })
    return totals
  }, [team])

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "en" ? "Weekly schedule" : "Planning hebdomadaire"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "en"
              ? "HQ · Casablanca · 6 people scheduled"
              : "Siège · Casablanca · 6 personnes planifiées"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "AI fill gaps" : "Remplir auto."}
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            {locale === "en" ? "Copy last week" : "Copier sem. dernière"}
          </Button>
          <Button size="sm" className="h-9">
            <Check className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "Publish" : "Publier"}
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label={locale === "en" ? "Previous week" : "Semaine précédente"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p
            className="px-2 text-sm font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "en" ? "Week of May 4" : "Semaine du 4 mai"} — 10{" "}
            {locale === "en" ? "May" : "mai"} 2026
            {weekOffset !== 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({weekOffset > 0 ? `+${weekOffset}` : weekOffset})
              </span>
            )}
          </p>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label={locale === "en" ? "Next week" : "Semaine suivante"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-8"
              onClick={() => setWeekOffset(0)}
            >
              {locale === "en" ? "This week" : "Cette semaine"}
            </Button>
          )}
        </div>
        <ShiftLegend />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
        <div
          className="min-w-[940px] grid"
          style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}
        >
          <div className="border-b border-r border-border/70 bg-secondary/40 px-3.5 py-3 text-xs font-semibold text-muted-foreground">
            {locale === "en" ? "Team member" : "Collaborateur"}
          </div>
          {days.map((d, i) => (
            <div
              key={i}
              className={cn(
                "border-b border-border/70 bg-secondary/40 px-3 py-2.5 text-center",
                i < 6 && "border-r",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {d}
              </p>
              <p
                className="mt-0.5 text-sm font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {DAY_NUMBERS[i]}
              </p>
            </div>
          ))}

          {team.map((member, ri) => (
            <div key={member.id} className="contents">
              <div
                className={cn(
                  "flex items-center gap-2.5 border-r border-border/70 bg-secondary/30 px-3.5 py-3",
                  ri < team.length - 1 && "border-b",
                )}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback
                    className="text-[10px] font-semibold text-white"
                    style={{ background: member.avatarColor }}
                  >
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {member.name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {locale === "en" ? member.roleEn : member.roleFr} ·{" "}
                    <span className="font-mono">{member.hours}h</span>
                  </p>
                </div>
              </div>
              {member.days.map((shift, ci) => {
                const isLastRow = ri === team.length - 1
                const isLastCol = ci === 6
                const isWeekend = ci >= 5
                return (
                  <div
                    key={ci}
                    className={cn(
                      "min-h-[88px] p-1.5",
                      !isLastRow && "border-b border-border/70",
                      !isLastCol && "border-r border-border/70",
                      isWeekend ? "bg-secondary/25" : "bg-card",
                    )}
                  >
                    {shift !== "off" ? (
                      <button
                        type="button"
                        className="block w-full rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition-shadow hover:shadow-sm"
                        style={{
                          background: SHIFT_SPECS[shift].bg,
                          borderColor: SHIFT_SPECS[shift].border,
                          color: SHIFT_SPECS[shift].text,
                        }}
                      >
                        {shift === "leave"
                          ? locale === "en"
                            ? "Leave"
                            : "Congé"
                          : SHIFT_SPECS[shift].label}
                        {shift !== "leave" && (
                          <p className="mt-0.5 font-mono text-[10px] opacity-80">
                            8h
                          </p>
                        )}
                      </button>
                    ) : (
                      <p className="px-1 py-2 text-center text-xs text-muted-foreground/60">
                        —
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          <div className="flex items-center gap-2 border-r border-border/70 bg-secondary/40 px-3.5 py-3 text-xs font-semibold text-foreground">
            {locale === "en" ? "Coverage / 6" : "Couverture / 6"}
          </div>
          {coverage.map((c, i) => {
            const ok = c >= 4
            const tone = ok
              ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : c >= 2
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
                  {c}/6
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
