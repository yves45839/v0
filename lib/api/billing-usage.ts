/**
 * Petit client dédié au bloc "Utilisation" de l'espace facturation.
 *
 * Récupère les compteurs réels du tenant (employés / appareils) depuis
 * `GET /api/home/summary/?tenant=...`. Fichier séparé de `lib/api/home.ts`
 * pour éviter les conflits pendant que ce module est créé en parallèle.
 *
 * Le parsing est volontairement tolérant : le backend peut exposer les
 * compteurs sous plusieurs formes ({employees_count}, {employees: {...}},
 * {counts: {...}}, listes…). Un compteur introuvable vaut `null` — l'UI
 * l'affiche alors comme indisponible plutôt que 0 (faux zéro).
 */
import { apiJson, withTenant } from "@/lib/api/client"

export type TenantUsageCounts = {
  employees: number | null
  devices: number | null
}

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = parseInt(value, 10)
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(value)) return value.length
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of ["count", "total", "used", "active"]) {
      const nested = asCount(record[key])
      if (nested !== null) return nested
    }
  }
  return null
}

function pickCount(payload: unknown, keys: string[]): number | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  for (const key of keys) {
    if (key in record) {
      const found = asCount(record[key])
      if (found !== null) return found
    }
  }
  // Conteneurs imbriqués courants : {summary: {...}}, {counts: {...}}, {data: {...}}
  for (const container of ["summary", "counts", "data", "stats", "totals"]) {
    const nested = record[container]
    if (nested && typeof nested === "object") {
      const found = pickCount(nested, keys)
      if (found !== null) return found
    }
  }
  return null
}

const EMPLOYEE_KEYS = [
  "employees_count",
  "employee_count",
  "total_employees",
  "active_employees",
  "employees",
]

const DEVICE_KEYS = [
  "devices_count",
  "device_count",
  "total_devices",
  "active_devices",
  "devices",
]

/**
 * Compteurs réels d'utilisation du tenant actif.
 * Lève une ApiError si l'endpoint est injoignable.
 */
export async function fetchTenantUsageCounts(): Promise<TenantUsageCounts> {
  const payload = await apiJson<unknown>(withTenant("/api/home/summary/"))
  return {
    employees: pickCount(payload, EMPLOYEE_KEYS),
    devices: pickCount(payload, DEVICE_KEYS),
  }
}
