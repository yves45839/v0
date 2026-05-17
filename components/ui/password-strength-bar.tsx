"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Strength evaluation ───────────────────────────────────────────────────

export type PasswordStrength = 0 | 1 | 2 | 3 | 4

interface StrengthMeta {
  label: string
  /** Tailwind bg-* class applied to filled segments */
  segmentClass: string
  /** Number of segments to fill (out of 4) */
  filled: number
}

const STRENGTH_META: Record<PasswordStrength, StrengthMeta> = {
  0: { label: "",              segmentClass: "",                         filled: 0 },
  1: { label: "Très faible",   segmentClass: "bg-[var(--destructive)]",  filled: 1 },
  2: { label: "Faible",        segmentClass: "bg-[var(--warning)]",      filled: 2 },
  3: { label: "Moyen",         segmentClass: "bg-[var(--info)]",         filled: 3 },
  4: { label: "Fort",          segmentClass: "bg-[var(--success)]",      filled: 4 },
}

/**
 * Score a password from 0 (empty) to 4 (strong).
 *
 * Rules (additive):
 *  +1  length ≥ 8
 *  +1  contains a digit
 *  +1  contains an uppercase + lowercase mix
 *  +1  contains a special character
 */
export function scorePassword(password: string): PasswordStrength {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/\d/.test(password)) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(4, score) as PasswordStrength
}

// ─── Component ─────────────────────────────────────────────────────────────

export interface PasswordStrengthBarProps {
  /** The current password value to evaluate. */
  password: string
  /** Show the strength label below the bar. @default true */
  showLabel?: boolean
  /** Additional class on the root element. */
  className?: string
}

/**
 * Visual password strength indicator with 4 segmented levels.
 *
 * Evaluates the password client-side based on length, digit, case-mix,
 * and special-character criteria. Maps to four color states using the
 * app's semantic design tokens.
 *
 * @example
 *   <PasswordStrengthBar password={password} />
 *   <PasswordStrengthBar password={password} showLabel={false} />
 */
export function PasswordStrengthBar({
  password,
  showLabel = true,
  className,
}: PasswordStrengthBarProps) {
  const strength = scorePassword(password)
  const meta = STRENGTH_META[strength]

  return (
    <div className={cn("flex flex-col gap-1", className)} aria-live="polite">
      {/* Segmented bar */}
      <div className="flex gap-1" role="meter" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={4} aria-label={`Force du mot de passe : ${meta.label || "non évalué"}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              // Empty: subtle background
              i < meta.filled
                ? meta.segmentClass
                : "bg-[rgba(255,255,255,0.08)]",
            )}
          />
        ))}
      </div>

      {/* Label */}
      {showLabel && meta.label ? (
        <p
          className={cn(
            "font-mono text-[10px] transition-colors duration-300",
            strength === 1 && "text-[var(--destructive)]",
            strength === 2 && "text-[var(--warning)]",
            strength === 3 && "text-[var(--info)]",
            strength === 4 && "text-[var(--success)]",
          )}
        >
          {meta.label}
        </p>
      ) : null}
    </div>
  )
}
