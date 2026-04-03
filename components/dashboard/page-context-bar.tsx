"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ContextTone = "critical" | "warning" | "success" | "neutral"

export type PageContextStat = {
  label: string
  value: number | string
  tone?: ContextTone
}

type PageContextBarProps = {
  title: string
  description?: string
  stats?: PageContextStat[]
  actions?: ReactNode
  className?: string
}

const toneClassNames: Record<ContextTone, string> = {
  critical: "border-red-500/35 bg-red-500/10 text-red-300",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  neutral: "border-border bg-secondary/40 text-muted-foreground",
}

export function PageContextBar({
  title,
  description,
  stats = [],
  actions,
  className,
}: PageContextBarProps) {
  return (
    <section className={cn("mb-6 rounded-xl border border-border/70 bg-card/70 p-4 md:p-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {stats.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {stats.map((stat) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
                toneClassNames[stat.tone ?? "neutral"]
              )}
            >
              <span className="font-semibold">{stat.value}</span>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

