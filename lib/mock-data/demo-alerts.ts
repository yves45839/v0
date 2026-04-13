// ── Mock data — Alertes & Incidents ──────────────────────────────────────────

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info"
export type AlertStatus   = "active" | "acknowledged" | "resolved" | "dismissed"
export type AlertCategory = "access" | "intrusion" | "device" | "system" | "compliance"

export type AlertObject = {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  status: AlertStatus
  category: AlertCategory
  location: string
  zoneId: string
  source: string
  createdAt: string
  updatedAt: string
  acknowledgedBy?: string
  resolvedBy?: string
  resolvedAt?: string
  eventCount: number
  tags: string[]
}

export type IncidentStatus = "open" | "investigating" | "contained" | "resolved" | "closed"
export type IncidentSeverity = "P1" | "P2" | "P3" | "P4"

export type IncidentEvent = {
  id: string
  type: "comment" | "status_change" | "assignment" | "action" | "escalation"
  author: string
  content: string
  createdAt: string
}

export type Incident = {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  category: AlertCategory
  location: string
  assignedTo: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  affectedAssets: string[]
  relatedAlerts: string[]
  timeline: IncidentEvent[]
  sla: string
}

export type AlertRule = {
  id: string
  name: string
  description: string
  severity: AlertSeverity
  category: AlertCategory
  enabled: boolean
  conditions: string
  actions: string[]
  cooldownMinutes: number
  triggeredCount: number
  lastTriggered?: string
  createdAt: string
}

export const ALERTS: AlertObject[] = [
  {
    id: "ALT-001",
    title: "Tentative d'accès non autorisée répétée",
    description: "5 tentatives d'accès refusées en 2 minutes sur la porte principale",
    severity: "critical",
    status: "active",
    category: "intrusion",
    location: "Entrée principale — RDC",
    zoneId: "zone-001",
    source: "Lecteur RFID DR-01",
    createdAt: "2026-04-12T08:14:23Z",
    updatedAt: "2026-04-12T08:16:01Z",
    eventCount: 5,
    tags: ["brute-force", "porte-principale"],
  },
  {
    id: "ALT-002",
    title: "Caméra hors ligne — Parking B2",
    description: "La caméra CAM-B207 n'envoie plus de signal depuis 14 min",
    severity: "high",
    status: "acknowledged",
    category: "device",
    location: "Parking souterrain niveau B2",
    zoneId: "zone-007",
    source: "CAM-B207",
    createdAt: "2026-04-12T07:55:00Z",
    updatedAt: "2026-04-12T08:05:12Z",
    acknowledgedBy: "Maxime Fontaine",
    eventCount: 1,
    tags: ["caméra", "parking"],
  },
  {
    id: "ALT-003",
    title: "Badge utilisé hors plage horaire",
    description: "Employé Ibrahim Diallo a accédé à la zone serveurs à 02h47",
    severity: "high",
    status: "active",
    category: "access",
    location: "Salle serveurs — Niveau 3",
    zoneId: "zone-003",
    source: "Badge EMP-0042",
    createdAt: "2026-04-12T02:47:33Z",
    updatedAt: "2026-04-12T02:47:33Z",
    eventCount: 1,
    tags: ["hors-horaire", "zone-sensible"],
  },
  {
    id: "ALT-004",
    title: "Porte laissée ouverte — R+2 Couloir Est",
    description: "La porte CLD-214 est restée ouverte plus de 5 minutes",
    severity: "medium",
    status: "resolved",
    category: "access",
    location: "Couloir Est — R+2",
    zoneId: "zone-005",
    source: "Capteur CLD-214",
    createdAt: "2026-04-12T06:30:00Z",
    updatedAt: "2026-04-12T06:38:55Z",
    resolvedBy: "Système automatique",
    resolvedAt: "2026-04-12T06:38:55Z",
    eventCount: 1,
    tags: ["porte-ouverte"],
  },
  {
    id: "ALT-005",
    title: "Mise à jour firmware en attente — 3 appareils",
    description: "Trois lecteurs RFID n'ont pas été mis à jour depuis 45 jours",
    severity: "low",
    status: "acknowledged",
    category: "compliance",
    location: "Bâtiment A — Multiple",
    zoneId: "zone-001",
    source: "Système d'inventaire",
    createdAt: "2026-04-11T09:00:00Z",
    updatedAt: "2026-04-12T07:00:00Z",
    acknowledgedBy: "Système",
    eventCount: 3,
    tags: ["firmware", "compliance"],
  },
  {
    id: "ALT-006",
    title: "Détecteur de mouvement déclenché — Zone rouge",
    description: "Mouvement détecté dans la zone sécurisée R+4 hors des heures d'ouverture",
    severity: "critical",
    status: "active",
    category: "intrusion",
    location: "Zone rouge confidentielle — R+4",
    zoneId: "zone-004",
    source: "PIR-R4-001",
    createdAt: "2026-04-12T03:22:15Z",
    updatedAt: "2026-04-12T03:22:15Z",
    eventCount: 2,
    tags: ["mouvement", "zone-rouge", "nuit"],
  },
  {
    id: "ALT-007",
    title: "Connexion API depuis IP inconnue",
    description: "Appel API authentifié depuis 38.142.77.201 — non répertorié",
    severity: "high",
    status: "active",
    category: "system",
    location: "Système — API Gateway",
    zoneId: "zone-sys",
    source: "API Gateway",
    createdAt: "2026-04-12T05:01:44Z",
    updatedAt: "2026-04-12T05:01:44Z",
    eventCount: 14,
    tags: ["api", "ip-inconnue", "sécurité"],
  },
  {
    id: "ALT-008",
    title: "Batterie faible — Lecteur R+1 Bureau Nord",
    description: "Lecteur RFID RDR-N112 signale 8% de batterie restante",
    severity: "low",
    status: "dismissed",
    category: "device",
    location: "Bureau Nord — R+1",
    zoneId: "zone-002",
    source: "RDR-N112",
    createdAt: "2026-04-11T16:30:00Z",
    updatedAt: "2026-04-11T16:30:00Z",
    eventCount: 1,
    tags: ["batterie", "lecteur"],
  },
]

export const INCIDENTS: Incident[] = [
  {
    id: "INC-2026-047",
    title: "Intrusion potentielle — Zone rouge R+4",
    description:
      "Mouvement détecté dans la zone confidentielle en dehors des heures d'ouverture. Aucun accès badge enregistré avant l'événement. Enquête en cours.",
    severity: "P1",
    status: "investigating",
    category: "intrusion",
    location: "Zone rouge confidentielle — R+4",
    assignedTo: "Abdoulaye Ndiaye",
    createdAt: "2026-04-12T03:22:15Z",
    updatedAt: "2026-04-12T08:45:00Z",
    affectedAssets: ["PIR-R4-001", "CAM-R4-01", "CAM-R4-02"],
    relatedAlerts: ["ALT-006"],
    sla: "< 1 heure",
    timeline: [
      { id: "e1", type: "status_change", author: "Système", content: "Incident créé automatiquement suite à l'alerte ALT-006", createdAt: "2026-04-12T03:22:15Z" },
      { id: "e2", type: "assignment", author: "Système", content: "Assigné à Abdoulaye Ndiaye (Responsable sécurité)", createdAt: "2026-04-12T03:23:00Z" },
      { id: "e3", type: "action", author: "Abdoulaye Ndiaye", content: "Visionnage des caméras en cours — aucune présence visible pour l'instant", createdAt: "2026-04-12T03:35:22Z" },
      { id: "e4", type: "comment", author: "Maxime Fontaine", content: "Je vérifie les logs d'accès badge des 2 dernières heures", createdAt: "2026-04-12T03:40:08Z" },
      { id: "e5", type: "escalation", author: "Abdoulaye Ndiaye", content: "Escalade vers le responsable de site — présence non confirmée mais non exclue", createdAt: "2026-04-12T04:00:00Z" },
    ],
  },
  {
    id: "INC-2026-046",
    title: "Badge usurpé — Accès zone serveurs hors horaire",
    description:
      "Accès au niveau 3 (salle serveurs) avec le badge d'Ibrahim Diallo à 02h47. L'employé confirme ne pas être présent. Badge potentiellement volé ou copié.",
    severity: "P1",
    status: "open",
    category: "access",
    location: "Salle serveurs — Niveau 3",
    assignedTo: "Fatou Keïta",
    createdAt: "2026-04-12T02:47:33Z",
    updatedAt: "2026-04-12T08:00:00Z",
    affectedAssets: ["Badge EMP-0042", "Lecteur RDR-S301"],
    relatedAlerts: ["ALT-003"],
    sla: "< 1 heure",
    timeline: [
      { id: "e1", type: "status_change", author: "Système", content: "Incident créé — badge utilisé hors plage horaire autorisée", createdAt: "2026-04-12T02:47:33Z" },
      { id: "e2", type: "action", author: "Fatou Keïta", content: "Contact avec Ibrahim Diallo — confirme ne pas être au bureau", createdAt: "2026-04-12T03:15:00Z" },
      { id: "e3", type: "action", author: "Fatou Keïta", content: "Badge EMP-0042 suspendu en attente d'investigation", createdAt: "2026-04-12T03:18:44Z" },
    ],
  },
  {
    id: "INC-2026-043",
    title: "Panne caméras parking — Indisponibilité 3h",
    description:
      "4 caméras du parking B2 ont été hors ligne pendant 3h12 suite à une coupure réseau locale. Les enregistrements sont incomplets pour cette période.",
    severity: "P2",
    status: "resolved",
    category: "device",
    location: "Parking souterrain B2",
    assignedTo: "Maxime Fontaine",
    createdAt: "2026-04-11T22:10:00Z",
    updatedAt: "2026-04-12T01:22:00Z",
    resolvedAt: "2026-04-12T01:22:00Z",
    affectedAssets: ["CAM-B201", "CAM-B202", "CAM-B205", "CAM-B207"],
    relatedAlerts: ["ALT-002"],
    sla: "< 4 heures",
    timeline: [
      { id: "e1", type: "status_change", author: "Système", content: "4 caméras Parker B2 hors ligne", createdAt: "2026-04-11T22:10:00Z" },
      { id: "e2", type: "assignment", author: "Système", content: "Assigné à Maxime Fontaine", createdAt: "2026-04-11T22:11:00Z" },
      { id: "e3", type: "action", author: "Maxime Fontaine", content: "Redémarrage du switch réseau Parking B2 effectué", createdAt: "2026-04-12T01:20:00Z" },
      { id: "e4", type: "status_change", author: "Maxime Fontaine", content: "Caméras de nouveau en ligne — incident résolu", createdAt: "2026-04-12T01:22:00Z" },
    ],
  },
]

export const ALERT_RULES: AlertRule[] = [
  {
    id: "RULE-001",
    name: "Multi-échecs accès — Seuil 3",
    description: "Déclenche une alerte critique si ≥ 3 tentatives refusées en 5 min sur la même porte",
    severity: "critical",
    category: "intrusion",
    enabled: true,
    conditions: "access_denied_count ≥ 3 WITHIN 5min GROUP BY door_id",
    actions: ["Créer alerte", "Notifier équipe sécurité", "Verrouiller porte 10min"],
    cooldownMinutes: 15,
    triggeredCount: 12,
    lastTriggered: "2026-04-12T08:14:23Z",
    createdAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "RULE-002",
    name: "Accès hors plage horaire — Zone sensible",
    description: "Tout accès badge dans les zones de niveau ≥ 3 entre 22h et 6h",
    severity: "high",
    category: "access",
    enabled: true,
    conditions: "zone_level ≥ 3 AND hour NOT BETWEEN 6 AND 22",
    actions: ["Créer alerte", "Notifier responsable zone", "Enregistrer clip vidéo"],
    cooldownMinutes: 0,
    triggeredCount: 7,
    lastTriggered: "2026-04-12T02:47:33Z",
    createdAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "RULE-003",
    name: "Porte ouverte prolongée",
    description: "Porte maintenue ouverte plus de 5 minutes sans mouvement actif",
    severity: "medium",
    category: "access",
    enabled: true,
    conditions: "door_open_duration > 5min AND motion_count = 0",
    actions: ["Créer alerte", "Déclencher buzzer", "Notifier agent de proximité"],
    cooldownMinutes: 5,
    triggeredCount: 34,
    lastTriggered: "2026-04-12T06:30:00Z",
    createdAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "RULE-004",
    name: "Appareil hors ligne > 10 min",
    description: "Un appareil (lecteur, caméra) ne répond plus depuis plus de 10 minutes",
    severity: "high",
    category: "device",
    enabled: true,
    conditions: "device_last_seen > 10min",
    actions: ["Créer alerte", "Notifier équipe IT"],
    cooldownMinutes: 30,
    triggeredCount: 8,
    lastTriggered: "2026-04-12T07:55:00Z",
    createdAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "RULE-005",
    name: "Mouvement zone rouge — Hors horaires",
    description: "Détecteur PIR déclenché dans zones confidentielles hors heures ouvrées",
    severity: "critical",
    category: "intrusion",
    enabled: true,
    conditions: "zone_tag = 'rouge' AND pir_triggered = true AND hour NOT BETWEEN 7 AND 20",
    actions: ["Créer incident P1", "Notifier RSSI + Directeur", "Enregistrer tous les flux vidéo"],
    cooldownMinutes: 0,
    triggeredCount: 1,
    lastTriggered: "2026-04-12T03:22:15Z",
    createdAt: "2025-10-15T00:00:00Z",
  },
  {
    id: "RULE-006",
    name: "API — IP non répertoriée",
    description: "Requête API authentifiée depuis une adresse IP absente de la liste blanche",
    severity: "high",
    category: "system",
    enabled: true,
    conditions: "api_request_authenticated = true AND source_ip NOT IN whitelist",
    actions: ["Créer alerte", "Logger la requête complète", "Notifier équipe IT"],
    cooldownMinutes: 60,
    triggeredCount: 3,
    lastTriggered: "2026-04-12T05:01:44Z",
    createdAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "RULE-007",
    name: "Batterie appareil < 15%",
    description: "Un lecteur ou capteur signale un niveau de batterie critique",
    severity: "low",
    category: "device",
    enabled: false,
    conditions: "device_battery_pct < 15",
    actions: ["Créer alerte", "Planifier maintenance"],
    cooldownMinutes: 1440,
    triggeredCount: 15,
    lastTriggered: "2026-04-11T16:30:00Z",
    createdAt: "2025-09-01T00:00:00Z",
  },
]

export const ALERT_STATS = {
  totalActive: 4,
  critical: 2,
  high: 2,
  medium: 1,
  todayResolved: 3,
  avgResolutionMinutes: 22,
  openIncidents: 2,
}
