import { apiFetch, apiJson, toApiError } from "@/lib/api/client"
import { getActiveTenantCode } from "@/lib/api/auth"

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
  fields?: string[]
}

export type AttendanceReportExportFormat = "excel" | "pdf" | "csv"

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

function buildAttendanceReportSearchParams(params: FetchAttendanceReportParams = {}): URLSearchParams {
  const defaultTenantCode = getActiveTenantCode()
  const search = new URLSearchParams()
  search.set("period", params.period ?? "weekly")
  if (params.date) search.set("date", params.date)
  if (params.startDate) search.set("start_date", params.startDate)
  if (params.endDate) search.set("end_date", params.endDate)
  if (params.personId) search.set("person_id", params.personId)
  if (params.personIds && params.personIds.length > 0) search.set("person_ids", params.personIds.join(","))
  if (params.fields && params.fields.length > 0) search.set("fields", params.fields.join(","))
  if (params.departmentId !== undefined && params.departmentId !== null && `${params.departmentId}`.trim()) {
    search.set("department_id", String(params.departmentId))
  }
  if (params.devIndex) search.set("dev_index", params.devIndex)
  if (params.source) search.set("source", params.source)

  const tenantCode = params.tenant ?? defaultTenantCode
  if (tenantCode) search.set("tenant", tenantCode)
  return search
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
  return apiJson<AttendanceReportResponse>(`/api/hikgateway/reports/attendance/?${search.toString()}`)
}

export async function downloadAttendanceReport(
  params: FetchAttendanceReportParams = {},
  format: AttendanceReportExportFormat
): Promise<{ blob: Blob; filename: string }> {
  const search = buildAttendanceReportSearchParams(params)
  search.set("export", format)

  const response = await apiFetch(`/api/hikgateway/reports/attendance/?${search.toString()}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw await toApiError(response)
  }

  const blob = await response.blob()
  const fallbackExtension = format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xlsx"
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
  const tenantCode = params.tenant ?? getActiveTenantCode()
  if (!tenantCode) {
    throw new Error("A tenant is required to read attendance corrections.")
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

  const payload = await apiJson<{ results?: AttendanceCorrectionItem[] } | AttendanceCorrectionItem[]>(
    `/api/hikgateway/attendance-corrections/?${search.toString()}`
  )
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

export async function upsertAttendanceCorrection(
  payload: UpsertAttendanceCorrectionPayload
): Promise<AttendanceCorrectionItem> {
  const tenantCode = payload.tenant ?? getActiveTenantCode()
  if (!tenantCode) {
    throw new Error("A tenant is required to save an attendance correction.")
  }

  const resultPayload = await apiJson<{ result?: AttendanceCorrectionItem } | AttendanceCorrectionItem>(
    "/api/hikgateway/attendance-corrections/",
    {
      method: "POST",
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
    }
  )

  if (resultPayload && typeof resultPayload === "object" && "result" in resultPayload && resultPayload.result) {
    return resultPayload.result
  }
  return resultPayload as AttendanceCorrectionItem
}
