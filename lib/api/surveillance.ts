import { apiJson, apiList, withTenant } from "@/lib/api/client"

// Flux d'événements temps réel : on réutilise le client existant (curseur
// since_id) plutôt que de dupliquer l'appel /api/hikgateway/events/.
export { fetchHikEvents } from "@/lib/api/access-logs"
export type { HikEvent, HikEventsResponse } from "@/lib/api/access-logs"

/**
 * Appareil "coeur" (table Django `devices`) — source de vérité locale,
 * disponible même quand la passerelle Hikvision est injoignable.
 * GET /api/devices/?tenant=<code>
 */
export type SurveillanceCoreDevice = {
  id: number
  name?: string
  dev_index?: string
  serial_number?: string
  /** "online" côté backend = appareil joignable ; toute autre valeur = hors ligne. */
  status?: string
  model?: string
  ip_address?: string
  [key: string]: unknown
}

/**
 * Appareil renvoyé en direct par la passerelle Hikvision
 * (GET /api/hikgateway/devices/?normalized=1). Accès défensif par clé :
 * le format normalisé peut varier selon la version de la passerelle.
 */
export type SurveillanceGatewayDevice = {
  dev_index?: string
  serial_number?: string
  name?: string
  device_name?: string
  status?: string
  model?: string
  ip_address?: string
  [key: string]: unknown
}

export type GatewayDevicesResult = {
  count: number
  results: SurveillanceGatewayDevice[]
  /**
   * Non vide = passerelle injoignable ou réponse partielle.
   * État de premier ordre (pas une exception) : l'UI doit basculer en mode
   * dégradé (bannière + données coeur uniquement), pas planter.
   */
  errors: unknown[]
}

/** GET /api/devices/ — inventaire local scopé sur le tenant actif. */
export async function fetchCoreDevices(): Promise<SurveillanceCoreDevice[]> {
  return apiList<SurveillanceCoreDevice>(withTenant("/api/devices/"))
}

/**
 * GET /api/hikgateway/devices/?normalized=1 — interrogation passerelle en
 * direct. Ne lève pas sur une passerelle injoignable signalée via `errors[]` :
 * l'appelant décide quoi faire des `results` restants.
 */
export async function fetchGatewayDevices(): Promise<GatewayDevicesResult> {
  const payload = await apiJson<Partial<GatewayDevicesResult> | null>(
    withTenant("/api/hikgateway/devices/", { normalized: 1 }),
  )
  const results = Array.isArray(payload?.results) ? payload.results : []
  const errors = Array.isArray(payload?.errors) ? payload.errors : []
  return {
    count: typeof payload?.count === "number" ? payload.count : results.length,
    results,
    errors,
  }
}

/** Formatte une entrée de `errors[]` passerelle en texte lisible. */
export function formatGatewayErrorEntry(entry: unknown): string {
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

/** Un statut est considéré "en ligne" si la chaîne normalisée vaut online/on. */
export function isDeviceOnline(status: string | undefined | null): boolean {
  const normalized = String(status ?? "").trim().toLowerCase()
  return normalized === "online" || normalized === "on" || normalized === "en ligne"
}
