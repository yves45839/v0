/**
 * Petit client dédié au bloc "Utilisation" de l'espace facturation.
 * Compteurs réels du tenant actif (employés / appareils) depuis
 * `GET /api/home/summary/`. Un compteur absent vaut `null` — l'UI l'affiche
 * comme indisponible plutôt que 0 (faux zéro).
 */
import { fetchHomeSummary } from "@/lib/api/home"

export type TenantUsageCounts = {
  employees: number | null
  devices: number | null
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/**
 * Compteurs réels d'utilisation du tenant actif.
 * Lève une ApiError si l'endpoint est injoignable.
 */
export async function fetchTenantUsageCounts(): Promise<TenantUsageCounts> {
  const payload = await fetchHomeSummary()
  return {
    employees: asCount(payload.summary?.employees_total),
    devices: asCount(payload.summary?.devices_total),
  }
}
