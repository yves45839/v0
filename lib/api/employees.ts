export type AuthTokens = {
  access: string
  refresh: string
}

export type CreateEmployeePayload = {
  tenant: number
  employee_no: string
  name: string
  department?: number
  devices?: number[]
  email?: string
  phone?: string
  position?: string
  cards?: Array<{ card_no: string; card_type?: string }>
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

const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"
const API_USERNAME = process.env.NEXT_PUBLIC_EMPLOYEE_API_USERNAME ?? "emp-admin"
const API_PASSWORD = process.env.NEXT_PUBLIC_EMPLOYEE_API_PASSWORD ?? "pass"

export async function fetchEmployeeApiToken(): Promise<AuthTokens> {
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

  return response.json()
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

export function isEmployeeApiEnabled() {
  return process.env.NEXT_PUBLIC_EMPLOYEE_API_ENABLED === "true"
}
