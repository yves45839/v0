import { apiJson, apiList, withTenant } from "@/lib/api/client"
import { fetchHikEvents } from "@/lib/api/access-logs"
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALE_TAGS, isLocale, type Locale } from "@/lib/i18n/config"

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

const ALERT_STRINGS = {
  en: {
    unknownPerson: "Unknown person",
    unknownDevice: "Unknown device",
    unknownEmployee: "Unknown employee",
    unknownStatus: "unknown",
    accessDeniedTitle: (who: string) => `Access denied — ${who}`,
    deviceOfflineTitle: (name: string) => `Device offline — ${name}`,
    deviceFallbackName: (id: number) => `Device #${id}`,
    statusDetail: (status: string) => `Status: ${status}`,
    anomalyTitle: (who: string) => `Attendance anomaly — ${who}`,
    missingCheckin: "missing check-in",
    missingCheckout: "missing check-out",
    issueJoiner: " and ",
    sourceErrors: {
      access_denied: "Access denied (24h): failed to load",
      device_offline: "Device status: failed to load",
      attendance_anomaly: "Today's attendance anomalies: failed to load",
    } as Record<DerivedAlertSource, string>,
  },
  fr: {
    unknownPerson: "Personne inconnue",
    unknownDevice: "Appareil inconnu",
    unknownEmployee: "Employé inconnu",
    unknownStatus: "inconnu",
    accessDeniedTitle: (who: string) => `Accès refusé — ${who}`,
    deviceOfflineTitle: (name: string) => `Appareil hors ligne — ${name}`,
    deviceFallbackName: (id: number) => `Appareil #${id}`,
    statusDetail: (status: string) => `Statut : ${status}`,
    anomalyTitle: (who: string) => `Anomalie de pointage — ${who}`,
    missingCheckin: "entrée manquante",
    missingCheckout: "sortie manquante",
    issueJoiner: " et ",
    sourceErrors: {
      access_denied: "Accès refusés (24h) : chargement impossible",
      device_offline: "État des appareils : chargement impossible",
      attendance_anomaly: "Anomalies de pointage du jour : chargement impossible",
    } as Record<DerivedAlertSource, string>,
  },
} satisfies Record<Locale, unknown>

type AlertStrings = (typeof ALERT_STRINGS)[Locale]

function resolveLocale(locale?: Locale): Locale {
  if (locale) return locale
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(LOCALE_STORAGE_KEY) : null
  return isLocale(stored) ? stored : DEFAULT_LOCALE
}

function formatTime(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
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
async function deriveAccessDeniedAlerts(s: AlertStrings, locale: Locale): Promise<DerivedAlert[]> {
  const payload = await fetchHikEvents({ limit: 500 })
  const cutoff = Date.now() - 24 * 60 * 60 * 1000

  return payload.results
    .filter((event) => {
      if (event.normalized_action !== "ACCESS_DENIED") return false
      const ts = new Date(event.timestamp).getTime()
      return Number.isFinite(ts) && ts >= cutoff
    })
    .map((event) => {
      const who = event.employee_name?.trim() || event.person_id || s.unknownPerson
      const deviceName = event.device?.device_name?.trim() || event.device?.dev_index || s.unknownDevice
      return {
        id: `access-denied-${event.id}`,
        source: "access_denied" as const,
        severity: "high" as const,
        title: s.accessDeniedTitle(who),
        detail: `${deviceName} · ${formatTime(event.timestamp, locale)}`,
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
async function deriveDeviceOfflineAlerts(s: AlertStrings): Promise<DerivedAlert[]> {
  const devices = await apiList<DeviceRow>(withTenant("/api/devices/"))
  const now = new Date().toISOString()

  return devices
    .filter((device) => (device.status ?? "").trim().toLowerCase() !== "online")
    .map((device) => {
      const name = device.name?.trim() || device.serial_number || s.deviceFallbackName(device.id)
      const status = (device.status ?? "").trim() || s.unknownStatus
      return {
        id: `device-offline-${device.id}`,
        source: "device_offline" as const,
        severity: "critical" as const,
        title: s.deviceOfflineTitle(name),
        detail: `${s.statusDetail(status)}${device.serial_number ? ` · SN ${device.serial_number}` : ""}`,
        timestamp: now,
        meta: { status: device.status ?? null, dev_index: device.dev_index ?? null },
      }
    })
}

/** Anomalies de pointage du jour (entrée/sortie manquante) → gravité "medium". */
async function deriveAttendanceAnomalyAlerts(s: AlertStrings): Promise<DerivedAlert[]> {
  const path = withTenant("/api/hikgateway/reports/attendance/", {
    period: "daily",
    date: localDateKey(),
  })
  const report = await apiJson<AttendanceReportRow>(path)
  const fallbackTimestamp = new Date().toISOString()
  const alerts: DerivedAlert[] = []

  for (const row of report.employees ?? []) {
    const issues: string[] = []
    if ((row.checkins ?? 0) === 0) issues.push(s.missingCheckin)
    if ((row.checkouts ?? 0) === 0) issues.push(s.missingCheckout)
    if (issues.length === 0) continue

    const who = row.employee_name?.trim() || row.person_id || s.unknownEmployee
    const timestamp = row.last_activity ?? row.first_checkin ?? fallbackTimestamp
    alerts.push({
      id: `attendance-anomaly-${row.person_id}`,
      source: "attendance_anomaly",
      severity: "medium",
      title: s.anomalyTitle(who),
      detail: `${issues.join(s.issueJoiner)}${row.department_name ? ` · ${row.department_name}` : ""}`,
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

/**
 * Calcule les alertes dérivées à partir des trois sources réelles.
 * Chaque source est chargée indépendamment : un échec sur l'une n'empêche
 * pas les autres d'être affichées (échecs remontés dans `errors`).
 */
export async function deriveAlerts(locale?: Locale): Promise<DeriveAlertsResult> {
  const resolved = resolveLocale(locale)
  const s = ALERT_STRINGS[resolved]
  const jobs: Array<{ source: DerivedAlertSource; run: () => Promise<DerivedAlert[]> }> = [
    { source: "access_denied", run: () => deriveAccessDeniedAlerts(s, resolved) },
    { source: "device_offline", run: () => deriveDeviceOfflineAlerts(s) },
    { source: "attendance_anomaly", run: () => deriveAttendanceAnomalyAlerts(s) },
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
      errors.push(`${s.sourceErrors[source]}${reason}`)
    }
  })

  return { alerts, errors }
}
