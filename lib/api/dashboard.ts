import type {
  AccessEvent,
  DashboardKPIData,
  Device,
  PriorityAction,
} from "@/components/dashboard/types"
import { fetchHikEvents, type HikEvent } from "@/lib/api/access-logs"
import {
  fetchDevices,
  fetchEmployeesDetailed,
  type DeviceApiItem,
  type EmployeeApiItem,
} from "@/lib/api/employees"
import { fetchAttendanceReport, type AttendanceReportResponse } from "@/lib/api/reports"

const DASHBOARD_TENANT = process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ?? "HQ-CASA"

export type DashboardSystemStatus = "connected" | "disconnected" | "syncing"

export type DashboardDataSourceStatus = "ok" | "warning" | "error"
export type DashboardWebhookStatus = "healthy" | "warning" | "offline"

export type DashboardStatusDetails = {
  updatedAt: string
  sources: Array<{
    key: "accessEvents" | "reports" | "employees" | "devices"
    label: string
    status: DashboardDataSourceStatus
    detail: string
  }>
  webhook: {
    status: DashboardWebhookStatus
    label: string
    detail: string
    lastEventAt: string | null
  }
}

export type DashboardPayload = {
  systemStatus: DashboardSystemStatus
  statusDetails: DashboardStatusDetails
  kpiData: DashboardKPIData
  accessEvents: AccessEvent[]
  devices: Device[]
  priorityActions: PriorityAction[]
}

function parseDateMs(value: string | null | undefined): number | null {
  const text = String(value ?? "").trim()
  if (!text) return null
  const parsed = Date.parse(text)
  if (Number.isNaN(parsed)) return null
  return parsed
}

function formatEventTime(value: string | null | undefined): string {
  const parsedMs = parseDateMs(value)
  if (parsedMs === null) return "--:--:--"
  return new Date(parsedMs).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function formatLastSeen(timestampMs: number | null, status: Device["status"]): string {
  if (timestampMs === null) {
    if (status === "online") return "A surveiller"
    if (status === "offline") return "Aucune activite"
    return "Signal instable"
  }

  const diffMs = Math.max(0, Date.now() - timestampMs)
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes <= 0) return "A l'instant"
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Il y a ${diffHours} h`
  return new Date(timestampMs).toLocaleDateString("fr-FR")
}

function normalizeAccessStatus(event: HikEvent): AccessEvent["status"] {
  const accessStatus = String(event.access_status ?? "").trim().toLowerCase()
  if (accessStatus === "denied") return "denied"
  if (accessStatus === "granted") return "granted"

  const eventText = `${event.attendance_status} ${event.attendance_type} ${event.direction}`.toLowerCase()
  if (eventText.includes("deny") || eventText.includes("refus")) return "denied"
  return "granted"
}

function normalizeDeviceStatus(status: string | null | undefined): Device["status"] {
  const normalized = String(status ?? "").trim().toLowerCase()
  if (
    normalized.includes("offline") ||
    normalized.includes("inactive") ||
    normalized.includes("error") ||
    normalized.includes("fault") ||
    normalized.includes("down")
  ) {
    return "offline"
  }
  if (normalized.includes("online") || normalized.includes("active") || normalized.includes("up")) {
    return "online"
  }
  return "warning"
}

function inferDeviceType(device: DeviceApiItem): Device["type"] {
  const sourceText = `${device.name ?? ""} ${device.dev_index ?? ""}`.toLowerCase()
  if (
    sourceText.includes("turnstile") ||
    sourceText.includes("tourniquet") ||
    sourceText.includes("gate") ||
    sourceText.includes("barriere")
  ) {
    return "turnstile"
  }
  if (sourceText.includes("reader") || sourceText.includes("lecteur")) {
    return "reader"
  }
  return "door_controller"
}

function computeLateArrivals(report: AttendanceReportResponse | null): number {
  if (!report?.compliance?.employees?.length) return 0
  return report.compliance.employees.reduce((total, employee) => {
    const lateDays = employee.details.reduce((count, day) => {
      return count + ((day.arrival_delta_minutes ?? 0) > 0 ? 1 : 0)
    }, 0)
    return total + lateDays
  }, 0)
}

function buildPriorityActions(params: {
  deniedEventsCount: number
  warningDevicesCount: number
  pendingGatewayPushCount: number
  correctionCount: number
  apiIssueCount: number
  webhookIssue: boolean
}): PriorityAction[] {
  const healthAction: PriorityAction = params.apiIssueCount > 0
    ? {
        id: "critical-api",
        title: "API hors ligne partielle",
        description: "Une ou plusieurs sources de donnees ne repondent pas.",
        priority: "critical",
        count: params.apiIssueCount,
        ctaLabel: "Diagnostiquer",
        ctaHref: "/settings",
      }
    : {
        id: "critical-webhook",
        title: params.webhookIssue ? "Webhook a verifier" : "Acces refuses recents",
        description: params.webhookIssue
          ? "Aucun evenement recent confirme sur le flux webhook."
          : "Evenements d'acces refuses detectes sur le flux temps reel.",
        priority: "critical",
        count: params.webhookIssue ? 1 : params.deniedEventsCount,
        ctaLabel: "Diagnostiquer",
        ctaHref: params.webhookIssue ? "/settings" : "/access-logs",
      }

  return [
    healthAction,
    {
      id: "warning-devices",
      title: "Appareils a verifier",
      description: "Appareils hors ligne ou avec etat incertain.",
      priority: "warning",
      count: params.warningDevicesCount,
      ctaLabel: "Voir les appareils",
      ctaHref: "/devices",
    },
    {
      id: "warning-pending-push",
      title: "Push employes en attente",
      description: "Employes non synchronises vers la gateway.",
      priority: "warning",
      count: params.pendingGatewayPushCount,
      ctaLabel: "Traiter la file",
      ctaHref: "/employees",
    },
    {
      id: "info-corrections",
      title: "Corrections de pointage",
      description: "Corrections RH en attente de suivi.",
      priority: "info",
      count: params.correctionCount,
      ctaLabel: "Valider",
      ctaHref: "/reports",
    },
  ]
}

/** Race a promise against a timeout – rejects if the promise takes too long. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

const API_TIMEOUT_MS = 5_000

export async function fetchDashboardData(): Promise<DashboardPayload> {
  const tenantCode = DASHBOARD_TENANT.trim() || undefined
  const [eventsResult, reportResult, employeesResult, devicesResult] = await Promise.allSettled([
    withTimeout(fetchHikEvents({ tenant: tenantCode, limit: 80 }), API_TIMEOUT_MS),
    withTimeout(fetchAttendanceReport({ tenant: tenantCode, period: "daily" }), API_TIMEOUT_MS),
    withTimeout(fetchEmployeesDetailed(tenantCode), API_TIMEOUT_MS),
    withTimeout(fetchDevices(tenantCode), API_TIMEOUT_MS),
  ])

  const settled = [eventsResult, reportResult, employeesResult, devicesResult]
  const fulfilledCount = settled.filter((item) => item.status === "fulfilled").length

  let systemStatus: DashboardSystemStatus = "disconnected"
  if (fulfilledCount === settled.length) {
    systemStatus = "connected"
  } else if (fulfilledCount > 0) {
    systemStatus = "syncing"
  }

  const events = eventsResult.status === "fulfilled" ? eventsResult.value.results : []
  const report = reportResult.status === "fulfilled" ? reportResult.value : null
  const employees = employeesResult.status === "fulfilled" ? employeesResult.value : []
  const deviceRows = devicesResult.status === "fulfilled" ? devicesResult.value : []

  const sourceStatuses: DashboardStatusDetails["sources"] = [
    {
      key: "accessEvents",
      label: "Flux acces",
      status: eventsResult.status === "fulfilled" ? "ok" : "error",
      detail:
        eventsResult.status === "fulfilled"
          ? `${events.length} evenements charges`
          : (eventsResult.reason instanceof Error ? eventsResult.reason.message : "Source indisponible"),
    },
    {
      key: "reports",
      label: "Rapports",
      status: reportResult.status === "fulfilled" ? "ok" : "error",
      detail:
        reportResult.status === "fulfilled"
          ? "Rapport journalier charge"
          : (reportResult.reason instanceof Error ? reportResult.reason.message : "Source indisponible"),
    },
    {
      key: "employees",
      label: "Employes",
      status: employeesResult.status === "fulfilled" ? "ok" : "error",
      detail:
        employeesResult.status === "fulfilled"
          ? `${employees.length} employes charges`
          : (employeesResult.reason instanceof Error ? employeesResult.reason.message : "Source indisponible"),
    },
    {
      key: "devices",
      label: "Appareils",
      status: devicesResult.status === "fulfilled" ? "ok" : "error",
      detail:
        devicesResult.status === "fulfilled"
          ? `${deviceRows.length} appareils charges`
          : (devicesResult.reason instanceof Error ? devicesResult.reason.message : "Source indisponible"),
    },
  ]

  const latestEventMs = events.reduce<number | null>((latest, event) => {
    const eventMs = parseDateMs(event.timestamp)
    if (eventMs === null) return latest
    if (latest === null) return eventMs
    return eventMs > latest ? eventMs : latest
  }, null)
  const hasRecentEvent = latestEventMs !== null && Date.now() - latestEventMs <= 30 * 60 * 1000
  const webhookStatus: DashboardWebhookStatus =
    eventsResult.status !== "fulfilled"
      ? "offline"
      : hasRecentEvent
        ? "healthy"
        : "warning"
  const webhookLabel =
    webhookStatus === "healthy"
      ? "Webhook actif"
      : webhookStatus === "warning"
        ? "Webhook a verifier"
        : "Webhook hors ligne"
  const webhookDetail =
    webhookStatus === "healthy"
      ? "Reception des evenements operationnelle"
      : webhookStatus === "warning"
        ? "Aucun evenement recent recu. Verifiez la connectivite et les listeners."
        : "Impossible de contacter la source d'evenements."

  const latestEventByDevIndex = new Map<string, number>()
  for (const event of events) {
    const devIndex = String(event.device.dev_index ?? "").trim()
    if (!devIndex) continue
    const eventMs = parseDateMs(event.timestamp)
    if (eventMs === null) continue
    const current = latestEventByDevIndex.get(devIndex)
    if (current === undefined || eventMs > current) {
      latestEventByDevIndex.set(devIndex, eventMs)
    }
  }

  const accessEvents: AccessEvent[] = events.slice(0, 20).map((event) => {
    const personId = String(event.person_id ?? "").trim()
    const employeeName = String(event.employee_name ?? "").trim()
    return {
      id: String(event.id),
      employeeId: personId || "N/A",
      name: employeeName || personId || "Employe inconnu",
      department: String(event.department_name ?? "").trim() || "Non assigne",
      deviceName: String(event.device.device_name ?? "").trim() || event.device.dev_index || "Appareil",
      status: normalizeAccessStatus(event),
      timestamp: formatEventTime(event.timestamp),
    }
  })

  const severityByStatus: Record<Device["status"], number> = {
    offline: 0,
    warning: 1,
    online: 2,
  }

  const devices: Device[] = deviceRows
    .map((device) => {
      const devIndex = String(device.dev_index ?? "").trim()
      const status = normalizeDeviceStatus(device.status)
      const lastEventMs = latestEventByDevIndex.get(devIndex) ?? null
      return {
        id: String(device.id ?? devIndex),
        name: String(device.name ?? "").trim() || devIndex || "Appareil",
        type: inferDeviceType(device),
        location: device.serial_number ? `SN ${device.serial_number}` : `DevIndex ${devIndex || "N/A"}`,
        status,
        lastSeen: formatLastSeen(lastEventMs, status),
      }
    })
    .sort((left, right) => {
      return severityByStatus[left.status] - severityByStatus[right.status] || left.name.localeCompare(right.name, "fr")
    })

  const presentToday = report?.summary.total_employees ?? 0
  const totalEmployees = employees.length > 0 ? employees.length : presentToday
  const lateArrivals = computeLateArrivals(report)
  const totalAbsences = Math.max(totalEmployees - presentToday, 0)

  const onlineDevices = devices.filter((device) => device.status === "online").length
  const warningOrOfflineDevices = devices.filter((device) => device.status !== "online").length
  const deniedEventsCount = events.filter((event) => normalizeAccessStatus(event) === "denied").length
  const pendingGatewayPushCount = employees.reduce((count: number, employee: EmployeeApiItem) => {
    return count + (employee.needs_gateway_push ? 1 : 0)
  }, 0)
  const correctionCount = report?.corrections?.length ?? 0
  const apiIssueCount = sourceStatuses.filter((source) => source.status === "error").length

  const kpiData: DashboardKPIData = {
    presentToday: {
      count: presentToday,
      total: totalEmployees,
    },
    totalAbsences,
    lateArrivals,
    activeDevices: {
      count: onlineDevices,
      total: devices.length,
    },
  }

  const priorityActions = buildPriorityActions({
    deniedEventsCount,
    warningDevicesCount: warningOrOfflineDevices,
    pendingGatewayPushCount,
    correctionCount,
    apiIssueCount,
    webhookIssue: webhookStatus !== "healthy",
  })

  const statusDetails: DashboardStatusDetails = {
    updatedAt: new Date().toISOString(),
    sources: sourceStatuses,
    webhook: {
      status: webhookStatus,
      label: webhookLabel,
      detail: webhookDetail,
      lastEventAt: latestEventMs ? new Date(latestEventMs).toISOString() : null,
    },
  }

  return {
    systemStatus,
    statusDetails,
    kpiData,
    accessEvents,
    devices,
    priorityActions,
  }
}
