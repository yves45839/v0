"use client"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { TimesheetValidation } from "@/components/timesheet/timesheet-validation"

export default function TimesheetPage() {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header />
        <main className="app-page">
          <TimesheetValidation />
        </main>
      </div>
    </div>
  )
}
