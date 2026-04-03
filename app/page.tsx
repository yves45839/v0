import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { fetchDashboardData } from "@/lib/api/dashboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const dashboardData = await fetchDashboardData()

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="pl-16 lg:pl-64">
        <Header systemStatus={dashboardData.systemStatus} />
        <DashboardOverview
          kpiData={dashboardData.kpiData}
          accessEvents={dashboardData.accessEvents}
          devices={dashboardData.devices}
          priorityActions={dashboardData.priorityActions}
        />
      </div>
    </div>
  )
}
