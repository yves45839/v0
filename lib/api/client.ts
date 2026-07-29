import { getAccessToken, getActiveTenantCode, redirectToLogin } from "@/lib/api/auth"

export const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"

/**
 * Erreur API normalisée : conserve le statut HTTP, le payload brut et, si le
 * backend en fournit un, le code d'erreur métier (ex: SHIFT_BREAK_INCOMPLETE).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown = null, code: string | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.payload = payload
  }
}

function extractMessage(payload: unknown, fallback: string): { message: string; code: string | null } {
  if (!payload || typeof payload !== "object") {
    return { message: fallback, code: null }
  }
  const record = payload as Record<string, unknown>
  const code = typeof record.code === "string" && record.code.trim() ? record.code.trim() : null

  const detail = record.detail
  if (typeof detail === "string" && detail.trim()) {
    return { message: detail.trim(), code }
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return { message: detail.map((entry) => String(entry)).join(" "), code }
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === "code") continue
    if (typeof value === "string" && value.trim()) {
      return { message: value.trim(), code }
    }
    if (Array.isArray(value) && value.length > 0) {
      return { message: `${key}: ${value.map((entry) => String(entry)).join(" ")}`, code }
    }
  }
  return { message: fallback, code }
}

export async function toApiError(response: Response, fallback = "Requête API échouée"): Promise<ApiError> {
  const text = await response.text().catch(() => "")
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }
  const { message, code } = extractMessage(payload, text || `${fallback} (${response.status})`)
  return new ApiError(message, response.status, payload, code)
}

/**
 * Ajoute ?tenant=<code actif> (+ paramètres additionnels) à un chemin d'API.
 * Convention principale de scoping tenant du backend Django.
 */
export function withTenant(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  const tenantCode = getActiveTenantCode()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const query = search.toString()
  if (!query) return path
  return `${path}${path.includes("?") ? "&" : "?"}${query}`
}

function buildHeaders(accessToken: string, init?: RequestInit): HeadersInit {
  const tenantCode = getActiveTenantCode()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...(tenantCode ? { "X-Tenant-Code": tenantCode } : {}),
    ...(init?.headers ?? {}),
  }
}

/**
 * Requête authentifiée : JWT + X-Tenant-Code, refresh proactif du token,
 * retry unique sur 401 puis redirection /login si la session est morte.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    redirectToLogin()
    throw new ApiError("Authentification requise.", 401)
  }

  const doFetch = (token: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildHeaders(token, init),
      cache: "no-store",
    })

  const response = await doFetch(accessToken)
  if (response.status !== 401) {
    return response
  }

  const refreshed = await getAccessToken({ forceRefresh: true }).catch(() => null)
  if (!refreshed) {
    redirectToLogin()
    return response
  }
  const retried = await doFetch(refreshed)
  if (retried.status === 401) {
    redirectToLogin()
  }
  return retried
}

export type GatewayPushResult = {
  status?: string
  pushed?: boolean
  errors?: unknown[]
  results?: unknown[]
  detail?: string
}

/**
 * Requête JSON authentifiée. Les réponses 207 MULTI_STATUS (push passerelle
 * partiel) sont des succès applicatifs : le payload contient `gateway_push`
 * que l'appelant peut inspecter via `readGatewayPush`.
 */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok && response.status !== 207) {
    throw await toApiError(response)
  }
  if (response.status === 204) {
    return null as T
  }
  return (await response.json()) as T
}

export async function apiDelete(path: string): Promise<void> {
  const response = await apiFetch(path, { method: "DELETE" })
  if (!response.ok && response.status !== 207) {
    throw await toApiError(response)
  }
}

export function readGatewayPush(payload: unknown): GatewayPushResult | null {
  if (!payload || typeof payload !== "object") return null
  const gatewayPush = (payload as { gateway_push?: unknown }).gateway_push
  if (!gatewayPush || typeof gatewayPush !== "object") return null
  return gatewayPush as GatewayPushResult
}

/** Déballe une liste DRF : tableau nu ou {count, results}. */
export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (
    payload &&
    typeof payload === "object" &&
    "results" in payload &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: T[] }).results
  }
  return []
}

export async function apiList<T>(path: string, init?: RequestInit): Promise<T[]> {
  return unwrapList<T>(await apiJson<unknown>(path, init))
}
