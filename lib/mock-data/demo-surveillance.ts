// ── Mock data — Surveillance Live ────────────────────────────────────────────

export type CameraStatus  = "online" | "offline" | "recording" | "alarm" | "maintenance"
export type DoorStatus    = "locked" | "unlocked" | "open" | "forced" | "alarm" | "offline"
export type FloorId       = "rdc" | "r1" | "r2" | "r3" | "r4" | "b1" | "b2"

export type Camera = {
  id: string
  name: string
  location: string
  floor: FloorId
  zoneId: string
  status: CameraStatus
  hasAudio: boolean
  hasPtz: boolean   // Pan-Tilt-Zoom
  hasMotionAlert: boolean
  lastMotionAt?: string
  resolutionMp: number
  ipAddress: string
  recordingSince?: string
  thumbnailColor: string // simulates camera feed color palette
}

export type Door = {
  id: string
  name: string
  location: string
  floor: FloorId
  zoneId: string
  status: DoorStatus
  isEmergency: boolean
  hasReader: boolean
  lastEventAt: string
  lastEventType: "access_granted" | "access_denied" | "forced_open" | "door_open" | "door_closed" | "locked" | "unlocked"
  lastEventUser?: string
  autoLockAt?: string
  batteryLevel?: number
}

export type LiveEvent = {
  id: string
  type: "access_granted" | "access_denied" | "door_open" | "door_forced" | "motion" | "camera_offline" | "alarm"
  location: string
  entityId: string
  entityName: string
  person?: string
  floor: FloorId
  createdAt: string
  severity: "info" | "warning" | "critical"
}

export type ZoneOverview = {
  id: string
  name: string
  floor: FloorId
  color: string
  occupancy: number
  capacity: number
  securityLevel: 1 | 2 | 3 | 4 | 5
  cameraCount: number
  doorCount: number
  activeAlarms: number
}

export const FLOORS: Array<{ id: FloorId; label: string; shortLabel: string }> = [
  { id: "b2", label: "Parking B2", shortLabel: "B2" },
  { id: "b1", label: "Parking B1", shortLabel: "B1" },
  { id: "rdc", label: "Rez-de-chaussée", shortLabel: "RDC" },
  { id: "r1", label: "Niveau 1", shortLabel: "R+1" },
  { id: "r2", label: "Niveau 2", shortLabel: "R+2" },
  { id: "r3", label: "Niveau 3", shortLabel: "R+3" },
  { id: "r4", label: "Niveau 4 (Confidentiel)", shortLabel: "R+4" },
]

export const CAMERAS: Camera[] = [
  { id: "CAM-001", name: "Entrée principale — Ext.", location: "Façade principale RDC", floor: "rdc", zoneId: "zone-001", status: "recording", hasAudio: true, hasPtz: true, hasMotionAlert: true, lastMotionAt: "2026-04-12T08:14:00Z", resolutionMp: 8, ipAddress: "192.168.10.11", recordingSince: "2026-04-12T00:00:00Z", thumbnailColor: "#1e3a5f" },
  { id: "CAM-002", name: "Hall d'accueil", location: "Hall RDC — Vue d'ensemble", floor: "rdc", zoneId: "zone-001", status: "recording", hasAudio: false, hasPtz: false, hasMotionAlert: true, lastMotionAt: "2026-04-12T08:55:00Z", resolutionMp: 4, ipAddress: "192.168.10.12", recordingSince: "2026-04-12T00:00:00Z", thumbnailColor: "#3d2b1f" },
  { id: "CAM-003", name: "Couloir R+1 Est", location: "Couloir Est — R+1", floor: "r1", zoneId: "zone-002", status: "recording", hasAudio: false, hasPtz: false, hasMotionAlert: false, resolutionMp: 4, ipAddress: "192.168.10.21", recordingSince: "2026-04-12T00:00:00Z", thumbnailColor: "#1a3323" },
  { id: "CAM-004", name: "Open Space R+1", location: "Bureau ouvert Nord R+1", floor: "r1", zoneId: "zone-002", status: "online", hasAudio: false, hasPtz: false, hasMotionAlert: true, lastMotionAt: "2026-04-12T09:02:00Z", resolutionMp: 4, ipAddress: "192.168.10.22", thumbnailColor: "#2c1f42" },
  { id: "CAM-005", name: "Salle de réunion R+2", location: "Réunion principale R+2", floor: "r2", zoneId: "zone-005", status: "recording", hasAudio: true, hasPtz: false, hasMotionAlert: false, resolutionMp: 8, ipAddress: "192.168.10.31", recordingSince: "2026-04-12T08:45:00Z", thumbnailColor: "#2d3a1e" },
  { id: "CAM-006", name: "Couloir R+2 Ouest", location: "Couloir Ouest — R+2", floor: "r2", zoneId: "zone-005", status: "online", hasAudio: false, hasPtz: false, hasMotionAlert: false, resolutionMp: 2, ipAddress: "192.168.10.32", thumbnailColor: "#1f2d3a" },
  { id: "CAM-007", name: "Salle serveurs N3 — Vue 1", location: "Salle serveurs — Entrée N3", floor: "r3", zoneId: "zone-003", status: "recording", hasAudio: false, hasPtz: false, hasMotionAlert: true, lastMotionAt: "2026-04-12T02:47:00Z", resolutionMp: 12, ipAddress: "192.168.10.41", recordingSince: "2026-04-12T00:00:00Z", thumbnailColor: "#3a1e1e" },
  { id: "CAM-008", name: "Salle serveurs N3 — Vue 2", location: "Salle serveurs — Baies N3", floor: "r3", zoneId: "zone-003", status: "recording", hasAudio: false, hasPtz: false, hasMotionAlert: true, resolutionMp: 12, ipAddress: "192.168.10.42", recordingSince: "2026-04-12T00:00:00Z", thumbnailColor: "#1e3a3a" },
  { id: "CAM-R4-01", name: "Zone rouge R+4 — Vue 1", location: "Zone confidentielle R+4", floor: "r4", zoneId: "zone-004", status: "alarm", hasAudio: true, hasPtz: true, hasMotionAlert: true, lastMotionAt: "2026-04-12T03:22:00Z", resolutionMp: 12, ipAddress: "192.168.10.51", recordingSince: "2026-04-12T03:22:00Z", thumbnailColor: "#4a1a1a" },
  { id: "CAM-R4-02", name: "Zone rouge R+4 — Vue 2", location: "Zone confidentielle R+4 — Accès", floor: "r4", zoneId: "zone-004", status: "alarm", hasAudio: true, hasPtz: false, hasMotionAlert: true, lastMotionAt: "2026-04-12T03:22:00Z", resolutionMp: 8, ipAddress: "192.168.10.52", recordingSince: "2026-04-12T03:22:00Z", thumbnailColor: "#3a1414" },
  { id: "CAM-B201", name: "Parking B2 — Entrée", location: "Rampe d'accès B2", floor: "b2", zoneId: "zone-007", status: "online", hasAudio: false, hasPtz: false, hasMotionAlert: false, resolutionMp: 4, ipAddress: "192.168.10.61", thumbnailColor: "#1a1a2e" },
  { id: "CAM-B207", name: "Parking B2 — Zone West", location: "Zone Ouest B2", floor: "b2", zoneId: "zone-007", status: "offline", hasAudio: false, hasPtz: false, hasMotionAlert: false, resolutionMp: 4, ipAddress: "192.168.10.67", thumbnailColor: "#111111" },
]

export const DOORS: Door[] = [
  { id: "DR-001", name: "Porte principale RDC", location: "Entrée principale RDC", floor: "rdc", zoneId: "zone-001", status: "locked", isEmergency: false, hasReader: true, lastEventAt: "2026-04-12T08:55:00Z", lastEventType: "access_granted", lastEventUser: "Sophie Marchand" },
  { id: "DR-002", name: "Porte latérale RDC", location: "Accès secondaire RDC", floor: "rdc", zoneId: "zone-001", status: "locked", isEmergency: false, hasReader: true, lastEventAt: "2026-04-12T08:30:00Z", lastEventType: "access_granted", lastEventUser: "Pierre Martin" },
  { id: "DR-E01", name: "Issue de secours RDC", location: "Sortie de secours RDC Nord", floor: "rdc", zoneId: "zone-001", status: "locked", isEmergency: true, hasReader: false, lastEventAt: "2026-04-10T14:20:00Z", lastEventType: "door_closed" },
  { id: "DR-101", name: "Couloir R+1 — Entrée", location: "Accès couloir Est R+1", floor: "r1", zoneId: "zone-002", status: "unlocked", isEmergency: false, hasReader: true, lastEventAt: "2026-04-12T09:01:00Z", lastEventType: "door_open", lastEventUser: "Fatou Keïta" },
  { id: "CLD-214", name: "Couloir Est R+2", location: "Couloir Est — R+2", floor: "r2", zoneId: "zone-005", status: "locked", isEmergency: false, hasReader: true, lastEventAt: "2026-04-12T06:38:00Z", lastEventType: "locked" },
  { id: "DR-S301", name: "Salle serveurs N3", location: "Accès salle serveurs N3", floor: "r3", zoneId: "zone-003", status: "locked", isEmergency: false, hasReader: true, lastEventAt: "2026-04-12T02:47:00Z", lastEventType: "access_granted", lastEventUser: "Badge EMP-0042" },
  { id: "DR-R401", name: "Zone rouge R+4 — Principal", location: "Accès zone confidentielle R+4", floor: "r4", zoneId: "zone-004", status: "alarm", isEmergency: false, hasReader: true, lastEventAt: "2026-04-12T03:22:00Z", lastEventType: "door_forced" },
  { id: "DR-B201", name: "Barrière Parking B2", location: "Entrée parking souterrain B2", floor: "b2", zoneId: "zone-007", status: "locked", isEmergency: false, hasReader: true, lastEventAt: "2026-04-12T07:15:00Z", lastEventType: "access_granted", batteryLevel: 87 },
]

export const LIVE_EVENTS: LiveEvent[] = [
  { id: "le-001", type: "alarm", location: "Zone rouge R+4", entityId: "DR-R401", entityName: "Zone rouge R+4 — Principal", floor: "r4", createdAt: "2026-04-12T03:22:15Z", severity: "critical" },
  { id: "le-002", type: "access_granted", location: "Entrée principale RDC", entityId: "DR-001", entityName: "Porte principale RDC", person: "Sophie Marchand", floor: "rdc", createdAt: "2026-04-12T08:55:12Z", severity: "info" },
  { id: "le-003", type: "access_denied", location: "Entrée principale RDC", entityId: "DR-001", entityName: "Porte principale RDC", floor: "rdc", createdAt: "2026-04-12T08:14:23Z", severity: "warning" },
  { id: "le-004", type: "camera_offline", location: "Parking B2", entityId: "CAM-B207", entityName: "Parking B2 — Zone West", floor: "b2", createdAt: "2026-04-12T07:55:00Z", severity: "warning" },
  { id: "le-005", type: "door_open", location: "Couloir R+1", entityId: "DR-101", entityName: "Couloir R+1 — Entrée", person: "Fatou Keïta", floor: "r1", createdAt: "2026-04-12T09:01:00Z", severity: "info" },
  { id: "le-006", type: "access_granted", location: "Salle serveurs N3", entityId: "DR-S301", entityName: "Salle serveurs N3", person: "Badge EMP-0042", floor: "r3", createdAt: "2026-04-12T02:47:33Z", severity: "warning" },
  { id: "le-007", type: "motion", location: "Zone rouge R+4", entityId: "CAM-R4-01", entityName: "Zone rouge R+4 — Vue 1", floor: "r4", createdAt: "2026-04-12T03:22:15Z", severity: "critical" },
]

export const ZONE_OVERVIEW: ZoneOverview[] = [
  { id: "zone-001", name: "RDC — Accueil & Entrée", floor: "rdc", color: "#3b82f6", occupancy: 12, capacity: 50, securityLevel: 1, cameraCount: 2, doorCount: 3, activeAlarms: 0 },
  { id: "zone-002", name: "R+1 — Bureaux ouverts", floor: "r1", color: "#22c55e", occupancy: 34, capacity: 80, securityLevel: 1, cameraCount: 2, doorCount: 2, activeAlarms: 0 },
  { id: "zone-005", name: "R+2 — Salles de réunion", floor: "r2", color: "#f59e0b", occupancy: 8, capacity: 40, securityLevel: 2, cameraCount: 2, doorCount: 2, activeAlarms: 0 },
  { id: "zone-003", name: "N3 — Salle serveurs", floor: "r3", color: "#ef4444", occupancy: 0, capacity: 10, securityLevel: 4, cameraCount: 2, doorCount: 1, activeAlarms: 0 },
  { id: "zone-004", name: "R+4 — Zone confidentielle", floor: "r4", color: "#dc2626", occupancy: 0, capacity: 5, securityLevel: 5, cameraCount: 2, doorCount: 1, activeAlarms: 1 },
  { id: "zone-007", name: "Parking B2", floor: "b2", color: "#6b7280", occupancy: 24, capacity: 60, securityLevel: 1, cameraCount: 2, doorCount: 1, activeAlarms: 0 },
]

export const SURVEILLANCE_STATS = {
  camerasOnline: 10,
  camerasOffline: 1,
  camerasAlarm: 2,
  doorsLocked: 6,
  doorsOpen: 1,
  doorsAlarm: 1,
  totalOccupancy: 78,
}
