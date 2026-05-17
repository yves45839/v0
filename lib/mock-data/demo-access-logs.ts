export type DemoAccessLog = { id: string; employeeId: string; employeeName: string; department: string; deviceId: string; deviceName: string; deviceLocation: string; status: "granted" | "denied" | "unknown"; accessType: string; site: string; reason?: string; timestamp: string; date: string; dateLabel: string }
export const DEMO_ACCESS_LOGS: DemoAccessLog[] = []
