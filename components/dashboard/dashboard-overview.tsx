import { KPICards } from "@/components/dashboard/kpi-cards"
import { AccessStream } from "@/components/dashboard/access-stream"
import { DeviceHealth } from "@/components/dashboard/device-health"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { PriorityActions } from "@/components/dashboard/priority-actions"
import type {
  AccessEvent,
  DashboardKPIData,
  Device,
  PriorityAction,
} from "@/components/dashboard/types"

interface DashboardOverviewProps {
  kpiData: DashboardKPIData
  accessEvents: AccessEvent[]
  devices: Device[]
  priorityActions: PriorityAction[]
}

export function DashboardOverview({
  kpiData,
  accessEvents,
  devices,
  priorityActions,
}: DashboardOverviewProps) {
  const criticalCount = priorityActions.filter((action) => action.priority === "critical").reduce((acc, action) => acc + (action.count ?? 1), 0)
  const warningCount = priorityActions.filter((action) => action.priority === "warning").reduce((acc, action) => acc + (action.count ?? 1), 0)
  const infoCount = priorityActions.filter((action) => action.priority === "info").reduce((acc, action) => acc + (action.count ?? 1), 0)

  return (
    <main className="p-6">
      <PageContextBar
        title="Tableau de bord operationnel"
        description="Vue temps reel de la presence, des acces, des appareils et des actions critiques."
        stats={[
          { value: criticalCount, label: "Incidents critiques", tone: "critical" },
          { value: warningCount, label: "Elements a surveiller", tone: "warning" },
          { value: infoCount, label: "Actions en attente", tone: "neutral" },
        ]}
      />

      <div className="mb-6">
        <KPICards data={kpiData} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <AccessStream events={accessEvents} />
        <DeviceHealth devices={devices} />
      </div>

      <div className="mt-6">
        <PriorityActions actions={priorityActions} />
      </div>
    </main>
  )
}
