import { apiJson } from "@/lib/api/client"
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
  const resolvedTenantCode = getActiveTenantCode()
  const search = new URLSearchParams()
  search.set("limit", String(params.limit ?? 200))
  if (params.source) search.set("source", params.source)
  if (params.devIndex) search.set("dev_index", params.devIndex)
  if (params.personId) search.set("person_id", params.personId)
  if (params.tenant || resolvedTenantCode) search.set("tenant", params.tenant ?? resolvedTenantCode)
  if (params.sinceId != null) search.set("since_id", String(params.sinceId))
  if (params.autoCatchup != null) search.set("auto_catchup", params.autoCatchup ? "1" : "0")
  search.set("include_system", params.includeSystem ? "1" : "0")

  return apiJson<HikEventsResponse>(`/api/hikgateway/events/?${search.toString()}`)
}

export async function triggerHikEventsCatchup(maxResults = 200): Promise<HikCatchupResponse> {
  return apiJson<HikCatchupResponse>("/api/hikgateway/catchup-acs-events/", {
    method: "POST",
    body: JSON.stringify({ max_results: maxResults }),
  })
}
