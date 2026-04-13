// ── Mock data — Audit & Conformité ───────────────────────────────────────────

export type AuditEventType =
  | "access_granted" | "access_denied" | "door_forced" | "door_held_open"
  | "badge_created" | "badge_revoked" | "badge_suspended"
  | "user_created" | "user_modified" | "user_deleted"
  | "zone_modified" | "group_modified" | "schedule_modified"
  | "rule_created" | "rule_modified" | "rule_disabled"
  | "system_login" | "system_logout" | "api_access"
  | "export_performed" | "report_generated" | "config_changed"
  | "incident_created" | "incident_resolved"

export type AuditSeverity = "info" | "notice" | "warning" | "critical"

export type AuditEvent = {
  id: string
  type: AuditEventType
  severity: AuditSeverity
  actor: string
  actorType: "user" | "system" | "api" | "badge"
  target: string
  targetType: "employee" | "visitor" | "badge" | "door" | "zone" | "group" | "rule" | "system"
  description: string
  details?: Record<string, string>
  ipAddress?: string
  location?: string
  createdAt: string
}

export type ComplianceCheck = {
  id: string
  name: string
  category: string
  description: string
  status: "pass" | "fail" | "warning" | "na"
  score: number
  maxScore: number
  lastChecked: string
  recommendation?: string
  evidence?: string
}

export type ReportTemplate = {
  id: string
  name: string
  description: string
  category: string
  periodicity: "on_demand" | "daily" | "weekly" | "monthly"
  format: "pdf" | "csv" | "xlsx"
  lastGenerated?: string
  scheduledAt?: string
  recipients: string[]
}

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: "AUD-9001", type: "door_forced", severity: "critical", actor: "Inconnu", actorType: "badge", target: "Zone rouge R+4 — Principal", targetType: "door", description: "Effraction détectée sur la porte DR-R401 — Zone confidentielle R+4", details: { door_id: "DR-R401", zone: "zone-004" }, location: "R+4 — Zone confidentielle", createdAt: "2026-04-12T03:22:15Z" },
  { id: "AUD-9000", type: "access_granted", severity: "warning", actor: "Badge EMP-0042 (Ibrahim Diallo)", actorType: "badge", target: "Salle serveurs N3", targetType: "door", description: "Accès accordé hors plage horaire autorisée", details: { badge_id: "EMP-0042", expected_schedule: "sch-002" }, ipAddress: undefined, location: "N3 — Salle serveurs", createdAt: "2026-04-12T02:47:33Z" },
  { id: "AUD-8999", type: "api_access", severity: "warning", actor: "API Client — Clé AK-PRD-007", actorType: "api", target: "Endpoint GET /api/employees", targetType: "system", description: "Accès API depuis adresse IP non répertoriée dans la liste blanche", details: { ip: "38.142.77.201", endpoint: "GET /api/employees", response_code: "200" }, ipAddress: "38.142.77.201", createdAt: "2026-04-12T05:01:44Z" },
  { id: "AUD-8998", type: "badge_suspended", severity: "notice", actor: "Fatou Keïta", actorType: "user", target: "Badge EMP-0042 (Ibrahim Diallo)", targetType: "badge", description: "Badge suspendu suite à suspicion d'utilisation non autorisée", details: { badge_id: "EMP-0042", reason: "Incident INC-2026-046" }, ipAddress: "192.168.1.105", createdAt: "2026-04-12T03:18:44Z" },
  { id: "AUD-8997", type: "report_generated", severity: "info", actor: "Kofi Asante", actorType: "user", target: "Rapport de présence — Mars 2026", targetType: "system", description: "Rapport mensuel de présence exporté en PDF", details: { format: "PDF", period: "2026-03" }, ipAddress: "192.168.1.88", createdAt: "2026-04-11T14:32:00Z" },
  { id: "AUD-8996", type: "user_created", severity: "info", actor: "Chloé Bernard", actorType: "user", target: "Nouveau compte — Moussa Camara", targetType: "employee", description: "Nouveau compte employé créé avec droits standard", details: { role: "Employé", department: "Logistique" }, ipAddress: "192.168.1.90", createdAt: "2026-04-11T10:15:22Z" },
  { id: "AUD-8995", type: "rule_modified", severity: "notice", actor: "Abdoulaye Ndiaye", actorType: "user", target: "Règle — Multi-échecs accès (RULE-001)", targetType: "rule", description: "Seuil de déclenchement modifié de 5 à 3 tentatives", details: { old_threshold: "5", new_threshold: "3" }, ipAddress: "192.168.1.102", createdAt: "2026-04-10T09:00:00Z" },
  { id: "AUD-8994", type: "group_modified", severity: "notice", actor: "Aminata Touré", actorType: "user", target: "Groupe — Habilitation R+4 (grp-007)", targetType: "group", description: "Ajout d'un membre au groupe : Marie-Claire Dupont", details: { action: "add_member", member: "Marie-Claire Dupont" }, ipAddress: "192.168.1.50", createdAt: "2026-04-09T15:44:00Z" },
  { id: "AUD-8993", type: "export_performed", severity: "info", actor: "Kofi Asante", actorType: "user", target: "Export journaux accès — Q1 2026", targetType: "system", description: "Export CSV des journaux d'accès Q1 2026 (8 742 entrées)", details: { format: "CSV", records: "8742", period: "Q1 2026" }, ipAddress: "192.168.1.88", createdAt: "2026-04-08T11:20:00Z" },
  { id: "AUD-8992", type: "config_changed", severity: "warning", actor: "Maxime Fontaine", actorType: "user", target: "Configuration Système — Rétention logs", targetType: "system", description: "Durée de rétention des journaux modifiée de 90 à 180 jours", details: { old_value: "90 jours", new_value: "180 jours" }, ipAddress: "192.168.1.77", createdAt: "2026-04-07T16:05:00Z" },
  { id: "AUD-8991", type: "badge_created", severity: "info", actor: "Service accueil", actorType: "user", target: "Badge visiteur — Sophie Marchand", targetType: "badge", description: "Badge temporaire VIP émis pour visiteur Sophie Marchand", details: { badge_id: "VBG-2026-0412-001", expires: "2026-04-12T18:00:00Z" }, ipAddress: "192.168.1.10", createdAt: "2026-04-12T08:55:12Z" },
  { id: "AUD-8990", type: "system_login", severity: "info", actor: "Abdoulaye Ndiaye", actorType: "user", target: "SecurePoint Control Center", targetType: "system", description: "Connexion administrateur depuis poste fixe bureau", details: { session_id: "sess-44821" }, ipAddress: "192.168.1.102", createdAt: "2026-04-12T08:00:05Z" },
]

export const COMPLIANCE_CHECKS: ComplianceCheck[] = [
  { id: "CC-001", name: "Politique mots de passe", category: "Authentification", description: "Complexité, rotation tous les 90j, blocage après 5 échecs", status: "pass", score: 10, maxScore: 10, lastChecked: "2026-04-12T07:00:00Z", evidence: "Configuration IAM vérifiée" },
  { id: "CC-002", name: "Rétention journaux d'audit", category: "Journalisation", description: "Conservation des logs ≥ 12 mois selon RGPD", status: "pass", score: 10, maxScore: 10, lastChecked: "2026-04-12T07:00:00Z", evidence: "180 jours configurés (validé)" },
  { id: "CC-003", name: "Chiffrement données sensibles", category: "Sécurité données", description: "AES-256 pour badges, TLS 1.3 pour toutes les API", status: "pass", score: 10, maxScore: 10, lastChecked: "2026-04-12T07:00:00Z", evidence: "Audit chiffrement OK" },
  { id: "CC-004", name: "MFA pour administrateurs", category: "Authentification", description: "Authentification à 2 facteurs obligatoire pour tous les admins", status: "warning", score: 7, maxScore: 10, lastChecked: "2026-04-12T07:00:00Z", recommendation: "2 comptes admin sans MFA actif — corriger sous 7 jours", evidence: "8/10 comptes admin avec MFA" },
  { id: "CC-005", name: "Revue droits d'accès trimestrielle", category: "Contrôle d'accès", description: "Vérification trimestrielle des habilitations et groupes", status: "pass", score: 10, maxScore: 10, lastChecked: "2026-04-01T07:00:00Z", evidence: "Revue Q1 2026 effectuée le 01/04" },
  { id: "CC-006", name: "Appareils avec firmware à jour", category: "Infrastructure", description: "100% des lecteurs sur firmware ≤ 45 jours d'ancienneté", status: "fail", score: 4, maxScore: 10, lastChecked: "2026-04-12T07:00:00Z", recommendation: "3 lecteurs (RDR-N112, RDR-103, RDR-B201) avec firmware > 45j", evidence: "Inventaire firmware du 12/04/2026" },
  { id: "CC-007", name: "Plan de réponse aux incidents", category: "Gestion incidents", description: "PRI documenté, testé, mis à jour < 1 an", status: "pass", score: 10, maxScore: 10, lastChecked: "2026-03-15T00:00:00Z", evidence: "PRI v3.2 — dernière mise à jour 15/03/2026" },
  { id: "CC-008", name: "Séparation des privilèges", category: "Contrôle d'accès", description: "Aucun compte avec accès total sans approbation dual-control", status: "pass", score: 10, maxScore: 10, lastChecked: "2026-04-12T07:00:00Z", evidence: "IAM validé" },
  { id: "CC-009", name: "Tests de pénétration annuels", category: "Sécurité technique", description: "Pentest externe annuel + rapport de remédiation", status: "warning", score: 6, maxScore: 10, lastChecked: "2025-09-01T00:00:00Z", recommendation: "Dernier pentest il y a 7 mois — planifier test 2026", evidence: "Rapport pentest sept. 2025" },
  { id: "CC-010", name: "Sauvegardes chiffrées testées", category: "Continuité", description: "Sauvegardes quotidiennes, chiffrées, testées mensuellement", status: "pass", score: 10, maxScore: 10, lastChecked: "2026-04-01T07:00:00Z", evidence: "Test restauration 01/04/2026 — OK" },
]

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "RPT-001", name: "Rapport de présence mensuel", description: "Synthèse des accès par employé et département", category: "RH", periodicity: "monthly", format: "pdf", lastGenerated: "2026-04-01T06:00:00Z", scheduledAt: "2026-05-01T06:00:00Z", recipients: ["rh@securepoint.fr", "direction@securepoint.fr"] },
  { id: "RPT-002", name: "Journal d'audit hebdomadaire", description: "Toutes les actions administratives de la semaine", category: "Sécurité", periodicity: "weekly", format: "pdf", lastGenerated: "2026-04-08T06:00:00Z", scheduledAt: "2026-04-15T06:00:00Z", recipients: ["rssi@securepoint.fr"] },
  { id: "RPT-003", name: "Export journaux d'accès bruts", description: "Données brutes CSV de tous les événements d'accès", category: "Conformité", periodicity: "on_demand", format: "csv", lastGenerated: "2026-04-08T11:20:00Z", recipients: [] },
  { id: "RPT-004", name: "Rapport de conformité RGPD", description: "Vérification des indicateurs RGPD (rétention, accès, exports)", category: "Conformité", periodicity: "monthly", format: "pdf", lastGenerated: "2026-04-01T06:00:00Z", scheduledAt: "2026-05-01T06:00:00Z", recipients: ["dpo@securepoint.fr", "rssi@securepoint.fr"] },
  { id: "RPT-005", name: "Incidents de sécurité du mois", description: "Synthèse des incidents, temps de résolution, impacts", category: "Sécurité", periodicity: "monthly", format: "pdf", lastGenerated: "2026-04-01T06:00:00Z", scheduledAt: "2026-05-01T06:00:00Z", recipients: ["direction@securepoint.fr", "rssi@securepoint.fr"] },
  { id: "RPT-006", name: "Inventaire appareils & firmware", description: "État de tous les lecteurs, caméras, capteurs et versions firmware", category: "Infrastructure", periodicity: "weekly", format: "xlsx", lastGenerated: "2026-04-08T06:00:00Z", scheduledAt: "2026-04-15T06:00:00Z", recipients: ["it@securepoint.fr"] },
]

export const COMPLIANCE_SCORE = {
  global: 87,
  authentication: 85,
  accessControl: 100,
  infrastructure: 40,
  dataProtection: 100,
  incidentManagement: 100,
  continuity: 100,
  technicalSecurity: 60,
}
