"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { fetchHikEvents, triggerHikEventsCatchup, type HikEvent } from "@/lib/api/access-logs"
import { fetchEmployees, type EmployeeListItem } from "@/lib/api/employees"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  DoorOpen,
  AlertTriangle,
  Calendar,
  RefreshCcw,
  User,
} from "lucide-react"

type AccessLog = {
  id: string
  employeeId: string
  employeeName: string
  department: string
  deviceId: string
  deviceName: string
  deviceLocation: string
  status: "granted" | "denied" | "unknown"
  reason?: string
  timestamp: string
  date: string
  dateLabel: string
}

const LIVE_POLL_INTERVAL_MS = 2000
const MAX_VISIBLE_LOGS = 500

function toNumericLogId(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sortLogsByNewest(a: AccessLog, b: AccessLog): number {
  return toNumericLogId(b.id) - toNumericLogId(a.id)
}

function getLatestLogId(logs: AccessLog[]): number | null {
  if (logs.length === 0) return null
  return logs.reduce((maxId, log) => {
    const currentId = toNumericLogId(log.id)
    return currentId > maxId ? currentId : maxId
  }, 0)
}

function mergeAccessLogs(existing: AccessLog[], incoming: AccessLog[]): AccessLog[] {
  const byId = new Map<string, AccessLog>()
  for (const log of existing) byId.set(log.id, log)
  for (const log of incoming) byId.set(log.id, log)
  return Array.from(byId.values()).sort(sortLogsByNewest).slice(0, MAX_VISIBLE_LOGS)
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function inferStatus(event: HikEvent): "granted" | "denied" | "unknown" {
  const normalizedAction = (event.normalized_action ?? "").trim().toUpperCase()
  if (normalizedAction === "ACCESS_DENIED") {
    return "denied"
  }
  if (
    normalizedAction === "CHECK_IN" ||
    normalizedAction === "CHECK_OUT" ||
    normalizedAction === "BREAK_IN" ||
    normalizedAction === "BREAK_OUT" ||
    normalizedAction === "OVERTIME_IN" ||
    normalizedAction === "OVERTIME_OUT"
  ) {
    return "granted"
  }

  const text = `${event.access_status ?? ""} ${event.attendance_status ?? ""} ${event.attendance_type ?? ""}`
    .toLowerCase()
    .trim()
  if (text.includes("denied") || text.includes("deny") || text.includes("refus") || text.includes("forbid")) {
    return "denied"
  }
  if (
    text.includes("granted") ||
    text.includes("allow") ||
    text.includes("autor") ||
    text.includes("success")
  ) {
    return "granted"
  }
  return "unknown"
}

function mapEventToAccessLog(event: HikEvent): AccessLog {
  const dateValue = event.timestamp || event.raw_event?.event_datetime || new Date().toISOString()
  const parsed = new Date(dateValue)
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const status = inferStatus(event)
  const doorNo = event.raw_event?.door_no
  const readerNo = event.raw_event?.card_reader_no
  const location =
    doorNo != null || readerNo != null
      ? `Porte ${doorNo ?? "-"}${readerNo != null ? `, Lecteur ${readerNo}` : ""}`
      : `Lecteur ${event.device.dev_index}`

  return {
    id: String(event.id),
    employeeId: event.person_id || "-",
    employeeName: event.employee_name?.trim() || event.person_id || "Systeme",
    department: event.department_name?.trim() || "-",
    deviceId: String(event.device.id),
    deviceName: event.device.device_name?.trim() || event.device.dev_index || event.device.serial_number || "-",
    deviceLocation: location,
    status,
    reason:
      status === "denied"
        ? event.attendance_status || "Acces refuse"
        : status === "unknown"
          ? event.attendance_status || "Evenement non classe"
          : undefined,
    timestamp: safeDate.toLocaleTimeString("fr-FR", { hour12: false }),
    date: toDateKey(safeDate),
    dateLabel: safeDate.toLocaleDateString("fr-FR"),
  }
}

export default function AccessLogsPage() {
  const tenantCode = (
    process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT ??
    process.env.NEXT_PUBLIC_EMPLOYEE_TENANT_CODE ??
    "HQ-CASA"
  ).trim()
  const latestLogIdRef = useRef<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deviceFilter, setDeviceFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("today")
  const [isLive, setIsLive] = useState(true)
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peopleError, setPeopleError] = useState<string | null>(null)
  const [catchupLoading, setCatchupLoading] = useState(false)
  const [hasAutoCatchupAttempted, setHasAutoCatchupAttempted] = useState(false)

  const loadLogs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true)
    setError(null)
    try {
      const payload = await fetchHikEvents({
        limit: 300,
        autoCatchup: true,
        tenant: tenantCode,
        personId: personFilter !== "all" ? personFilter : undefined,
      })
      const mapped = payload.results.map(mapEventToAccessLog).sort(sortLogsByNewest)
      latestLogIdRef.current = getLatestLogId(mapped)
      setAccessLogs(mapped)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les evenements."
      setError(message)
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [personFilter, tenantCode])

  const loadLatestLogs = useCallback(async () => {
    const sinceId = latestLogIdRef.current
    if (!sinceId) {
      await loadLogs(false)
      return
    }

    try {
      const payload = await fetchHikEvents({
        limit: 100,
        sinceId,
        autoCatchup: true,
        tenant: tenantCode,
        personId: personFilter !== "all" ? personFilter : undefined,
      })
      if (payload.results.length === 0) return

      const mapped = payload.results.map(mapEventToAccessLog)
      setAccessLogs((existing) => {
        const merged = mergeAccessLogs(existing, mapped)
        latestLogIdRef.current = getLatestLogId(merged)
        return merged
      })
    } catch {
      // Ignore transient live refresh errors and keep the last successful state.
    }
  }, [loadLogs, personFilter, tenantCode])

  const loadPeople = useCallback(async () => {
    setPeopleError(null)
    try {
      const list = await fetchEmployees(tenantCode)
      setEmployees(list)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les personnes."
      setPeopleError(message)
    }
  }, [tenantCode])

  useEffect(() => {
    void loadLogs(true)
  }, [loadLogs])

  useEffect(() => {
    void loadPeople()
  }, [loadPeople])

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      void loadLatestLogs()
    }, LIVE_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isLive, loadLatestLogs])

  const now = new Date()
  const todayKey = toDateKey(now)
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday)

  const recentLogsCount = useMemo(
    () => accessLogs.filter((log) => log.date === todayKey || log.date === yesterdayKey).length,
    [accessLogs, todayKey, yesterdayKey],
  )

  const runCatchupAndReload = useCallback(async () => {
    setCatchupLoading(true)
    setError(null)
    try {
      await triggerHikEventsCatchup(500)
      await loadLogs(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Le rattrapage des evenements a echoue."
      setError(message)
    } finally {
      setCatchupLoading(false)
    }
  }, [loadLogs])

  useEffect(() => {
    if (loading || catchupLoading || hasAutoCatchupAttempted) return
    if (accessLogs.length === 0 || recentLogsCount === 0) {
      setHasAutoCatchupAttempted(true)
      void runCatchupAndReload()
    }
  }, [accessLogs.length, recentLogsCount, loading, catchupLoading, hasAutoCatchupAttempted, runCatchupAndReload])

  const todayLogs = useMemo(() => accessLogs.filter((log) => log.date === todayKey), [accessLogs, todayKey])
  const totalAccess = todayLogs.length
  const grantedAccess = todayLogs.filter((log) => log.status === "granted").length
  const deniedAccess = todayLogs.filter((log) => log.status === "denied").length
  const devices = useMemo(() => [...new Set(accessLogs.map((log) => log.deviceName))], [accessLogs])

  const filteredLogs = useMemo(
    () =>
      accessLogs.filter((log) => {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          log.employeeName.toLowerCase().includes(query) ||
          log.employeeId.toLowerCase().includes(query) ||
          log.deviceName.toLowerCase().includes(query)

        const matchesStatus = statusFilter === "all" || log.status === statusFilter
        const matchesDevice = deviceFilter === "all" || log.deviceName === deviceFilter
        const matchesPerson = personFilter === "all" || log.employeeId === personFilter
        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "today" && log.date === todayKey) ||
          (dateFilter === "yesterday" && log.date === yesterdayKey)

        return matchesSearch && matchesStatus && matchesDevice && matchesPerson && matchesDate
      }),
    [accessLogs, searchQuery, statusFilter, deviceFilter, personFilter, dateFilter, todayKey, yesterdayKey],
  )

  const handleExportCsv = () => {
    const rows = [
      ["Heure", "Employe", "Matricule", "Departement", "Appareil", "Localisation", "Statut", "Details"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          `"${log.employeeName.replaceAll('"', '""')}"`,
          log.employeeId,
          `"${log.department.replaceAll('"', '""')}"`,
          `"${log.deviceName.replaceAll('"', '""')}"`,
          `"${log.deviceLocation.replaceAll('"', '""')}"`,
          log.status === "granted" ? "Autorise" : log.status === "denied" ? "Refuse" : "Inconnu",
          `"${(log.reason ?? "").replaceAll('"', '""')}"`,
        ].join(","),
      ),
    ]
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `access-logs-${todayKey}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="p-6">
          <PageContextBar
            title="Journal d'acces"
            description="Historique temps reel des acces autorises et refuses, avec capacites de rattrapage et d'export."
            stats={[
              { value: totalAccess, label: "Evenements du jour" },
              { value: deniedAccess, label: "Refus", tone: deniedAccess > 0 ? "critical" : "success" },
              { value: devices.length, label: "Appareils concernes" },
            ]}
            actions={
              <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLive((v) => !v)}
                className={
                  isLive
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                    : ""
                }
              >
                {isLive && <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
                Live
              </Button>
              <Button variant="outline" size="sm" onClick={() => void loadLogs(true)} disabled={loading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
              <Button variant="outline" size="sm" onClick={() => void runCatchupAndReload()} disabled={catchupLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {catchupLoading ? "Rattrapage..." : "Rattraper les acces"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exporter CSV
              </Button>
              </>
            }
          />

          {peopleError && (
            <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              {peopleError}
            </div>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="border-border/70 bg-card/90">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <DoorOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Aujourd&apos;hui</p>
                  <p className="text-2xl font-semibold text-foreground">{totalAccess}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acces Autorises</p>
                  <p className="text-2xl font-semibold text-foreground">{grantedAccess}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acces Refuses</p>
                  <p className="text-2xl font-semibold text-foreground">{deniedAccess}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6 border-border/70 bg-card/90">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, matricule ou appareil..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="all">Tout</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="granted">Autorise</SelectItem>
                    <SelectItem value="denied">Refuse</SelectItem>
                    <SelectItem value="unknown">Inconnu</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={personFilter} onValueChange={setPersonFilter}>
                  <SelectTrigger className="w-full lg:w-[260px]">
                    <User className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Toutes les personnes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les personnes ({employees.length})</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={String(employee.id)} value={employee.employee_no}>
                        {employee.name || employee.employee_no} ({employee.employee_no})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="w-full lg:w-[220px]">
                    <SelectValue placeholder="Appareil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les appareils</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device} value={device}>
                        {device}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Evenements ({filteredLogs.length})</CardTitle>
                {isLive && (
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                    <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Temps reel
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {error && (
                <div className="mx-4 mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[180px]">Heure</TableHead>
                    <TableHead>Employe</TableHead>
                    <TableHead>Departement</TableHead>
                    <TableHead>Appareil</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && filteredLogs.length === 0 && (
                    <TableRow className="border-border">
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Aucun evenement trouve.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-border transition-colors hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono">{log.timestamp}</span>
                          <span className="text-xs text-muted-foreground">{log.dateLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {log.employeeName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{log.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{log.employeeId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {log.department}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{log.deviceName}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{log.deviceLocation}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        {log.status === "granted" ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Autorise
                          </Badge>
                        ) : log.status === "denied" ? (
                          <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                            <XCircle className="mr-1 h-3 w-3" />
                            Refuse
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Inconnu
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.reason && (
                          <div className="flex items-center gap-1.5 text-sm text-amber-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{log.reason}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
