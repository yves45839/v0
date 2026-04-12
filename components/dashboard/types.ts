export type DashboardSystemStatus = "connected" | "disconnected" | "syncing"

export interface DashboardKPIData {
  presentToday: { count: number; total: number }
  totalAbsences: number
  lateArrivals: number
  activeDevices: { count: number; total: number }
}

export interface AccessEvent {
  id: string
  employeeId: string
  name: string
  photo?: string
  department: string
  deviceName: string
  status: "granted" | "denied"
  timestamp: string
}

export interface Device {
  id: string
  name: string
  type: "door_controller" | "turnstile" | "reader"
  location: string
  status: "online" | "offline" | "warning"
  lastSeen: string
}

export interface PriorityAction {
  id: string
  title: string
  description: string
  priority: "critical" | "warning" | "info"
  count?: number
  ctaLabel?: string
  ctaHref?: string
}
