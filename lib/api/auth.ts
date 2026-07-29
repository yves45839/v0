export type AuthTokens = {
  access: string
  refresh: string
}

export type AuthUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
}

export type AuthTenant = {
  id: number
  code: string
  name: string
  role: string
}

export type AuthSession = {
  tokens: AuthTokens
  user: AuthUser
  tenants: AuthTenant[]
  activeTenantCode: string
  lastLoginAt: string
}

export type LoginResponse = {
  refresh: string
  access: string
  user: AuthUser
  tenants: AuthTenant[]
}

export type ClientSignupPayload = {
  email: string
  password: string
  tenant_name: string
  tenant_code?: string
  organization_name?: string
  domain?: string
  require_payment?: boolean
}

export type ClientSignupResponse = {
  status: "pending_verification"
  tenant: {
    id: number
    name: string
    code: string
    is_active: boolean
    payment_status: string
  }
  user: {
    id: number
    username: string
    email: string
    is_active: boolean
  }
  default_organization: {
    id: number
    name: string
    code: string
  }
  email_verification_expires_at: string
  email_sent: boolean
  next_step?: string
}

export type PasswordResetRequestResponse = {
  status: "reset_requested"
  email_sent?: boolean
  expires_at?: string
}

export type MyOrganizationItem = {
  id: number
  name: string
  code: string
  role: string
}

export type MyOrganizationGroup = {
  tenant_id: number
  tenant_code: string
  tenant_name: string
  tenant_role: string
  organizations: MyOrganizationItem[]
}

export type MyOrganizationsResponse = {
  count: number
  results: MyOrganizationGroup[]
}

export type OrganizationCustomRoleItem = {
  id: number
  tenant: number
  organization: number
  name: string
  description: string
  is_active: boolean
  created_by: number | null
  created_at: string
  updated_at: string
}

export type OrganizationCustomRolesResponse = {
  count: number
  results: OrganizationCustomRoleItem[]
}

export type OrganizationUserItem = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  tenant_role: string
  organization_role: string
  custom_roles: Array<{ id: number; name: string }>
}

export type OrganizationUsersResponse = {
  count: number
  results: OrganizationUserItem[]
}

export type OrganizationRoleAssignResponse = {
  status: "assigned" | "removed"
  user_id: number
  organization_id: number
  roles: Array<{ id: number; name: string }>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"
const AUTH_STORAGE_KEY = "securepoint-auth-session-v1"
const ACTIVE_TENANT_KEY = "securepoint-active-tenant-code"
const AUTH_SESSION_EVENT = "securepoint:auth-session-changed"
const TOKEN_REFRESH_LEEWAY_SECONDS = 45

let cachedSession: AuthSession | null | undefined
let refreshRequestInFlight: Promise<string> | null = null

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

/**
 * Clear the local session and redirect to /login preserving the current path
 * as the `next` query param so the user is returned here after re-auth.
 * No-op on the server (SSR context).
 */
export function redirectToLogin(): void {
  if (!isBrowser()) return
  clearAuthSession()
  const next = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.replace(`/login?next=${next}`)
}

function decodeBase64Url(payload: string): string {
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4)
  if (typeof atob === "function") {
    return atob(padded)
  }
  return Buffer.from(padded, "base64").toString("utf-8")
}

function parseJwtExp(accessToken: string): number | null {
  const parts = String(accessToken || "").split(".")
  if (parts.length < 2) {
    return null
  }
  try {
    const json = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown }
    const exp = Number(json.exp)
    return Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

function shouldRefreshAccessToken(accessToken: string): boolean {
  const exp = parseJwtExp(accessToken)
  if (!exp) {
    return false
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  return exp - nowSeconds <= TOKEN_REFRESH_LEEWAY_SECONDS
}

function emitAuthSessionChanged(): void {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT))
}

function normalizeSession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const payload = raw as Partial<AuthSession>
  const access = String(payload.tokens?.access ?? "").trim()
  const refresh = String(payload.tokens?.refresh ?? "").trim()
  const user = payload.user
  if (!access || !refresh || !user) {
    return null
  }
  const tenants = Array.isArray(payload.tenants) ? payload.tenants : []
  const activeTenantCode =
    String(payload.activeTenantCode ?? "").trim() || String(tenants[0]?.code ?? "").trim()
  return {
    tokens: { access, refresh },
    user: {
      id: Number(user.id),
      username: String(user.username ?? ""),
      email: String(user.email ?? ""),
      first_name: String(user.first_name ?? ""),
      last_name: String(user.last_name ?? ""),
      is_active: Boolean(user.is_active),
    },
    tenants: tenants
      .map((tenant) => ({
        id: Number(tenant.id),
        code: String(tenant.code ?? ""),
        name: String(tenant.name ?? ""),
        role: String(tenant.role ?? ""),
      }))
      .filter((tenant) => Number.isFinite(tenant.id) && tenant.code.length > 0),
    activeTenantCode,
    lastLoginAt: String(payload.lastLoginAt ?? new Date().toISOString()),
  }
}

function readSessionFromStorage(): AuthSession | null {
  if (!isBrowser()) {
    return null
  }
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return normalizeSession(JSON.parse(raw))
  } catch {
    return null
  }
}

function persistSession(session: AuthSession | null): void {
  cachedSession = session
  if (!isBrowser()) {
    return
  }
  if (session) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    if (session.activeTenantCode) {
      window.localStorage.setItem(ACTIVE_TENANT_KEY, session.activeTenantCode)
    }
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    window.localStorage.removeItem(ACTIVE_TENANT_KEY)
  }
  emitAuthSessionChanged()
}

export function getAuthSession(): AuthSession | null {
  if (cachedSession !== undefined) {
    return cachedSession
  }
  cachedSession = readSessionFromStorage()
  return cachedSession
}

export function getAuthUser(): AuthUser | null {
  return getAuthSession()?.user ?? null
}

export function hasAuthSession(): boolean {
  const session = getAuthSession()
  return Boolean(session?.tokens.access && session?.tokens.refresh)
}

export function getSessionTokens(): AuthTokens | null {
  const session = getAuthSession()
  if (!session) {
    return null
  }
  return {
    access: session.tokens.access,
    refresh: session.tokens.refresh,
  }
}

export function getActiveTenantCode(fallback = ""): string {
  const session = getAuthSession()
  if (session?.activeTenantCode) {
    return session.activeTenantCode
  }
  if (!isBrowser()) {
    return fallback
  }
  return window.localStorage.getItem(ACTIVE_TENANT_KEY) || fallback
}

export function setActiveTenantCode(code: string): void {
  const normalized = String(code || "").trim()
  const session = getAuthSession()
  if (session) {
    persistSession({
      ...session,
      activeTenantCode: normalized,
    })
    return
  }
  if (!isBrowser()) return
  if (normalized) {
    window.localStorage.setItem(ACTIVE_TENANT_KEY, normalized)
  } else {
    window.localStorage.removeItem(ACTIVE_TENANT_KEY)
  }
  emitAuthSessionChanged()
}

export function clearAuthSession(): void {
  persistSession(null)
}

async function parseApiError(response: Response, fallback = "API request failed"): Promise<Error> {
  const text = await response.text().catch(() => "")
  let message = text || `${fallback} (${response.status})`
  try {
    const parsed = JSON.parse(text) as { detail?: unknown } & Record<string, unknown>
    const detail = parsed.detail
    if (typeof detail === "string" && detail.trim()) {
      message = detail.trim()
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail.map((entry) => String(entry)).join(" ")
    } else if (parsed && typeof parsed === "object") {
      const firstEntry = Object.values(parsed).find((value) => {
        if (typeof value === "string") return value.trim().length > 0
        return Array.isArray(value) && value.length > 0
      })
      if (typeof firstEntry === "string") {
        message = firstEntry
      } else if (Array.isArray(firstEntry)) {
        message = firstEntry.map((entry) => String(entry)).join(" ")
      }
    }
  } catch {
    // Keep plain text/body fallback.
  }
  return new Error(message)
}

export async function refreshAccessToken(force = false): Promise<string | null> {
  const session = getAuthSession()
  if (!session) {
    return null
  }
  if (!force && !shouldRefreshAccessToken(session.tokens.access)) {
    return session.tokens.access
  }
  if (refreshRequestInFlight) {
    return refreshRequestInFlight
  }

  refreshRequestInFlight = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: session.tokens.refresh }),
      cache: "no-store",
    })
    if (!response.ok) {
      throw await parseApiError(response, "Token refresh failed")
    }
    const payload = (await response.json()) as { access?: unknown; refresh?: unknown }
    const access = String(payload.access ?? "").trim()
    if (!access) {
      throw new Error("Token refresh returned no access token.")
    }
    // The backend rotates refresh tokens (ROTATE_REFRESH_TOKENS + blacklist):
    // the old refresh token is dead after this call, so the rotated one must be kept.
    const rotatedRefresh = String(payload.refresh ?? "").trim() || session.tokens.refresh
    persistSession({
      ...session,
      tokens: {
        access,
        refresh: rotatedRefresh,
      },
    })
    return access
  })()

  try {
    return await refreshRequestInFlight
  } catch (error) {
    clearAuthSession()
    throw error
  } finally {
    refreshRequestInFlight = null
  }
}

export async function getAccessToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
  const session = getAuthSession()
  if (!session) {
    return null
  }
  if (options?.forceRefresh) {
    return refreshAccessToken(true)
  }
  return refreshAccessToken(false)
}

export async function loginWithCredentials(identifier: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Login failed")
  }
  const payload = (await response.json()) as LoginResponse
  const tenants = payload.tenants ?? []
  // Un compte dont TOUS les rôles sont "employee" est réservé à l'application
  // mobile : le tableau de bord admin refuse la session (défense en profondeur —
  // le backend n'expose de toute façon aucune donnée à ce rôle).
  if (tenants.length > 0 && tenants.every((tenant) => tenant.role === "employee")) {
    const error = new Error("EMPLOYEE_ONLY_ACCOUNT")
    error.name = "EmployeeOnlyAccountError"
    throw error
  }
  const session: AuthSession = {
    tokens: {
      access: payload.access,
      refresh: payload.refresh,
    },
    user: payload.user,
    tenants,
    activeTenantCode: String(tenants[0]?.code ?? ""),
    lastLoginAt: new Date().toISOString(),
  }
  persistSession(session)
  return session
}

export async function logoutCurrentSession(): Promise<void> {
  const session = getAuthSession()
  if (!session) {
    clearAuthSession()
    return
  }
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.tokens.access}`,
      },
      body: JSON.stringify({ refresh: session.tokens.refresh }),
      cache: "no-store",
    })
  } finally {
    clearAuthSession()
  }
}

async function authRequest(path: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error("Authentication required.")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (response.status !== 401) {
    return response
  }

  const refreshed = await getAccessToken({ forceRefresh: true })
  if (!refreshed) {
    redirectToLogin()
    return response
  }
  const retried = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshed}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
  if (retried.status === 401) {
    redirectToLogin()
  }
  return retried
}

async function authJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authRequest(path, init)
  if (!response.ok) {
    throw await parseApiError(response)
  }
  if (response.status === 204) {
    return null as T
  }
  return response.json()
}

function parseListPayload<T>(payload: unknown): T[] {
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

export async function fetchProfile(): Promise<AuthUser> {
  return authJson<AuthUser>("/api/auth/profile/")
}

export async function updateProfile(payload: Partial<Pick<AuthUser, "username" | "email" | "first_name" | "last_name">>): Promise<AuthUser> {
  const user = await authJson<AuthUser>("/api/auth/profile/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  const session = getAuthSession()
  if (session) {
    persistSession({
      ...session,
      user,
    })
  }
  return user
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ status: string }> {
  return authJson<{ status: string }>("/api/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  })
}

export async function fetchMyOrganizations(tenantCode?: string): Promise<MyOrganizationsResponse> {
  const query = tenantCode ? `?tenant_code=${encodeURIComponent(tenantCode)}` : ""
  return authJson<MyOrganizationsResponse>(`/api/auth/me/organizations/${query}`)
}

export async function fetchOrganizationUsers(organizationId: number): Promise<OrganizationUsersResponse> {
  const payload = await authJson<unknown>(`/api/auth/organizations/${organizationId}/users/`)
  const results = parseListPayload<OrganizationUserItem>(payload)
  return { count: results.length, results }
}

export async function createOrganizationUser(
  organizationId: number,
  payload: {
    email: string
    password: string
    username?: string
    first_name?: string
    last_name?: string
    tenant_role?: string
    organization_role?: string
    custom_role_ids?: number[]
  }
): Promise<unknown> {
  return authJson<unknown>(`/api/auth/organizations/${organizationId}/users/`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function fetchOrganizationRoles(organizationId: number): Promise<OrganizationCustomRolesResponse> {
  const payload = await authJson<unknown>(`/api/auth/organizations/${organizationId}/roles/`)
  const results = parseListPayload<OrganizationCustomRoleItem>(payload)
  return { count: results.length, results }
}

export async function createOrganizationRole(
  organizationId: number,
  payload: { name: string; description?: string; is_active?: boolean }
): Promise<OrganizationCustomRoleItem> {
  return authJson<OrganizationCustomRoleItem>(`/api/auth/organizations/${organizationId}/roles/`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function assignOrganizationRole(
  organizationId: number,
  roleId: number,
  payload: { user_id: number; assigned: boolean }
): Promise<OrganizationRoleAssignResponse> {
  return authJson<OrganizationRoleAssignResponse>(
    `/api/auth/organizations/${organizationId}/roles/${roleId}/assign/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}

export async function verifyEmail(payload: { token?: string; email?: string; otp?: string }): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Email verification failed")
  }
  return response.json()
}

export async function verifyEmailToken(token: string): Promise<unknown> {
  return verifyEmail({ token })
}

export async function resendEmailVerification(email: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Verification resend failed")
  }
  return response.json()
}

export async function requestPasswordReset(
  identifier: string
): Promise<PasswordResetRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/request/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Password reset request failed")
  }
  return response.json()
}

export async function confirmPasswordReset(payload: {
  token?: string
  email?: string
  otp?: string
  new_password: string
}): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Password reset confirmation failed")
  }
  return response.json()
}

export async function clientSignup(payload: ClientSignupPayload): Promise<ClientSignupResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/client-signup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Signup failed")
  }
  return response.json()
}

export async function acceptInvitation(
  token: string,
  payload?: { username?: string; password?: string }
): Promise<unknown> {
  const sessionToken = await getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/auth/invitations/accept/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify({
      token,
      ...(payload?.username ? { username: payload.username } : {}),
      ...(payload?.password ? { password: payload.password } : {}),
    }),
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Invitation acceptance failed")
  }
  return response.json()
}

export const AUTH_EVENTS = {
  SESSION_CHANGED: AUTH_SESSION_EVENT,
}
