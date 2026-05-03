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
      <Card className="border-border/70 bg-card/90 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Badges actifs</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{totalActive}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeRatio}% du parc deja synchronise.</p>
          </div>
        </div>
      </Card>

      <Card className="border-border/70 bg-card/90 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Effectif total</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{totalEmployees}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Base employee consolidee.</p>
          </div>
        </div>
      </Card>

      <Card className="border-border/70 bg-card/90 p-5 sm:col-span-2 md:col-span-1">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
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
