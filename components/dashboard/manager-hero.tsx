"use client"

import { Button } from "@/components/ui/button"
import { InfoTooltip } from "@/components/dashboard/info-tooltip"
import { Download, Plus } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface ManagerHeroProps {
  managerName: string | null
  onSiteCount: number
  totalCount: number
  pendingActions: number
  onQuickAction?: () => void
  onExport?: () => void
}

export function ManagerHero({
  managerName,
  onSiteCount,
  totalCount,
  pendingActions,
  onQuickAction,
  onExport,
}: ManagerHeroProps) {
  const { locale } = useI18n()

  const greeting = locale === "en" ? "Welcome" : "Bienvenue"
  const title = managerName
    ? `${greeting}, ${managerName} 👋`
    : `${greeting} 👋`

  const subtitle =
    locale === "en"
      ? `${onSiteCount} people on shift today out of ${totalCount}. ${pendingActions} actions need your attention.`
      : `${onSiteCount} personnes en service aujourd'hui sur ${totalCount}. ${pendingActions} actions vous attendent.`

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/70 px-6 py-5 md:px-7 md:py-6"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--primary) 12%, var(--card)) 0%, color-mix(in oklab, var(--primary) 6%, var(--card)) 60%, var(--card) 100%)",
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1
            className="m-0 text-xl font-semibold tracking-tight text-foreground md:text-[22px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            {subtitle}
            <InfoTooltip
              side="bottom"
              content={
                locale === "en"
                  ? "Priority actions automatically detected: timesheet anomalies, pending leave requests, uncovered shifts."
                  : "Actions prioritaires détectées automatiquement : anomalies de pointage, congés en attente, quarts non couverts."
              }
            />
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-9" onClick={onExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {locale === "en" ? "Export" : "Exporter"}
            </Button>
            <InfoTooltip
              side="bottom"
              content={
                locale === "en"
                  ? "Downloads a CSV summary of the dashboard key indicators for the current day."
                  : "Télécharge un résumé CSV des indicateurs clés du tableau de bord pour la journée en cours."
              }
            />
          </span>
          <span className="inline-flex items-center gap-1">
            <Button size="sm" className="h-9" onClick={onQuickAction}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {locale === "en" ? "Quick action" : "Action rapide"}
            </Button>
            <InfoTooltip
              side="bottom"
              content={
                locale === "en"
                  ? "Create an employee, assign a badge or trigger a device synchronisation."
                  : "Créez un employé, assignez un badge ou lancez une synchronisation des appareils."
              }
            />
          </span>
        </div>
      </div>
    </section>
  )
}
