import type { AccessEvent, DashboardKPIData, Device, PriorityAction } from "@/components/dashboard/types"
export const dashboardKpiData: DashboardKPIData = { presentToday: { count: 0, total: 0 }, totalAbsences: 0, lateArrivals: 0, activeDevices: { count: 0, total: 0 } }
export const accessEvents: AccessEvent[] = []
export const devices: Device[] = []
export const priorityActions: PriorityAction[] = []
