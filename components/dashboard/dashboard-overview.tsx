import { KPICards } from "@/components/dashboard/kpi-cards"
import { AccessStream } from "@/components/dashboard/access-stream"
import { DeviceHealth } from "@/components/dashboard/device-health"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { PriorityActions } from "@/components/dashboard/priority-actions"
import type {
  AccessEvent,
  DashboardKPIData,
  DashboardSystemStatus,
  Device,
  PriorityAction,
} from "@/components/dashboard/types"

interface DashboardOverviewProps {
  systemStatus: DashboardSystemStatus
  kpiData: DashboardKPIData
  accessEvents: AccessEvent[]
  devices: Device[]
  priorityActions: PriorityAction[]
}

export function DashboardOverview({
  systemStatus,
  kpiData,
  accessEvents,
  devices,
  priorityActions,
}: DashboardOverviewProps) {
  const criticalCount = priorityActions.filter((action) => action.priority === "critical").reduce((acc, action) => acc + (action.count ?? 1), 0)
  const warningCount = priorityActions.filter((action) => action.priority === "warning").reduce((acc, action) => acc + (action.count ?? 1), 0)
  const infoCount = priorityActions.filter((action) => action.priority === "info").reduce((acc, action) => acc + (action.count ?? 1), 0)

  return (
    <main className="app-page space-y-6">
      <div className="animate-fade-up">
        <PageContextBar
          title="Tableau de bord operationnel"
          description="Vue temps reel de la presence, des acces, des appareils et des actions critiques."
          stats={[
            { value: criticalCount, label: "Incidents critiques", tone: "critical", href: "/access-logs" },
            { value: warningCount, label: "Elements a surveiller", tone: "warning", href: "/devices" },
            { value: infoCount, label: "Actions en attente", tone: "neutral", href: "/reports" },
            { value: systemStatus === "connected" ? "OK" : systemStatus === "syncing" ? "Partiel" : "Hors ligne", label: "Etat API", tone: systemStatus === "connected" ? "success" : systemStatus === "syncing" ? "warning" : "critical", href: "/settings?tab=hikcentral" },
          ]}
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <KPICards data={kpiData} systemStatus={systemStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_390px] animate-fade-up" style={{ animationDelay: "160ms" }}>
        <AccessStream events={accessEvents} />
        <DeviceHealth devices={devices} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <PriorityActions actions={priorityActions} />
      </div>
    </main>
  )
}
