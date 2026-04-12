"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"

type ContextTone = "critical" | "warning" | "success" | "neutral"

export type PageContextStat = {
  label: string
  value: number | string
  tone?: ContextTone
  href?: string
}

type PageContextBarProps = {
  title: string
  description?: string
  stats?: PageContextStat[]
  actions?: ReactNode
  className?: string
}

const toneClassNames: Record<ContextTone, string> = {
  critical: "border-red-500/35 bg-red-500/14 text-red-200 shadow-[0_8px_18px_rgba(227,90,90,0.18)]",
  warning: "border-amber-500/35 bg-amber-500/14 text-amber-200 shadow-[0_8px_18px_rgba(244,179,93,0.16)]",
  success: "border-emerald-500/35 bg-emerald-500/14 text-emerald-200 shadow-[0_8px_18px_rgba(47,213,165,0.16)]",
  neutral: "border-border/70 bg-secondary/55 text-muted-foreground shadow-[0_8px_16px_rgba(0,0,0,0.14)]",
}

export function PageContextBar({
  title,
  description,
  stats = [],
  actions,
  className,
}: PageContextBarProps) {
  return (
    <section
      className={cn(
        "mb-6 rounded-2xl border border-border/70 bg-linear-to-r from-card/90 via-card/78 to-card/90 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)] backdrop-blur-md md:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[2rem]">{title}</h1>
          {description ? <p className="max-w-3xl text-sm text-muted-foreground md:text-[13px]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {stats.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2.5 stagger-children">
          {stats.map((stat) => {
            const badgeClasses = cn(
              "wow-transition press-effect inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              toneClassNames[stat.tone ?? "neutral"],
              stat.href && "cursor-pointer hover:brightness-110"
            )
            const inner = (
              <>
                <span className="font-semibold tabular-premium">{stat.value}</span>
                <span>{stat.label}</span>
              </>
            )
            return stat.href ? (
              <Link
                key={`${stat.label}-${stat.value}`}
                href={stat.href}
                className={badgeClasses}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={`${stat.label}-${stat.value}`}
                className={cn(badgeClasses, "cursor-default")}
              >
                {inner}
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
