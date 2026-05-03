"use client"

import { Button } from "@/components/ui/button"
import { Download, Plus } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface ManagerHeroProps {
  managerName?: string
  onSiteCount: number
  totalCount: number
  pendingActions: number
  onQuickAction?: () => void
  onExport?: () => void
}

export function ManagerHero({
  managerName = "Jamila",
  onSiteCount,
  totalCount,
  pendingActions,
  onQuickAction,
  onExport,
}: ManagerHeroProps) {
  const { locale } = useI18n()

  const title =
    locale === "en"
      ? `Welcome, ${managerName} 👋`
      : `Bienvenue, ${managerName} 👋`

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
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "Export" : "Exporter"}
          </Button>
          <Button size="sm" className="h-9" onClick={onQuickAction}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "Quick action" : "Action rapide"}
          </Button>
        </div>
      </div>
    </section>
  )
}
