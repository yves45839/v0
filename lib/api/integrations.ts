import { API_BASE_URL, apiJson, unwrapList, withTenant } from "@/lib/api/client"

/**
 * API "Intégrations" : vue santé en lecture seule de la passerelle Hik Device
 * Gateway et de la synchronisation. Aucun modèle backend d'intégration/clé API
 * n'existe — tout est dérivé d'endpoints existants (hikgateway, devices, beta).
 */

/** État de la passerelle dérivé de GET /api/hikgateway/devices/. */
export type GatewayHealth = {
  /** true si `errors[]` est vide : la passerelle a répondu correctement. */
  reachable: boolean
  /** Nombre d'appareils vus par la passerelle. */
  deviceCount: number
  /** Messages d'erreur bruts renvoyés par la passerelle (non vide = problème). */
  errors: string[]
}

/** Dernier événement ingéré (GET /api/hikgateway/events/?limit=1). */
export type LastIngestedEvent = {
  /** Timestamp ISO du dernier événement reçu, null si aucun événement ingéré. */
  lastEventAt: string | null
  /** Provenance de l'événement : "realtime" (webhook) ou "catchup" (rattrapage). */
  source: string | null
}

/** Appareil synchronisé en base locale (GET /api/devices/). */
export type SyncedDevice = {
  id: number
  name: string
  serial_number: string
  dev_index: string
  status: string
}

/** Infos publiques de la plateforme (GET /api/beta/info/, sans auth). */
export type BetaInfo = {
  beta_mode: boolean
  billing_enabled: boolean
  stripe_configured: boolean
  signup_open: boolean
  banner_message_fr: string
  banner_message_en: string
}

/** Formatte une entrée de `errors[]` passerelle en texte lisible. */
function formatGatewayError(entry: unknown): string {
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
 * GET /api/hikgateway/devices/ — appel passerelle en direct.
 * `errors[]` vide = passerelle joignable ; non vide = problème de connexion
 * (les messages sont remontés tels quels pour affichage).
 */
export async function fetchGatewayHealth(): Promise<GatewayHealth> {
  const payload = await apiJson<{ count?: number; results?: unknown[]; errors?: unknown[] } | null>(
    withTenant("/api/hikgateway/devices/"),
  )
  const results = Array.isArray(payload?.results) ? payload.results : []
  const errors = Array.isArray(payload?.errors) ? payload.errors.map(formatGatewayError) : []
  return {
    reachable: errors.length === 0,
    deviceCount: typeof payload?.count === "number" ? payload.count : results.length,
    errors,
  }
}

/**
 * GET /api/hikgateway/events/?limit=1 — dernier événement ingéré.
 * Son timestamp sert de signal de vie du webhook passerelle → backend.
 */
export async function fetchLastIngestedEvent(): Promise<LastIngestedEvent> {
  const payload = await apiJson<{ results?: Array<{ timestamp?: unknown; source?: unknown }> } | null>(
    withTenant("/api/hikgateway/events/", { limit: 1 }),
  )
  const latest = Array.isArray(payload?.results) ? payload.results[0] : undefined
  if (!latest) {
    return { lastEventAt: null, source: null }
  }
  const timestamp = typeof latest.timestamp === "string" && latest.timestamp.trim() ? latest.timestamp : null
  const source = typeof latest.source === "string" && latest.source.trim() ? latest.source : null
  return { lastEventAt: timestamp, source }
}

/** GET /api/devices/ — appareils synchronisés en base locale (tenant actif). */
export async function fetchSyncedDevices(): Promise<SyncedDevice[]> {
  const payload = await apiJson<unknown>(withTenant("/api/devices/"))
  return unwrapList<Record<string, unknown>>(payload).map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? "").trim(),
    serial_number: String(row.serial_number ?? "").trim(),
    dev_index: String(row.dev_index ?? "").trim(),
    status: String(row.status ?? "").trim(),
  }))
}

/**
 * Erreur typée levée quand /api/beta/info/ répond en échec : l'appelant
 * (composant) traduit le message via son dictionnaire à partir du `status`.
 */
export class BetaInfoError extends Error {
  status: number

  constructor(status: number) {
    super(`Failed to fetch platform information (${status})`)
    this.name = "BetaInfoError"
    this.status = status
  }
}

/** GET /api/beta/info/ — endpoint public, appelé sans authentification. */
export async function fetchBetaInfo(): Promise<BetaInfo> {
  const response = await fetch(`${API_BASE_URL}/api/beta/info/`, { cache: "no-store" })
  if (!response.ok) {
    throw new BetaInfoError(response.status)
  }
  const payload = (await response.json()) as Partial<BetaInfo>
  return {
    beta_mode: Boolean(payload.beta_mode),
    billing_enabled: Boolean(payload.billing_enabled),
    stripe_configured: Boolean(payload.stripe_configured),
    signup_open: Boolean(payload.signup_open),
    banner_message_fr: String(payload.banner_message_fr ?? ""),
    banner_message_en: String(payload.banner_message_en ?? ""),
  }
}
