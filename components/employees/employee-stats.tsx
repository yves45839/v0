"use client"

import { Card } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react"

type EmployeeStatsProps = {
  totalActive: number
  pendingSync: number
  biometricAlerts: number
}

export function EmployeeStats({
  totalActive,
  pendingSync,
  biometricAlerts,
}: EmployeeStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Total Active */}
      <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Badges Actifs</p>
          <p className="text-2xl font-semibold text-foreground">{totalActive}</p>
        </div>
      </Card>

      {/* Pending Sync */}
      <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
          <Clock className="h-6 w-6 text-warning" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">En attente de Synchro</p>
          <p className="text-2xl font-semibold text-foreground">{pendingSync}</p>
        </div>
      </Card>

      {/* Biometric Alerts */}
      <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Alertes Biometriques</p>
          <p className="text-2xl font-semibold text-foreground">{biometricAlerts}</p>
        </div>
      </Card>
    </div>
  )
}
