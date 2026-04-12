"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertTriangle, Clock3, CircleAlert, ShieldAlert } from "lucide-react"
import type { PriorityAction } from "@/components/dashboard/types"
import Link from "next/link"
import { toast } from "sonner"

type PriorityActionsProps = {
  actions: PriorityAction[]
}

const priorityStyles = {
  critical: {
    badge: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
    icon: ShieldAlert,
    label: "Critique",
  },
  warning: {
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    label: "A surveiller",
  },
  info: {
    badge: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    icon: CircleAlert,
    label: "Info actionnable",
  },
} as const

export function PriorityActions({ actions }: PriorityActionsProps) {
  const activeActions = actions.filter((a) => (a.count ?? 1) > 0)
  const resolvedActions = activeActions.length > 0 ? activeActions : actions

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Centre d&apos;actions prioritaires</CardTitle>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Mise a jour continue
        </span>
      </CardHeader>
      <CardContent>
        {resolvedActions.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <ShieldAlert className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Aucune action prioritaire</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Tous les systèmes fonctionnent normalement</p>
            <Button variant="link" size="sm" className="mt-2 h-7 text-xs" asChild>
              <Link href="/access-logs">Voir le journal complet</Link>
            </Button>
          </div>
        ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 stagger-children">
        {resolvedActions.map((action) => {
          const styles = priorityStyles[action.priority]
          const Icon = styles.icon
          const isInactive = (action.count ?? 1) === 0
          const actionHref = action.ctaHref ?? "/settings"
          return (
            <article key={action.id} className={cn("card-shine wow-transition wow-hover rounded-xl border border-border/70 bg-secondary/28 p-3", isInactive && "opacity-50")}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]", styles.badge)}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{styles.label}</span>
                </div>
                {action.count != null ? <span className="text-sm font-semibold text-foreground">{action.count}</span> : null}
              </div>
              <Link href={actionHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" onClick={() => toast.info(`Ouverture: ${action.title}`)}>
                <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              <Button variant="outline" size="sm" className="mt-3 h-8 w-full justify-center text-xs" asChild>
                <Link href={actionHref} onClick={() => toast.info(`Action lancee: ${action.title}`)}>{action.ctaLabel ?? "Traiter"}</Link>
              </Button>
            </article>
          )
        })}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
