import type { DerivedAlertSeverity, DerivedAlertSource } from "@/lib/api/alerts"

const en = {
  title: "Alerts",
  subtitle: (n: number) => `Real-time detection — ${n} active alert${n !== 1 ? "s" : ""}`,
  updatedAgo: (relative: string) => `(updated ${relative})`,
  refresh: "Refresh",

  criticalBanner: (n: number) => `${n} critical alert${n > 1 ? "s" : ""} — immediate action required`,
  partialFailures: "Some sources could not be loaded:",

  kpiActive: "Active",
  kpiCritical: "Critical",
  kpiHigh: "High",
  kpiMedium: "Medium",

  liveTab: "Live feed",
  sourcesTab: "Detection sources",

  severityFilterLabel: "Severity",
  sourceFilterLabel: "Source",
  all: "All",

  loadingAlerts: "Loading alerts…",
  loadFailedTitle: "Unable to load alerts",
  loadFailedHint: "No detection source could be reached. Check the server connection and try again.",
  retry: "Retry",
  emptyAll: "No active alerts — all clear",
  emptyFiltered: "No alerts match the filters",
  emptyFilteredHint: "Adjust the severity or source filters.",

  sourcesTitle: "Detection sources",
  sourcesDescription:
    "Alerts are derived automatically from live data on every refresh (every 30 seconds). No rules to configure, no persisted state.",

  // Relative time
  justNow: "just now",
  minutesAgo: (m: number) => `${m} min ago`,
  hoursAgo: (h: number) => `${h}h ago`,
  daysAgo: (d: number) => `${d}d ago`,

  severity: {
    critical: "Critical",
    high: "High",
    medium: "Medium",
  } satisfies Record<DerivedAlertSeverity, string> as Record<DerivedAlertSeverity, string>,

  sources: {
    access_denied: {
      label: "Access denied",
      description: "Access-denied events reported by devices over the last 24 hours.",
    },
    device_offline: {
      label: "Device offline",
      description: "Inventory devices whose status is not “online” (offline or unknown).",
    },
    attendance_anomaly: {
      label: "Attendance anomaly",
      description: "Anomalies in today's attendance report: a missing clock-in or clock-out per employee.",
    },
  } satisfies Record<DerivedAlertSource, { label: string; description: string }> as Record<
    DerivedAlertSource,
    { label: string; description: string }
  >,
}

const fr: typeof en = {
  title: "Alertes",
  subtitle: (n: number) => `Détection en temps réel — ${n} alerte${n !== 1 ? "s" : ""} active${n !== 1 ? "s" : ""}`,
  updatedAgo: (relative: string) => `(mise à jour ${relative})`,
  refresh: "Actualiser",

  criticalBanner: (n: number) =>
    `${n} alerte${n > 1 ? "s" : ""} critique${n > 1 ? "s" : ""} — intervention requise immédiatement`,
  partialFailures: "Certaines sources n'ont pas pu être chargées :",

  kpiActive: "Actives",
  kpiCritical: "Critiques",
  kpiHigh: "Élevées",
  kpiMedium: "Modérées",

  liveTab: "Flux actif",
  sourcesTab: "Sources de détection",

  severityFilterLabel: "Gravité",
  sourceFilterLabel: "Source",
  all: "Toutes",

  loadingAlerts: "Chargement des alertes…",
  loadFailedTitle: "Impossible de charger les alertes",
  loadFailedHint: "Aucune source de détection n'a pu être contactée. Vérifiez la connexion au serveur puis réessayez.",
  retry: "Réessayer",
  emptyAll: "Aucune alerte active — tout est en ordre",
  emptyFiltered: "Aucune alerte ne correspond aux filtres",
  emptyFilteredHint: "Modifiez les filtres de gravité ou de source.",

  sourcesTitle: "Sources de détection",
  sourcesDescription:
    "Les alertes sont dérivées automatiquement des données réelles à chaque actualisation (toutes les 30 secondes). Aucune règle à configurer, aucun état persisté.",

  // Temps relatif
  justNow: "à l'instant",
  minutesAgo: (m: number) => `il y a ${m} min`,
  hoursAgo: (h: number) => `il y a ${h}h`,
  daysAgo: (d: number) => `il y a ${d}j`,

  severity: {
    critical: "Critique",
    high: "Élevée",
    medium: "Modérée",
  },

  sources: {
    access_denied: {
      label: "Accès refusé",
      description: "Événements d'accès refusés remontés par les appareils sur les dernières 24 heures.",
    },
    device_offline: {
      label: "Appareil hors ligne",
      description: "Appareils de l'inventaire dont le statut n'est pas « online » (hors ligne ou inconnu).",
    },
    attendance_anomaly: {
      label: "Anomalie de pointage",
      description: "Anomalies du rapport de présence du jour : entrée ou sortie manquante par employé.",
    },
  },
}

export const alertsDict = { en, fr }
