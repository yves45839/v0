"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { fetchDashboardData, type DashboardPayload } from "@/lib/api/dashboard"
import { fetchHomeSummary, type HomeSummaryCounts } from "@/lib/api/home"
import { ApiError } from "@/lib/api/client"
import { getAuthUser } from "@/lib/api/auth"
import { useI18n } from "@/lib/i18n/context"
import type { AsyncSection, DashboardSystemStatus } from "@/components/dashboard/types"

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message.trim()) return error.message
  return "Impossible de contacter le serveur."
}

export default function DashboardPage() {
  const { locale } = useI18n()
  const [summaryState, setSummaryState] = useState<AsyncSection<HomeSummaryCounts>>({ status: "loading" })
  const [widgetsState, setWidgetsState] = useState<AsyncSection<DashboardPayload>>({ status: "loading" })
  const [summaryAttempt, setSummaryAttempt] = useState(0)
  const [widgetsAttempt, setWidgetsAttempt] = useState(0)
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

  // KPI de tête : /api/home/summary/ (chiffres serveur, appel léger).
  useEffect(() => {
    let cancelled = false
    setSummaryState({ status: "loading" })
    fetchHomeSummary(locale)
      .then((result) => {
        if (!cancelled) setSummaryState({ status: "ready", data: result.summary })
      })
      .catch((error: unknown) => {
        if (!cancelled) setSummaryState({ status: "error", message: toErrorMessage(error) })
      })
    return () => {
      cancelled = true
    }
  }, [locale, summaryAttempt])

  // Widgets détaillés : agrégation client (flux accès, appareils, présence, congés).
  // Chargé en parallèle du résumé, avec sa propre gestion d'erreur.
  useEffect(() => {
    let cancelled = false
    setWidgetsState({ status: "loading" })
    fetchDashboardData(locale)
      .then((result) => {
        if (!cancelled) setWidgetsState({ status: "ready", data: result })
      })
      .catch((error: unknown) => {
        if (!cancelled) setWidgetsState({ status: "error", message: toErrorMessage(error) })
      })
    return () => {
      cancelled = true
    }
  }, [locale, widgetsAttempt])

  const systemStatus: DashboardSystemStatus =
    summaryState.status === "loading" || widgetsState.status === "loading"
      ? "syncing"
      : summaryState.status === "error" || widgetsState.status === "error"
        ? "disconnected"
        : widgetsState.data.systemStatus

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header
          systemStatus={systemStatus}
          statusDetails={widgetsState.status === "ready" ? widgetsState.data.statusDetails : undefined}
          hideRouteInfo
        />
        <DashboardOverview
          systemStatus={systemStatus}
          summary={summaryState}
          widgets={widgetsState}
          managerName={managerName}
          onRetrySummary={() => setSummaryAttempt((attempt) => attempt + 1)}
          onRetryWidgets={() => setWidgetsAttempt((attempt) => attempt + 1)}
        />
      </div>
    </div>
  )
}
