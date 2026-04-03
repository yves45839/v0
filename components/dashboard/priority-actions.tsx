"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertTriangle, Clock3, CircleAlert, ShieldAlert } from "lucide-react"
import type { PriorityAction } from "@/components/dashboard/types"

type PriorityActionsProps = {
  actions: PriorityAction[]
}

const priorityStyles = {
  critical: {
    badge: "border-red-500/35 bg-red-500/10 text-red-300",
    icon: ShieldAlert,
    label: "Critique",
  },
  warning: {
    badge: "border-amber-500/35 bg-amber-500/10 text-amber-300",
    icon: AlertTriangle,
    label: "A surveiller",
  },
  info: {
    badge: "border-blue-500/35 bg-blue-500/10 text-blue-300",
    icon: CircleAlert,
    label: "Info actionnable",
  },
} as const

export function PriorityActions({ actions }: PriorityActionsProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Centre d&apos;actions prioritaires</CardTitle>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Mise a jour continue
        </span>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const styles = priorityStyles[action.priority]
          const Icon = styles.icon
          return (
            <article key={action.id} className="rounded-lg border border-border/80 bg-secondary/35 p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]", styles.badge)}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{styles.label}</span>
                </div>
                {action.count != null ? <span className="text-sm font-semibold text-foreground">{action.count}</span> : null}
              </div>
              <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              <Button variant="outline" size="sm" className="mt-3 h-8 w-full justify-center text-xs">
                {action.ctaLabel ?? "Traiter"}
              </Button>
            </article>
          )
        })}
      </CardContent>
    </Card>
  )
}

