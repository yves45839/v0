"use client"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { WeeklyPlanningGrid } from "@/components/planning/weekly-grid"

export default function WeeklyPlanningPage() {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">
          <WeeklyPlanningGrid />
        </main>
      </div>
    </div>
  )
}
