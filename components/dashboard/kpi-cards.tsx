"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserX, Clock, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardKPIData } from "@/components/dashboard/types"

interface KPICardsProps {
  data: DashboardKPIData
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
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle
          className="text-secondary"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-primary transition-all duration-500 ease-out"
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

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: "Presents aujourd'hui",
      value: data.presentToday.count,
      subtitle: `${data.presentToday.total} employes attendus`,
      icon: Users,
      showProgress: true,
      progressValue: data.presentToday.count,
      progressTotal: data.presentToday.total,
      trend: "Tendance stable",
      trendUp: true,
    },
    {
      title: "Absences",
      value: data.totalAbsences,
      subtitle: "Sur la periode en cours",
      icon: UserX,
      iconColor: "text-destructive",
      trend: "Controle requis",
      trendUp: false,
    },
    {
      title: "Retards",
      value: data.lateArrivals,
      subtitle: "Detectes aujourd'hui",
      icon: Clock,
      iconColor: "text-warning",
      trend: "A corriger",
      trendUp: false,
    },
    {
      title: "Appareils actifs",
      value: data.activeDevices.count,
      subtitle: `${data.activeDevices.total} appareils au total`,
      icon: Cpu,
      showProgress: true,
      progressValue: data.activeDevices.count,
      progressTotal: data.activeDevices.total,
      trend: "Surveillance continue",
      trendUp: true,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="group border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon
              className={cn(
                "h-4 w-4 transition-colors group-hover:text-primary",
                card.iconColor || "text-muted-foreground"
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-card-foreground">{card.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
                <div
                  className={cn(
                    "mt-2 text-xs font-medium",
                    card.trendUp ? "text-primary" : "text-destructive"
                  )}
                >
                  {card.trend}
                </div>
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
      ))}
    </div>
  )
}
