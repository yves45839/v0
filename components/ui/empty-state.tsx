"use client"

import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyStateAction = {
  label: string
  icon?: LucideIcon
  onClick?: () => void
  href?: string
  disabled?: boolean
}

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /** Variant: "panel" wraps in a bordered card; "bare" is just the content */
  variant?: "panel" | "bare"
  className?: string
}

function ActionButton({
  action,
  variant: btnVariant,
}: {
  action: EmptyStateAction
  variant: "default" | "outline"
}) {
  const Icon = action.icon
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      <span>{action.label}</span>
    </>
  )

  if (action.href) {
    return (
      <Button
        asChild
        variant={btnVariant}
        size="sm"
        className="gap-2"
        disabled={action.disabled}
      >
        <Link href={action.href}>{content}</Link>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant={btnVariant}
      size="sm"
      className="gap-2"
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {content}
    </Button>
  )
}

/**
 * Empty state for collections, search results, dashboards.
 * Uses brand colors (LR Time = blue + orange) for the icon halo.
 *
 * @example
 *   <EmptyState
 *     icon={Cpu}
 *     title="Aucun appareil connecté"
 *     description="Ajoutez votre premier lecteur Hikvision pour commencer."
 *     action={{ label: "Ajouter un appareil", icon: Plus, onClick: openDialog }}
 *     secondaryAction={{ label: "Importer depuis HikCentral", href: "/integrations" }}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "panel",
  className,
}: EmptyStateProps) {
  const wrapperClass = cn(
    "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
    variant === "panel" &&
      "rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm",
    className,
  )

  return (
    <div className={wrapperClass} role="status">
      <div
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-[var(--brand-soft)] text-[var(--brand)]",
          "ring-1 ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]",
          "shadow-[0_8px_28px_-12px_color-mix(in_srgb,var(--brand)_55%,transparent)]",
        )}
        aria-hidden
      >
        {/* Halo orange subtil — accent de marque */}
        <span
          className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-[var(--brand-accent)] ring-2 ring-card"
          aria-hidden
        />
        <Icon className="h-6 w-6" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          {action ? <ActionButton action={action} variant="default" /> : null}
          {secondaryAction ? (
            <ActionButton action={secondaryAction} variant="outline" />
          ) : null}
        </div>
      )}
    </div>
  )
}
