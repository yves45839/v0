"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Users, UserX, Clock, Cpu, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { DashboardKPIData, DashboardSystemStatus } from "@/components/dashboard/types"

interface KPICardsProps {
  data: DashboardKPIData
  systemStatus: DashboardSystemStatus
}

function ProgressRing({
  value,
  total,
  size = 48,
  strokeWidth = 4,
  className,
}: {
  value: number
  total: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          className="text-secondary/80"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-primary transition-all duration-700 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-foreground">{Math.round(percentage)}%</span>
      </div>
    </div>
  )
}

type KpiCard = {
  key: "present" | "absences" | "late" | "devices"
  title: string
  value: number
  subtitle: string
  icon: typeof Users
  showProgress?: boolean
  progressValue?: number
  progressTotal?: number
  trend: string
  trendUp: boolean
  href: string
  detailDescription: string
}

export function KPICards({ data, systemStatus }: KPICardsProps) {
  const [selectedCardKey, setSelectedCardKey] = useState<KpiCard["key"] | null>(null)

  const cards = [
    {
      key: "present" as const,
      title: "Presents aujourd'hui",
      value: data.presentToday.count,
      subtitle: `${data.presentToday.total} employes attendus`,
      icon: Users,
      showProgress: true,
      progressValue: data.presentToday.count,
      progressTotal: data.presentToday.total,
      trend: "Tendance stable",
      trendUp: true,
      href: "/employees?focus=present-today",
      detailDescription:
        "Suivi en temps reel des presences du jour. Ouvrez la vue Employes pour filtrer et traiter les absences potentielles.",
    },
    {
      key: "absences" as const,
      title: "Absences",
      value: data.totalAbsences,
      subtitle: "Sur la periode en cours",
      icon: UserX,
      iconColor: "text-destructive",
      trend: "Controle requis",
      trendUp: false,
      href: "/reports?focus=absences",
      detailDescription:
        "Ce compteur regroupe les absences detectees sur la periode courante. La vue Rapports permet d'analyser les details par employe.",
    },
    {
      key: "late" as const,
      title: "Retards",
      value: data.lateArrivals,
      subtitle: "Detectes aujourd'hui",
      icon: Clock,
      iconColor: "text-warning",
      trend: "A corriger",
      trendUp: false,
      href: "/reports?focus=late-arrivals",
      detailDescription:
        "Indique les retards detectes aujourd'hui. Ouvrez Rapports pour identifier les cas critiques et lancer les corrections.",
    },
    {
      key: "devices" as const,
      title: "Appareils actifs",
      value: data.activeDevices.count,
      subtitle: `${data.activeDevices.total} appareils au total`,
      icon: Cpu,
      showProgress: true,
      progressValue: data.activeDevices.count,
      progressTotal: data.activeDevices.total,
      trend: "Surveillance continue",
      trendUp: true,
      href: "/devices?status=online",
      detailDescription:
        "Disponibilite de l'infrastructure d'acces. La vue Appareils permet de diagnostiquer les terminaux hors ligne et instables.",
    },
  ] satisfies KpiCard[]

  const selectedCard = useMemo(
    () => cards.find((card) => card.key === selectedCardKey) ?? null,
    [cards, selectedCardKey]
  )

  const hasFallbackData = systemStatus !== "connected"

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
        {cards.map((card) => {
          const isFallbackValue = hasFallbackData && card.value === 0
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setSelectedCardKey(card.key)}
              className="group/kpi rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full border-border/70 bg-card/90 wow-transition wow-hover cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <card.icon
                      className={cn(
                        "h-4 w-4 transition-colors group-hover/kpi:text-primary",
                        card.iconColor || "text-muted-foreground"
                      )}
                    />
                    <ArrowUpRight className="h-3 w-3 text-transparent transition-all group-hover/kpi:text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold tracking-tight text-card-foreground">{card.value}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
                      <div
                        className={cn(
                          "mt-2 text-xs font-semibold",
                          card.trendUp ? "text-primary" : "text-destructive"
                        )}
                      >
                        {card.trend}
                      </div>
                      {isFallbackValue ? (
                        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">Donnees partielles: source API indisponible.</p>
                      ) : null}
                    </div>
                    {card.showProgress && card.progressValue !== undefined && card.progressTotal !== undefined && (
                      <ProgressRing
                        value={card.progressValue}
                        total={card.progressTotal}
                        size={56}
                        strokeWidth={5}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <Dialog open={selectedCard !== null} onOpenChange={(open) => !open && setSelectedCardKey(null)}>
        <DialogContent className="sm:max-w-md border-border/70 bg-card/95">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedCard?.title ?? "Detail KPI"}</DialogTitle>
            <DialogDescription>
              {selectedCard?.detailDescription ?? "Analyse detaillee du KPI selectionne."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/70 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Valeur actuelle</p>
            <p className="mt-1 text-3xl font-bold text-foreground tabular-nums">{selectedCard?.value ?? 0}</p>
            {hasFallbackData ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Certaines sources sont degradees. Les valeurs peuvent etre incompletes.
              </p>
            ) : null}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setSelectedCardKey(null)}>
              Fermer
            </Button>
            <Button asChild>
              <Link href={selectedCard?.href ?? "/"}>Ouvrir la vue detaillee</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
