"use client"

import { Check, Pencil } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

export type TimesheetSeverity = "info" | "warn" | "danger"

export interface TimesheetItem {
  id: number | string
  name: string
  initials: string
  avatarColor: string
  dateFr: string
  dateEn: string
  reasonFr: string
  reasonEn: string
  expectStart: string
  expectEnd: string
  actualStart: string
  actualEnd: string
  delta: string
  deltaType: TimesheetSeverity
  severity: TimesheetSeverity
}

const HOURS_SCALE = ["04:00", "10:00", "16:00", "22:00", "04:00"]

function toPct(t: string): number | null {
  if (!t || t === "—" || t === "-") return null
  const [h, m] = t.split(":").map(Number)
  let v = h + m / 60
  if (v < 4) v += 24
  return Math.max(0, Math.min(100, ((v - 4) / 24) * 100))
}

function severityClasses(severity: TimesheetSeverity) {
  switch (severity) {
    case "danger":
      return {
        marker: "border-destructive text-destructive",
        bar: "bg-destructive",
        delta: "bg-destructive/12 text-destructive",
      }
    case "warn":
      return {
        marker: "border-amber-500 text-amber-700 dark:text-amber-300",
        bar: "bg-amber-500",
        delta: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      }
    case "info":
    default:
      return {
        marker: "border-primary text-primary",
        bar: "bg-primary",
        delta: "bg-primary/10 text-primary",
      }
  }
}

interface TimesheetRowProps {
  item: TimesheetItem
  selected: boolean
  onToggleSelect: () => void
  onApprove: () => void
  onEdit: () => void
  approveDisabled?: boolean
  busy?: boolean
}

export function TimesheetRow({
  item,
  selected,
  onToggleSelect,
  onApprove,
  onEdit,
  approveDisabled = false,
  busy = false,
}: TimesheetRowProps) {
  const { locale } = useI18n()
  const expS = toPct(item.expectStart) ?? 0
  const expE = toPct(item.expectEnd) ?? 100
  const actS = toPct(item.actualStart) ?? expS
  const actEResolved = toPct(item.actualEnd)
  const isMissing = actEResolved === null
  const actE = actEResolved ?? expE
  const sev = severityClasses(item.severity)

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/70 hover:border-border",
      )}
    >
      <div className="grid grid-cols-1 items-center gap-4 p-4 md:gap-6 md:p-5 md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,2.2fr)_minmax(0,1fr)_auto]">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={locale === "en" ? "Select row" : "Sélectionner"}
        />

        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback
              className="text-xs font-semibold text-white"
              style={{ background: item.avatarColor }}
            >
              {item.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {item.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {locale === "en" ? item.dateEn : item.dateFr} ·{" "}
              {locale === "en" ? item.reasonEn : item.reasonFr}
            </p>
          </div>
        </div>

        <div className="relative h-12 min-w-[180px]">
          <div className="absolute inset-x-0 top-[18px] h-1.5 rounded-full bg-secondary/70" />
          <div
            className="absolute top-[18px] h-1.5 rounded-full bg-primary/30"
            style={{ left: `${expS}%`, width: `${Math.max(0, expE - expS)}%` }}
          />
          {isMissing ? (
            <div
              className="absolute top-[18px] h-1.5 rounded-full opacity-70"
              style={{
                left: `${actS}%`,
                width: `${Math.max(0, actE - actS)}%`,
                background:
                  "repeating-linear-gradient(90deg, var(--destructive), var(--destructive) 6px, transparent 6px, transparent 12px)",
              }}
            />
          ) : (
            <div
              className={cn("absolute top-[18px] h-1.5 rounded-full", sev.bar)}
              style={{ left: `${actS}%`, width: `${Math.max(0, actE - actS)}%` }}
            />
          )}
          <div
            className={cn(
              "absolute top-[10px] grid h-5 w-5 place-items-center rounded-full border-2 bg-card text-[10px] font-bold tabular-nums",
              sev.marker,
            )}
            style={{ left: `calc(${actS}% - 10px)` }}
            aria-label={`${locale === "en" ? "Actual start" : "Début réel"} ${item.actualStart}`}
          >
            {item.actualStart.split(":")[0]}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[10px] text-muted-foreground/70">
            {HOURS_SCALE.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-xs">
          <div className="text-muted-foreground">
            {locale === "en" ? "Expected" : "Attendu"}{" "}
            <span className="font-mono text-foreground/80">
              {item.expectStart}–{item.expectEnd}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">
              {locale === "en" ? "Actual" : "Réel"}
            </span>
            <span className="font-mono font-semibold text-foreground">
              {item.actualStart}–{item.actualEnd}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                sev.delta,
              )}
            >
              {item.delta}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onEdit}
            disabled={busy}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            {locale === "en" ? "Correct" : "Corriger"}
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={onApprove}
            disabled={approveDisabled || busy}
            title={
              approveDisabled
                ? locale === "en"
                  ? "Missing clock-in/out — use Correct to enter times"
                  : "Pointage incomplet — utilisez Corriger pour saisir les heures"
                : undefined
            }
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            {locale === "en" ? "Approve" : "Valider"}
          </Button>
        </div>
      </div>
    </div>
  )
}
