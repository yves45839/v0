// ──────────────────────────────────────────────────────────
//  DONNÉES MOCKÉES — ABONNEMENTS & PAIEMENTS
//  Aucune donnée réelle, aucune clé, aucune marque commerciale
// ──────────────────────────────────────────────────────────

export type PlanId = "free" | "essentiel" | "pro" | "enterprise"

export interface Plan {
  id: PlanId
  name: string
  price: number
  priceLabel: string
  badge?: "populaire" | "recommande" | "actuel" | "enterprise"
  description: string
  features: { label: string; included: boolean; highlight?: boolean }[]
  limits: {
    employees: number | "illimite"
    devices: number | "illimite"
    sites: number | "illimite"
    admins: number | "illimite"
    historyDays: number | "illimite"
  }
  color: string
  gradient: string
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "0 FCFA / mois",
    description: "Idéal pour tester la plateforme ou les très petites structures.",
    color: "text-slate-500",
    gradient: "from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50",
    limits: { employees: 5, devices: 1, sites: 1, admins: 1, historyDays: 7 },
    features: [
      { label: "5 employés maximum", included: true },
      { label: "1 porte / 1 appareil", included: true },
      { label: "1 site", included: true },
      { label: "1 administrateur", included: true },
      { label: "Historique 7 jours", included: true },
      { label: "Tableau de bord basique", included: true },
      { label: "Rapports standards", included: false },
      { label: "Alertes & validations RH", included: false },
      { label: "Exports complets", included: false },
      { label: "API / webhooks", included: false },
      { label: "Support prioritaire", included: false },
    ],
  },
  {
    id: "essentiel",
    name: "Essentiel",
    price: 7500,
    priceLabel: "7 500 FCFA / mois",
    description: "Pour les petites entreprises qui démarrent la gestion des accès.",
    color: "text-blue-500",
    gradient: "from-blue-50 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/30",
    limits: { employees: 15, devices: 2, sites: 1, admins: 2, historyDays: 90 },
    features: [
      { label: "15 employés maximum", included: true },
      { label: "2 portes / appareils", included: true },
      { label: "1 site", included: true },
      { label: "2 administrateurs", included: true },
      { label: "Historique 3 mois", included: true },
      { label: "Tableau de bord standard", included: true },
      { label: "Rapports standards", included: true },
      { label: "Export simple", included: true },
      { label: "Alertes & validations RH", included: false },
      { label: "API / webhooks", included: false },
      { label: "Support prioritaire", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 20000,
    priceLabel: "20 000 FCFA / mois",
    badge: "populaire",
    description: "La solution complète pour les entreprises en croissance.",
    color: "text-violet-500",
    gradient: "from-violet-50 to-purple-100/60 dark:from-violet-950/40 dark:to-purple-900/30",
    limits: { employees: 40, devices: 5, sites: 2, admins: 5, historyDays: 365 },
    features: [
      { label: "40 employés maximum", included: true, highlight: true },
      { label: "5 portes / appareils", included: true, highlight: true },
      { label: "2 sites", included: true },
      { label: "5 administrateurs", included: true },
      { label: "Historique 12 mois", included: true },
      { label: "Rapports avancés", included: true, highlight: true },
      { label: "Alertes & validations RH", included: true, highlight: true },
      { label: "Exports complets", included: true },
      { label: "API / webhooks", included: false },
      { label: "Support prioritaire", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 50000,
    priceLabel: "À partir de 50 000 FCFA / mois",
    badge: "recommande",
    description: "Pour les grandes organisations avec des besoins avancés.",
    color: "text-amber-500",
    gradient: "from-amber-50 to-orange-100/60 dark:from-amber-950/40 dark:to-orange-900/30",
    limits: { employees: 100, devices: 15, sites: "illimite", admins: "illimite", historyDays: "illimite" },
    features: [
      { label: "100+ employés", included: true, highlight: true },
      { label: "15+ portes / appareils", included: true, highlight: true },
      { label: "Multi-sites illimités", included: true, highlight: true },
      { label: "Administrateurs avancés", included: true },
      { label: "Historique illimité", included: true },
      { label: "Rapports avancés & BI", included: true },
      { label: "Alertes & validations RH", included: true },
      { label: "Exports complets", included: true },
      { label: "API / webhooks", included: true, highlight: true },
      { label: "Support prioritaire", included: true, highlight: true },
      { label: "Personnalisation avancée", included: true },
    ],
  },
]

// ── ABONNEMENT ACTUEL ──────────────────────────────────────
export type AccountStatus = "active" | "trial" | "suspended" | "expired" | "pending_payment"

export interface CurrentSubscription {
  planId: PlanId
  status: AccountStatus
  renewalDate: string
  renewalAmount: number
  startDate: string
  trialEndsAt?: string
  cancelAtPeriodEnd: boolean
  autoRenew: boolean
}

export const currentSubscription: CurrentSubscription = {
  planId: "pro",
  status: "active",
  renewalDate: "2026-05-12",
  renewalAmount: 20000,
  startDate: "2025-05-12",
  cancelAtPeriodEnd: false,
  autoRenew: true,
}

// ── UTILISATION ───────────────────────────────────────────
export interface UsageData {
  employees: { used: number; limit: number | "illimite" }
  devices: { used: number; limit: number | "illimite" }
  sites: { used: number; limit: number | "illimite" }
  admins: { used: number; limit: number | "illimite" }
  historyDays: number | "illimite"
}

export const currentUsage: UsageData = {
  employees: { used: 34, limit: 40 },
  devices: { used: 4, limit: 5 },
  sites: { used: 2, limit: 2 },
  admins: { used: 3, limit: 5 },
  historyDays: 365,
}

// ── MOYENS DE PAIEMENT ─────────────────────────────────────
export type PaymentMethodType = "mobile_wallet" | "bank_card" | "bank_transfer" | "pro_account" | "manual"
export type PaymentMethodStatus = "active" | "expired" | "pending" | "invalid"

export interface PaymentMethod {
  id: string
  type: PaymentMethodType
  label: string
  detail: string
  isDefault: boolean
  isVerified: boolean
  status: PaymentMethodStatus
  addedAt: string
  expiresAt?: string
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: "pm-001",
    type: "mobile_wallet",
    label: "Portefeuille mobile principal",
    detail: "+221 77 ••• ••• 42",
    isDefault: true,
    isVerified: true,
    status: "active",
    addedAt: "2025-01-15",
  },
  {
    id: "pm-002",
    type: "bank_card",
    label: "Carte bancaire professionnelle",
    detail: "**** **** **** 8823",
    isDefault: false,
    isVerified: true,
    status: "active",
    addedAt: "2025-03-02",
    expiresAt: "2027-09",
  },
  {
    id: "pm-003",
    type: "bank_transfer",
    label: "Virement bancaire",
    detail: "IBAN FR76 ••••••••••• 3301",
    isDefault: false,
    isVerified: false,
    status: "pending",
    addedAt: "2026-03-28",
  },
]

// ── FACTURES ──────────────────────────────────────────────
export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded" | "cancelled"

export interface Invoice {
  id: string
  number: string
  period: string
  amount: number
  status: InvoiceStatus
  paymentMethod: string
  issuedAt: string
  paidAt?: string
  dueAt: string
  planName: string
  downloadUrl: string
}

export const invoices: Invoice[] = [
  {
    id: "inv-001",
    number: "FAC-2026-0412",
    period: "Avril 2026",
    amount: 20000,
    status: "paid",
    paymentMethod: "Portefeuille mobile principal",
    issuedAt: "2026-04-01",
    paidAt: "2026-04-01",
    dueAt: "2026-04-12",
    planName: "Pro",
    downloadUrl: "#",
  },
  {
    id: "inv-002",
    number: "FAC-2026-0312",
    period: "Mars 2026",
    amount: 20000,
    status: "paid",
    paymentMethod: "Portefeuille mobile principal",
    issuedAt: "2026-03-01",
    paidAt: "2026-03-01",
    dueAt: "2026-03-12",
    planName: "Pro",
    downloadUrl: "#",
  },
  {
    id: "inv-003",
    number: "FAC-2026-0212",
    period: "Février 2026",
    amount: 20000,
    status: "failed",
    paymentMethod: "Carte bancaire professionnelle",
    issuedAt: "2026-02-01",
    dueAt: "2026-02-12",
    planName: "Pro",
    downloadUrl: "#",
  },
  {
    id: "inv-004",
    number: "FAC-2026-0112",
    period: "Janvier 2026",
    amount: 20000,
    status: "paid",
    paymentMethod: "Portefeuille mobile principal",
    issuedAt: "2026-01-01",
    paidAt: "2026-01-01",
    dueAt: "2026-01-12",
    planName: "Pro",
    downloadUrl: "#",
  },
  {
    id: "inv-005",
    number: "FAC-2025-1212",
    period: "Décembre 2025",
    amount: 20000,
    status: "paid",
    paymentMethod: "Portefeuille mobile principal",
    issuedAt: "2025-12-01",
    paidAt: "2025-12-01",
    dueAt: "2025-12-12",
    planName: "Pro",
    downloadUrl: "#",
  },
  {
    id: "inv-006",
    number: "FAC-2025-1112",
    period: "Novembre 2025",
    amount: 7500,
    status: "refunded",
    paymentMethod: "Carte bancaire professionnelle",
    issuedAt: "2025-11-01",
    paidAt: "2025-11-01",
    dueAt: "2025-11-12",
    planName: "Essentiel",
    downloadUrl: "#",
  },
  {
    id: "inv-007",
    number: "FAC-2025-1012",
    period: "Octobre 2025",
    amount: 7500,
    status: "paid",
    paymentMethod: "Virement bancaire",
    issuedAt: "2025-10-01",
    paidAt: "2025-10-03",
    dueAt: "2025-10-12",
    planName: "Essentiel",
    downloadUrl: "#",
  },
]

// ── TICKETS SUPPORT ────────────────────────────────────────
export type TicketStatus = "open" | "pending" | "resolved" | "closed" | "urgent"
export type TicketPriority = "low" | "normal" | "high" | "urgent"

export interface SupportTicket {
  id: string
  number: string
  subject: string
  category: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  updatedAt: string
  invoiceRef?: string
  description: string
  messages: { author: string; text: string; at: string; isSupport: boolean }[]
}

export const TICKET_CATEGORIES = [
  "Paiement non confirmé",
  "Débit non visible",
  "Facture introuvable",
  "Prélèvement automatique non souhaité",
  "Moyen de paiement refusé",
  "Renouvellement non pris en compte",
  "Montant contesté",
  "Erreur de facturation",
  "Besoin de facture personnalisée",
  "Besoin de devis / offre sur mesure",
  "Autre problème de paiement",
]

export const supportTickets: SupportTicket[] = [
  {
    id: "tkt-001",
    number: "TKT-2026-0087",
    subject: "Paiement de février 2026 non confirmé",
    category: "Paiement non confirmé",
    status: "open",
    priority: "high",
    createdAt: "2026-02-14T10:22:00",
    updatedAt: "2026-02-14T14:35:00",
    invoiceRef: "FAC-2026-0212",
    description: "Le paiement de la facture FAC-2026-0212 a été débité mais non confirmé dans le système.",
    messages: [
      {
        author: "Ibrahima Diallo",
        text: "Bonjour, le montant de 20 000 FCFA a été prélevé le 12 février mais la facture reste en statut 'Échec'. Merci de vérifier.",
        at: "2026-02-14T10:22:00",
        isSupport: false,
      },
      {
        author: "Support SecurePoint",
        text: "Bonjour, nous avons bien reçu votre demande. Nous analysons la transaction. Un retour sous 24h.",
        at: "2026-02-14T14:35:00",
        isSupport: true,
      },
    ],
  },
  {
    id: "tkt-002",
    number: "TKT-2026-0051",
    subject: "Demande de facture personnalisée pour audit",
    category: "Besoin de facture personnalisée",
    status: "resolved",
    priority: "normal",
    createdAt: "2026-01-20T09:00:00",
    updatedAt: "2026-01-22T11:10:00",
    description: "Besoin d'une facture avec mentions spéciales pour notre audit interne annuel.",
    messages: [
      {
        author: "Fatou Sow",
        text: "Pouvez-vous nous envoyer une version de la facture avec le numéro de TVA intracommunautaire et notre code client ?",
        at: "2026-01-20T09:00:00",
        isSupport: false,
      },
      {
        author: "Support SecurePoint",
        text: "Document généré et disponible en téléchargement. La facture a été mise à jour avec les mentions demandées.",
        at: "2026-01-22T11:10:00",
        isSupport: true,
      },
    ],
  },
  {
    id: "tkt-003",
    number: "TKT-2025-0312",
    subject: "Montant prélevé incorrect - novembre 2025",
    category: "Montant contesté",
    status: "closed",
    priority: "urgent",
    createdAt: "2025-11-18T16:44:00",
    updatedAt: "2025-11-25T08:20:00",
    invoiceRef: "FAC-2025-1112",
    description: "Le prélèvement de novembre correspond à l'ancien tarif Essentiel alors que nous avions migré vers Pro.",
    messages: [
      {
        author: "Moussa Traoré",
        text: "Nous avons migré vers le plan Pro en début de mois mais avons quand même été facturés au tarif Essentiel.",
        at: "2025-11-18T16:44:00",
        isSupport: false,
      },
      {
        author: "Support SecurePoint",
        text: "Après vérification, un remboursement de la différence a été effectué. Un avoir a été émis. Désolé pour la gêne.",
        at: "2025-11-25T08:20:00",
        isSupport: true,
      },
    ],
  },
]

// ── PROCHAINE ÉCHÉANCE ─────────────────────────────────────
export const nextDueDate = "2026-05-12"
export const autoDebitEnabled = true
export const autoDebitMethodId = "pm-001"
export const nextDebitEstimate = "2026-05-12"
