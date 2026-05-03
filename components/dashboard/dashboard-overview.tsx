import { KPICards } from "@/components/dashboard/kpi-cards"
import { ManagerHero } from "@/components/dashboard/manager-hero"
import { NeedsAttention } from "@/components/dashboard/needs-attention"
import { PresenceWeek } from "@/components/dashboard/presence-week"
import { UpcomingLeave } from "@/components/dashboard/upcoming-leave"
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
  priorityActions,
}: DashboardOverviewProps) {
  const pendingActionsCount = priorityActions.reduce(
    (acc, action) => acc + (action.count ?? 1),
    0,
  )

  return (
    <main className="app-page space-y-6">
      <div className="animate-fade-up">
        <ManagerHero
          onSiteCount={kpiData.presentToday.count}
          totalCount={kpiData.presentToday.total}
          pendingActions={pendingActionsCount}
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <KPICards data={kpiData} systemStatus={systemStatus} />
      </div>

      <section
        className="animate-fade-up grid gap-4 lg:grid-cols-[1.4fr_1fr]"
        style={{ animationDelay: "160ms" }}
      >
        <NeedsAttention actions={priorityActions} />
        <div className="flex flex-col gap-4">
          <PresenceWeek />
          <UpcomingLeave />
        </div>
      </section>
    </main>
  )
}
