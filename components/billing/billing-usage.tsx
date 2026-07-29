"use client"

/**
 * Utilisation & Limites — données réelles :
 *   - Limites du plan : GET /api/billing/summary/ (subscription.plan + tenant.device_quota)
 *   - Compteurs réels : GET /api/home/summary/ (via lib/api/billing-usage)
 */
import { useCallback, useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Activity,
  AlertTriangle,
  Check,
  Cpu,
  Loader2,
  Lock,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { fetchBillingSummary, type BillingSummary } from "@/lib/api/billing"
import {
  fetchTenantUsageCounts,
  type TenantUsageCounts,
} from "@/lib/api/billing-usage"
import type { BillingTab } from "./billing-tabs"
import { cn } from "@/lib/utils"

function getPercent(used: number | null, limit: number | null): number {
  if (used === null || limit === null || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function StatusBar({
  label,
  used,
  limit,
  icon: Icon,
  description,
}: {
  label: string
  used: number | null
  limit: number | null
  icon: React.ElementType
  description?: string
}) {
  const unlimited = limit === null || limit <= 0
  const percent = getPercent(used, limit)
  const isCritical = !unlimited && percent >= 95
  const isWarning = !unlimited && percent >= 80

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border p-4 space-y-3 transition-shadow hover:shadow-sm",
        isCritical && "border-destructive/30 bg-destructive/4",
        isWarning && !isCritical && "border-amber-400/30 bg-amber-500/4"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
              isCritical ? "bg-destructive/15" : isWarning ? "bg-amber-500/15" : "bg-primary/10"
            )}
          >
            <Icon className={cn("h-4 w-4", isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "text-primary")} />
          </div>
          <div>
            <p className="font-semibold text-sm">{label}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-lg font-bold tabular-nums", isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "")}>
            <span>{used === null ? "—" : used}</span>
            <span className="text-sm font-normal text-muted-foreground"> / {unlimited ? "∞" : limit}</span>
          </p>
          {!unlimited && used !== null && <p className="text-xs text-muted-foreground">{percent}% utilisé</p>}
        </div>
      </div>

      {!unlimited && used !== null ? (
        <div className="space-y-1.5">
          <Progress
            value={percent}
            className={cn(
              "h-2",
              isCritical ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
            )}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              {used} utilisé{used > 1 ? "s" : ""}
            </span>
            <span>{Math.max(0, limit - used)} disponible{Math.max(0, limit - used) > 1 ? "s" : ""}</span>
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
      ) : unlimited ? (
        <div className="flex items-center gap-1.5 text-xs text-success">
          <Check className="h-3 w-3" />
          Illimité dans ce plan
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          Compteur momentanément indisponible
        </div>
      )}
    </div>
  )
}

interface BillingUsageProps {
  onTabChange: (tab: BillingTab) => void
}

export function BillingUsage({ onTabChange }: BillingUsageProps) {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<TenantUsageCounts | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    Promise.allSettled([fetchBillingSummary(), fetchTenantUsageCounts()]).then(
      ([summaryResult, usageResult]) => {
        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value)
        } else {
          const reason = summaryResult.reason
          setError(reason instanceof Error ? reason.message : String(reason))
        }
        setUsage(usageResult.status === "fulfilled" ? usageResult.value : null)
        setLoading(false)
      }
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de l&apos;utilisation…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <p className="font-semibold">Impossible de charger l&apos;utilisation</p>
          <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    )
  }

  const plan = summary?.subscription?.plan ?? null
  const deviceQuota =
    (summary?.tenant.device_quota ?? 0) > 0
      ? summary!.tenant.device_quota
      : plan && plan.device_quota > 0
        ? plan.device_quota
        : null

  const hasWarning =
    getPercent(usage?.devices ?? null, deviceQuota) >= 80

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
          <span>
            Plan <strong>{plan?.name ?? "Aucun abonnement"}</strong>
          </span>
        </div>
      </div>

      {/* ── Alerte proche des limites ── */}
      {hasWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/8 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Vous approchez de certaines limites
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pensez à passer au plan supérieur pour éviter toute interruption de service.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 border-amber-400/30 text-amber-600 dark:text-amber-400"
            onClick={() => onTabChange("plans")}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Voir les plans
          </Button>
        </div>
      )}

      {/* ── Barres d'utilisation (compteurs réels) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusBar
          label="Employés"
          used={usage?.employees ?? null}
          limit={null}
          icon={Users}
          description="Comptes employés actifs"
        />
        <StatusBar
          label="Appareils"
          used={usage?.devices ?? null}
          limit={deviceQuota}
          icon={Cpu}
          description="Portes et appareils connectés"
        />
      </div>

      {/* ── Quota d'évènements du plan ── */}
      {plan && (
        <div className="overflow-hidden rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Quota d&apos;évènements</h3>
          </div>
          <div className="flex-1 rounded-lg border border-border/50 bg-muted/30 p-3.5">
            <p className="text-xs text-muted-foreground mb-1">Inclus dans le plan {plan.name}</p>
            <p className="text-xl font-bold">
              {plan.event_quota_per_month > 0
                ? `${plan.event_quota_per_month.toLocaleString("fr-FR")} évènements / mois`
                : "Illimité"}
            </p>
            {plan.is_metered && plan.metered_unit_label && (
              <p className="mt-1 text-xs text-muted-foreground">
                Facturation à l&apos;usage : par {plan.metered_unit_label}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Fonctionnalités actives / verrouillées ── */}
      {plan ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-success/25 bg-success/4 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15">
                <Check className="h-3.5 w-3.5 text-success" />
              </div>
              <h3 className="font-semibold text-sm text-success">Fonctionnalités actives</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "Support prioritaire", included: plan.has_priority_support },
                { label: "Analytique avancée", included: plan.has_advanced_analytics },
              ]
                .filter((f) => f.included)
                .map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    <span>{f.label}</span>
                  </div>
                ))}
              {Object.entries(plan.features ?? {})
                .filter(([, v]) => v === true)
                .map(([key]) => (
                  <div key={key} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    <span>{key.replaceAll("_", " ")}</span>
                  </div>
                ))}
              {!plan.has_priority_support &&
                !plan.has_advanced_analytics &&
                Object.values(plan.features ?? {}).every((v) => v !== true) && (
                  <p className="text-sm text-muted-foreground">Fonctionnalités de base incluses.</p>
                )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm text-muted-foreground">Fonctionnalités non incluses</h3>
            </div>
            {plan.has_priority_support && plan.has_advanced_analytics ? (
              <p className="text-sm text-success flex items-center gap-2">
                <Check className="h-4 w-4" />
                Toutes les fonctionnalités sont incluses dans ce plan !
              </p>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Support prioritaire", included: plan.has_priority_support },
                  { label: "Analytique avancée", included: plan.has_advanced_analytics },
                ]
                  .filter((f) => !f.included)
                  .map((f) => (
                    <div key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground/60">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-through">{f.label}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-10 text-center">
          <Zap className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Aucun abonnement actif</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Souscrivez à un plan pour bénéficier de quotas étendus et des fonctionnalités avancées.
          </p>
          <Button className="mt-1 gap-2" onClick={() => onTabChange("plans")}>
            <TrendingUp className="h-4 w-4" />
            Voir les plans
          </Button>
        </div>
      )}
    </div>
  )
}
