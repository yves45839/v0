export type Visitor = { id: string; firstName: string; lastName: string; company?: string; host?: string; checkInAt?: string; checkOutAt?: string; status: "expected" | "on_site" | "checked_out" | "overdue" }
export type BadgeRecord = { id: string; badgeNumber: string; visitorId: string; active: boolean; assignedAt: string }
export const VISITORS: Visitor[] = []
export const ACTIVE_BADGES: BadgeRecord[] = []
export const VISITOR_STATS = { onSiteNow: 0, expectedToday: 0, pendingApprovals: 0, overdueBadges: 0 }
