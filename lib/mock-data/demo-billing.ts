export type PlanId = "free" | "essentiel" | "pro" | "enterprise"
export interface Plan { id: PlanId; name: string; price: number; priceLabel: string; badge?: "populaire" | "recommande" | "actuel" | "enterprise"; description: string; features: { label: string; included: boolean; highlight?: boolean }[]; limits: { employees: number | "illimite"; devices: number | "illimite"; sites: number | "illimite"; admins: number | "illimite"; historyDays: number | "illimite" }; color: string; gradient: string }
export const PLANS: Plan[] = []
export type AccountStatus = "active" | "trial" | "suspended" | "expired" | "pending_payment"
export interface CurrentSubscription { planId: PlanId; status: AccountStatus; renewalDate: string; renewalAmount: number; startDate: string; trialEndsAt?: string; cancelAtPeriodEnd: boolean; autoRenew: boolean }
export const currentSubscription: CurrentSubscription = { planId: "free", status: "pending_payment", renewalDate: "", renewalAmount: 0, startDate: "", cancelAtPeriodEnd: false, autoRenew: false }
export interface UsageData { employees: { used: number; limit: number | "illimite" }; devices: { used: number; limit: number | "illimite" }; sites: { used: number; limit: number | "illimite" }; admins: { used: number; limit: number | "illimite" }; historyDays: number | "illimite" }
export const currentUsage: UsageData = { employees: { used: 0, limit: 0 }, devices: { used: 0, limit: 0 }, sites: { used: 0, limit: 0 }, admins: { used: 0, limit: 0 }, historyDays: 0 }
export type PaymentMethodType = "mobile_wallet" | "bank_card" | "bank_transfer" | "pro_account" | "manual"
export type PaymentMethodStatus = "active" | "expired" | "pending" | "invalid"
export interface PaymentMethod { id: string; type: PaymentMethodType; label: string; detail: string; isDefault: boolean; isVerified: boolean; status: PaymentMethodStatus; addedAt: string; expiresAt?: string }
export const paymentMethods: PaymentMethod[] = []
export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded" | "cancelled"
export interface Invoice { id: string; number: string; period: string; amount: number; status: InvoiceStatus; paymentMethod: string; issuedAt: string; paidAt?: string; dueAt: string; planName: string; downloadUrl: string }
export const invoices: Invoice[] = []
export const TICKET_CATEGORIES: string[] = []
export interface SupportTicket { id: string; category: string; subject: string; status: "open" | "pending" | "closed"; priority: "low" | "normal" | "high"; createdAt: string; updatedAt: string; invoiceRef?: string; description: string }
export const supportTickets: SupportTicket[] = []
export const nextDueDate = ""
export const autoDebitEnabled = false
export const autoDebitMethodId = ""
export const nextDebitEstimate = ""
