import { fetchEmployeeApiToken } from "@/lib/api/employees"

const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"

export type TenantItem = {
  id: number
  name: string
  code: string
}

export type PlanningItem = {
  id: number
  tenant: number
  name: string
  code: string
  description?: string
  timezone?: string
}

export type DeviceItem = {
  id: number
  tenant: number | null
  name: string
  dev_index: string
  serial_number: string
}

export type AccessGroupItem = {
  id: number
  tenant: number
  planning: number | null
  planning_name?: string
  name: string
  code: string
  description: string
  readers: number[]
  reader_count: number
  employee_count: number
}

export type AccessGroupPayload = {
  tenant: number
  name: string
  description?: string
  planning?: number | null
  readers?: number[]
}

export type OrganizationItem = {
  id: number
  tenant: number
  name: string
  code: string
}

export type DepartmentItem = {
  id: number
  tenant: number
  organization: number
  parent: number | null
  planning: number | null
  work_shift: number | null
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
  name: string
  code: string
}

export type DepartmentPayload = {
  tenant: number
  organization: number
  parent?: number | null
  planning?: number | null
  work_shift?: number | null
  devices?: number[]
  name: string
  code?: string
}

export type WorkShiftItem = {
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

export type WorkShiftPayload = {
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

export type PlanningPayload = {
  tenant: number
  name: string
  code?: string
  description?: string
  timezone?: string
  metadata?: Record<string, unknown>
}

function withTenantQuery(path: string, tenantCode?: string): string {
  if (!tenantCode) return path
  const search = new URLSearchParams()
  search.set("tenant", tenantCode)
  return `${path}?${search.toString()}`
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
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
    const body = await response.text()
    throw new Error(`API error (${response.status}) on ${path}: ${body}`)
  }
  if (response.status === 204) {
    return null as T
  }
  return response.json()
}

async function apiDelete(path: string): Promise<void> {
  await apiRequest<null>(path, { method: "DELETE" })
}

export async function fetchTenants(): Promise<TenantItem[]> {
  return apiRequest<TenantItem[]>("/api/tenants/")
}

export async function fetchPlannings(tenantCode?: string): Promise<PlanningItem[]> {
  return apiRequest<PlanningItem[]>(withTenantQuery("/api/plannings/", tenantCode))
}

export async function fetchReaders(tenantCode?: string): Promise<DeviceItem[]> {
  return apiRequest<DeviceItem[]>(withTenantQuery("/api/devices/", tenantCode))
}

export async function fetchAccessGroups(tenantCode?: string): Promise<AccessGroupItem[]> {
  return apiRequest<AccessGroupItem[]>(withTenantQuery("/api/access-groups/", tenantCode))
}

export async function fetchOrganizations(tenantCode?: string): Promise<OrganizationItem[]> {
  return apiRequest<OrganizationItem[]>(withTenantQuery("/api/organizations/", tenantCode))
}

export async function fetchDepartments(tenantCode?: string): Promise<DepartmentItem[]> {
  return apiRequest<DepartmentItem[]>(withTenantQuery("/api/departments/", tenantCode))
}

export async function fetchWorkShifts(tenantCode?: string): Promise<WorkShiftItem[]> {
  return apiRequest<WorkShiftItem[]>(withTenantQuery("/api/work-shifts/", tenantCode))
}

export async function createPlanning(payload: PlanningPayload): Promise<PlanningItem> {
  return apiRequest<PlanningItem>("/api/plannings/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updatePlanning(id: number, payload: Partial<PlanningPayload>): Promise<PlanningItem> {
  return apiRequest<PlanningItem>(`/api/plannings/${id}/`, {
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
  await apiDelete(`/api/plannings/${id}/${query ? `?${query}` : ""}`)
}

export async function createDepartment(payload: DepartmentPayload): Promise<DepartmentItem> {
  return apiRequest<DepartmentItem>("/api/departments/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateDepartment(id: number, payload: Partial<DepartmentPayload>): Promise<DepartmentItem> {
  return apiRequest<DepartmentItem>(`/api/departments/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiDelete(`/api/departments/${id}/`)
}

export async function assignDepartmentPlanning(
  departmentId: number,
  planningId: number,
  includeSubDepartments = false,
): Promise<DepartmentItem> {
  return apiRequest<DepartmentItem>(`/api/departments/${departmentId}/assign-planning/`, {
    method: "POST",
    body: JSON.stringify({
      planning: planningId,
      include_sub_departments: includeSubDepartments,
    }),
  })
}

export async function createWorkShift(payload: WorkShiftPayload): Promise<WorkShiftItem> {
  return apiRequest<WorkShiftItem>("/api/work-shifts/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateWorkShift(id: number, payload: Partial<WorkShiftPayload>): Promise<WorkShiftItem> {
  return apiRequest<WorkShiftItem>(`/api/work-shifts/${id}/`, {
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
  await apiDelete(`/api/work-shifts/${id}/${query ? `?${query}` : ""}`)
}

export async function assignDepartmentWorkShift(departmentId: number, workShiftId: number): Promise<DepartmentItem> {
  return apiRequest<DepartmentItem>(`/api/departments/${departmentId}/assign-work-shift/`, {
    method: "POST",
    body: JSON.stringify({ work_shift: workShiftId }),
  })
}

export async function createAccessGroup(payload: AccessGroupPayload): Promise<AccessGroupItem> {
  return apiRequest<AccessGroupItem>("/api/access-groups/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAccessGroup(id: number, payload: Partial<AccessGroupPayload>): Promise<AccessGroupItem> {
  return apiRequest<AccessGroupItem>(`/api/access-groups/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteAccessGroup(id: number): Promise<void> {
  await apiDelete(`/api/access-groups/${id}/`)
}
