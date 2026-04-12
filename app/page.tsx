"use client"

import { useState, useEffect, useRef } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import type { DashboardPayload, DashboardStatusDetails } from "@/lib/api/dashboard"
import {
  dashboardKpiData,
  accessEvents as mockAccessEvents,
  devices as mockDevices,
  priorityActions as mockPriorityActions,
} from "@/lib/dashboard/mock-data"

const MOCK_STATUS_DETAILS: DashboardStatusDetails = {
  updatedAt: new Date().toISOString(),
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

const INITIAL_DATA: DashboardPayload = {
  systemStatus: "disconnected",
  statusDetails: MOCK_STATUS_DETAILS,
  kpiData: dashboardKpiData,
  accessEvents: mockAccessEvents,
  devices: mockDevices,
  priorityActions: mockPriorityActions,
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload>(INITIAL_DATA)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    let cancelled = false

    async function loadRealData() {
      try {
        const { fetchDashboardData } = await import("@/lib/api/dashboard")
        const result = await fetchDashboardData()
        if (!cancelled) setData(result)
      } catch {
        // API indisponible — on reste sur les donnees de demonstration
      } finally {
        if (!cancelled) setIsRefreshing(false)
      }
    }

    void loadRealData()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header
          systemStatus={isRefreshing ? "syncing" : data.systemStatus}
          statusDetails={data.statusDetails}
        />
        <DashboardOverview
          systemStatus={isRefreshing ? "syncing" : data.systemStatus}
          kpiData={data.kpiData}
          accessEvents={data.accessEvents}
          devices={data.devices}
          priorityActions={data.priorityActions}
        />
      </div>
    </div>
  )
}
