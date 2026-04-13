"use client"

import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  Cpu,
  Globe,
  Lock,
  TrendingUp,
  UserCog,
  Users,
  X,
  Zap,
} from "lucide-react"
import { PLANS, currentSubscription, currentUsage } from "@/lib/mock-data/demo-billing"
import type { BillingTab } from "./billing-tabs"
import { cn } from "@/lib/utils"

function getPercent(used: number, limit: number | "illimite") {
  if (limit === "illimite") return 0
  return Math.min(100, Math.round((used / (limit as number)) * 100))
}

function StatusBar({
  label,
  used,
  limit,
  icon: Icon,
  description,
}: {
  label: string
  used: number
  limit: number | "illimite"
  icon: React.ElementType
  description?: string
}) {
  const percent = getPercent(used, limit)
  const isCritical = percent >= 95
  const isWarning = percent >= 80
  const isUnlimited = limit === "illimite"

  return (
    <div className={cn(
      "overflow-hidden rounded-xl border p-4 space-y-3 transition-shadow hover:shadow-sm",
      isCritical && "border-destructive/30 bg-destructive/4",
      isWarning && !isCritical && "border-amber-400/30 bg-amber-500/4",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
            isCritical ? "bg-destructive/15" : isWarning ? "bg-amber-500/15" : "bg-primary/10"
          )}>
            <Icon className={cn("h-4 w-4", isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "text-primary")} />
          </div>
          <div>
            <p className="font-semibold text-sm">{label}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-lg font-bold tabular-nums", isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "")}>
            <span>{used}</span>
            <span className="text-sm font-normal text-muted-foreground"> / {isUnlimited ? "∞" : limit}</span>
          </p>
          {!isUnlimited && <p className="text-xs text-muted-foreground">{percent}% utilisé</p>}
        </div>
      </div>

      {!isUnlimited ? (
        <div className="space-y-1.5">
          <Progress
            value={percent}
            className={cn(
              "h-2",
              isCritical ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
            )}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{used} utilisé{used > 1 ? "s" : ""}</span>
            <span>{(limit as number) - used} disponible</span>
          </div>
          {isCritical && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Limite presque atteinte — passez au plan supérieur
            </div>
          )}
          {isWarning && !isCritical && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Vous approchez de la limite du plan
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-success">
          <Check className="h-3 w-3" />
          Illimité dans ce plan
        </div>
      )}
    </div>
  )
}

interface BillingUsageProps {
  onTabChange: (tab: BillingTab) => void
}

export function BillingUsage({ onTabChange }: BillingUsageProps) {
  const plan = PLANS.find((p) => p.id === currentSubscription.planId)!
  const nextPlanIdx = PLANS.findIndex((p) => p.id === currentSubscription.planId) + 1
  const nextPlan = nextPlanIdx < PLANS.length ? PLANS[nextPlanIdx] : null

  const hasWarning =
    getPercent(currentUsage.employees.used, currentUsage.employees.limit) >= 80 ||
    getPercent(currentUsage.devices.used, currentUsage.devices.limit) >= 80 ||
    getPercent(currentUsage.sites.used, currentUsage.sites.limit) >= 80

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Utilisation & Limites</h2>
          <p className="text-sm text-muted-foreground">Suivez votre consommation en temps réel.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2 text-sm shrink-0">
          <Zap className="h-4 w-4 text-primary" />
          <span>Plan <strong>{plan.name}</strong></span>
        </div>
      </div>

      {/* ── Alerte si proche des limites ── */}
      {hasWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/8 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Vous approchez de certaines limites</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pensez à passer au plan supérieur pour éviter toute interruption de service.
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-amber-400/30 text-amber-600 dark:text-amber-400" onClick={() => onTabChange("plans")}>
            <TrendingUp className="h-3.5 w-3.5" />
            Voir les plans
          </Button>
        </div>
      )}

      {/* ── Barres d'utilisation ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusBar
          label="Employés"
          used={currentUsage.employees.used}
          limit={currentUsage.employees.limit}
          icon={Users}
          description="Comptes employés actifs"
        />
        <StatusBar
          label="Appareils"
          used={currentUsage.devices.used}
          limit={currentUsage.devices.limit}
          icon={Cpu}
          description="Portes et appareils connectés"
        />
        <StatusBar
          label="Sites"
          used={currentUsage.sites.used}
          limit={currentUsage.sites.limit}
          icon={Globe}
          description="Sites de déploiement"
        />
        <StatusBar
          label="Administrateurs"
          used={currentUsage.admins.used}
          limit={currentUsage.admins.limit}
          icon={UserCog}
          description="Comptes administrateurs"
        />
      </div>

      {/* ── Historique dispo ── */}
      <div className="overflow-hidden rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Historique des accès</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg border border-border/50 bg-muted/30 p-3.5">
            <p className="text-xs text-muted-foreground mb-1">Disponible dans ce plan</p>
            <p className="text-xl font-bold">
              {currentUsage.historyDays === "illimite" ? "Illimité" : `${currentUsage.historyDays} jours`}
            </p>
          </div>
          {nextPlan && typeof currentUsage.historyDays === "number" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-success" />
              <span className="text-success font-medium">
                Plan {nextPlan.name} : {nextPlan.limits.historyDays === "illimite" ? "Illimité" : `${nextPlan.limits.historyDays} jours`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Fonctionnalités actives / verrouillées ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Actives */}
        <div className="rounded-xl border border-success/25 bg-success/4 p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15">
              <Check className="h-3.5 w-3.5 text-success" />
            </div>
            <h3 className="font-semibold text-sm text-success">Fonctionnalités actives</h3>
          </div>
          <div className="space-y-2">
            {plan.features.filter((f) => f.included).map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 text-sm">
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verrouillées */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm text-muted-foreground">Fonctionnalités non incluses</h3>
          </div>
          {plan.features.filter((f) => !f.included).length === 0 ? (
            <p className="text-sm text-success flex items-center gap-2">
              <Check className="h-4 w-4" />
              Toutes les fonctionnalités sont incluses dans ce plan !
            </p>
          ) : (
            <div className="space-y-2">
              {plan.features.filter((f) => !f.included).map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground/60">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-through">{f.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recommandation upgrade ── */}
      {nextPlan && (
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5",
          nextPlan.id === "enterprise"
            ? "border-amber-400/30 bg-linear-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20"
            : "border-violet-400/30 bg-linear-to-br from-violet-50/60 to-purple-50/40 dark:from-violet-950/30 dark:to-purple-950/20"
        )}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Recommandation</p>
              <h3 className="font-bold">Passez au plan <span className={nextPlan.id === "enterprise" ? "text-amber-500" : "text-violet-500"}>{nextPlan.name}</span></h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Débloquez des capacités supplémentaires : {nextPlan.limits.employees === "illimite" ? "employés illimités" : `jusqu'à ${nextPlan.limits.employees} employés`}, {nextPlan.limits.devices === "illimite" ? "appareils illimités" : `${nextPlan.limits.devices} appareils`}, et plus encore.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {nextPlan.features.filter((f) => f.included && !plan.features.find((pf) => pf.label === f.label)?.included).slice(0, 3).map((f) => (
                  <span key={f.label} className="flex items-center gap-1 rounded-full border bg-background/60 px-2.5 py-0.5 text-[11px]">
                    <Check className="h-3 w-3 text-success" />
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
            <Button
              className={cn(
                "shrink-0 gap-2 shadow-md",
                nextPlan.id === "enterprise"
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25"
                  : "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25"
              )}
              onClick={() => onTabChange("plans")}
            >
              <TrendingUp className="h-4 w-4" />
              Passer au plan {nextPlan.name}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
