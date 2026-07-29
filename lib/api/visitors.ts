import { apiDelete, apiJson, readGatewayPush, unwrapList, withTenant, type GatewayPushResult } from "@/lib/api/client"
import { getActiveTenantCode } from "@/lib/api/auth"
import type { HikEvent } from "@/lib/api/access-logs"

/**
 * Les visiteurs sont des employés flagués `is_visitor` côté backend.
 * Ce module encapsule les appels /api/employees/?is_visitor=1 et expose un
 * modèle `VisitorItem` propre à l'UI Visiteurs.
 */

export type VisitorStatus = "expected" | "on_site" | "checked_out" | "expired"

export type VisitorCard = {
  card_no: string
  card_type?: string
}

/** Ligne brute renvoyée par /api/employees/ (sous-ensemble utile aux visiteurs). */
export type VisitorEmployeeRow = {
  id: number
  tenant: number
  employee_no: string
  name: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  position?: string
  is_visitor?: boolean
  is_active?: boolean
  valid_from?: string | null
  valid_to?: string | null
  access_groups?: number[]
  cards?: VisitorCard[]
  needs_gateway_push?: boolean
}

export type VisitorItem = {
  id: number
  tenantId: number
  employeeNo: string
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  cardNo: string | null
  cards: VisitorCard[]
  accessGroups: number[]
  validFrom: string | null
  validTo: string | null
  isActive: boolean
  needsGatewayPush: boolean
}

export type VisitorAccessGroup = {
  id: number
  tenant: number
  name: string
  code: string
}

export type CreateVisitorPayload = {
  name: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  employee_no: string
  valid_from?: string
  valid_to?: string
  cards?: VisitorCard[]
  access_groups?: number[]
}

export type UpdateVisitorPayload = Partial<{
  name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  valid_from: string | null
  valid_to: string | null
  cards: VisitorCard[]
  access_groups: number[]
  is_active: boolean
}>

export type VisitorMutationResult = {
  visitor: VisitorItem
  /** Renseigné quand le backend répond 207 (push passerelle partiel). */
  gatewayPush: GatewayPushResult | null
  /** Message français prêt à afficher si la synchro lecteurs est partielle. */
  gatewayWarning: string | null
}

function splitName(row: VisitorEmployeeRow): { firstName: string; lastName: string } {
  const first = (row.first_name ?? "").trim()
  const last = (row.last_name ?? "").trim()
  if (first || last) return { firstName: first, lastName: last }
  const parts = String(row.name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

export function mapVisitorRow(row: VisitorEmployeeRow): VisitorItem {
  const cards = Array.isArray(row.cards) ? row.cards.filter((card) => String(card?.card_no ?? "").trim()) : []
  const { firstName, lastName } = splitName(row)
  return {
    id: row.id,
    tenantId: row.tenant,
    employeeNo: String(row.employee_no ?? ""),
    name: String(row.name ?? "").trim() || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: String(row.email ?? "").trim(),
    phone: String(row.phone ?? "").trim(),
    cardNo: cards.length > 0 ? String(cards[0].card_no) : null,
    cards,
    accessGroups: Array.isArray(row.access_groups) ? row.access_groups : [],
    validFrom: row.valid_from ?? null,
    validTo: row.valid_to ?? null,
    isActive: row.is_active !== false,
    needsGatewayPush: Boolean(row.needs_gateway_push),
  }
}

// ── Tenant (id numérique requis par POST /api/employees/) ────────────────────

type TenantRow = { id: number; code?: string }

let cachedTenantId: { code: string; id: number } | null = null

async function resolveTenantId(): Promise<number> {
  const code = getActiveTenantCode()
  if (cachedTenantId && cachedTenantId.code === code) {
    return cachedTenantId.id
  }
  const payload = await apiJson<unknown>("/api/tenants/")
  const rows = unwrapList<TenantRow>(payload)
  const match = code ? rows.find((row) => String(row.code ?? "") === code) : rows[0]
  const fallback = rows[0]
  const tenant = match ?? fallback
  if (!tenant || typeof tenant.id !== "number") {
    throw new Error("Impossible de déterminer le tenant actif.")
  }
  cachedTenantId = { code, id: tenant.id }
  return tenant.id
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function fetchVisitors(): Promise<VisitorItem[]> {
  const payload = await apiJson<unknown>(withTenant("/api/employees/", { is_visitor: 1 }))
  return unwrapList<VisitorEmployeeRow>(payload).map(mapVisitorRow)
}

export function buildGatewayWarning(payload: unknown): { gatewayPush: GatewayPushResult | null; warning: string | null } {
  const gatewayPush = readGatewayPush(payload)
  if (!gatewayPush) return { gatewayPush: null, warning: null }
  const errors = Array.isArray(gatewayPush.errors) ? gatewayPush.errors : []
  const isPartial =
    errors.length > 0 ||
    gatewayPush.pushed === false ||
    (typeof gatewayPush.status === "string" && gatewayPush.status.toLowerCase() !== "ok")
  if (!isPartial) return { gatewayPush, warning: null }
  const detailParts = errors
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>
        const detail = String(record.detail ?? "").trim()
        const devIndex = String(record.dev_index ?? "").trim()
        if (detail && devIndex) return `${devIndex} : ${detail}`
        if (detail) return detail
        if (devIndex) return devIndex
      }
      const text = String(entry ?? "").trim()
      return text || null
    })
    .filter((entry): entry is string => Boolean(entry))
  const detail =
    detailParts.length > 0
      ? detailParts.join(" ; ")
      : String(gatewayPush.detail ?? "").trim() || "certains lecteurs n'ont pas été mis à jour."
  return { gatewayPush, warning: detail }
}

function toMutationResult(payload: VisitorEmployeeRow): VisitorMutationResult {
  const { gatewayPush, warning } = buildGatewayWarning(payload)
  return {
    visitor: mapVisitorRow(payload),
    gatewayPush,
    gatewayWarning: warning,
  }
}

export async function createVisitor(payload: CreateVisitorPayload): Promise<VisitorMutationResult> {
  const tenantId = await resolveTenantId()
  const response = await apiJson<VisitorEmployeeRow>("/api/employees/", {
    method: "POST",
    body: JSON.stringify({
      tenant: tenantId,
      is_visitor: true,
      ...payload,
    }),
  })
  return toMutationResult(response)
}

export async function updateVisitor(id: number, patch: UpdateVisitorPayload): Promise<VisitorMutationResult> {
  const response = await apiJson<VisitorEmployeeRow>(`/api/employees/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
  return toMutationResult(response)
}

export async function deleteVisitor(id: number): Promise<void> {
  return apiDelete(`/api/employees/${id}/`)
}

/** Groupes d'accès du tenant actif (appel local pour ne pas dépendre d'autres modules). */
export async function fetchVisitorAccessGroups(): Promise<VisitorAccessGroup[]> {
  const payload = await apiJson<unknown>(withTenant("/api/access-groups/"))
  return unwrapList<VisitorAccessGroup>(payload)
}

// ── Dérivation du statut ─────────────────────────────────────────────────────

function isSameLocalDay(iso: string, reference: Date): boolean {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  )
}

function isDeniedEvent(event: HikEvent): boolean {
  const action = String(event.normalized_action ?? "").toUpperCase()
  if (action === "ACCESS_DENIED") return true
  return String(event.access_status ?? "").toLowerCase() === "denied"
}

/**
 * Statut d'un visiteur à partir des événements passerelle du jour :
 * - `valid_to` dépassé → "expired" (Expiré)
 * - dernier événement du jour (person_id === employee_no, non refusé) :
 *   CHECK_IN / direction IN → "on_site" (Sur site)
 *   CHECK_OUT / direction OUT → "checked_out" (Parti)
 * - aucun événement → "expected" (Attendu)
 */
export function deriveVisitorStatus(visitor: VisitorItem, todaysEvents: HikEvent[], now: Date = new Date()): VisitorStatus {
  if (visitor.validTo) {
    const validTo = new Date(visitor.validTo)
    if (!Number.isNaN(validTo.getTime()) && validTo.getTime() < now.getTime()) {
      return "expired"
    }
  }

  if (!visitor.employeeNo) return "expected"

  let latest: HikEvent | null = null
  let latestMs = Number.NEGATIVE_INFINITY
  for (const event of todaysEvents) {
    if (String(event.person_id ?? "") !== visitor.employeeNo) continue
    if (!isSameLocalDay(event.timestamp, now)) continue
    if (isDeniedEvent(event)) continue
    const eventMs = new Date(event.timestamp).getTime()
    if (Number.isNaN(eventMs) || eventMs <= latestMs) continue
    latest = event
    latestMs = eventMs
  }

  if (!latest) return "expected"

  const action = String(latest.normalized_action ?? "").toUpperCase()
  const direction = String(latest.direction ?? "").toUpperCase()
  if (action === "CHECK_OUT" || direction === "OUT") return "checked_out"
  if (action === "CHECK_IN" || direction === "IN") return "on_site"
  return "on_site"
}
