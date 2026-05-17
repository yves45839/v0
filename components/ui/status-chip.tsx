"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chipVariants = cva(
  // Base — pill shape, compact, focusable when interactive
  [
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border",
    "px-2.5 py-0.5 text-[11px] font-semibold leading-5",
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        success: [
          "border-[color-mix(in_srgb,var(--success)_42%,transparent)]",
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
          "text-[var(--success)]",
        ].join(" "),
        warning: [
          "border-[color-mix(in_srgb,var(--warning)_44%,transparent)]",
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
          "text-[var(--warning)]",
        ].join(" "),
        danger: [
          "border-[color-mix(in_srgb,var(--destructive)_44%,transparent)]",
          "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)]",
          "text-[var(--destructive)]",
        ].join(" "),
        info: [
          "border-[color-mix(in_srgb,var(--info)_42%,transparent)]",
          "bg-[color-mix(in_srgb,var(--info)_12%,transparent)]",
          "text-[var(--info)]",
        ].join(" "),
        brand: [
          "border-[color-mix(in_srgb,var(--brand)_42%,transparent)]",
          "bg-[var(--brand-soft)]",
          "text-[var(--brand)]",
        ].join(" "),
        accent: [
          "border-[color-mix(in_srgb,var(--brand-accent)_44%,transparent)]",
          "bg-[var(--brand-accent-soft)]",
          "text-[var(--brand-accent)]",
        ].join(" "),
        neutral: [
          "border-border/70",
          "bg-muted/50",
          "text-muted-foreground",
        ].join(" "),
      },
      size: {
        sm: "px-2 py-0 text-[10px] leading-4",
        md: "px-2.5 py-0.5 text-[11px] leading-5",
        lg: "px-3 py-1 text-[12px] leading-5",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  },
)

type Variant = NonNullable<VariantProps<typeof chipVariants>["variant"]>

const dotColorByVariant: Record<Variant, string> = {
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--destructive)]",
  info: "bg-[var(--info)]",
  brand: "bg-[var(--brand)]",
  accent: "bg-[var(--brand-accent)]",
  neutral: "bg-muted-foreground",
}

export interface StatusChipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof chipVariants> {
  /** Visible label (e.g. "Live", "API connectée") */
  label: string
  /** Optional Lucide icon (rendered before the label) */
  icon?: LucideIcon
  /** Animated dot indicating live state — replaces the icon if both are passed */
  pulse?: boolean
  /** Show a static colored dot before the label (mutually exclusive with icon/pulse) */
  dot?: boolean
}

/**
 * Unified status indicator. One component to express any system / entity state.
 *
 * @example
 *   <StatusChip variant="success" label="API connectée" dot />
 *   <StatusChip variant="success" label="Live" pulse />
 *   <StatusChip variant="warning" label="À surveiller" icon={AlertTriangle} />
 *   <StatusChip variant="danger" label="Hors ligne" icon={WifiOff} />
 */
export function StatusChip({
  variant = "neutral",
  size = "md",
  label,
  icon: Icon,
  pulse = false,
  dot = false,
  className,
  ...rest
}: StatusChipProps) {
  const resolvedVariant: Variant = variant ?? "neutral"

  return (
    <span
      className={cn(chipVariants({ variant: resolvedVariant, size }), className)}
      role="status"
      aria-label={label}
      {...rest}
    >
      {pulse ? (
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping",
              dotColorByVariant[resolvedVariant],
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              dotColorByVariant[resolvedVariant],
            )}
          />
        </span>
      ) : Icon ? (
        <Icon className="h-3 w-3" aria-hidden />
      ) : dot ? (
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            dotColorByVariant[resolvedVariant],
          )}
          aria-hidden
        />
      ) : null}
      <span>{label}</span>
    </span>
  )
}
