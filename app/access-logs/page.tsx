"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { fetchHikEvents, triggerHikEventsCatchup, type HikEvent } from "@/lib/api/access-logs"
import { getActiveTenantCode } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { fetchEmployees, type EmployeeListItem } from "@/lib/api/employees"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Loader2,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Inbox,
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"
import { accessLogsPageDict } from "@/lib/i18n/pages/access-logs-page"

type AccessLogsTr = (typeof accessLogsPageDict)["en"]

type AccessLog = {
  id: string
  employeeId: string
  employeeName: string
  department: string
  deviceId: string
  deviceName: string
  deviceLocation: string
  status: "granted" | "denied" | "unknown"
  accessType: string
  site: string
  reason?: string
  timestamp: string
  date: string
  dateLabel: string
}

const LIVE_POLL_INTERVAL_MS = 2000
const MAX_VISIBLE_LOGS = 500
const PAGE_SIZE = 25

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

function mapEventToAccessLog(event: HikEvent, tr: AccessLogsTr, localeTag: string): AccessLog {
  const dateValue = event.timestamp || event.raw_event?.event_datetime || new Date().toISOString()
  const parsed = new Date(dateValue)
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const status = inferStatus(event)
  const doorNo = event.raw_event?.door_no
  const readerNo = event.raw_event?.card_reader_no
  const location =
    doorNo != null || readerNo != null
      ? `${tr.door(doorNo ?? "-")}${readerNo != null ? `, ${tr.reader(readerNo)}` : ""}`
      : tr.reader(event.device.dev_index)
  const accessType =
    (event.normalized_action ?? "").toString().trim() ||
    (event.attendance_type ?? "").toString().trim() ||
    (event.access_status ?? "").toString().trim() ||
    tr.unknown
  const site = tr.site(event.device.dev_index || "-")

  return {
    id: String(event.id),
    employeeId: event.person_id || "-",
    employeeName: event.employee_name?.trim() || event.person_id || tr.system,
    department: event.department_name?.trim() || "-",
    deviceId: String(event.device.id),
    deviceName: event.device.device_name?.trim() || event.device.dev_index || event.device.serial_number || "-",
    deviceLocation: location,
    status,
    accessType,
    site,
    reason:
      status === "denied"
        ? event.attendance_status || tr.accessDeniedReason
        : status === "unknown"
          ? event.attendance_status || tr.unclassifiedEvent
          : undefined,
    timestamp: safeDate.toLocaleTimeString(localeTag, { hour12: false }),
    date: toDateKey(safeDate),
    dateLabel: safeDate.toLocaleDateString(localeTag),
  }
}

export default function AccessLogsPage() {
  const searchParams = useSearchParams()
  const { locale, localeTag } = useI18n()
  const tr = accessLogsPageDict[locale]
  const tenantCode = getActiveTenantCode()
  const latestLogIdRef = useRef<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deviceFilter, setDeviceFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("today")
  const [siteFilter, setSiteFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"datetime" | "employee" | "device" | "status">("datetime")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
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
      const mapped = payload.results
        .map((event) => mapEventToAccessLog(event, tr, localeTag))
        .sort(sortLogsByNewest)
      latestLogIdRef.current = getLatestLogId(mapped)
      setAccessLogs(mapped)
    } catch (err) {
      setAccessLogs([])
      setError(err instanceof Error ? err.message : tr.loadError)
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [personFilter, tenantCode, tr, localeTag])

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

      const mapped = payload.results.map((event) => mapEventToAccessLog(event, tr, localeTag))
      setAccessLogs((existing) => {
        const merged = mergeAccessLogs(existing, mapped)
        latestLogIdRef.current = getLatestLogId(merged)
        return merged
      })
    } catch {
      // Ignore transient live refresh errors and keep the last successful state.
    }
  }, [loadLogs, personFilter, tenantCode, tr, localeTag])

  const loadPeople = useCallback(async () => {
    setPeopleError(null)
    try {
      const list = await fetchEmployees(tenantCode)
      setEmployees(list)
    } catch (err) {
      const message = err instanceof Error ? err.message : tr.loadPeopleError
      setPeopleError(message)
    }
  }, [tenantCode, tr])

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

  const runCatchupAndReload = useCallback(async (options?: { silent?: boolean }) => {
    setCatchupLoading(true)
    setError(null)
    try {
      await triggerHikEventsCatchup(500)
      await loadLogs(true)
      if (!options?.silent) toast.success(tr.catchupDone)
    } catch (err) {
      // Le rattrapage est réservé aux administrateurs plateforme : un 403
      // est attendu pour un utilisateur tenant — pas une erreur à afficher.
      const isForbidden = err instanceof ApiError && err.status === 403
      if (isForbidden) {
        if (!options?.silent) toast.info(tr.catchupAdminOnly)
        return
      }
      const message = err instanceof Error ? err.message : tr.catchupFailedMessage
      setError(message)
      if (!options?.silent) toast.error(tr.catchupFailedToast)
    } finally {
      setCatchupLoading(false)
    }
  }, [loadLogs, tr])

  useEffect(() => {
    if (loading || catchupLoading || hasAutoCatchupAttempted) return
    if (accessLogs.length === 0 || recentLogsCount === 0) {
      setHasAutoCatchupAttempted(true)
      void runCatchupAndReload({ silent: true })
    }
  }, [accessLogs.length, recentLogsCount, loading, catchupLoading, hasAutoCatchupAttempted, runCatchupAndReload])

  const todayLogs = useMemo(() => accessLogs.filter((log) => log.date === todayKey), [accessLogs, todayKey])
  const totalAccess = todayLogs.length
  const grantedAccess = todayLogs.filter((log) => log.status === "granted").length
  const deniedAccess = todayLogs.filter((log) => log.status === "denied").length
  const devices = useMemo(() => [...new Set(accessLogs.map((log) => log.deviceName))], [accessLogs])
  const sites = useMemo(() => [...new Set(accessLogs.map((log) => log.site))], [accessLogs])
  const accessTypes = useMemo(() => [...new Set(accessLogs.map((log) => log.accessType))], [accessLogs])

  useEffect(() => {
    const initialSearch = searchParams.get("search")
    const initialStatus = searchParams.get("status")
    const initialPerson = searchParams.get("person")
    const initialDate = searchParams.get("date")
    const initialDevice = searchParams.get("device")
    const initialScope = searchParams.get("scope")

    if (initialSearch !== null) {
      setSearchQuery(initialSearch)
    }

    if (initialStatus && ["granted", "denied", "unknown"].includes(initialStatus)) {
      setStatusFilter(initialStatus)
    }
    if (initialPerson) {
      setPersonFilter(initialPerson)
    }
    if (initialDate && ["today", "yesterday", "last7", "all"].includes(initialDate)) {
      setDateFilter(initialDate)
    }
    if (initialDevice) {
      setDeviceFilter(initialDevice)
    }
    if (initialScope === "departments") {
      setSortBy("employee")
      setSortOrder("asc")
    }
  }, [searchParams])

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
        const matchesSite = siteFilter === "all" || log.site === siteFilter
        const matchesType = typeFilter === "all" || log.accessType === typeFilter
        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "today" && log.date === todayKey) ||
          (dateFilter === "yesterday" && log.date === yesterdayKey) ||
          (dateFilter === "last7" && (() => {
            const logDate = new Date(`${log.date}T00:00:00`)
            const diffDays = Math.floor((now.getTime() - logDate.getTime()) / 86400000)
            return diffDays >= 0 && diffDays <= 6
          })())

        return matchesSearch && matchesStatus && matchesDevice && matchesPerson && matchesSite && matchesType && matchesDate
      }),
    [accessLogs, searchQuery, statusFilter, deviceFilter, personFilter, siteFilter, typeFilter, dateFilter, todayKey, yesterdayKey, now],
  )

  const sortedLogs = useMemo(() => {
    const sorted = [...filteredLogs]
    sorted.sort((a, b) => {
      if (sortBy === "employee") return a.employeeName.localeCompare(b.employeeName, localeTag)
      if (sortBy === "device") return a.deviceName.localeCompare(b.deviceName, localeTag)
      if (sortBy === "status") return a.status.localeCompare(b.status, localeTag)
      return toNumericLogId(a.id) - toNumericLogId(b.id)
    })
    if (sortOrder === "desc") {
      sorted.reverse()
    }
    return sorted
  }, [filteredLogs, sortBy, sortOrder, localeTag])

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE))
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedLogs.slice(start, start + PAGE_SIZE)
  }, [sortedLogs, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, deviceFilter, personFilter, siteFilter, typeFilter, dateFilter, sortBy, sortOrder])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "all" ||
    deviceFilter !== "all" ||
    personFilter !== "all" ||
    siteFilter !== "all" ||
    typeFilter !== "all" ||
    dateFilter !== "today"

  const pageSystemStatus: "connected" | "disconnected" | "syncing" =
    loading || catchupLoading ? "syncing" : error && accessLogs.length === 0 ? "disconnected" : "connected"

  const handleExportCsv = () => {
    const rows = [
      tr.csvHeaders.join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          `"${log.employeeName.replaceAll('"', '""')}"`,
          log.employeeId,
          `"${log.department.replaceAll('"', '""')}"`,
          `"${log.deviceName.replaceAll('"', '""')}"`,
          `"${log.deviceLocation.replaceAll('"', '""')}"`,
          log.status === "granted" ? tr.statusGranted : log.status === "denied" ? tr.statusDenied : tr.statusUnknown,
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
    toast.success(tr.exportedToast(filteredLogs.length))
  }

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-shell-content">
        <Header systemStatus={pageSystemStatus} />

        <main className="app-page">
          <div className="animate-fade-up">
          <PageContextBar
            title={tr.pageTitle}
            description={tr.pageDescription}
            stats={[
              { value: totalAccess, label: tr.statEventsToday },
              { value: deniedAccess, label: tr.statDenied, tone: deniedAccess > 0 ? "critical" : "success" },
              { value: devices.length, label: tr.statDevices },
              { value: tenantCode, label: tr.statTenant, tone: "neutral" },
            ]}
            actions={
              <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLive((v) => !v)}
                className={
                  isLive
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-800 dark:hover:text-emerald-300"
                    : ""
                }
              >
                {isLive && <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
                {tr.live}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void loadLogs(true)} disabled={loading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {tr.refresh}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void runCatchupAndReload()} disabled={catchupLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {catchupLoading ? tr.catchupLoading : tr.catchupAction}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                {tr.exportCsv}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                  setDeviceFilter("all")
                  setPersonFilter("all")
                  setSiteFilter("all")
                  setTypeFilter("all")
                  setDateFilter("today")
                  setSortBy("datetime")
                  setSortOrder("desc")
                  toast.success(tr.filtersReset)
                }}
              >
                <X className="mr-2 h-4 w-4" />
                {tr.resetFilters}
              </Button>
              </>
            }
          />
          </div>

          {peopleError && (
            <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {peopleError}
            </div>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-3 stagger-children animate-fade-up" style={{ animationDelay: "80ms" }}>
            <Card className="border-border/70 bg-card/90">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <DoorOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tr.totalToday}</p>
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
                  <p className="text-sm text-muted-foreground">{tr.grantedAccess}</p>
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
                  <p className="text-sm text-muted-foreground">{tr.deniedAccess}</p>
                  <p className="text-2xl font-semibold text-foreground">{deniedAccess}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6 border-border/70 bg-card/90 animate-fade-up" style={{ animationDelay: "160ms" }}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                {tr.filters}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={tr.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full lg:w-45">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={tr.periodPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{tr.today}</SelectItem>
                    <SelectItem value="yesterday">{tr.yesterday}</SelectItem>
                    <SelectItem value="last7">{tr.last7Days}</SelectItem>
                    <SelectItem value="all">{tr.all}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-45">
                    <SelectValue placeholder={tr.statusPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allStatuses}</SelectItem>
                    <SelectItem value="granted">{tr.statusGranted}</SelectItem>
                    <SelectItem value="denied">{tr.statusDenied}</SelectItem>
                    <SelectItem value="unknown">{tr.statusUnknown}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={personFilter} onValueChange={setPersonFilter}>
                  <SelectTrigger className="w-full lg:w-65">
                    <User className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={tr.allPeoplePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allPeople(employees.length)}</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={String(employee.id)} value={employee.employee_no}>
                        {employee.name || employee.employee_no} ({employee.employee_no})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="w-full lg:w-55">
                    <SelectValue placeholder={tr.devicePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allDevices}</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device} value={device}>
                        {device}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={siteFilter} onValueChange={setSiteFilter}>
                  <SelectTrigger className="w-full lg:w-45">
                    <SelectValue placeholder={tr.sitePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allSites}</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site} value={site}>
                        {site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full lg:w-55">
                    <SelectValue placeholder={tr.typePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allTypes}</SelectItem>
                    {accessTypes.map((accessType) => (
                      <SelectItem key={accessType} value={accessType}>
                        {accessType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as "datetime" | "employee" | "device" | "status")}>
                  <SelectTrigger className="w-full lg:w-55">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={tr.sortPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="datetime">{tr.sortDatetime}</SelectItem>
                    <SelectItem value="employee">{tr.sortEmployee}</SelectItem>
                    <SelectItem value="device">{tr.sortDevice}</SelectItem>
                    <SelectItem value="status">{tr.sortStatus}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}>
                  {sortOrder === "asc" ? tr.orderAsc : tr.orderDesc}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tr.events(sortedLogs.length)}</CardTitle>
                {isLive && (
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                    <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    {tr.realtime}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {error && (
                <div className="mx-4 mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-45">{tr.thTime}</TableHead>
                    <TableHead>{tr.thEmployee}</TableHead>
                    <TableHead>{tr.thDepartment}</TableHead>
                    <TableHead>{tr.thDevice}</TableHead>
                    <TableHead>{tr.thLocation}</TableHead>
                    <TableHead className="text-center">{tr.thStatus}</TableHead>
                    <TableHead>{tr.thDetails}</TableHead>
                    <TableHead className="text-right">{tr.thAction}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow className="border-border">
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {tr.loadingEvents}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedLogs.length === 0 && !hasActiveFilters && (
                    <TableRow className="border-border hover:bg-transparent">
                      <TableCell colSpan={8} className="py-8">
                        <EmptyState
                          icon={Inbox}
                          title={tr.emptyTitle}
                          description={tr.emptyDescription}
                          variant="bare"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedLogs.length === 0 && hasActiveFilters && (
                    <TableRow className="border-border hover:bg-transparent">
                      <TableCell colSpan={8} className="py-8">
                        <EmptyState
                          icon={Filter}
                          title={tr.emptyFilteredTitle}
                          description={tr.emptyFilteredDescription}
                          variant="bare"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {paginatedLogs.map((log) => (
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
                            {tr.statusGranted}
                          </Badge>
                        ) : log.status === "denied" ? (
                          <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                            <XCircle className="mr-1 h-3 w-3" />
                            {tr.statusDenied}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {tr.statusUnknown}
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setSelectedLog(log)
                            setDetailsOpen(true)
                          }}
                        >
                          <Eye className="mr-1.5 h-4 w-4" />
                          {tr.inspect}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {sortedLogs.length === 0
                    ? tr.noResults
                    : tr.showingRange(
                        Math.min((currentPage - 1) * PAGE_SIZE + 1, sortedLogs.length),
                        Math.min(currentPage * PAGE_SIZE, sortedLogs.length),
                        sortedLogs.length,
                      )}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {tr.previous}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {tr.pageOf(currentPage, totalPages)}
                  </span>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}>
                    {tr.next}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="sm:max-w-lg border-border/70 bg-card/95">
              <DialogHeader>
                <DialogTitle className="text-base">{tr.dialogTitle(selectedLog?.id ?? "-")}</DialogTitle>
                <DialogDescription>
                  {tr.dialogDescription}
                </DialogDescription>
              </DialogHeader>

              {selectedLog ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-background/35 p-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{tr.fieldEmployee}</p>
                      <p className="font-medium text-foreground">{selectedLog.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{selectedLog.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tr.fieldTimestamp}</p>
                      <p className="font-medium text-foreground">{selectedLog.dateLabel} {selectedLog.timestamp}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tr.fieldDevice}</p>
                      <p className="font-medium text-foreground">{selectedLog.deviceName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tr.fieldLocation}</p>
                      <p className="font-medium text-foreground">{selectedLog.deviceLocation}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tr.fieldDepartment}</p>
                      <p className="font-medium text-foreground">{selectedLog.department}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tr.fieldAccessType}</p>
                      <p className="font-medium text-foreground">{selectedLog.accessType}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tr.fieldStatus}</p>
                    <div className="mt-1">
                      {selectedLog.status === "granted" ? (
                        <Badge className="bg-green-500/10 text-green-500">{tr.statusGranted}</Badge>
                      ) : selectedLog.status === "denied" ? (
                        <Badge className="bg-red-500/10 text-red-500">{tr.statusDenied}</Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-500">{tr.statusUnknown}</Badge>
                      )}
                    </div>
                  </div>
                  {selectedLog.reason ? (
                    <div>
                      <p className="text-xs text-muted-foreground">{tr.fieldAnomaly}</p>
                      <p className="font-medium text-amber-400">{selectedLog.reason}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!selectedLog) return
                      setPersonFilter(selectedLog.employeeId)
                      setDetailsOpen(false)
                      toast.success(tr.employeeFilterApplied)
                    }}
                    disabled={!selectedLog}
                  >
                    {tr.filterThisEmployee}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!selectedLog) return
                      setDeviceFilter(selectedLog.deviceName)
                      setDetailsOpen(false)
                      toast.success(tr.deviceFilterApplied)
                    }}
                    disabled={!selectedLog}
                  >
                    {tr.filterThisDevice}
                  </Button>
                </div>
                <Button
                  variant="default"
                  onClick={async () => {
                    if (!selectedLog) return
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2))
                      toast.success(tr.logCopied)
                    } catch {
                      toast.error(tr.copyFailed)
                    }
                  }}
                  disabled={!selectedLog}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {tr.copy}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
