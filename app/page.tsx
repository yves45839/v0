import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { fetchDashboardData } from "@/lib/api/dashboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const dashboardData = await fetchDashboardData()

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="app-shell-content">
        <Header
          systemStatus={dashboardData.systemStatus}
          statusDetails={dashboardData.statusDetails}
        />
        <DashboardOverview
          systemStatus={dashboardData.systemStatus}
          kpiData={dashboardData.kpiData}
          accessEvents={dashboardData.accessEvents}
          devices={dashboardData.devices}
          priorityActions={dashboardData.priorityActions}
        />
      </div>
    </div>
  )
}
