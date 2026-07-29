import { apiJson, withTenant } from "@/lib/api/client"

/** Compteurs serveur du tableau de bord (GET /api/home/summary/). */
export type HomeSummaryCounts = {
  employees_total: number
  employees_active: number
  devices_total: number
  devices_online: number
  attendance_logs_today: number
  denied_today: number
}

export type HomeSummary = {
  lang: string
  tenant: string
  generated_at: string
  summary: HomeSummaryCounts
  labels: Record<string, string>
}

/**
 * KPI de tête du dashboard : un seul appel léger, chiffres faisant foi côté
 * serveur. Le scoping tenant (?tenant=<code>) est géré par withTenant.
 */
export async function fetchHomeSummary(lang?: string): Promise<HomeSummary> {
  return apiJson<HomeSummary>(withTenant("/api/home/summary/", { lang }))
}
