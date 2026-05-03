"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

export type EmployeeOperationalStatus =
  | "active"
  | "leave"
  | "remote"
  | "anomaly"
  | "probation"
  | "suspended"

const STATUS_LABEL: Record<EmployeeOperationalStatus, { fr: string; en: string }> = {
  active: { fr: "En service", en: "On shift" },
  leave: { fr: "En congé", en: "On leave" },
  remote: { fr: "Télétravail", en: "Remote" },
  anomaly: { fr: "Anomalie", en: "Anomaly" },
  probation: { fr: "Période d'essai", en: "Probation" },
  suspended: { fr: "Suspendu", en: "Suspended" },
}

const STATUS_CLASS: Record<EmployeeOperationalStatus, string> = {
  active: "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  leave: "border-destructive/30 bg-destructive/8 text-destructive",
  remote: "border-primary/30 bg-primary/10 text-primary",
  anomaly: "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  probation: "border-primary/35 bg-primary/12 text-primary",
  suspended: "border-border/70 bg-secondary text-muted-foreground",
}

interface EmployeeStatusChipProps {
  status: EmployeeOperationalStatus
  className?: string
}

export function EmployeeStatusChip({ status, className }: EmployeeStatusChipProps) {
  const { locale } = useI18n()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        STATUS_CLASS[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status][locale]}
    </span>
  )
}

interface EmployeeLike {
  isActive?: boolean
  validityStart?: string | null
  validityEnd?: string | null
  workShift?: string
}

export function deriveOperationalStatus(
  employee: EmployeeLike,
  options: { suspended?: boolean; onLeave?: boolean; hasAnomaly?: boolean } = {},
): EmployeeOperationalStatus {
  if (options.suspended) return "suspended"
  if (options.onLeave) return "leave"
  if (options.hasAnomaly) return "anomaly"
  if (employee.isActive === false) return "suspended"

  const today = new Date().toISOString().split("T")[0]
  if (employee.validityStart && employee.validityEnd) {
    const startsLater = employee.validityStart > today
    const endsTooSoon =
      employee.validityEnd >= today &&
      new Date(employee.validityEnd).getTime() - new Date(today).getTime() <
        14 * 24 * 3600 * 1000
    if (startsLater) return "probation"
    if (endsTooSoon) return "probation"
  }

  if (
    employee.workShift &&
    /remote|teletravail|télétravail/i.test(employee.workShift)
  ) {
    return "remote"
  }

  return "active"
}
