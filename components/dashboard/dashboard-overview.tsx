import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
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

type HomeSection = {
  key: "people" | "planning" | "devices" | "reports"
  title: string
  href: string
  variantClass: string
}

export function DashboardOverview({
  systemStatus,
  kpiData,
  accessEvents,
  devices,
  priorityActions,
}: DashboardOverviewProps) {
  const criticalCount = priorityActions.filter((action) => action.priority === "critical").reduce((acc, action) => acc + (action.count ?? 1), 0)
  const warningCount = priorityActions.filter((action) => action.priority === "warning").reduce((acc, action) => acc + (action.count ?? 1), 0)
  const infoCount = priorityActions.filter((action) => action.priority === "info").reduce((acc, action) => acc + (action.count ?? 1), 0)
  const pendingActionsCount = criticalCount + warningCount + infoCount

  const homeSections: HomeSection[] = [
    {
      key: "people",
      title: "Personnes",
      href: "/employees",
      variantClass: "home-3d-card--people",
    },
    {
      key: "planning",
      title: "Plannings",
      href: "/planning",
      variantClass: "home-3d-card--planning",
    },
    {
      key: "devices",
      title: "Appareils",
      href: "/devices",
      variantClass: "home-3d-card--devices",
    },
    {
      key: "reports",
      title: "Rapports",
      href: "/reports",
      variantClass: "home-3d-card--reports",
    },
  ]

  return (
    <main className="app-page space-y-6">
      <div className="animate-fade-up">
        <PageContextBar
          title="Tableau de bord operationnel"
          description="Vue temps reel de la presence, des acces, des appareils et des actions critiques."
          stats={[
            { value: criticalCount, label: "Incidents critiques", tone: "critical", href: "/access-logs" },
            { value: warningCount, label: "Elements a surveiller", tone: "warning", href: "/devices" },
            { value: pendingActionsCount, label: "Actions en attente", tone: "neutral", href: "/reports" },
            { value: systemStatus === "connected" ? "OK" : systemStatus === "syncing" ? "Partiel" : "Hors ligne", label: "Etat API", tone: systemStatus === "connected" ? "success" : systemStatus === "syncing" ? "warning" : "critical", href: "/settings?tab=hikcentral" },
          ]}
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <KPICards data={kpiData} systemStatus={systemStatus} />
      </div>

      <section className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {homeSections.map((section, index) => (
            <Link
              key={section.key}
              href={section.href}
              className={`group animate-fade-up rounded-xl border bg-card/85 px-3 py-2.5 text-foreground shadow-[0_8px_20px_rgba(0,0,0,0.10)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(0,0,0,0.14)] ${section.variantClass}`}
              style={{ animationDelay: `${220 + index * 70}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{section.title}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
