// ── Mock data — Zones & Accès ────────────────────────────────────────────────

export type ZoneLevel     = 1 | 2 | 3 | 4 | 5
export type ReaderStatus  = "online" | "offline" | "tampered" | "maintenance"
export type DoorMode      = "normal" | "always_open" | "always_locked" | "time_controlled"

export type SecurityZone = {
  id: string
  name: string
  description: string
  parentId?: string
  level: ZoneLevel
  floor: string
  color: string
  readers: string[]
  accessGroups: string[]
  occupancy: number
  capacity: number
  tags: string[]
}

export type Reader = {
  id: string
  name: string
  location: string
  zoneId: string
  status: ReaderStatus
  doorId: string
  doorName: string
  doorMode: DoorMode
  firmware: string
  lastSeen: string
  accessCount24h: number
  denialCount24h: number
  batteryLevel?: number
  serialNumber: string
  model: string
}

export type AccessGroup = {
  id: string
  name: string
  description: string
  memberCount: number
  zoneIds: string[]
  scheduleId: string
  scheduleName: string
  createdAt: string
  updatedAt: string
  isDefault: boolean
  tags: string[]
}

export type AccessSchedule = {
  id: string
  name: string
  description: string
  days: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">
  startTime: string
  endTime: string
  isHolidayExcluded: boolean
}

export const ZONES: SecurityZone[] = [
  {
    id: "zone-000",
    name: "Bâtiment Principal",
    description: "Périmètre global du site",
    level: 1,
    floor: "Tout niveau",
    color: "#3b82f6",
    readers: [],
    accessGroups: ["grp-001"],
    occupancy: 78,
    capacity: 200,
    tags: ["bâtiment", "principal"],
  },
  {
    id: "zone-001",
    name: "Accueil & Entrée RDC",
    parentId: "zone-000",
    description: "Zone d'accueil — accessible à tous les employés et visiteurs enregistrés",
    level: 1,
    floor: "RDC",
    color: "#22c55e",
    readers: ["RDR-001", "RDR-002"],
    accessGroups: ["grp-001", "grp-002"],
    occupancy: 12,
    capacity: 50,
    tags: ["accueil", "public", "rdc"],
  },
  {
    id: "zone-002",
    name: "Bureaux Ouverts R+1",
    parentId: "zone-000",
    description: "Espace de travail ouvert — accès employés",
    level: 2,
    floor: "R+1",
    color: "#84cc16",
    readers: ["RDR-N112", "RDR-103"],
    accessGroups: ["grp-001", "grp-003"],
    occupancy: 34,
    capacity: 80,
    tags: ["bureaux", "r1"],
  },
  {
    id: "zone-005",
    name: "Salles de réunion R+2",
    parentId: "zone-000",
    description: "Salles de réunion — accès employés et visiteurs VIP",
    level: 2,
    floor: "R+2",
    color: "#f59e0b",
    readers: ["RDR-205", "RDR-214"],
    accessGroups: ["grp-001", "grp-004"],
    occupancy: 8,
    capacity: 40,
    tags: ["réunion", "r2"],
  },
  {
    id: "zone-006",
    name: "Direction R+2",
    parentId: "zone-005",
    description: "Bureaux de direction — accès restreint",
    level: 3,
    floor: "R+2",
    color: "#f97316",
    readers: ["RDR-280"],
    accessGroups: ["grp-005"],
    occupancy: 3,
    capacity: 15,
    tags: ["direction", "restreint", "r2"],
  },
  {
    id: "zone-003",
    name: "Salle Serveurs N3",
    parentId: "zone-000",
    description: "Infrastructure IT critique — accès très restreint",
    level: 4,
    floor: "N3",
    color: "#ef4444",
    readers: ["RDR-S301"],
    accessGroups: ["grp-006"],
    occupancy: 0,
    capacity: 10,
    tags: ["serveurs", "it", "zone-sensible"],
  },
  {
    id: "zone-004",
    name: "Zone Confidentielle R+4",
    parentId: "zone-000",
    description: "Zone confidentielle — accès ultra restreint, traçabilité complète",
    level: 5,
    floor: "R+4",
    color: "#dc2626",
    readers: ["RDR-R401"],
    accessGroups: ["grp-007"],
    occupancy: 0,
    capacity: 5,
    tags: ["confidentiel", "zone-rouge", "r4"],
  },
  {
    id: "zone-007",
    name: "Parking Souterrain B2",
    parentId: "zone-000",
    description: "Parking — accès employés et visiteurs avec véhicule",
    level: 1,
    floor: "B2",
    color: "#6b7280",
    readers: ["RDR-B201", "RDR-B202"],
    accessGroups: ["grp-001", "grp-008"],
    occupancy: 24,
    capacity: 60,
    tags: ["parking", "b2", "véhicule"],
  },
]

export const READERS: Reader[] = [
  { id: "RDR-001", name: "Entrée principale — Ext.", location: "Façade RDC", zoneId: "zone-001", status: "online", doorId: "DR-001", doorName: "Porte principale RDC", doorMode: "normal", firmware: "v4.2.1", lastSeen: "2026-04-12T09:00:00Z", accessCount24h: 87, denialCount24h: 6, serialNumber: "SP-R-00441", model: "HID iClass SE R40" },
  { id: "RDR-002", name: "Entrée secondaire RDC", location: "Côté Est RDC", zoneId: "zone-001", status: "online", doorId: "DR-002", doorName: "Porte latérale RDC", doorMode: "normal", firmware: "v4.2.1", lastSeen: "2026-04-12T08:59:12Z", accessCount24h: 42, denialCount24h: 1, serialNumber: "SP-R-00442", model: "HID iClass SE R40" },
  { id: "RDR-N112", name: "Bureau Nord R+1", location: "Couloir Nord R+1", zoneId: "zone-002", status: "online", doorId: "DR-101", doorName: "Couloir R+1 — Entrée", doorMode: "time_controlled", firmware: "v4.1.8", lastSeen: "2026-04-12T09:01:00Z", accessCount24h: 56, denialCount24h: 0, batteryLevel: 8, serialNumber: "SP-R-00483", model: "Nedap MACE" },
  { id: "RDR-103", name: "Couloir Ouest R+1", location: "Couloir Ouest R+1", zoneId: "zone-002", status: "online", doorId: "DR-102", doorName: "Porte Ouest R+1", doorMode: "normal", firmware: "v4.2.0", lastSeen: "2026-04-12T08:45:00Z", accessCount24h: 29, denialCount24h: 0, serialNumber: "SP-R-00521", model: "HID iClass SE R40" },
  { id: "RDR-205", name: "Salle réunion R+2", location: "Couloir central R+2", zoneId: "zone-005", status: "online", doorId: "DR-201", doorName: "Accès réunions R+2", doorMode: "time_controlled", firmware: "v4.2.1", lastSeen: "2026-04-12T08:44:00Z", accessCount24h: 18, denialCount24h: 0, serialNumber: "SP-R-00614", model: "Aperio E100" },
  { id: "RDR-214", name: "Couloir Est R+2", location: "Couloir Est R+2", zoneId: "zone-005", status: "online", doorId: "CLD-214", doorName: "Couloir Est R+2", doorMode: "normal", firmware: "v4.2.1", lastSeen: "2026-04-12T06:38:00Z", accessCount24h: 11, denialCount24h: 0, serialNumber: "SP-R-00615", model: "Aperio E100" },
  { id: "RDR-280", name: "Direction R+2", location: "Accès direction R+2", zoneId: "zone-006", status: "maintenance", doorId: "DR-280", doorName: "Porte direction R+2", doorMode: "always_locked", firmware: "v4.0.2", lastSeen: "2026-04-11T17:30:00Z", accessCount24h: 0, denialCount24h: 0, serialNumber: "SP-R-00701", model: "HID SIGNO 40" },
  { id: "RDR-S301", name: "Salle serveurs N3", location: "Accès salle serveurs N3", zoneId: "zone-003", status: "online", doorId: "DR-S301", doorName: "Salle serveurs N3", doorMode: "normal", firmware: "v4.2.1", lastSeen: "2026-04-12T02:47:00Z", accessCount24h: 3, denialCount24h: 0, serialNumber: "SP-R-00822", model: "HID SIGNO 40K" },
  { id: "RDR-R401", name: "Zone rouge R+4", location: "Accès zone confidentielle R+4", zoneId: "zone-004", status: "tampered", doorId: "DR-R401", doorName: "Zone rouge R+4 — Principal", doorMode: "always_locked", firmware: "v4.2.1", lastSeen: "2026-04-12T03:22:00Z", accessCount24h: 1, denialCount24h: 0, serialNumber: "SP-R-00901", model: "HID SIGNO 40K" },
  { id: "RDR-B201", name: "Barrière entrée B2", location: "Rampe accès B2", zoneId: "zone-007", status: "online", doorId: "DR-B201", doorName: "Barrière Parking B2", doorMode: "time_controlled", firmware: "v3.9.4", lastSeen: "2026-04-12T07:15:00Z", accessCount24h: 34, denialCount24h: 2, batteryLevel: 87, serialNumber: "SP-R-01022", model: "Nedap ANPR" },
  { id: "RDR-B202", name: "Sortie Parking B2", location: "Sortie rampe B2", zoneId: "zone-007", status: "online", doorId: "DR-B202", doorName: "Sortie Parking B2", doorMode: "time_controlled", firmware: "v3.9.4", lastSeen: "2026-04-12T07:18:00Z", accessCount24h: 31, denialCount24h: 0, batteryLevel: 82, serialNumber: "SP-R-01023", model: "Nedap ANPR" },
]

export const ACCESS_GROUPS: AccessGroup[] = [
  { id: "grp-001", name: "Tous Employés", description: "Accès standard à tous les espaces communs", memberCount: 112, zoneIds: ["zone-001", "zone-002", "zone-007"], scheduleId: "sch-001", scheduleName: "Horaires bureau (L-V, 7h–20h)", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z", isDefault: true, tags: ["employés", "standard"] },
  { id: "grp-002", name: "Visiteurs Standard", description: "Zones accessibles aux visiteurs enregistrés", memberCount: 45, zoneIds: ["zone-001"], scheduleId: "sch-001", scheduleName: "Horaires bureau (L-V, 7h–20h)", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z", isDefault: false, tags: ["visiteurs"] },
  { id: "grp-003", name: "Personnel R+1", description: "Accès bureaux ouverts R+1", memberCount: 68, zoneIds: ["zone-001", "zone-002"], scheduleId: "sch-001", scheduleName: "Horaires bureau (L-V, 7h–20h)", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z", isDefault: false, tags: ["r1", "bureaux"] },
  { id: "grp-004", name: "Accès Réunions VIP", description: "Salles de réunion R+2 — personnel + visiteurs VIP", memberCount: 23, zoneIds: ["zone-001", "zone-002", "zone-005"], scheduleId: "sch-001", scheduleName: "Horaires bureau (L-V, 7h–20h)", createdAt: "2025-06-01T00:00:00Z", updatedAt: "2026-01-20T00:00:00Z", isDefault: false, tags: ["réunion", "vip"] },
  { id: "grp-005", name: "Direction", description: "Accès direction R+2 — comité de direction uniquement", memberCount: 7, zoneIds: ["zone-001", "zone-002", "zone-005", "zone-006"], scheduleId: "sch-002", scheduleName: "Étendu (7j/7, 6h–23h)", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z", isDefault: false, tags: ["direction", "restreint"] },
  { id: "grp-006", name: "Équipe IT — Serveurs", description: "Accès salle serveurs N3 — administrateurs système uniquement", memberCount: 5, zoneIds: ["zone-001", "zone-002", "zone-003"], scheduleId: "sch-002", scheduleName: "Étendu (7j/7, 6h–23h)", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z", isDefault: false, tags: ["it", "serveurs", "sensible"] },
  { id: "grp-007", name: "Habilitation R+4", description: "Zone confidentielle R+4 — habilitation spéciale requise", memberCount: 3, zoneIds: ["zone-001", "zone-004"], scheduleId: "sch-003", scheduleName: "Personnalisé (L-V, 8h–18h)", createdAt: "2025-03-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z", isDefault: false, tags: ["confidentiel", "zone-rouge"] },
  { id: "grp-008", name: "Véhicules Autorisés", description: "Accès parking B2 — véhicules enregistrés", memberCount: 44, zoneIds: ["zone-007"], scheduleId: "sch-001", scheduleName: "Horaires bureau (L-V, 7h–20h)", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2026-02-28T00:00:00Z", isDefault: false, tags: ["parking", "véhicule"] },
]

export const ACCESS_SCHEDULES: AccessSchedule[] = [
  { id: "sch-001", name: "Horaires bureau (L-V, 7h–20h)", description: "Plage standard bureau", days: ["mon", "tue", "wed", "thu", "fri"], startTime: "07:00", endTime: "20:00", isHolidayExcluded: true },
  { id: "sch-002", name: "Étendu (7j/7, 6h–23h)", description: "Accès étendu 7 jours", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], startTime: "06:00", endTime: "23:00", isHolidayExcluded: false },
  { id: "sch-003", name: "Personnalisé (L-V, 8h–18h)", description: "Horaires restreints zone rouge", days: ["mon", "tue", "wed", "thu", "fri"], startTime: "08:00", endTime: "18:00", isHolidayExcluded: true },
  { id: "sch-004", name: "Week-end uniquement", description: "Accès le week-end", days: ["sat", "sun"], startTime: "08:00", endTime: "20:00", isHolidayExcluded: false },
]

export const ZONES_STATS = {
  totalZones: 8,
  totalReaders: 11,
  totalGroups: 8,
  readersOnline: 9,
  readersOffline: 1,
  readersMaintenance: 1,
  readersTampered: 1,
}
