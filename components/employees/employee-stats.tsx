"use client"

import { Card } from "@/components/ui/card"
import { CheckCircle2, Users, AlertTriangle } from "lucide-react"

type EmployeeStatsProps = {
  totalActive: number
  totalEmployees: number
  biometricAlerts: number
}

export function EmployeeStats({
  totalActive,
  totalEmployees,
  biometricAlerts,
}: EmployeeStatsProps) {
  const activeRatio = totalEmployees ? Math.round((totalActive / totalEmployees) * 100) : 0
  const biometricCoverage = totalEmployees ? Math.max(0, 100 - Math.round((biometricAlerts / totalEmployees) * 100)) : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <Card className="wow-transition wow-hover group relative overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(14,24,36,0.97),rgba(10,18,29,0.93))] p-5">
        <div className="absolute -right-10 -top-6 h-28 w-28 rounded-full bg-primary/10 blur-[50px] transition-all group-hover:bg-primary/16" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_6px_16px_rgba(78,155,255,0.14)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Badges actifs</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{totalActive}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeRatio}% du parc deja synchronise.</p>
          </div>
        </div>
      </Card>

      <Card className="wow-transition wow-hover group relative overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(10,20,32,0.97),rgba(8,16,28,0.93))] p-5">
        <div className="absolute -left-10 -bottom-6 h-28 w-28 rounded-full bg-blue-500/8 blur-[50px] transition-all group-hover:bg-blue-500/14" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-400 shadow-[0_6px_16px_rgba(52,140,255,0.12)]">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Effectif total</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{totalEmployees}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Base employee consolidee.</p>
          </div>
        </div>
      </Card>

      <Card className="wow-transition wow-hover group relative overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(24,15,16,0.96),rgba(16,11,12,0.92))] p-5 sm:col-span-2 md:col-span-1">
        <div className="absolute -right-10 -bottom-6 h-28 w-28 rounded-full bg-destructive/10 blur-[50px] transition-all group-hover:bg-destructive/16" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive shadow-[0_6px_16px_rgba(227,90,90,0.1)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Alertes biometrie</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{biometricAlerts}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{biometricCoverage}% de couverture complete.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
