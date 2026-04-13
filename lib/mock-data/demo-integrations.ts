// ── Mock data — Intégrations ─────────────────────────────────────────────────

export type IntegrationStatus   = "active" | "inactive" | "error" | "pending" | "deprecated"
export type IntegrationCategory = "hr" | "identity" | "communication" | "erp" | "security" | "cloud"
export type WebhookStatus       = "active" | "inactive" | "failing"
export type ApiKeyStatus        = "active" | "revoked" | "expired"
export type SyncStatus          = "success" | "partial" | "failed" | "running" | "pending"

export type Integration = {
  id: string
  name: string
  description: string
  category: IntegrationCategory
  status: IntegrationStatus
  logoColor: string    // for avatar placeholder
  logoText: string     // short initials
  vendor: string
  version: string
  connectedAt?: string
  lastSyncAt?: string
  nextSyncAt?: string
  syncFrequency: string
  recordsSynced?: number
  errorMessage?: string
  features: string[]
  isNative: boolean
  isPremium: boolean
  documentationUrl: string
}

export type Webhook = {
  id: string
  name: string
  url: string
  events: string[]
  status: WebhookStatus
  secret: string
  createdAt: string
  lastTriggeredAt?: string
  successCount: number
  failureCount: number
  responseTimeMs?: number
  lastStatusCode?: number
}

export type ApiKey = {
  id: string
  name: string
  prefix: string
  scopes: string[]
  status: ApiKeyStatus
  createdAt: string
  expiresAt?: string
  lastUsedAt?: string
  lastUsedIp?: string
  usageCount: number
  createdBy: string
}

export type SyncLog = {
  id: string
  integrationId: string
  integrationName: string
  status: SyncStatus
  startedAt: string
  completedAt?: string
  durationMs?: number
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number
  errorDetail?: string
}

export const INTEGRATIONS: Integration[] = [
  {
    id: "int-001",
    name: "Active Directory",
    description: "Synchronisation des utilisateurs et groupes depuis le LDAP/AD de l'entreprise",
    category: "identity",
    status: "active",
    logoColor: "#00a4ef",
    logoText: "AD",
    vendor: "Microsoft",
    version: "v2.4",
    connectedAt: "2025-01-15T00:00:00Z",
    lastSyncAt: "2026-04-12T06:00:00Z",
    nextSyncAt: "2026-04-12T18:00:00Z",
    syncFrequency: "Toutes les 12h",
    recordsSynced: 112,
    features: ["Sync utilisateurs", "Sync groupes", "Provisioning automatique", "Déprovisionning"],
    isNative: true,
    isPremium: false,
    documentationUrl: "#",
  },
  {
    id: "int-002",
    name: "SIRH PeopleCore",
    description: "Synchronisation des données RH (dates d'embauche, départs, congés, départements)",
    category: "hr",
    status: "active",
    logoColor: "#6366f1",
    logoText: "PC",
    vendor: "PeopleCore SAS",
    version: "v1.9",
    connectedAt: "2025-03-01T00:00:00Z",
    lastSyncAt: "2026-04-12T04:00:00Z",
    nextSyncAt: "2026-04-13T04:00:00Z",
    syncFrequency: "Quotidienne (4h)",
    recordsSynced: 98,
    features: ["Import employés", "Sync départs/arrivées", "Mise à jour départements", "Export présences"],
    isNative: false,
    isPremium: false,
    documentationUrl: "#",
  },
  {
    id: "int-003",
    name: "Slack",
    description: "Envoi de notifications d'alertes et d'incidents sur les canaux Slack configurés",
    category: "communication",
    status: "active",
    logoColor: "#4a154b",
    logoText: "SL",
    vendor: "Slack Technologies",
    version: "v3.0",
    connectedAt: "2025-06-10T00:00:00Z",
    lastSyncAt: "2026-04-12T09:00:00Z",
    syncFrequency: "Temps réel",
    features: ["Alertes sécurité", "Notifications incidents", "Rapports quotidiens", "Commandes slash"],
    isNative: true,
    isPremium: false,
    documentationUrl: "#",
  },
  {
    id: "int-004",
    name: "SAP HR",
    description: "Synchronisation bidirectionnelle avec le module RH SAP (temps de travail, pointage)",
    category: "erp",
    status: "error",
    logoColor: "#009bde",
    logoText: "SAP",
    vendor: "SAP SE",
    version: "v1.2",
    connectedAt: "2025-09-01T00:00:00Z",
    lastSyncAt: "2026-04-10T04:00:00Z",
    errorMessage: "Timeout lors de la connexion au serveur SAP — vérifier la configuration réseau",
    syncFrequency: "Quotidienne (4h)",
    recordsSynced: 0,
    features: ["Export pointage", "Import badgeage", "Rapports temps de travail"],
    isNative: false,
    isPremium: true,
    documentationUrl: "#",
  },
  {
    id: "int-005",
    name: "Microsoft Teams",
    description: "Intégration notifications et alertes dans les canaux Teams de l'organisation",
    category: "communication",
    status: "inactive",
    logoColor: "#464eb8",
    logoText: "MT",
    vendor: "Microsoft",
    version: "v2.1",
    syncFrequency: "Temps réel",
    features: ["Alertes sécurité", "Rapports hebdomadaires", "Tableau de bord Teams"],
    isNative: true,
    isPremium: false,
    documentationUrl: "#",
  },
  {
    id: "int-006",
    name: "AWS S3 Archives",
    description: "Archivage automatique des journaux d'audit et enregistrements vidéo vers S3",
    category: "cloud",
    status: "active",
    logoColor: "#ff9900",
    logoText: "S3",
    vendor: "Amazon Web Services",
    version: "v2.0",
    connectedAt: "2026-01-01T00:00:00Z",
    lastSyncAt: "2026-04-12T02:00:00Z",
    nextSyncAt: "2026-04-13T02:00:00Z",
    syncFrequency: "Nightly (2h)",
    recordsSynced: 18420,
    features: ["Archivage journaux", "Stockage vidéo", "Chiffrement SSE-KMS", "Lifecycle rules"],
    isNative: false,
    isPremium: true,
    documentationUrl: "#",
  },
  {
    id: "int-007",
    name: "Okta SSO",
    description: "Single Sign-On via Okta — authentification centralisée pour tous les accès",
    category: "identity",
    status: "pending",
    logoColor: "#007dc1",
    logoText: "OK",
    vendor: "Okta Inc.",
    version: "v1.0",
    syncFrequency: "Temps réel",
    features: ["SSO SAML 2.0", "Provisioning SCIM", "MFA", "Session management"],
    isNative: false,
    isPremium: true,
    documentationUrl: "#",
  },
  {
    id: "int-008",
    name: "Procore Maintenance",
    description: "Synchronisation des demandes de maintenance liées aux équipements de contrôle d'accès",
    category: "security",
    status: "inactive",
    logoColor: "#f5841f",
    logoText: "PM",
    vendor: "Procore Technologies",
    version: "v1.0",
    syncFrequency: "Quotidienne",
    features: ["Tickets maintenance", "Inventaire appareils", "Planification interventions"],
    isNative: false,
    isPremium: false,
    documentationUrl: "#",
  },
]

export const WEBHOOKS: Webhook[] = [
  { id: "wh-001", name: "Alertes critiques → SIEM", url: "https://siem-interne.corp/api/ingest/securepoint", events: ["alert.critical", "incident.created", "door.forced"], status: "active", secret: "whs_••••••••••••••••", createdAt: "2025-09-01T00:00:00Z", lastTriggeredAt: "2026-04-12T03:22:15Z", successCount: 384, failureCount: 2, responseTimeMs: 145, lastStatusCode: 200 },
  { id: "wh-002", name: "Visits → Portail RH", url: "https://rh-portail.corp/api/visits/webhook", events: ["visitor.checked_in", "visitor.checked_out"], status: "active", secret: "whs_••••••••••••••••", createdAt: "2025-11-15T00:00:00Z", lastTriggeredAt: "2026-04-12T08:55:12Z", successCount: 892, failureCount: 0, responseTimeMs: 62, lastStatusCode: 200 },
  { id: "wh-003", name: "Incidents → PagerDuty", url: "https://events.pagerduty.com/v2/enqueue", events: ["incident.created", "incident.escalated"], status: "failing", secret: "whs_••••••••••••••••", createdAt: "2026-02-01T00:00:00Z", lastTriggeredAt: "2026-04-12T03:22:15Z", successCount: 12, failureCount: 8, responseTimeMs: undefined, lastStatusCode: 503 },
  { id: "wh-004", name: "Events all → Data Warehouse", url: "https://dwh.corp/api/securepoint/events", events: ["*"], status: "inactive", secret: "whs_••••••••••••••••", createdAt: "2026-03-10T00:00:00Z", successCount: 0, failureCount: 0 },
]

export const API_KEYS: ApiKey[] = [
  { id: "ak-001", name: "Intégration SIRH PeopleCore", prefix: "AK-PRD-005", scopes: ["employees:read", "employees:write", "schedules:read"], status: "active", createdAt: "2025-03-01T00:00:00Z", lastUsedAt: "2026-04-12T04:00:00Z", lastUsedIp: "10.0.10.55", usageCount: 2891, createdBy: "Maxime Fontaine" },
  { id: "ak-002", name: "Intégration AD Sync", prefix: "AK-PRD-003", scopes: ["users:read", "users:write", "groups:read", "groups:write"], status: "active", createdAt: "2025-01-15T00:00:00Z", lastUsedAt: "2026-04-12T06:00:00Z", lastUsedIp: "10.0.0.10", usageCount: 8742, createdBy: "Abdoulaye Ndiaye" },
  { id: "ak-003", name: "Reporting externe BI", prefix: "AK-PRD-007", scopes: ["reports:read", "employees:read"], status: "active", createdAt: "2026-01-10T00:00:00Z", expiresAt: "2027-01-10T00:00:00Z", lastUsedAt: "2026-04-12T05:01:44Z", lastUsedIp: "38.142.77.201", usageCount: 144, createdBy: "Kofi Asante" },
  { id: "ak-004", name: "Test développement local", prefix: "AK-DEV-012", scopes: ["*"], status: "revoked", createdAt: "2026-02-14T00:00:00Z", lastUsedAt: "2026-03-28T14:20:00Z", lastUsedIp: "127.0.0.1", usageCount: 331, createdBy: "Maxime Fontaine" },
  { id: "ak-005", name: "Partenaire audit externe", prefix: "AK-EXT-002", scopes: ["audit:read", "reports:read"], status: "expired", createdAt: "2025-10-01T00:00:00Z", expiresAt: "2026-04-01T00:00:00Z", lastUsedAt: "2026-03-31T16:55:00Z", lastUsedIp: "82.65.12.44", usageCount: 28, createdBy: "Abdoulaye Ndiaye" },
]

export const SYNC_LOGS: SyncLog[] = [
  { id: "sl-001", integrationId: "int-001", integrationName: "Active Directory", status: "success", startedAt: "2026-04-12T06:00:00Z", completedAt: "2026-04-12T06:02:14Z", durationMs: 134000, recordsProcessed: 112, recordsCreated: 1, recordsUpdated: 3, recordsSkipped: 108, recordsFailed: 0 },
  { id: "sl-002", integrationId: "int-002", integrationName: "SIRH PeopleCore", status: "success", startedAt: "2026-04-12T04:00:00Z", completedAt: "2026-04-12T04:01:42Z", durationMs: 102000, recordsProcessed: 98, recordsCreated: 0, recordsUpdated: 2, recordsSkipped: 96, recordsFailed: 0 },
  { id: "sl-003", integrationId: "int-004", integrationName: "SAP HR", status: "failed", startedAt: "2026-04-12T04:00:00Z", completedAt: "2026-04-12T04:00:30Z", durationMs: 30000, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0, errorDetail: "Connection timeout — SAP server unreachable (TCP 8000)" },
  { id: "sl-004", integrationId: "int-006", integrationName: "AWS S3 Archives", status: "success", startedAt: "2026-04-12T02:00:00Z", completedAt: "2026-04-12T02:18:33Z", durationMs: 1113000, recordsProcessed: 512, recordsCreated: 512, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0 },
  { id: "sl-005", integrationId: "int-001", integrationName: "Active Directory", status: "success", startedAt: "2026-04-11T18:00:00Z", completedAt: "2026-04-11T18:01:58Z", durationMs: 118000, recordsProcessed: 112, recordsCreated: 0, recordsUpdated: 1, recordsSkipped: 111, recordsFailed: 0 },
  { id: "sl-006", integrationId: "int-004", integrationName: "SAP HR", status: "failed", startedAt: "2026-04-11T04:00:00Z", completedAt: "2026-04-11T04:00:30Z", durationMs: 30000, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0, errorDetail: "Connection timeout — SAP server unreachable" },
]

export const INTEGRATION_STATS = {
  totalActive: 4,
  totalInactive: 2,
  totalError: 1,
  totalPending: 1,
  webhooksActive: 2,
  webhooksFailing: 1,
  apiKeysActive: 3,
  lastSyncStatus: "partial",
}
