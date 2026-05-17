"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, XCircle, Zap } from "lucide-react"
import { StatusChip } from "@/components/ui/status-chip"
import type { StatusChipProps } from "@/components/ui/status-chip"
import { cn } from "@/lib/utils"

// ─── Domain status types ───────────────────────────────────────────────────

/** The four canonical attendance/pointage states used across the app. */
export type AttendanceStatus = "compliant" | "late" | "missing" | "incident"

// ─── Mapping ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    variant: StatusChipProps["variant"]
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  compliant: {
    variant: "success",
    label: "Conforme",
    icon: CheckCircle2,
  },
  late: {
    variant: "warning",
    label: "Retard",
    icon: AlertTriangle,
  },
  missing: {
    variant: "danger",
    label: "Absent",
    icon: XCircle,
  },
  incident: {
    variant: "info",
    label: "Incident",
    icon: Zap,
  },
}

// ─── Component ─────────────────────────────────────────────────────────────

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Attendance state to display. */
  status: AttendanceStatus
  /** Override the default translated label. */
  label?: string
  /** Badge size, forwarded to StatusChip. Default: "md". */
  size?: StatusChipProps["size"]
  /** Show animated pulse dot instead of icon. Useful for live/real-time states. */
  pulse?: boolean
}

/**
 * Semantic attendance badge.
 *
 * Maps the four domain states (`compliant`, `late`, `missing`, `incident`)
 * to the correct color token, icon, and French label from the design system.
 *
 * @example
 *   <StatusBadge status="compliant" />
 *   <StatusBadge status="late" label="Retard · 12 min" />
 *   <StatusBadge status="missing" size="sm" />
 *   <StatusBadge status="incident" pulse />
 */
export function StatusBadge({
  status,
  label,
  size = "md",
  pulse = false,
  className,
  ...rest
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <StatusChip
      variant={cfg.variant}
      label={label ?? cfg.label}
      icon={pulse ? undefined : cfg.icon}
      pulse={pulse}
      size={size}
      className={cn(className)}
      {...rest}
    />
  )
}

// ─── Helper ────────────────────────────────────────────────────────────────

/**
 * Derive the attendance status from raw data values.
 *
 * @param present  Whether the person was recorded present
 * @param minutesLate  Minutes late (0 = on time, negative = early)
 * @param hasIncident  Whether an anomaly/incident was flagged
 */
export function deriveAttendanceStatus(
  present: boolean,
  minutesLate = 0,
  hasIncident = false,
): AttendanceStatus {
  if (hasIncident) return "incident"
  if (!present) return "missing"
  if (minutesLate > 0) return "late"
  return "compliant"
}
