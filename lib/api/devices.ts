import { apiDelete, apiFetch, apiJson, apiList, toApiError, withTenant } from "@/lib/api/client"

/**
 * Appareil "coeur" (table Django `devices`), source de vérité locale.
 * GET /api/devices/ renvoie un tableau nu (ou {count, results}).
 */
export type CoreDevice = {
  id: number
  name?: string
  dev_index?: string
  serial_number?: string
  [key: string]: unknown
}

/**
 * Appareil renvoyé par la passerelle Hikvision (GET /api/hikgateway/devices/).
 * Le format varie selon `normalized=1` : on garde un accès défensif par clé.
 */
export type GatewayDevice = Record<string, unknown>

export type GatewayDevicesResponse = {
  count: number
  results: GatewayDevice[]
  /** Non vide = la passerelle est injoignable ou a répondu partiellement. */
  errors: unknown[]
}

export type Tenant = {
  id: number
  code: string
  name: string
}

export type OnboardDevicePayload = {
  tenant_code: string
  sn: string
  ehome_key: string
  dev_name: string
  dev_type: string
  device_username: string
  device_password: string
}

export type OnboardDeviceResult = {
  /** 201 = créé, 200 = déjà onboardé sur ce tenant, 409 = SN affecté à un autre tenant. */
  status: 200 | 201 | 409
  created: boolean
  alreadyOnboarded: boolean
  conflict: boolean
  payload: unknown
}

export type RebootDeviceResponse = {
  status?: string
  detail?: string
  dev_index?: string
  gateway_response?: unknown
}

/** Formatte une entrée de `errors[]` passerelle en texte lisible. */
export function formatGatewayError(entry: unknown): string {
  if (typeof entry === "string") return entry
  if (entry && typeof entry === "object") {
    const record = entry as Record<string, unknown>
    const detail = record.detail ?? record.message ?? record.error
    if (typeof detail === "string" && detail.trim()) return detail.trim()
    try {
      return JSON.stringify(entry)
    } catch {
      return String(entry)
    }
  }
  return String(entry)
}

/**
 * GET /api/devices/ — inventaire local (scopé sur le tenant actif par défaut,
 * ou sur `tenantCode` s'il est fourni).
 */
export async function fetchDevices(tenantCode?: string): Promise<CoreDevice[]> {
  return apiList<CoreDevice>(withTenant("/api/devices/", tenantCode ? { tenant: tenantCode } : undefined))
}

/**
 * GET /api/hikgateway/devices/ — appel passerelle en direct.
 * `errors` non vide signifie que la passerelle est injoignable (ou en erreur
 * partielle) : à l'appelant de décider si `results` reste exploitable.
 */
export async function fetchGatewayDevices(params?: {
  tenant?: string
  normalized?: boolean
  maxResult?: number
}): Promise<GatewayDevicesResponse> {
  const payload = await apiJson<Partial<GatewayDevicesResponse> | null>(
    withTenant("/api/hikgateway/devices/", {
      tenant: params?.tenant,
      normalized: params?.normalized ? 1 : undefined,
      max_result: params?.maxResult,
    }),
  )
  const results = Array.isArray(payload?.results) ? payload.results : []
  const errors = Array.isArray(payload?.errors) ? payload.errors : []
  return {
    count: typeof payload?.count === "number" ? payload.count : results.length,
    results,
    errors,
  }
}

/**
 * POST /api/devices/onboard/ — enregistre un appareil sur un tenant.
 * 201/200/409 sont des issues applicatives (voir OnboardDeviceResult) ;
 * tout autre statut (502 passerelle incluse) lève une ApiError.
 */
export async function onboardDevice(payload: OnboardDevicePayload): Promise<OnboardDeviceResult> {
  const response = await apiFetch("/api/devices/onboard/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  if (![200, 201, 409].includes(response.status)) {
    throw await toApiError(response)
  }
  const data: unknown = await response.json().catch(() => null)
  const status = response.status as 200 | 201 | 409
  return {
    status,
    created: status === 201,
    alreadyOnboarded: status === 200,
    conflict: status === 409,
    payload: data,
  }
}

/** POST /api/devices/{id}/reboot/ — redémarrage (202 accepté). */
export async function rebootDevice(id: number): Promise<RebootDeviceResponse> {
  return apiJson<RebootDeviceResponse>(`/api/devices/${id}/reboot/`, { method: "POST" })
}

/** PATCH /api/devices/{id}/ — mise à jour partielle (ex: {name}). */
export async function updateDevice(id: number, patch: Record<string, unknown>): Promise<CoreDevice> {
  return apiJson<CoreDevice>(`/api/devices/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

/**
 * DELETE /api/devices/{id}/ — `gateway: true` (défaut) supprime aussi
 * l'appareil côté passerelle Hikvision (?gateway=1).
 */
export async function deleteDevice(id: number, options?: { gateway?: boolean }): Promise<void> {
  const gateway = options?.gateway ?? true
  return apiDelete(`/api/devices/${id}/${gateway ? "?gateway=1" : ""}`)
}

/**
 * POST /api/hikgateway/sync-devices/ — resynchronise l'inventaire passerelle.
 *
 * RÉSERVÉ AUX ADMINISTRATEURS DE LA PLATEFORME : le backend renvoie 403
 * (ApiError.status === 403) pour un utilisateur normal. Les appelants UI
 * doivent intercepter ce cas et afficher un message adapté plutôt qu'une
 * erreur générique.
 */
export async function syncDevices(options?: { dispatchCoreDevices?: boolean }): Promise<unknown> {
  return apiJson<unknown>("/api/hikgateway/sync-devices/", {
    method: "POST",
    body: JSON.stringify({ dispatch_core_devices: options?.dispatchCoreDevices ?? true }),
  })
}

/** GET /api/tenants/ — tenants auxquels l'utilisateur appartient. */
export async function fetchTenants(): Promise<Tenant[]> {
  const rows = await apiList<Record<string, unknown>>("/api/tenants/")
  return rows
    .map((item) => ({
      id: Number(item.id),
      code: String(item.code ?? "").trim(),
      name: String(item.name ?? "").trim(),
    }))
    .filter((item) => Number.isFinite(item.id) && item.code.length > 0)
}
