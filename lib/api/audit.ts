import { apiJson, withTenant } from "@/lib/api/client"

export type AuditActor = {
  id: number
  username: string
  email: string
}

export type AuditEvent = {
  id: number
  actor: AuditActor | null
  action: string
  target_model: string
  target_id: string | number | null
  ip_address: string | null
  tenant_code: string
  extra: Record<string, unknown>
  created_at: string
}

export type AuditEventsResponse = {
  count: number
  results: AuditEvent[]
}

export type FetchAuditEventsParams = {
  /** Sous-chaîne du nom d'utilisateur de l'acteur. */
  actor?: string
  /** Sous-chaîne de l'action (ex: "login", "create_employee"). */
  action?: string
  /** Nom de modèle exact (ex: "employee"). */
  targetModel?: string
  /** Format YYYY-MM-DD. */
  dateFrom?: string
  /** Format YYYY-MM-DD. */
  dateTo?: string
  /** Max 500 côté backend. */
  limit?: number
  /** Curseur "charger plus" : plus petit id actuellement affiché. */
  beforeId?: number
}

/**
 * Journal d'audit du tenant actif (ordre anté-chronologique).
 * 403 (ApiError.status) si le rôle tenant est inférieur à "operator".
 */
export async function fetchAuditEvents(params: FetchAuditEventsParams = {}): Promise<AuditEventsResponse> {
  return apiJson<AuditEventsResponse>(
    withTenant("/api/audit/events/", {
      actor: params.actor,
      action: params.action,
      target_model: params.targetModel,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      limit: params.limit ?? 100,
      before_id: params.beforeId,
    })
  )
}
