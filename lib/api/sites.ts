import { apiDelete, apiJson, apiList, withTenant } from "@/lib/api/client"
import { getActiveTenantCode } from "@/lib/api/auth"
import type { TenantItem } from "@/lib/api/settings"

/** Site de pointage mobile (géofence) tel que renvoyé par /api/punch-sites/. */
export type SiteItem = {
  id: number
  tenant: number
  name: string
  address: string
  latitude: string
  longitude: string
  radius_m: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SitePayload = {
  tenant: number
  name: string
  address?: string
  latitude: string
  longitude: string
  radius_m: number
  is_active?: boolean
}

/** Cache tenant code -> tenant id (évite un GET /api/tenants/ à chaque écriture). */
const tenantIdCache = new Map<string, number>()

/**
 * Résout l'id numérique du tenant actif via GET /api/tenants/ (le backend
 * attend `tenant: <id>` sur les écritures). Mis en cache par code de tenant.
 */
export async function resolveTenantId(): Promise<number | null> {
  const code = getActiveTenantCode()
  if (!code) return null
  const cached = tenantIdCache.get(code)
  if (cached !== undefined) return cached
  const tenants = await apiList<TenantItem>("/api/tenants/")
  const match = tenants.find((tenant) => tenant.code === code)
  if (!match) return null
  tenantIdCache.set(code, match.id)
  return match.id
}

export async function fetchSites(): Promise<SiteItem[]> {
  return apiList<SiteItem>(withTenant("/api/punch-sites/"))
}

export async function createSite(payload: SitePayload): Promise<SiteItem> {
  return apiJson<SiteItem>("/api/punch-sites/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateSite(id: number, patch: Partial<SitePayload>): Promise<SiteItem> {
  return apiJson<SiteItem>(`/api/punch-sites/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

export async function deleteSite(id: number): Promise<void> {
  await apiDelete(`/api/punch-sites/${id}/`)
}
