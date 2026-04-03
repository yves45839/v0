import { fetchEmployeeApiToken } from "@/lib/api/employees"

export type AttendanceReportPeriod = "daily" | "weekly" | "monthly"

export type AttendanceReportSummary = {
  total_logs: number
  total_employees: number
  checkins: number
  checkouts: number
  unknown_events: number
}

export type AttendanceReportTimelineItem = {
  date: string
  total_logs: number
  distinct_employees: number
  checkins: number
  checkouts: number
  unknown_events: number
}

export type AttendanceReportEmployeeItem = {
  tenant: string
  person_id: string
  employee_name: string
  department_name: string
  total_logs: number
  checkins: number
  checkouts: number
  unknown_events: number
  days_present: number
  first_activity: string | null
  last_activity: string | null
  first_checkin: string | null
  last_checkout: string | null
}

export type AttendanceReportResponse = {
  period: AttendanceReportPeriod
  range: {
    start_date: string
    end_date: string
  }
  summary: AttendanceReportSummary
  timeline: AttendanceReportTimelineItem[]
  employees: AttendanceReportEmployeeItem[]
  filters: {
    tenant: string | null
    person_id: string | null
    person_ids?: string[]
    department_id?: number | null
    dev_index: string | null
    source: string | null
  }
  corrections?: AttendanceCorrectionItem[]
  compliance?: {
    summary: {
      evaluated_employees: number
      expected_work_days: number
      compliant_days: number
      partial_days: number
      missing_days: number
      unexpected_activity_days: number
      rest_days: number
      compliance_rate: number | null
    }
    employees: Array<{
      tenant: string
      person_id: string
      employee_name: string
      department_name: string
      planning_name: string
      work_shift_name: string
      expected_work_days: number
      compliant_days: number
      partial_days: number
      missing_days: number
      unexpected_activity_days: number
      rest_days: number
      compliance_rate: number | null
      details: Array<{
        date: string
        status: "compliant" | "partial" | "missing" | "unexpected_activity" | "rest"
        expected_work_period: boolean
        observed: {
          total_logs: number
          checkins: number
          checkouts: number
          unknown_events: number
        }
        planned_minutes: number
        expected_checkin_at?: string | null
        expected_checkout_at?: string | null
        actual_checkin_at?: string | null
        actual_checkout_at?: string | null
        arrival_delta_minutes?: number | null
        departure_delta_minutes?: number | null
      }>
    }>
  }
}

export type AttendanceCorrectionItem = {
  id: number
  tenant: string
  person_id: string
  employee_name: string
  date: string
  arrival_time: string
  departure_time: string
  break_start_time: string | null
  break_end_time: string | null
  overtime_hours: number | null
  notes: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

type FetchAttendanceReportParams = {
  period?: AttendanceReportPeriod
  date?: string
  startDate?: string
  endDate?: string
  tenant?: string
  personId?: string
  personIds?: string[]
  departmentId?: string | number
  devIndex?: string
  source?: string
}

export type AttendanceReportExportFormat = "excel" | "pdf"

type FetchAttendanceCorrectionsParams = {
  tenant?: string
  personId: string
  date?: string
  startDate?: string
  endDate?: string
}

type UpsertAttendanceCorrectionPayload = {
  tenant?: string
  personId: string
  date: string
  arrivalTime?: string
  departureTime?: string
  breakStartTime?: string
  breakEndTime?: string
  overtimeHours?: number | string | null
  notes?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"
const HIK_EVENTS_TENANT = process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? ""

function buildAttendanceReportSearchParams(params: FetchAttendanceReportParams = {}): URLSearchParams {
  const search = new URLSearchParams()
  search.set("period", params.period ?? "weekly")
  if (params.date) search.set("date", params.date)
  if (params.startDate) search.set("start_date", params.startDate)
  if (params.endDate) search.set("end_date", params.endDate)
  if (params.personId) search.set("person_id", params.personId)
  if (params.personIds && params.personIds.length > 0) search.set("person_ids", params.personIds.join(","))
  if (params.departmentId !== undefined && params.departmentId !== null && `${params.departmentId}`.trim()) {
    search.set("department_id", String(params.departmentId))
  }
  if (params.devIndex) search.set("dev_index", params.devIndex)
  if (params.source) search.set("source", params.source)

  const tenantCode = params.tenant ?? HIK_EVENTS_TENANT
  if (tenantCode) search.set("tenant", tenantCode)
  return search
}

async function buildAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  let accessToken: string | null = null
  try {
    const tokens = await fetchEmployeeApiToken()
    accessToken = tokens.access
  } catch {
    accessToken = null
  }

  const headers: Record<string, string> = { ...extraHeaders }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  return headers
}

function extractFilenameFromContentDisposition(headerValue: string | null, fallback: string): string {
  if (!headerValue) return fallback
  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }
  const simpleMatch = headerValue.match(/filename="?([^"]+)"?/i)
  if (simpleMatch?.[1]) return simpleMatch[1]
  return fallback
}

export async function fetchAttendanceReport(
  params: FetchAttendanceReportParams = {}
): Promise<AttendanceReportResponse> {
  const search = buildAttendanceReportSearchParams(params)
  const headers = await buildAuthHeaders()

  const response = await fetch(`${API_BASE_URL}/api/hikgateway/reports/attendance/?${search.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Attendance report API error (${response.status}): ${body}`)
  }

  return response.json()
}

export async function downloadAttendanceReport(
  params: FetchAttendanceReportParams = {},
  format: AttendanceReportExportFormat
): Promise<{ blob: Blob; filename: string }> {
  const search = buildAttendanceReportSearchParams(params)
  search.set("export", format)

  const headers = await buildAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/hikgateway/reports/attendance/?${search.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Attendance report export error (${response.status}): ${body}`)
  }

  const blob = await response.blob()
  const fallbackExtension = format === "pdf" ? "pdf" : "xlsx"
  const fallbackName = `attendance-report.${fallbackExtension}`
  const filename = extractFilenameFromContentDisposition(
    response.headers.get("content-disposition"),
    fallbackName
  )
  return { blob, filename }
}

export async function fetchAttendanceCorrections(
  params: FetchAttendanceCorrectionsParams
): Promise<AttendanceCorrectionItem[]> {
  const tenantCode = params.tenant ?? HIK_EVENTS_TENANT
  if (!tenantCode) {
    throw new Error("Le tenant est requis pour lire les corrections de pointage.")
  }

  const search = new URLSearchParams()
  search.set("tenant", tenantCode)
  search.set("person_id", params.personId)
  if (params.date) {
    search.set("date", params.date)
  } else {
    if (params.startDate) search.set("start_date", params.startDate)
    if (params.endDate) search.set("end_date", params.endDate)
  }

  const headers = await buildAuthHeaders()

  const response = await fetch(`${API_BASE_URL}/api/hikgateway/attendance-corrections/?${search.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Attendance corrections API error (${response.status}): ${body}`)
  }

  const payload = (await response.json()) as { results?: AttendanceCorrectionItem[] } | AttendanceCorrectionItem[]
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

export async function upsertAttendanceCorrection(
  payload: UpsertAttendanceCorrectionPayload
): Promise<AttendanceCorrectionItem> {
  const tenantCode = payload.tenant ?? HIK_EVENTS_TENANT
  if (!tenantCode) {
    throw new Error("Le tenant est requis pour enregistrer une correction de pointage.")
  }

  const headers = await buildAuthHeaders({
    "Content-Type": "application/json",
  })

  const response = await fetch(`${API_BASE_URL}/api/hikgateway/attendance-corrections/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tenant: tenantCode,
      person_id: payload.personId,
      date: payload.date,
      ...(payload.arrivalTime !== undefined ? { arrival_time: payload.arrivalTime } : {}),
      ...(payload.departureTime !== undefined ? { departure_time: payload.departureTime } : {}),
      ...(payload.breakStartTime !== undefined ? { break_start_time: payload.breakStartTime } : {}),
      ...(payload.breakEndTime !== undefined ? { break_end_time: payload.breakEndTime } : {}),
      ...(payload.overtimeHours !== undefined
        ? {
            overtime_hours:
              payload.overtimeHours === null || `${payload.overtimeHours}`.trim() === ""
                ? null
                : Number(payload.overtimeHours),
          }
        : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Attendance correction save error (${response.status}): ${body}`)
  }

  const resultPayload = (await response.json()) as { result?: AttendanceCorrectionItem } | AttendanceCorrectionItem
  if ("result" in resultPayload && resultPayload.result) return resultPayload.result
  return resultPayload as AttendanceCorrectionItem
}
