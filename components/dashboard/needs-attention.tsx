"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoTooltip } from "@/components/dashboard/info-tooltip"
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Plane,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import type { PriorityAction } from "@/components/dashboard/types"

interface NeedsAttentionProps {
  actions: PriorityAction[]
}

const priorityIconClass: Record<PriorityAction["priority"], string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  info: "bg-primary/10 text-primary",
}

function pickIcon(action: PriorityAction) {
  const blob = `${action.title} ${action.description}`.toLowerCase()
  if (/anomal|pointage|timesheet|écart|ecart/.test(blob)) return AlertTriangle
  if (/cong|leave|absence/.test(blob)) return Plane
  if (/quart|shift|planning|schedule|couvert/.test(blob)) return Calendar
  return ClipboardList
}

export function NeedsAttention({ actions }: NeedsAttentionProps) {
  const { locale } = useI18n()
  const sorted = [...actions].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const
    return order[a.priority] - order[b.priority]
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-base font-semibold tracking-tight">
              {locale === "en" ? "Needs your attention" : "À traiter aujourd'hui"}
            </CardTitle>
            <InfoTooltip
              side="right"
              content={
                locale === "en"
                  ? "Actions sorted by urgency: 🔴 critical, 🟠 warning, 🔵 info. Sources: timesheet anomalies, pending leave requests, uncovered shifts."
                  : "Actions classées par urgence : 🔴 critique, 🟠 avertissement, 🔵 info. Sources : anomalies de pointage, congés en attente, quarts non couverts."
              }
            />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {locale === "en" ? "Sorted by urgency" : "Trié par urgence"}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Link href="/access-logs">
            {locale === "en" ? "View all" : "Tout voir"}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {locale === "en"
              ? "All clear — nothing pending."
              : "Tout est à jour — rien en attente."}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {sorted.slice(0, 5).map((action) => {
              const Icon = pickIcon(action)
              return (
                <li
                  key={action.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/40"
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${priorityIconClass[action.priority]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {action.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  {action.ctaLabel ? (
                    action.ctaHref ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 flex-shrink-0"
                      >
                        <Link href={action.ctaHref}>{action.ctaLabel}</Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-shrink-0"
                      >
                        {action.ctaLabel}
                      </Button>
                    )
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
