import { apiJson, apiList, withTenant } from "@/lib/api/client"
import { fetchHikEvents } from "@/lib/api/access-logs"

/**
 * Alertes dérivées en temps réel à partir des données existantes du backend.
 * Aucune persistance : chaque appel recalcule l'état courant (stateless).
 */

export type DerivedAlertSource = "access_denied" | "device_offline" | "attendance_anomaly"
export type DerivedAlertSeverity = "critical" | "high" | "medium"

export type DerivedAlert = {
  id: string
  source: DerivedAlertSource
  severity: DerivedAlertSeverity
  title: string
  detail: string
  timestamp: string
  meta?: Record<string, unknown>
}

export type DeriveAlertsResult = {
  alerts: DerivedAlert[]
  errors: string[]
}

/** Type local minimal pour GET /api/devices/ (statut = chaîne libre). */
type DeviceRow = {
  id: number
  name?: string
  dev_index?: string
  serial_number?: string
  status?: string
}

/** Types locaux minimaux pour GET /api/hikgateway/reports/attendance/ (period=daily). */
type AttendanceEmployeeRow = {
  person_id: string
  employee_name?: string
  department_name?: string
  checkins?: number
  checkouts?: number
  first_checkin?: string | null
  last_checkout?: string | null
  last_activity?: string | null
}

type AttendanceReportRow = {
  employees?: AttendanceEmployeeRow[]
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
  } catch {
    return iso
  }
}

function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Accès refusés sur les dernières 24h → gravité "high". */
async function deriveAccessDeniedAlerts(): Promise<DerivedAlert[]> {
  const payload = await fetchHikEvents({ limit: 500 })
  const cutoff = Date.now() - 24 * 60 * 60 * 1000

  return payload.results
    .filter((event) => {
      if (event.normalized_action !== "ACCESS_DENIED") return false
      const ts = new Date(event.timestamp).getTime()
      return Number.isFinite(ts) && ts >= cutoff
    })
    .map((event) => {
      const who = event.employee_name?.trim() || event.person_id || "Personne inconnue"
      const deviceName = event.device?.device_name?.trim() || event.device?.dev_index || "Appareil inconnu"
      return {
        id: `access-denied-${event.id}`,
        source: "access_denied" as const,
        severity: "high" as const,
        title: `Accès refusé — ${who}`,
        detail: `${deviceName} · ${formatTime(event.timestamp)}`,
        timestamp: event.timestamp,
        meta: {
          person_id: event.person_id,
          department: event.department_name ?? null,
          direction: event.direction,
        },
      }
    })
}

/** Appareils dont le statut n'est pas "online" → gravité "critical". */
async function deriveDeviceOfflineAlerts(): Promise<DerivedAlert[]> {
  const devices = await apiList<DeviceRow>(withTenant("/api/devices/"))
  const now = new Date().toISOString()

  return devices
    .filter((device) => (device.status ?? "").trim().toLowerCase() !== "online")
    .map((device) => {
      const name = device.name?.trim() || device.serial_number || `Appareil #${device.id}`
      const status = (device.status ?? "").trim() || "inconnu"
      return {
        id: `device-offline-${device.id}`,
        source: "device_offline" as const,
        severity: "critical" as const,
        title: `Appareil hors ligne — ${name}`,
        detail: `Statut : ${status}${device.serial_number ? ` · SN ${device.serial_number}` : ""}`,
        timestamp: now,
        meta: { status: device.status ?? null, dev_index: device.dev_index ?? null },
      }
    })
}

/** Anomalies de pointage du jour (entrée/sortie manquante) → gravité "medium". */
async function deriveAttendanceAnomalyAlerts(): Promise<DerivedAlert[]> {
  const path = withTenant("/api/hikgateway/reports/attendance/", {
    period: "daily",
    date: localDateKey(),
  })
  const report = await apiJson<AttendanceReportRow>(path)
  const fallbackTimestamp = new Date().toISOString()
  const alerts: DerivedAlert[] = []

  for (const row of report.employees ?? []) {
    const issues: string[] = []
    if ((row.checkins ?? 0) === 0) issues.push("entrée manquante")
    if ((row.checkouts ?? 0) === 0) issues.push("sortie manquante")
    if (issues.length === 0) continue

    const who = row.employee_name?.trim() || row.person_id || "Employé inconnu"
    const timestamp = row.last_activity ?? row.first_checkin ?? fallbackTimestamp
    alerts.push({
      id: `attendance-anomaly-${row.person_id}`,
      source: "attendance_anomaly",
      severity: "medium",
      title: `Anomalie de pointage — ${who}`,
      detail: `${issues.join(" et ")}${row.department_name ? ` · ${row.department_name}` : ""}`,
      timestamp,
      meta: {
        person_id: row.person_id,
        checkins: row.checkins ?? 0,
        checkouts: row.checkouts ?? 0,
      },
    })
  }
  return alerts
}

const SOURCE_ERROR_MESSAGES: Record<DerivedAlertSource, string> = {
  access_denied: "Accès refusés (24h) : chargement impossible",
  device_offline: "État des appareils : chargement impossible",
  attendance_anomaly: "Anomalies de pointage du jour : chargement impossible",
}

/**
 * Calcule les alertes dérivées à partir des trois sources réelles.
 * Chaque source est chargée indépendamment : un échec sur l'une n'empêche
 * pas les autres d'être affichées (échecs remontés dans `errors`).
 */
export async function deriveAlerts(): Promise<DeriveAlertsResult> {
  const jobs: Array<{ source: DerivedAlertSource; run: () => Promise<DerivedAlert[]> }> = [
    { source: "access_denied", run: deriveAccessDeniedAlerts },
    { source: "device_offline", run: deriveDeviceOfflineAlerts },
    { source: "attendance_anomaly", run: deriveAttendanceAnomalyAlerts },
  ]

  const settled = await Promise.allSettled(jobs.map((job) => job.run()))
  const alerts: DerivedAlert[] = []
  const errors: string[] = []

  settled.forEach((result, index) => {
    const source = jobs[index].source
    if (result.status === "fulfilled") {
      alerts.push(...result.value)
    } else {
      const reason = result.reason instanceof Error && result.reason.message ? ` (${result.reason.message})` : ""
      errors.push(`${SOURCE_ERROR_MESSAGES[source]}${reason}`)
    }
  })

  return { alerts, errors }
}
