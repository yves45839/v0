import type {
  AccessEvent,
  DashboardKPIData,
  Device,
  PresenceWeekData,
  PresenceWeekDay,
  PriorityAction,
  UpcomingLeaveItem,
  UpcomingLeaveKind,
} from "@/components/dashboard/types"
import { getActiveTenantCode } from "@/lib/api/auth"
import { fetchHikEvents, type HikEvent } from "@/lib/api/access-logs"
import {
  fetchDevices,
  fetchEmployeesDetailed,
  fetchLeaveRequests,
  type DeviceApiItem,
  type EmployeeApiItem,
  type LeaveRequestApiItem,
} from "@/lib/api/employees"
import { fetchAttendanceReport, type AttendanceReportResponse } from "@/lib/api/reports"

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

export type DashboardLocale = "fr" | "en"

export type DashboardPayload = {
  systemStatus: DashboardSystemStatus
  statusDetails: DashboardStatusDetails
  kpiData: DashboardKPIData
  accessEvents: AccessEvent[]
  devices: Device[]
  priorityActions: PriorityAction[]
  presenceWeek: PresenceWeekData
  upcomingLeaves: UpcomingLeaveItem[]
}

const HIK_EVENTS_FETCH_LIMIT = 500
const UPCOMING_LEAVE_HORIZON_DAYS = 30
const MONTHS_FR = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"]
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function parseDateMs(value: string | null | undefined): number | null {
  const text = String(value ?? "").trim()
  if (!text) return null
  const parsed = Date.parse(text)
  if (Number.isNaN(parsed)) return null
  return parsed
}

function formatEventTime(value: string | null | undefined, locale: DashboardLocale): string {
  const parsedMs = parseDateMs(value)
  if (parsedMs === null) return "--:--:--"
  return new Date(parsedMs).toLocaleTimeString(locale === "en" ? "en-US" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function formatLastSeen(timestampMs: number | null, status: Device["status"], locale: DashboardLocale): string {
  if (timestampMs === null) {
    if (locale === "en") {
      if (status === "online") return "Monitor"
      if (status === "offline") return "No activity"
      return "Unstable signal"
    }
    if (status === "online") return "À surveiller"
    if (status === "offline") return "Aucune activité"
    return "Signal instable"
  }

  const diffMs = Math.max(0, Date.now() - timestampMs)
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes <= 0) return locale === "en" ? "Just now" : "À l'instant"
  if (diffMinutes < 60) return locale === "en" ? `${diffMinutes} min ago` : `Il y a ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return locale === "en" ? `${diffHours} h ago` : `Il y a ${diffHours} h`
  return new Date(timestampMs).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")
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

const PRIORITY_STRINGS = {
  en: {
    apiTitle: "Partial API outage",
    apiDesc: "One or more data sources are not responding.",
    webhookTitle: "Webhook to check",
    webhookDesc: "No recent event confirmed on the webhook stream.",
    deniedTitle: "Recent denied access",
    deniedDesc: "Denied access events detected on the live stream.",
    diagnose: "Diagnose",
    devicesTitle: "Devices to check",
    devicesDesc: "Devices offline or in an uncertain state.",
    devicesCta: "View devices",
    pushTitle: "Pending employee push",
    pushDesc: "Employees not yet synced to the gateway.",
    pushCta: "Process queue",
    correctionsTitle: "Attendance corrections",
    correctionsDesc: "HR corrections awaiting follow-up.",
    correctionsCta: "Review",
  },
  fr: {
    apiTitle: "API partiellement hors ligne",
    apiDesc: "Une ou plusieurs sources de données ne répondent pas.",
    webhookTitle: "Webhook à vérifier",
    webhookDesc: "Aucun événement récent confirmé sur le flux webhook.",
    deniedTitle: "Accès refusés récents",
    deniedDesc: "Événements d'accès refusés détectés sur le flux temps réel.",
    diagnose: "Diagnostiquer",
    devicesTitle: "Appareils à vérifier",
    devicesDesc: "Appareils hors ligne ou avec état incertain.",
    devicesCta: "Voir les appareils",
    pushTitle: "Push employés en attente",
    pushDesc: "Employés non synchronisés vers la passerelle.",
    pushCta: "Traiter la file",
    correctionsTitle: "Corrections de pointage",
    correctionsDesc: "Corrections RH en attente de suivi.",
    correctionsCta: "Valider",
  },
} as const

function buildPriorityActions(params: {
  deniedEventsCount: number
  warningDevicesCount: number
  pendingGatewayPushCount: number
  correctionCount: number
  apiIssueCount: number
  webhookIssue: boolean
  locale: DashboardLocale
}): PriorityAction[] {
  const s = PRIORITY_STRINGS[params.locale]
  const healthAction: PriorityAction = params.apiIssueCount > 0
    ? {
        id: "critical-api",
        title: s.apiTitle,
        description: s.apiDesc,
        priority: "critical",
        count: params.apiIssueCount,
        ctaLabel: s.diagnose,
        ctaHref: "/settings?tab=hikcentral",
      }
    : {
        id: "critical-webhook",
        title: params.webhookIssue ? s.webhookTitle : s.deniedTitle,
        description: params.webhookIssue ? s.webhookDesc : s.deniedDesc,
        priority: "critical",
        count: params.webhookIssue ? 1 : params.deniedEventsCount,
        ctaLabel: s.diagnose,
        ctaHref: params.webhookIssue ? "/settings?tab=hikcentral" : "/access-logs?status=denied&date=today",
      }

  return [
    healthAction,
    {
      id: "warning-devices",
      title: s.devicesTitle,
      description: s.devicesDesc,
      priority: "warning",
      count: params.warningDevicesCount,
      ctaLabel: s.devicesCta,
      ctaHref: "/devices?status=attention",
    },
    {
      id: "warning-pending-push",
      title: s.pushTitle,
      description: s.pushDesc,
      priority: "warning",
      count: params.pendingGatewayPushCount,
      ctaLabel: s.pushCta,
      ctaHref: "/employees?focus=pending-sync",
    },
    {
      id: "info-corrections",
      title: s.correctionsTitle,
      description: s.correctionsDesc,
      priority: "info",
      count: params.correctionCount,
      ctaLabel: s.correctionsCta,
      ctaHref: "/reports?focus=corrections",
    },
  ]
}

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function startOfCurrentWeekLocal(now: Date = new Date()): Date {
  const start = startOfLocalDay(now)
  const day = start.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const distanceFromMonday = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - distanceFromMonday)
  return start
}

function computePresenceWeek(
  events: HikEvent[],
  totalEmployees: number,
  reachedEventsLimit: boolean,
): PresenceWeekData {
  const now = new Date()
  const weekStart = startOfCurrentWeekLocal(now)
  const todayStart = startOfLocalDay(now)

  const dayBuckets: Set<string>[] = Array.from({ length: 7 }, () => new Set())
  let oldestEventMs: number | null = null

  for (const event of events) {
    const eventMs = parseDateMs(event.timestamp)
    if (eventMs === null) continue
    if (oldestEventMs === null || eventMs < oldestEventMs) {
      oldestEventMs = eventMs
    }
    const eventDate = new Date(eventMs)
    const dayStart = startOfLocalDay(eventDate)
    const diffDays = Math.round((dayStart.getTime() - weekStart.getTime()) / 86_400_000)
    if (diffDays < 0 || diffDays > 6) continue
    if (normalizeAccessStatus(event) !== "granted") continue
    const personId = String(event.person_id ?? "").trim()
    if (!personId) continue
    dayBuckets[diffDays].add(personId)
  }

  const days: PresenceWeekDay[] = dayBuckets.map((bucket, index) => {
    const dayStart = new Date(weekStart)
    dayStart.setDate(weekStart.getDate() + index)
    const isFuture = dayStart.getTime() > todayStart.getTime()
    const covered =
      isFuture
      || oldestEventMs === null
      || oldestEventMs <= dayStart.getTime()
      || !reachedEventsLimit
    const count = bucket.size
    const value = totalEmployees > 0 ? Math.min(100, Math.round((count / totalEmployees) * 100)) : 0
    return { value, count, covered, isFuture }
  })

  const isPartial = days.some((day) => !day.covered && !day.isFuture)
  const observedDays = days.filter((day) => !day.isFuture && day.covered)
  const averagePct = observedDays.length > 0
    ? Math.round(observedDays.reduce((acc, day) => acc + day.value, 0) / observedDays.length)
    : 0

  return { days, averagePct, isPartial, totalEmployees }
}

function diffDaysCeil(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(ms / 86_400_000) + 1)
}

function leaveTypeToKind(leaveType: LeaveRequestApiItem["leave_type"]): UpcomingLeaveKind {
  if (leaveType === "sick") return "sick"
  if (leaveType === "paid") return "paid"
  return "personal"
}

function buildUpcomingLeaves(
  leaveRequests: LeaveRequestApiItem[],
  employees: EmployeeApiItem[],
  locale: DashboardLocale,
): UpcomingLeaveItem[] {
  const todayStart = startOfLocalDay(new Date())
  const horizon = new Date(todayStart)
  horizon.setDate(horizon.getDate() + UPCOMING_LEAVE_HORIZON_DAYS)

  const employeeNameById = new Map<number, string>()
  for (const employee of employees) {
    employeeNameById.set(employee.id, employee.name)
  }

  type Sortable = { item: UpcomingLeaveItem; startMs: number }

  return leaveRequests
    .filter((leave) => leave.status === "approved")
    .map((leave): Sortable | null => {
      const start = new Date(`${leave.start_date}T00:00:00`)
      const end = new Date(`${leave.end_date}T00:00:00`)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
      if (end.getTime() < todayStart.getTime()) return null
      if (start.getTime() > horizon.getTime()) return null

      const days = diffDaysCeil(start, end)
      const monthIndex = start.getMonth()
      const item: UpcomingLeaveItem = {
        id: String(leave.id),
        day: String(start.getDate()).padStart(2, "0"),
        monthFr: MONTHS_FR[monthIndex],
        monthEn: MONTHS_EN[monthIndex],
        name: employeeNameById.get(leave.employee)
          ?? (locale === "en" ? "Unknown employee" : "Employé inconnu"),
        duration: locale === "en"
          ? (days > 1 ? `${days} d` : "1 d")
          : (days > 1 ? `${days} j` : "1 j"),
        kind: leaveTypeToKind(leave.leave_type),
      }
      return { item, startMs: start.getTime() }
    })
    .filter((entry): entry is Sortable => entry !== null)
    .sort((left, right) => left.startMs - right.startMs)
    .slice(0, 6)
    .map((entry) => entry.item)
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

export async function fetchDashboardData(locale: DashboardLocale = "fr"): Promise<DashboardPayload> {
  const tenantCode = getActiveTenantCode().trim() || undefined
  const [eventsResult, reportResult, employeesResult, devicesResult, leavesResult] = await Promise.allSettled([
    withTimeout(fetchHikEvents({ tenant: tenantCode, limit: HIK_EVENTS_FETCH_LIMIT }), API_TIMEOUT_MS),
    withTimeout(fetchAttendanceReport({ tenant: tenantCode, period: "daily" }), API_TIMEOUT_MS),
    withTimeout(fetchEmployeesDetailed(tenantCode), API_TIMEOUT_MS),
    withTimeout(fetchDevices(tenantCode), API_TIMEOUT_MS),
    withTimeout(fetchLeaveRequests(tenantCode), API_TIMEOUT_MS),
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
  const leaveRequests = leavesResult.status === "fulfilled" ? leavesResult.value : []
  const reachedEventsLimit = events.length >= HIK_EVENTS_FETCH_LIMIT

  const sourceStatuses: DashboardStatusDetails["sources"] = [
    {
      key: "accessEvents",
      label: locale === "en" ? "Access stream" : "Flux accès",
      status: eventsResult.status === "fulfilled" ? "ok" : "error",
      detail:
        eventsResult.status === "fulfilled"
          ? (locale === "en" ? `${events.length} events loaded` : `${events.length} événements chargés`)
          : (eventsResult.reason instanceof Error ? eventsResult.reason.message : (locale === "en" ? "Source unavailable" : "Source indisponible")),
    },
    {
      key: "reports",
      label: locale === "en" ? "Reports" : "Rapports",
      status: reportResult.status === "fulfilled" ? "ok" : "error",
      detail:
        reportResult.status === "fulfilled"
          ? (locale === "en" ? "Daily report loaded" : "Rapport journalier chargé")
          : (reportResult.reason instanceof Error ? reportResult.reason.message : (locale === "en" ? "Source unavailable" : "Source indisponible")),
    },
    {
      key: "employees",
      label: locale === "en" ? "Employees" : "Employes",
      status: employeesResult.status === "fulfilled" ? "ok" : "error",
      detail:
        employeesResult.status === "fulfilled"
          ? (locale === "en" ? `${employees.length} employees loaded` : `${employees.length} employés chargés`)
          : (employeesResult.reason instanceof Error ? employeesResult.reason.message : (locale === "en" ? "Source unavailable" : "Source indisponible")),
    },
    {
      key: "devices",
      label: locale === "en" ? "Devices" : "Appareils",
      status: devicesResult.status === "fulfilled" ? "ok" : "error",
      detail:
        devicesResult.status === "fulfilled"
          ? (locale === "en" ? `${deviceRows.length} devices loaded` : `${deviceRows.length} appareils charges`)
          : (devicesResult.reason instanceof Error ? devicesResult.reason.message : (locale === "en" ? "Source unavailable" : "Source indisponible")),
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
      ? (locale === "en" ? "Webhook active" : "Webhook actif")
      : webhookStatus === "warning"
        ? (locale === "en" ? "Webhook needs attention" : "Webhook a verifier")
        : (locale === "en" ? "Webhook offline" : "Webhook hors ligne")
  const webhookDetail =
    webhookStatus === "healthy"
      ? (locale === "en" ? "Event reception is operational" : "Réception des événements opérationnelle")
      : webhookStatus === "warning"
        ? (locale === "en" ? "No recent events. Check connectivity and listeners." : "Aucun événement récent reçu. Vérifiez la connectivité et les listeners.")
        : (locale === "en" ? "Unable to reach events source." : "Impossible de contacter la source d'événements.")

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
      name: employeeName || personId || (locale === "en" ? "Unknown employee" : "Employé inconnu"),
      department: String(event.department_name ?? "").trim() || (locale === "en" ? "Unassigned" : "Non assigne"),
      deviceName: String(event.device.device_name ?? "").trim() || event.device.dev_index || (locale === "en" ? "Device" : "Appareil"),
      status: normalizeAccessStatus(event),
      timestamp: formatEventTime(event.timestamp, locale),
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
        name: String(device.name ?? "").trim() || devIndex || (locale === "en" ? "Device" : "Appareil"),
        type: inferDeviceType(device),
        location: device.serial_number ? `SN ${device.serial_number}` : `DevIndex ${devIndex || "N/A"}`,
        status,
        lastSeen: formatLastSeen(lastEventMs, status, locale),
      }
    })
    .sort((left, right) => {
      return severityByStatus[left.status] - severityByStatus[right.status] || left.name.localeCompare(right.name, locale === "en" ? "en" : "fr")
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
    locale,
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

  const presenceWeek = computePresenceWeek(events, totalEmployees, reachedEventsLimit)
  const upcomingLeaves = buildUpcomingLeaves(leaveRequests, employees, locale)

  return {
    systemStatus,
    statusDetails,
    kpiData,
    accessEvents,
    devices,
    priorityActions,
    presenceWeek,
    upcomingLeaves,
  }
}
