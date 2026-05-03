"use client"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { AbsencesView } from "@/components/absences/absences-view"

export default function AbsencesPage() {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">
          <AbsencesView />
        </main>
      </div>
    </div>
  )
}
