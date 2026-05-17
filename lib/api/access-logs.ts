import { fetchEmployeeApiToken } from "@/lib/api/employees"
import { getActiveTenantCode } from "@/lib/api/auth"

export type HikEvent = {
  id: number
  tenant: string
  timestamp: string
  person_id: string
  employee_name?: string
  department_name?: string
  device: {
    id: number
    dev_index: string
    serial_number: string
    device_name?: string
    status?: string
  }
  attendance_type: string
  attendance_status: string
  normalized_action?: string
  access_status?: "granted" | "denied" | "unknown" | string
  direction: string
  source: string
  raw_event: {
    id: number
    event_type: string
    event_datetime: string
    major_event_type: number | null
    sub_event_type: number | null
    serial_no: number | null
    card_reader_no?: number | null
    door_no?: number | null
  }
}

export type HikEventsResponse = {
  count: number
  results: HikEvent[]
  filters: {
    tenant: string | null
    source: string | null
    dev_index: string | null
    person_id: string | null
    include_system?: boolean
    since_id?: number | null
    limit: number
  }
}

export type HikCatchupResponse = {
  status: string
  processed: number
  max_results: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"

// Dev safeguard: log a visible warning when tenant env vars are not configured
function _requireTenantCode(value: string | undefined, varName: string): string {
  if (!value || value.trim() === "") {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[LR Time] ${varName} is not set. ` +
        "Add it to your .env.local file. " +
        "Falling back to empty string — API calls that require a tenant code will fail."
      )
    }
    return ""
  }
  return value.trim()
}

const HIK_EVENTS_TENANT = _requireTenantCode(
  process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? process.env.NEXT_PUBLIC_EMPLOYEE_TENANT_CODE,
  "NEXT_PUBLIC_HIK_EVENTS_TENANT"
)

type FetchHikEventsParams = {
  limit?: number
  source?: string
  devIndex?: string
  personId?: string
  tenant?: string
  sinceId?: number
  autoCatchup?: boolean
  includeSystem?: boolean
}

export async function fetchHikEvents(params: FetchHikEventsParams = {}): Promise<HikEventsResponse> {
  const resolvedTenantCode = getActiveTenantCode(HIK_EVENTS_TENANT)
  const search = new URLSearchParams()
  search.set("limit", String(params.limit ?? 200))
  if (params.source) search.set("source", params.source)
  if (params.devIndex) search.set("dev_index", params.devIndex)
  if (params.personId) search.set("person_id", params.personId)
  if (params.tenant || resolvedTenantCode) search.set("tenant", params.tenant ?? resolvedTenantCode)
  if (params.sinceId != null) search.set("since_id", String(params.sinceId))
  if (params.autoCatchup != null) search.set("auto_catchup", params.autoCatchup ? "1" : "0")
  search.set("include_system", params.includeSystem ? "1" : "0")

  let accessToken: string | null = null
  try {
    const tokens = await fetchEmployeeApiToken()
    accessToken = tokens.access
  } catch {
    accessToken = null
  }

  const headers: HeadersInit = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/api/hikgateway/events/?${search.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Hik events API error (${response.status}): ${body}`)
  }

  return response.json()
}

export async function triggerHikEventsCatchup(maxResults = 200): Promise<HikCatchupResponse> {
  const tokens = await fetchEmployeeApiToken()
  const response = await fetch(`${API_BASE_URL}/api/hikgateway/catchup-acs-events/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_results: maxResults }),
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Catchup API error (${response.status}): ${body}`)
  }

  return response.json()
}
