import { apiDelete, apiJson, apiList, withTenant } from "@/lib/api/client"

/**
 * Appels API de la page "Groupes d'accès" (/zones) : groupes d'accès,
 * lecteurs (devices) et plannings, tous scindés par tenant via withTenant.
 * Types locaux volontairement indépendants de lib/api/settings.ts.
 */

export type ZoneTenant = {
  id: number
  name: string
  code: string
}

export type ZonePlanning = {
  id: number
  tenant: number
  name: string
  code: string
  description?: string
  timezone?: string
}

export type ZoneDevice = {
  id: number
  tenant: number | null
  name: string
  dev_index: string
  serial_number: string
  status?: string
}

export type ZoneAccessGroup = {
  id: number
  tenant: number
  planning: number | null
  planning_name?: string
  name: string
  code: string
  description: string
  readers: number[]
  reader_count: number
  employee_count: number
}

export type ZoneAccessGroupPayload = {
  tenant: number
  name: string
  description?: string
  planning?: number | null
  readers?: number[]
}

type MutationOptions = {
  pushNow?: boolean
}

function mutationQuery(path: string, options?: MutationOptions): string {
  return withTenant(path, options?.pushNow !== undefined ? { push_now: options.pushNow } : undefined)
}

export async function fetchAccessGroups(): Promise<ZoneAccessGroup[]> {
  return apiList<ZoneAccessGroup>(withTenant("/api/access-groups/"))
}

export async function createAccessGroup(
  payload: ZoneAccessGroupPayload,
  options?: MutationOptions,
): Promise<ZoneAccessGroup> {
  return apiJson<ZoneAccessGroup>(mutationQuery("/api/access-groups/", options), {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAccessGroup(
  id: number,
  payload: Partial<ZoneAccessGroupPayload>,
  options?: MutationOptions,
): Promise<ZoneAccessGroup> {
  return apiJson<ZoneAccessGroup>(mutationQuery(`/api/access-groups/${id}/`, options), {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteAccessGroup(id: number): Promise<void> {
  await apiDelete(withTenant(`/api/access-groups/${id}/`))
}

export async function fetchDevices(): Promise<ZoneDevice[]> {
  return apiList<ZoneDevice>(withTenant("/api/devices/"))
}

export async function fetchPlannings(): Promise<ZonePlanning[]> {
  return apiList<ZonePlanning>(withTenant("/api/plannings/"))
}

export async function fetchTenants(): Promise<ZoneTenant[]> {
  return apiList<ZoneTenant>("/api/tenants/")
}
