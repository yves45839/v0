"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import type { DashboardPayload, DashboardStatusDetails } from "@/lib/api/dashboard"
import { getAuthUser } from "@/lib/api/auth"
import {
  dashboardKpiData,
  accessEvents as mockAccessEvents,
  devices as mockDevices,
  priorityActions as mockPriorityActions,
} from "@/lib/dashboard/mock-data"
import { useI18n } from "@/lib/i18n/context"
import type { PresenceWeekData } from "@/components/dashboard/types"

const MOCK_STATUS_DETAILS: DashboardStatusDetails = {
  updatedAt: "", // sera défini côté client uniquement (évite hydration mismatch)
  sources: [
    { key: "accessEvents", label: "Flux acces", status: "error", detail: "Mode demonstration — API HikCentral non configuree" },
    { key: "reports", label: "Rapports", status: "error", detail: "Mode demonstration — API HikCentral non configuree" },
    { key: "employees", label: "Employes", status: "error", detail: "Mode demonstration — API HikCentral non configuree" },
    { key: "devices", label: "Appareils", status: "error", detail: "Mode demonstration — API HikCentral non configuree" },
  ],
  webhook: {
    status: "offline",
    label: "Mode demonstration",
    detail: "Configurez HikCentral dans Parametres > HikCentral pour activer les donnees reelles.",
    lastEventAt: null,
  },
}

const EMPTY_PRESENCE_WEEK: PresenceWeekData = {
  days: Array.from({ length: 7 }, () => ({ value: 0, count: 0, covered: false, isFuture: false })),
  averagePct: 0,
  isPartial: true,
  totalEmployees: 0,
}

const INITIAL_DATA: DashboardPayload = {
  systemStatus: "disconnected",
  statusDetails: MOCK_STATUS_DETAILS,
  kpiData: dashboardKpiData,
  accessEvents: mockAccessEvents,
  devices: mockDevices,
  priorityActions: mockPriorityActions,
  presenceWeek: EMPTY_PRESENCE_WEEK,
  upcomingLeaves: [],
}

export default function DashboardPage() {
  const { locale } = useI18n()
  const [data, setData] = useState<DashboardPayload>(INITIAL_DATA)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [managerName, setManagerName] = useState<string | null>(null)

  useEffect(() => {
    const user = getAuthUser()
    if (!user) {
      setManagerName(null)
      return
    }
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
    setManagerName(fullName || user.username || user.email || null)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsRefreshing(true)

    // Définir updatedAt côté client uniquement (évite hydration mismatch)
    setData(prev => ({
      ...prev,
      statusDetails: { ...prev.statusDetails, updatedAt: new Date().toISOString() },
    }))

    async function loadRealData() {
      try {
        const { fetchDashboardData } = await import("@/lib/api/dashboard")
        const result = await fetchDashboardData(locale)
        if (!cancelled) setData(result)
      } catch {
        // API indisponible — on reste sur les donnees de demonstration
      } finally {
        if (!cancelled) setIsRefreshing(false)
      }
    }

    void loadRealData()
    return () => { cancelled = true }
  }, [locale])

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header
          systemStatus={isRefreshing ? "syncing" : data.systemStatus}
          statusDetails={data.statusDetails}
          hideRouteInfo
        />
        <DashboardOverview
          systemStatus={isRefreshing ? "syncing" : data.systemStatus}
          kpiData={data.kpiData}
          accessEvents={data.accessEvents}
          devices={data.devices}
          priorityActions={data.priorityActions}
          presenceWeek={data.presenceWeek}
          upcomingLeaves={data.upcomingLeaves}
          managerName={managerName}
        />
      </div>
    </div>
  )
}
