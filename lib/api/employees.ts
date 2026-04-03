export type AuthTokens = {
  access: string
  refresh: string
}

export type EmployeeApiItem = {
  id: number
  tenant: number
  employee_no: string
  name: string
  email: string
  phone: string
  position: string
  department: number | null
  work_shift: number | null
  work_shifts?: number[]
  effective_planning?: {
    id: number
    tenant: number
    name: string
    code: string
  } | null
  effective_work_shift?: {
    id: number
    tenant: number
    name: string
    code: string
    start_time: string | null
    end_time: string | null
    break_start_time?: string | null
    break_end_time?: string | null
    overtime_minutes?: number
    late_allowable_minutes?: number
    early_leave_allowable_minutes?: number
  } | null
  devices?: number[]
  access_groups: number[]
  cards: Array<{ card_no: string; card_type: string }>
  fingerprints?: Array<{ id?: number; finger_index: number; template: string }>
  face?: { id?: number; face_data: string } | null
  needs_gateway_push: boolean
  is_active: boolean
}

export type AccessGroupApiItem = {
  id: number
  tenant: number
  name: string
  code: string
}

export type DepartmentApiItem = {
  id: number
  tenant: number
  organization: number
  parent: number | null
  name: string
  code: string
  work_shift?: number | null
  effective_work_shift?: {
    id: number
    tenant: number
    name: string
    code: string
    start_time: string | null
    end_time: string | null
    break_start_time?: string | null
    break_end_time?: string | null
    overtime_minutes?: number
    late_allowable_minutes?: number
    early_leave_allowable_minutes?: number
  } | null
}

export type OrganizationApiItem = {
  id: number
  tenant: number
  name: string
  code: string
}

export type WorkShiftApiItem = {
  id: number
  tenant: number
  name: string
  code: string
  description: string
  start_time: string | null
  end_time: string | null
  break_start_time: string | null
  break_end_time: string | null
  overtime_minutes: number
  late_allowable_minutes: number
  early_leave_allowable_minutes: number
  metadata: Record<string, unknown>
}

export type PlanningDailySlotApiItem = {
  id?: number
  day_of_week: number
  slot_type: "work" | "shift" | "rest"
  start_time: string
  end_time: string
  label: string
}

export type PlanningEntryApiItem = {
  id?: number
  day_of_week: number | null
  sequence_index?: number | null
  start_date?: string | null
  end_date?: string | null
  work_shift?: number | null
  is_rest_day: boolean
  label: string
  metadata?: Record<string, unknown>
}

export type PlanningApiItem = {
  id: number
  tenant: number
  name: string
  code: string
  description: string
  timezone: string
  metadata: Record<string, unknown>
  daily_slots: PlanningDailySlotApiItem[]
  entries: PlanningEntryApiItem[]
}

export type CreateWorkShiftPayload = {
  tenant: number
  name: string
  code?: string
  description?: string
  start_time?: string | null
  end_time?: string | null
  break_start_time?: string | null
  break_end_time?: string | null
  overtime_minutes?: number
  late_allowable_minutes?: number
  early_leave_allowable_minutes?: number
  metadata?: Record<string, unknown>
}

export type CreatePlanningPayload = {
  tenant: number
  name: string
  code?: string
  description?: string
  timezone?: string
  metadata?: Record<string, unknown>
  daily_slots?: PlanningDailySlotApiItem[]
  entries?: PlanningEntryApiItem[]
}

export type CreateEmployeePayload = {
  tenant: number
  employee_no: string
  name: string
  department?: number
  devices?: number[]
  access_groups?: number[]
  email?: string
  phone?: string
  position?: string
  cards?: Array<{ card_no: string; card_type?: string }>
  fingerprints?: Array<{ finger_index: number; template: string }>
  face?: { face_data: string }
  access_group?: string
}

export type CreateEmployeeResponse = {
  id: number | string
  employee_no: string
  name: string
  email?: string
  phone?: string
  position?: string
  cards?: Array<{ card_no: string; card_type?: string }>
}

export type UpdateEmployeePayload = {
  name?: string
  email?: string
  phone?: string
  position?: string
  department?: number
  devices?: number[]
  access_groups?: number[]
  cards?: Array<{ card_no: string; card_type?: string }>
  fingerprints?: Array<{ finger_index: number; template: string }>
  face?: { face_data: string } | null
}

export type EmployeeListItem = {
  id: number | string
  employee_no: string
  name: string
}

export type PushEmployeeResult = {
  status: "ok" | "partial" | "skipped"
  employee_id: number
  pushed: Array<{ dev_index: string }>
  errors: Array<{ dev_index: string; detail: string }>
  detail?: string
}

export type PushPendingResult = {
  status: "ok" | "partial"
  tenant: number
  pending_count: number
  pushed_count: number
  errors: Array<{ employee_id: number; detail: string; dev_index?: string }>
}

export type DeviceApiItem = {
  id: number
  dev_index: string
  serial_number?: string
  name?: string
  status?: string
}

type HikGatewayDeviceItem = {
  dev_index?: string
  devIndex?: string
  name?: string
  device_name?: string
  device_type?: string
  model?: string
  status?: string
}

export type GatewayReaderItem = {
  dev_index: string
  name: string
  device_type: string
  status: string
}

export type ReadCardResponse = {
  status: "ok"
  dev_index: string
  card_no: string
  event_time: string | null
  serial_no: number | null
  card_reader_no: number | null
  door_no: number | null
  employee_no: string
  employee_no_string: string
}

export type EnrollFingerprintResponse = {
  status: "ok" | "partial"
  employee_id: number
  employee_no: string
  finger_index: number
  finger_quality: number | null
  finger_template?: string
  target_readers_count: number
  success_count: number
  partial_count: number
  error_count: number
  results: Array<{
    reader_id: number
    dev_index: string
    status: "ok" | "partial" | "error"
    detail?: string
  }>
}

export type EnrollFaceResponse = {
  status: "ok" | "partial"
  employee_id: number
  employee_no: string
  face_lib_type: "infraredFD" | "blackFD" | "staticFD"
  target_readers_count: number
  success_count: number
  partial_count: number
  error_count: number
  results: Array<{
    reader_id: number
    dev_index: string
    status: "ok" | "partial" | "error"
    detail?: string
  }>
}

type HikAcsEnvelope = {
  response?: unknown
}

type HikAcsEvent = {
  cardNo?: unknown
  card_no?: unknown
  cardNumber?: unknown
  dateTime?: unknown
  time?: unknown
  eventTime?: unknown
  serialNo?: unknown
  serial_no?: unknown
  cardReaderNo?: unknown
  doorNo?: unknown
  employeeNo?: unknown
  employeeNoString?: unknown
}

export type EmployeeScheduleDay = {
  date: string
  day_of_week: number
  day_name: string
  is_rest_day: boolean
  has_work_period: boolean
  planned_minutes: number
  slots: Array<{
    id: number
    label: string
    slot_type: "work" | "shift" | "rest"
    start_time: string | null
    end_time: string | null
    duration_minutes: number
  }>
  shifts: Array<{
    id: number
    name: string
    code: string
    description: string
    start_time: string | null
    end_time: string | null
    break_start_time: string | null
    break_end_time: string | null
    overtime_minutes: number
    late_allowable_minutes: number
    early_leave_allowable_minutes: number
    total_minutes: number
    net_minutes: number
  }>
}

export type EmployeeScheduleApiResponse = {
  employee: {
    id: number
    employee_no: string
    name: string
    department: string | null
  }
  month: string
  month_label: string
  previous_month: string
  next_month: string
  planning: {
    id: number
    name: string
    code: string
    timezone: string
  } | null
  work_shifts: EmployeeScheduleDay["shifts"]
  summary: {
    days_in_month: number
    working_days: number
    rest_days: number
    planned_minutes: number
    shift_minutes: number
  }
  days: EmployeeScheduleDay[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"
const API_USERNAME = process.env.NEXT_PUBLIC_EMPLOYEE_API_USERNAME ?? "emp-admin"
const API_PASSWORD = process.env.NEXT_PUBLIC_EMPLOYEE_API_PASSWORD ?? "pass"
const TOKEN_CACHE_TTL_MS = 60_000

let cachedEmployeeTokens: AuthTokens | null = null
let cachedEmployeeTokensAt = 0
let employeeTokenRequestInFlight: Promise<AuthTokens> | null = null

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

function normalizeGatewayStatus(status: string): string {
  const normalized = status.trim().toLowerCase()
  if (normalized.includes("online") || normalized === "active") return "online"
  if (normalized.includes("offline") || normalized === "inactive") return "offline"
  return normalized || "unknown"
}

function inferReaderPriority(deviceType: string): number {
  const type = deviceType.toLowerCase()
  if (type.includes("reader")) return 3
  if (type.includes("access")) return 2
  if (type.includes("door")) return 2
  if (type.includes("finger")) return 1
  return 0
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function parseDateToMs(value: unknown): number | null {
  const text = String(value ?? "").trim()
  if (!text) return null
  const parsed = Date.parse(text)
  if (Number.isNaN(parsed)) return null
  return parsed
}

function getEventCardNo(event: HikAcsEvent): string {
  return String(event.cardNo ?? event.card_no ?? event.cardNumber ?? "").trim()
}

function getEventSerialNo(event: HikAcsEvent): number {
  const serialCandidate = Number(event.serialNo ?? event.serial_no ?? 0)
  return Number.isFinite(serialCandidate) ? serialCandidate : 0
}

function normalizeAcsEvents(payload: unknown): HikAcsEvent[] {
  if (!payload || typeof payload !== "object") return []

  const candidate = payload as Record<string, unknown>
  const info =
    (candidate.AcsEventTotalNum as Record<string, unknown> | undefined) ??
    (candidate.AcsEvent as Record<string, unknown> | undefined) ??
    candidate

  const rawList = info?.InfoList
  if (Array.isArray(rawList)) {
    const flattened: HikAcsEvent[] = []
    for (const row of rawList) {
      if (!row || typeof row !== "object") continue
      const rowObject = row as Record<string, unknown>
      const nested = rowObject.AcsEventInfo
      if (nested && typeof nested === "object") {
        flattened.push(nested as HikAcsEvent)
      } else {
        flattened.push(rowObject as HikAcsEvent)
      }
    }
    return flattened
  }

  if (rawList && typeof rawList === "object") {
    const nested = (rawList as Record<string, unknown>).AcsEventInfo
    if (Array.isArray(nested)) {
      return nested.filter((row): row is HikAcsEvent => !!row && typeof row === "object")
    }
    if (nested && typeof nested === "object") {
      return [nested as HikAcsEvent]
    }
  }

  return []
}

function pickLatestCardEvent(events: HikAcsEvent[], startedAtMs: number): HikAcsEvent | null {
  let best: HikAcsEvent | null = null
  let bestTimeMs = -1
  let bestSerialNo = -1

  for (const event of events) {
    const cardNo = getEventCardNo(event)
    if (!cardNo) continue

    const eventTimeMs =
      parseDateToMs(event.dateTime ?? event.time ?? event.eventTime) ?? startedAtMs
    if (eventTimeMs + 5000 < startedAtMs) continue

    const serialNo = getEventSerialNo(event)

    if (eventTimeMs > bestTimeMs || (eventTimeMs === bestTimeMs && serialNo > bestSerialNo)) {
      best = event
      bestTimeMs = eventTimeMs
      bestSerialNo = serialNo
    }
  }

  return best
}

function maxCardSerial(events: HikAcsEvent[]): number {
  let maxSerial = -1
  for (const event of events) {
    if (!getEventCardNo(event)) continue
    const serialNo = getEventSerialNo(event)
    if (serialNo > maxSerial) {
      maxSerial = serialNo
    }
  }
  return maxSerial
}

function toReadCardResponse(devIndex: string, event: HikAcsEvent): ReadCardResponse {
  const serialCandidate = getEventSerialNo(event)
  const readerNoCandidate = Number(event.cardReaderNo ?? NaN)
  const doorNoCandidate = Number(event.doorNo ?? NaN)

  return {
    status: "ok",
    dev_index: devIndex,
    card_no: getEventCardNo(event),
    event_time:
      String(event.dateTime ?? event.time ?? event.eventTime ?? "").trim() || null,
    serial_no: Number.isFinite(serialCandidate) && serialCandidate > 0 ? serialCandidate : null,
    card_reader_no: Number.isFinite(readerNoCandidate) ? readerNoCandidate : null,
    door_no: Number.isFinite(doorNoCandidate) ? doorNoCandidate : null,
    employee_no: String(event.employeeNo ?? "").trim(),
    employee_no_string: String(event.employeeNoString ?? "").trim(),
  }
}

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

function isBadJsonGatewayError(detail: string): boolean {
  const lowered = detail.toLowerCase()
  return (
    lowered.includes("badjsoncontent") ||
    lowered.includes("wrong json content") ||
    lowered.includes("bad json content")
  )
}

async function readCardFromAcsEventsFallback(
  devIndex: string,
  accessToken: string,
  options?: { timeoutSeconds?: number; pollIntervalMs?: number }
): Promise<ReadCardResponse> {
  const timeoutSeconds = clampNumber(options?.timeoutSeconds ?? 15, 1, 60)
  const pollIntervalMs = clampNumber(options?.pollIntervalMs ?? 1200, 200, 5000)

  const startedAtMs = Date.now()
  const startedAtIso = new Date(startedAtMs).toISOString()
  const deadlineMs = startedAtMs + timeoutSeconds * 1000
  const searchID = `card-read-${devIndex}`
  let baselineCardSerial: number | null = null

  const requestAcsSearch = async (
    includeWindow: boolean
  ): Promise<{ ok: boolean; detail: string; envelope: HikAcsEnvelope }> => {
    const condition: Record<string, unknown> = {
      searchID,
      searchResultPosition: 0,
      maxResults: 30,
    }
    if (includeWindow) {
      condition.startTime = startedAtIso
      condition.endTime = new Date().toISOString()
    }

    const response = await fetch(`${API_BASE_URL}/api/hikgateway/acs-events/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        dev_index: devIndex,
        payload: {
          AcsEventCond: condition,
        },
      }),
      cache: "no-store",
    })

    const envelope = (await response.json().catch(() => ({}))) as HikAcsEnvelope & {
      detail?: unknown
    }
    const detail = String(envelope.detail ?? "").trim()
    return { ok: response.ok, detail, envelope }
  }

  while (Date.now() <= deadlineMs) {
    let acsResult = await requestAcsSearch(true)
    if (!acsResult.ok && isBadJsonGatewayError(acsResult.detail)) {
      acsResult = await requestAcsSearch(false)
    }

    if (!acsResult.ok) {
      throw new Error(acsResult.detail || "Card read error (ACS search)")
    }

    const gatewayPayload = acsResult.envelope.response ?? acsResult.envelope
    const events = normalizeAcsEvents(gatewayPayload)
    const latest = pickLatestCardEvent(events, startedAtMs)
    if (latest) {
      return toReadCardResponse(devIndex, latest)
    }

    const currentMaxCardSerial = maxCardSerial(events)
    if (baselineCardSerial === null) {
      baselineCardSerial = currentMaxCardSerial
    } else if (currentMaxCardSerial > baselineCardSerial) {
      const latestBySerial = events
        .filter((event) => getEventCardNo(event) && getEventSerialNo(event) === currentMaxCardSerial)
        .pop()
      if (latestBySerial) {
        return toReadCardResponse(devIndex, latestBySerial)
      }
      baselineCardSerial = currentMaxCardSerial
    }

    await waitMs(pollIntervalMs)
  }

  throw new Error("Aucune carte detectee pendant la fenetre de lecture.")
}

export async function fetchEmployeeApiToken(): Promise<AuthTokens> {
  const now = Date.now()
  if (cachedEmployeeTokens && now - cachedEmployeeTokensAt < TOKEN_CACHE_TTL_MS) {
    return cachedEmployeeTokens
  }
  if (employeeTokenRequestInFlight) {
    return employeeTokenRequestInFlight
  }

  employeeTokenRequestInFlight = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: API_USERNAME,
        password: API_PASSWORD,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token API error (${response.status})`)
    }

    const tokens = (await response.json()) as AuthTokens
    cachedEmployeeTokens = tokens
    cachedEmployeeTokensAt = Date.now()
    return tokens
  })()

  try {
    return await employeeTokenRequestInFlight
  } finally {
    employeeTokenRequestInFlight = null
  }
}

async function employeeApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const tokens = await fetchEmployeeApiToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.access}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Employee API error (${response.status}) on ${path}: ${errorBody}`)
  }

  if (response.status === 204) {
    return null as T
  }
  return response.json()
}

async function employeeApiDelete(path: string): Promise<void> {
  const tokens = await fetchEmployeeApiToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${tokens.access}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Employee API delete error (${response.status}) on ${path}: ${errorBody}`)
  }
}

export async function createEmployee(
  payload: CreateEmployeePayload,
  accessToken: string
): Promise<CreateEmployeeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/employees/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Employee API error (${response.status}): ${errorBody}`)
  }

  return response.json()
}

export async function updateEmployee(
  employeeId: string | number,
  payload: UpdateEmployeePayload
): Promise<EmployeeApiItem> {
  return employeeApiRequest<EmployeeApiItem>(`/api/employees/${employeeId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function fetchEmployees(tenantCode?: string): Promise<EmployeeListItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/employees/${query ? `?${query}` : ""}`)
  return parseListPayload<EmployeeListItem>(payload)
}

export async function fetchEmployeesDetailed(tenantCode?: string): Promise<EmployeeApiItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/employees/${query ? `?${query}` : ""}`)
  return parseListPayload<EmployeeApiItem>(payload)
}

export async function fetchAccessGroups(tenantCode?: string): Promise<AccessGroupApiItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/access-groups/${query ? `?${query}` : ""}`)
  return parseListPayload<AccessGroupApiItem>(payload)
}

export async function fetchDepartments(tenantCode?: string): Promise<DepartmentApiItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/departments/${query ? `?${query}` : ""}`)
  return parseListPayload<DepartmentApiItem>(payload)
}

export async function fetchOrganizations(tenantCode?: string): Promise<OrganizationApiItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/organizations/${query ? `?${query}` : ""}`)
  return parseListPayload<OrganizationApiItem>(payload)
}

export async function fetchWorkShifts(tenantCode?: string): Promise<WorkShiftApiItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/work-shifts/${query ? `?${query}` : ""}`)
  return parseListPayload<WorkShiftApiItem>(payload)
}

export async function createWorkShift(payload: CreateWorkShiftPayload): Promise<WorkShiftApiItem> {
  return employeeApiRequest<WorkShiftApiItem>("/api/work-shifts/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateWorkShift(
  id: number,
  payload: Partial<CreateWorkShiftPayload>
): Promise<WorkShiftApiItem> {
  return employeeApiRequest<WorkShiftApiItem>(`/api/work-shifts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteWorkShift(id: number, options?: { force?: boolean }): Promise<void> {
  const search = new URLSearchParams()
  if (options?.force) {
    search.set("force", "true")
  }
  const query = search.toString()
  return employeeApiDelete(`/api/work-shifts/${id}/${query ? `?${query}` : ""}`)
}

export async function fetchPlannings(tenantCode?: string): Promise<PlanningApiItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/plannings/${query ? `?${query}` : ""}`)
  return parseListPayload<PlanningApiItem>(payload)
}

export async function createPlanning(payload: CreatePlanningPayload): Promise<PlanningApiItem> {
  return employeeApiRequest<PlanningApiItem>("/api/plannings/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updatePlanning(
  id: number,
  payload: Partial<CreatePlanningPayload>
): Promise<PlanningApiItem> {
  return employeeApiRequest<PlanningApiItem>(`/api/plannings/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deletePlanning(id: number, options?: { force?: boolean }): Promise<void> {
  const search = new URLSearchParams()
  if (options?.force) {
    search.set("force", "true")
  }
  const query = search.toString()
  return employeeApiDelete(`/api/plannings/${id}/${query ? `?${query}` : ""}`)
}

export async function fetchDevices(tenantCode?: string): Promise<DeviceApiItem[]> {
  const search = new URLSearchParams()
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }
  const query = search.toString()
  const payload = await employeeApiRequest<unknown>(`/api/devices/${query ? `?${query}` : ""}`)
  return parseListPayload<DeviceApiItem>(payload)
}

export async function fetchOnlineReaders(tenantCode?: string): Promise<GatewayReaderItem[]> {
  const search = new URLSearchParams()
  search.set("normalized", "1")
  search.set("max_result", "200")
  search.set("status", "online")
  if (tenantCode) {
    search.set("tenant", tenantCode)
  }

  const payload = await employeeApiRequest<unknown>(`/api/hikgateway/devices/?${search.toString()}`)
  const rows = parseListPayload<HikGatewayDeviceItem>(payload)

  const mapped = rows
    .map((row) => {
      const devIndex = String(row.dev_index ?? row.devIndex ?? "").trim()
      const resolvedName = row.name ?? row.device_name ?? devIndex
      const name = String(resolvedName || "Lecteur")
      const deviceType = String(row.device_type ?? row.model ?? "").trim()
      const status = normalizeGatewayStatus(String(row.status ?? ""))
      return {
        dev_index: devIndex,
        name,
        device_type: deviceType,
        status,
      }
    })
    .filter((row) => row.dev_index.length > 0 && row.status === "online")

  const dedupedByDevIndex = new Map<string, GatewayReaderItem>()
  for (const item of mapped) {
    const existing = dedupedByDevIndex.get(item.dev_index)
    if (!existing) {
      dedupedByDevIndex.set(item.dev_index, item)
      continue
    }

    const existingPriority = inferReaderPriority(existing.device_type)
    const currentPriority = inferReaderPriority(item.device_type)
    if (currentPriority > existingPriority) {
      dedupedByDevIndex.set(item.dev_index, item)
    }
  }

  const readers = Array.from(dedupedByDevIndex.values())
  readers.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
  return readers
}

export async function readCardFromReader(
  devIndex: string,
  options?: { tenantCode?: string; timeoutSeconds?: number; pollIntervalMs?: number }
): Promise<ReadCardResponse> {
  const tokens = await fetchEmployeeApiToken()
  const timeoutSeconds = clampNumber(options?.timeoutSeconds ?? 15, 1, 60)
  const pollIntervalMs = clampNumber(options?.pollIntervalMs ?? 1200, 200, 5000)

  try {
    const response = await fetch(`${API_BASE_URL}/api/hikgateway/read-card/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access}`,
      },
      body: JSON.stringify({
        dev_index: devIndex,
        tenant: options?.tenantCode || undefined,
        timeout_seconds: timeoutSeconds,
        poll_interval_ms: pollIntervalMs,
      }),
      cache: "no-store",
    })

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (response.ok) {
      return {
        status: "ok",
        dev_index: String(payload.dev_index ?? devIndex),
        card_no: String(payload.card_no ?? "").trim(),
        event_time: payload.event_time == null ? null : String(payload.event_time),
        serial_no:
          typeof payload.serial_no === "number" && Number.isFinite(payload.serial_no)
            ? payload.serial_no
            : null,
        card_reader_no:
          typeof payload.card_reader_no === "number" && Number.isFinite(payload.card_reader_no)
            ? payload.card_reader_no
            : null,
        door_no:
          typeof payload.door_no === "number" && Number.isFinite(payload.door_no)
            ? payload.door_no
            : null,
        employee_no: String(payload.employee_no ?? "").trim(),
        employee_no_string: String(payload.employee_no_string ?? "").trim(),
      }
    }
  } catch {
    // Fall through to ACS fallback.
  }

  return readCardFromAcsEventsFallback(devIndex, tokens.access, {
    timeoutSeconds,
    pollIntervalMs,
  })
}

export async function enrollFingerprintFromReader(
  deviceId: number,
  payload: {
    employee_id: number
    finger_index: number
    push_to_all_readers?: boolean
    include_cards?: boolean
    quality_threshold?: number
  }
): Promise<EnrollFingerprintResponse> {
  return employeeApiRequest<EnrollFingerprintResponse>(`/api/devices/${deviceId}/enroll-fingerprint/`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function enrollFaceFromReader(
  deviceId: number,
  payload: {
    employee_id: number
    face_data?: string
    face_lib_type?: "infraredFD" | "blackFD" | "staticFD"
    push_to_all_readers?: boolean
    include_cards?: boolean
    include_fingerprints?: boolean
  }
): Promise<EnrollFaceResponse> {
  return employeeApiRequest<EnrollFaceResponse>(`/api/devices/${deviceId}/enroll-face/`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateEmployeeAccessGroups(
  employeeId: string | number,
  accessGroupIds: number[]
): Promise<EmployeeApiItem> {
  return employeeApiRequest<EmployeeApiItem>(`/api/employees/${employeeId}/`, {
    method: "PATCH",
    body: JSON.stringify({ access_groups: accessGroupIds }),
  })
}

export async function updateEmployeeDepartment(
  employeeId: string | number,
  departmentId: number
): Promise<EmployeeApiItem> {
  return employeeApiRequest<EmployeeApiItem>(`/api/employees/${employeeId}/`, {
    method: "PATCH",
    body: JSON.stringify({ department: departmentId }),
  })
}

export async function assignEmployeePlanning(
  employeeId: string | number,
  planningId: number
): Promise<EmployeeApiItem> {
  return employeeApiRequest<EmployeeApiItem>(`/api/employees/${employeeId}/assign-planning/`, {
    method: "POST",
    body: JSON.stringify({ planning: planningId }),
  })
}

export async function assignDepartmentPlanning(
  departmentId: string | number,
  planningId: number,
  includeSubDepartments = false
): Promise<DepartmentApiItem> {
  return employeeApiRequest<DepartmentApiItem>(`/api/departments/${departmentId}/assign-planning/`, {
    method: "POST",
    body: JSON.stringify({
      planning: planningId,
      include_sub_departments: includeSubDepartments,
    }),
  })
}

export async function assignEmployeeWorkShift(
  employeeId: string | number,
  workShiftId: number
): Promise<EmployeeApiItem> {
  return employeeApiRequest<EmployeeApiItem>(`/api/employees/${employeeId}/assign-work-shift/`, {
    method: "POST",
    body: JSON.stringify({ work_shift: workShiftId }),
  })
}

export async function assignEmployeeWorkShifts(
  employeeId: string | number,
  workShiftIds: number[],
  replace = true
): Promise<EmployeeApiItem> {
  return employeeApiRequest<EmployeeApiItem>(`/api/employees/${employeeId}/assign-work-shifts/`, {
    method: "POST",
    body: JSON.stringify({ work_shifts: workShiftIds, replace }),
  })
}

export async function assignEmployeeDevices(
  employeeId: string | number,
  deviceIds: number[],
  options?: { replace?: boolean; deviceAssignmentMode?: "employee_only" | "department_only" | "combined" }
): Promise<EmployeeApiItem> {
  return employeeApiRequest<EmployeeApiItem>(`/api/employees/${employeeId}/assign-devices/`, {
    method: "POST",
    body: JSON.stringify({
      devices: deviceIds,
      replace: options?.replace ?? true,
      ...(options?.deviceAssignmentMode ? { device_assignment_mode: options.deviceAssignmentMode } : {}),
    }),
  })
}

export async function fetchEmployeeSchedule(
  employeeId: string | number,
  month?: string
): Promise<EmployeeScheduleApiResponse> {
  const search = new URLSearchParams()
  if (month) {
    search.set("month", month)
  }
  const query = search.toString()
  return employeeApiRequest<EmployeeScheduleApiResponse>(
    `/api/employees/${employeeId}/schedule/${query ? `?${query}` : ""}`
  )
}

export async function pushEmployeeToGateway(
  employeeId: string | number,
  devIndexes?: string[]
): Promise<PushEmployeeResult> {
  return employeeApiRequest<PushEmployeeResult>(`/api/employees/${employeeId}/push-to-gateway/`, {
    method: "POST",
    body: JSON.stringify(devIndexes ? { dev_indexes: devIndexes } : {}),
  })
}

export async function pushPendingEmployeesToGateway(
  tenantId: number,
  employeeIds?: number[],
  devIndexes?: string[]
): Promise<PushPendingResult> {
  return employeeApiRequest<PushPendingResult>("/api/employees/push-pending/", {
    method: "POST",
    body: JSON.stringify({
      tenant: tenantId,
      ...(employeeIds && employeeIds.length > 0 ? { employee_ids: employeeIds } : {}),
      ...(devIndexes && devIndexes.length > 0 ? { dev_indexes: devIndexes } : {}),
    }),
  })
}

export function isEmployeeApiEnabled() {
  return process.env.NEXT_PUBLIC_EMPLOYEE_API_ENABLED === "true"
}
