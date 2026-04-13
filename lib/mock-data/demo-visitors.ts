// ── Mock data — Visiteurs ─────────────────────────────────────────────────────

export type VisitorStatus = "expected" | "checked_in" | "checked_out" | "cancelled" | "no_show"
export type BadgeType     = "visitor" | "contractor" | "vip" | "delivery" | "temporary"
export type VisitPurpose  = "meeting" | "delivery" | "maintenance" | "interview" | "other"

export type Visitor = {
  id: string
  firstName: string
  lastName: string
  company?: string
  email: string
  phone?: string
  badgeType: BadgeType
  purpose: VisitPurpose
  hostName: string
  hostDept: string
  status: VisitorStatus
  scheduledAt: string
  checkedInAt?: string
  checkedOutAt?: string
  accessZones: string[]
  badgeNumber?: string
  vehiclePlate?: string
  idVerified: boolean
  notes?: string
  photoUrl?: string
}

export type BadgeRecord = {
  id: string
  badgeNumber: string
  visitorId: string
  visitorName: string
  badgeType: BadgeType
  issuedAt: string
  expiresAt: string
  isActive: boolean
  accessZones: string[]
}

export const VISITORS: Visitor[] = [
  {
    id: "VIS-001",
    firstName: "Sophie",
    lastName: "Marchand",
    company: "KPMG Audit",
    email: "s.marchand@kpmg.com",
    phone: "+33 6 12 34 56 78",
    badgeType: "vip",
    purpose: "meeting",
    hostName: "Aminata Touré",
    hostDept: "Direction Générale",
    status: "checked_in",
    scheduledAt: "2026-04-12T09:00:00Z",
    checkedInAt: "2026-04-12T08:55:12Z",
    accessZones: ["Accueil", "Salle de réunion R+2", "Cafétéria"],
    badgeNumber: "VBG-2026-0412-001",
    idVerified: true,
    notes: "Auditrice externe — accès salle de données autorisé",
  },
  {
    id: "VIS-002",
    firstName: "Bruno",
    lastName: "Alves",
    company: "TechFix Maintenance",
    email: "b.alves@techfix.fr",
    phone: "+33 6 98 76 54 32",
    badgeType: "contractor",
    purpose: "maintenance",
    hostName: "Maxime Fontaine",
    hostDept: "Infrastructure IT",
    status: "expected",
    scheduledAt: "2026-04-12T14:00:00Z",
    accessZones: ["Accueil", "Salle serveurs N3", "Local technique"],
    idVerified: false,
  },
  {
    id: "VIS-003",
    firstName: "Léa",
    lastName: "Dumont",
    company: undefined,
    email: "lea.dumont@gmail.com",
    badgeType: "visitor",
    purpose: "interview",
    hostName: "Chloé Bernard",
    hostDept: "Ressources Humaines",
    status: "expected",
    scheduledAt: "2026-04-12T10:30:00Z",
    accessZones: ["Accueil", "RH — Salle entretien"],
    idVerified: false,
  },
  {
    id: "VIS-004",
    firstName: "Jean-Claude",
    lastName: "Mbeki",
    company: "Express Livraison",
    email: "jc.mbeki@express-liv.com",
    badgeType: "delivery",
    purpose: "delivery",
    hostName: "Service Accueil",
    hostDept: "Administration",
    status: "checked_out",
    scheduledAt: "2026-04-12T08:00:00Z",
    checkedInAt: "2026-04-12T08:03:22Z",
    checkedOutAt: "2026-04-12T08:18:45Z",
    accessZones: ["Accueil", "Zone livraison"],
    badgeNumber: "VBG-2026-0412-002",
    vehiclePlate: "AB-123-CD",
    idVerified: true,
  },
  {
    id: "VIS-005",
    firstName: "Myriam",
    lastName: "Tran",
    company: "Cabinet Conseil Stratégie",
    email: "m.tran@ccs-conseil.fr",
    phone: "+33 6 55 44 33 22",
    badgeType: "vip",
    purpose: "meeting",
    hostName: "Aminata Touré",
    hostDept: "Direction Générale",
    status: "expected",
    scheduledAt: "2026-04-12T11:00:00Z",
    accessZones: ["Accueil", "Salle de conseil R+3", "Cafétéria"],
    idVerified: false,
  },
  {
    id: "VIS-006",
    firstName: "Patrice",
    lastName: "Ngom",
    company: "FireSafe Systems",
    email: "p.ngom@firesafe.fr",
    badgeType: "contractor",
    purpose: "maintenance",
    hostName: "Maxime Fontaine",
    hostDept: "Infrastructure IT",
    status: "cancelled",
    scheduledAt: "2026-04-12T09:30:00Z",
    accessZones: ["Accueil", "Local technique RDC"],
    idVerified: false,
    notes: "Annulé — reporté au 15/04",
  },
  {
    id: "VIS-007",
    firstName: "Amandine",
    lastName: "Leclerc",
    company: "Cabinet Fiscal Partenaires",
    email: "a.leclerc@cfp-fiscal.com",
    badgeType: "visitor",
    purpose: "meeting",
    hostName: "Kofi Asante",
    hostDept: "Finance",
    status: "checked_out",
    scheduledAt: "2026-04-11T14:00:00Z",
    checkedInAt: "2026-04-11T14:02:00Z",
    checkedOutAt: "2026-04-11T15:45:00Z",
    accessZones: ["Accueil", "Finance R+1"],
    badgeNumber: "VBG-2026-0411-005",
    idVerified: true,
  },
  {
    id: "VIS-008",
    firstName: "Thomas",
    lastName: "Vidal",
    company: undefined,
    email: "t.vidal@candidat.com",
    badgeType: "visitor",
    purpose: "interview",
    hostName: "Chloé Bernard",
    hostDept: "Ressources Humaines",
    status: "no_show",
    scheduledAt: "2026-04-11T10:00:00Z",
    accessZones: ["Accueil", "RH — Salle entretien"],
    idVerified: false,
  },
]

export const ACTIVE_BADGES: BadgeRecord[] = [
  {
    id: "BDG-001",
    badgeNumber: "VBG-2026-0412-001",
    visitorId: "VIS-001",
    visitorName: "Sophie Marchand",
    badgeType: "vip",
    issuedAt: "2026-04-12T08:55:12Z",
    expiresAt: "2026-04-12T18:00:00Z",
    isActive: true,
    accessZones: ["Accueil", "Salle de réunion R+2", "Cafétéria"],
  },
]

export const VISITOR_STATS = {
  todayExpected: 5,
  todayCheckedIn: 2,
  todayCheckedOut: 2,
  currentlyOnSite: 1,
  weekTotal: 23,
  avgDurationMinutes: 67,
}
