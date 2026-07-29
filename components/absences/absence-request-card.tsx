"use client"

import { AlertTriangle, Check, MessageSquare, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { absencesDict } from "@/lib/i18n/pages/absences"

export type LeaveKind = "paid" | "sick" | "personal" | "rtt"

export interface AbsenceRequest {
  id: number | string
  name: string
  initials: string
  avatarColor: string
  kind: LeaveKind
  fromDate: string
  toDate: string
  days: number
  requestedFr: string
  requestedEn: string
  reasonFr: string
  reasonEn: string
  conflict?: boolean
  balanceUsed: number
  balanceTotal: number
}

function chipClass(kind: LeaveKind) {
  switch (kind) {
    case "sick":
      return "border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-300"
    case "rtt":
      return "border-primary/30 bg-primary/10 text-primary"
    case "personal":
      return "border-border/70 bg-secondary text-secondary-foreground"
    case "paid":
    default:
      return "border-destructive/25 bg-destructive/8 text-destructive"
  }
}

interface AbsenceRequestCardProps {
  request: AbsenceRequest
  selected: boolean
  onSelect: () => void
  onApprove: () => void
  onReject: () => void
  onDiscuss?: () => void
}

export function AbsenceRequestCard({
  request,
  selected,
  onSelect,
  onApprove,
  onReject,
  onDiscuss,
}: AbsenceRequestCardProps) {
  const { locale } = useI18n()
  const tr = absencesDict[locale]
  const projectedUsed = request.balanceUsed + request.days
  const usedPct = (request.balanceUsed / request.balanceTotal) * 100
  const projectedPct = Math.min(100, (projectedUsed / request.balanceTotal) * 100)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "block w-full rounded-xl border bg-card p-5 text-left transition-all",
        selected
          ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
          : "border-border/70 hover:border-border",
      )}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback
                className="text-xs font-semibold text-white"
                style={{ background: request.avatarColor }}
              >
                {request.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {request.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {tr.requested}{" "}
                {locale === "en" ? request.requestedEn : request.requestedFr}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                chipClass(request.kind),
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {tr.kinds[request.kind]}
            </span>
            {request.conflict && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/12 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {tr.conflict}
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 border-y border-border/70 py-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {tr.period}
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {request.fromDate} → {request.toDate}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {tr.duration}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {request.days} {tr.days}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {tr.balance}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">
                {projectedUsed} / {request.balanceTotal} {tr.daysShort}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary/70">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${usedPct}%` }}
                  aria-hidden
                />
                <div
                  className="-mt-1.5 h-1.5 border-r-2 border-destructive/60"
                  style={{ width: `${projectedPct}%` }}
                  aria-hidden
                />
              </div>
            </div>
          </div>

          <p className="mt-2.5 text-xs italic text-muted-foreground">
            "{locale === "en" ? request.reasonEn : request.reasonFr}"
          </p>

          {request.conflict && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{tr.conflictWarning}</span>
            </div>
          )}
        </div>

        <div className="flex flex-row items-stretch gap-2 md:min-w-[120px] md:flex-col">
          <Button
            size="sm"
            className="h-9 flex-1 md:flex-none"
            onClick={(e) => {
              e.stopPropagation()
              onApprove()
            }}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            {tr.approve}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 md:flex-none"
            onClick={(e) => {
              e.stopPropagation()
              onReject()
            }}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            {tr.reject}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 flex-1 md:flex-none"
            onClick={(e) => {
              e.stopPropagation()
              onDiscuss?.()
            }}
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            {tr.discuss}
          </Button>
        </div>
      </div>
    </button>
  )
}
