"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as DayCalendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  Timer,
  TrendingUp,
  Users,
  ArrowUpDown,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  downloadAttendanceReport,
  fetchAttendanceCorrections,
  fetchAttendanceReport,
  upsertAttendanceCorrection,
  type AttendanceReportExportFormat,
  type AttendanceReportPeriod,
  type AttendanceReportResponse,
} from "@/lib/api/reports"
import { fetchDepartments, fetchEmployeesDetailed, type DepartmentApiItem } from "@/lib/api/employees"

type DirectoryPerson = {
  personId: string
  name: string
  departmentId: number | null
}

const PERIOD_OPTIONS: Array<{ value: AttendanceReportPeriod; label: string }> = [
  { value: "daily", label: "Journalier" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
]

type CorrectionFormState = {
  arrivalTime: string
  departureTime: string
  breakStartTime: string
  breakEndTime: string
  overtimeHours: string
  notes: string
}

type AttendanceDetailRow = {
  tenant: string
  personId: string
  employeeName: string
  departmentName: string
  date: string
  status: "compliant" | "partial" | "missing" | "unexpected_activity" | "rest_day"
  statusLabel: string
  arrivalIso: string | null
  departureIso: string | null
  arrivalDeltaMinutes: number | null
  departureDeltaMinutes: number | null
}

type DetailFocus = "all" | "compliant" | "late" | "missing" | "incident"

const DETAIL_PAGE_SIZE = 20

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"))

function toDateInputValue(value: Date): string {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatMinutesAsHoursMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

function formatIsoToHourMinute(isoValue: string | null | undefined): string {
  if (!isoValue) return "-"
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function minutesBetween(startIso: string | null | undefined, endIso: string | null | undefined): number {
  if (!startIso || !endIso) return 0
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  return Math.floor((end - start) / 60000)
}

function splitTimeParts(value: string): { hour: string; minute: string } {
  const normalized = normalizeTimeValue(value || "")
  if (!normalized) return { hour: "", minute: "" }
  const [hour, minute] = normalized.split(":")
  return { hour: hour ?? "", minute: minute ?? "" }
}

type TimeSelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
}

function TimeSelectField({ label, value, onChange, optional = false }: TimeSelectFieldProps) {
  const { hour, minute } = splitTimeParts(value)

  const onHourChange = (nextHour: string) => {
    const nextMinute = minute || "00"
    onChange(`${nextHour}:${nextMinute}`)
  }

  const onMinuteChange = (nextMinute: string) => {
    const nextHour = hour || "08"
    onChange(`${nextHour}:${nextMinute}`)
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Select value={hour || "__empty__"} onValueChange={(next) => (next === "__empty__" ? onChange("") : onHourChange(next))}>
          <SelectTrigger className="w-27.5">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {optional && <SelectItem value="__empty__">--</SelectItem>}
            {HOUR_OPTIONS.map((item) => (
              <SelectItem key={`h-${item}`} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">:</span>
        <Select value={minute || "__empty__"} onValueChange={(next) => (next === "__empty__" ? onChange("") : onMinuteChange(next))}>
          <SelectTrigger className="w-27.5">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {optional && <SelectItem value="__empty__">--</SelectItem>}
            {MINUTE_OPTIONS.map((item) => (
              <SelectItem key={`m-${item}`} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {optional && value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Effacer
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function normalizeTimeValue(value: string): string | null {
  const raw = (value || "").trim()
  if (!raw) return null

  const direct = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (direct) {
    const hour = Number(direct[1])
    const minute = Number(direct[2])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    }
    return null
  }

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
  if (!ampm) return null
  let hour = Number(ampm[1])
  const minute = Number(ampm[2])
  const period = ampm[3].toUpperCase()
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
  if (period === "AM") {
    if (hour === 12) hour = 0
  } else if (hour !== 12) {
    hour += 12
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export default function ReportsPage() {
  const tenantCode = process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT
  const [selectedPeriod, setSelectedPeriod] = useState<AttendanceReportPeriod>("weekly")
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("all")
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [report, setReport] = useState<AttendanceReportResponse | null>(null)
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([])
  const [people, setPeople] = useState<DirectoryPerson[]>([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState<AttendanceReportExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customRangeEnabled, setCustomRangeEnabled] = useState(false)
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [includeLateTotals, setIncludeLateTotals] = useState(false)
  const [includeOvertimeTotals, setIncludeOvertimeTotals] = useState(false)
  const [selectedCorrectionPersonId, setSelectedCorrectionPersonId] = useState("")
  const [correctionDate, setCorrectionDate] = useState<Date>(new Date())
  const [correctionForm, setCorrectionForm] = useState<CorrectionFormState>({
    arrivalTime: "",
    departureTime: "",
    breakStartTime: "",
    breakEndTime: "",
    overtimeHours: "",
    notes: "",
  })
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const [correctionMessage, setCorrectionMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"recap" | "details">("recap")
  const [detailFocus, setDetailFocus] = useState<DetailFocus>("all")
  const [detailSortBy, setDetailSortBy] = useState<"date" | "employee" | "department" | "status">("date")
  const [detailSortOrder, setDetailSortOrder] = useState<"asc" | "desc">("desc")
  const [detailPage, setDetailPage] = useState(1)
  const [selectedDetailRow, setSelectedDetailRow] = useState<AttendanceDetailRow | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  const peopleOptions = useMemo(() => {
    if (selectedDepartmentId === "all") return people
    const departmentId = Number(selectedDepartmentId)
    return people.filter((person) => person.departmentId === departmentId)
  }, [people, selectedDepartmentId])

  useEffect(() => {
    const allowed = new Set(peopleOptions.map((person) => person.personId))
    setSelectedPersonIds((prev) => prev.filter((personId) => allowed.has(personId)))
  }, [peopleOptions])

  const selectedPeopleLabel = useMemo(() => {
    if (selectedPersonIds.length === 0) return "Toutes les personnes"
    if (selectedPersonIds.length === 1) {
      const match = people.find((person) => person.personId === selectedPersonIds[0])
      return match ? `${match.name} (${match.personId})` : selectedPersonIds[0]
    }
    return `${selectedPersonIds.length} personnes`
  }, [people, selectedPersonIds])

  useEffect(() => {
    if (selectedPersonIds.length === 1) {
      setSelectedCorrectionPersonId(selectedPersonIds[0])
      return
    }
    if (selectedPersonIds.length === 0 && !selectedCorrectionPersonId && peopleOptions.length > 0) {
      setSelectedCorrectionPersonId(peopleOptions[0].personId)
      return
    }
    if (
      selectedCorrectionPersonId &&
      !peopleOptions.some((person) => person.personId === selectedCorrectionPersonId)
    ) {
      setSelectedCorrectionPersonId(peopleOptions[0]?.personId ?? "")
    }
  }, [peopleOptions, selectedCorrectionPersonId, selectedPersonIds])

  const tenantForCorrection = useMemo(() => {
    const envTenant = (tenantCode || "").trim()
    if (envTenant) return envTenant
    if (!selectedCorrectionPersonId) return ""

    const fromCompliance = report?.compliance?.employees?.find(
      (row) => row.person_id === selectedCorrectionPersonId
    )?.tenant
    if (fromCompliance) return fromCompliance

    const fromEmployees = report?.employees?.find((row) => row.person_id === selectedCorrectionPersonId)?.tenant
    if (fromEmployees) return fromEmployees

    return ""
  }, [report?.compliance?.employees, report?.employees, selectedCorrectionPersonId, tenantCode])

  const loadDirectory = useCallback(async () => {
    try {
      const [employees, departmentsList] = await Promise.all([
        fetchEmployeesDetailed(tenantCode),
        fetchDepartments(tenantCode),
      ])
      setDepartments(departmentsList)
      setPeople(
        employees.map((employee) => ({
          personId: employee.employee_no,
          name: employee.name || employee.employee_no,
          departmentId: employee.department ?? null,
        }))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger annuaire personnes/departements."
      setError(message)
    }
  }, [tenantCode])

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const reportParams = {
        period: selectedPeriod,
        date: !customRangeEnabled && selectedPeriod === "daily" ? selectedDate : undefined,
        startDate: customRangeEnabled ? customStartDate : undefined,
        endDate: customRangeEnabled ? customEndDate : undefined,
        tenant: tenantCode,
        personIds: selectedPersonIds,
        departmentId: selectedDepartmentId === "all" ? undefined : selectedDepartmentId,
      }
      const payload = await fetchAttendanceReport({
        ...reportParams,
      })
      setReport(payload)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger le rapport."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [
    selectedPeriod,
    selectedDate,
    customRangeEnabled,
    customStartDate,
    customEndDate,
    tenantCode,
    selectedPersonIds,
    selectedDepartmentId,
  ])

  const loadSelectedCorrection = useCallback(async () => {
    if (!selectedCorrectionPersonId) {
      setCorrectionForm({
        arrivalTime: "",
        departureTime: "",
        breakStartTime: "",
        breakEndTime: "",
        overtimeHours: "",
        notes: "",
      })
      return
    }
    if (!tenantForCorrection) {
      setCorrectionMessage("Tenant introuvable pour cette personne. Configure NEXT_PUBLIC_HIK_EVENTS_TENANT ou charge un rapport filtre par tenant.")
      return
    }

    setCorrectionLoading(true)
    setCorrectionMessage(null)
    try {
      const targetDate = toDateInputValue(correctionDate)
      const rows = await fetchAttendanceCorrections({
        tenant: tenantForCorrection,
        personId: selectedCorrectionPersonId,
        date: targetDate,
      })
      const row = rows[0]
      if (!row) {
        setCorrectionForm({
          arrivalTime: "",
          departureTime: "",
          breakStartTime: "",
          breakEndTime: "",
          overtimeHours: "",
          notes: "",
        })
        return
      }
      setCorrectionForm({
        arrivalTime: row.arrival_time || "",
        departureTime: row.departure_time || "",
        breakStartTime: row.break_start_time || "",
        breakEndTime: row.break_end_time || "",
        overtimeHours: row.overtime_hours != null ? String(row.overtime_hours) : "",
        notes: row.notes || "",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger la correction."
      setCorrectionMessage(message)
    } finally {
      setCorrectionLoading(false)
    }
  }, [correctionDate, selectedCorrectionPersonId, tenantForCorrection])

  useEffect(() => {
    void loadDirectory()
  }, [loadDirectory])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  useEffect(() => {
    void loadSelectedCorrection()
  }, [loadSelectedCorrection])

  const complianceSummary = report?.compliance?.summary
  const correctionDateValue = useMemo(() => toDateInputValue(correctionDate), [correctionDate])
  const correctedDateSet = useMemo(
    () =>
      new Set(
        (report?.corrections ?? [])
          .filter((item) => item.person_id === selectedCorrectionPersonId)
          .map((item) => item.date)
      ),
    [report?.corrections, selectedCorrectionPersonId]
  )
  const selectedCorrectionPerson = useMemo(
    () => people.find((person) => person.personId === selectedCorrectionPersonId) ?? null,
    [people, selectedCorrectionPersonId]
  )

  const attendanceDetailRows = useMemo<AttendanceDetailRow[]>(() => {
    return (report?.compliance?.employees ?? []).flatMap((employee) =>
      (employee.details ?? []).map((detail) => ({
        tenant: employee.tenant,
        personId: employee.person_id,
        employeeName: employee.employee_name || employee.person_id,
        departmentName: employee.department_name || "Non assigne",
        date: detail.date,
        status: detail.status,
        statusLabel:
          detail.status === "compliant"
            ? "Conforme"
            : detail.status === "partial"
              ? "Partiel"
              : detail.status === "missing"
                ? "Manquant"
                : detail.status === "unexpected_activity"
                  ? "Inattendu"
                  : "Repos",
        arrivalIso: detail.actual_checkin_at ?? null,
        departureIso: detail.actual_checkout_at ?? null,
        arrivalDeltaMinutes: detail.arrival_delta_minutes ?? null,
        departureDeltaMinutes: detail.departure_delta_minutes ?? null,
      }))
    )
  }, [report?.compliance?.employees])

  const visibleDetailRows = useMemo(() => {
    return attendanceDetailRows.filter((row) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !query ||
        row.employeeName.toLowerCase().includes(query) ||
        row.personId.toLowerCase().includes(query) ||
        row.departmentName.toLowerCase().includes(query)

      const matchesFocus =
        detailFocus === "all" ||
        (detailFocus === "compliant" && row.status === "compliant") ||
        (detailFocus === "late" && (row.arrivalDeltaMinutes ?? 0) > 0) ||
        (detailFocus === "missing" && row.status === "missing") ||
        (detailFocus === "incident" && (row.status === "unexpected_activity" || row.status === "partial"))

      return matchesQuery && matchesFocus
    })
  }, [attendanceDetailRows, searchQuery, detailFocus])

  const sortedDetailRows = useMemo(() => {
    const sorted = [...visibleDetailRows]
    sorted.sort((a, b) => {
      if (detailSortBy === "employee") return a.employeeName.localeCompare(b.employeeName, "fr")
      if (detailSortBy === "department") return a.departmentName.localeCompare(b.departmentName, "fr")
      if (detailSortBy === "status") return a.statusLabel.localeCompare(b.statusLabel, "fr")
      return a.date.localeCompare(b.date, "fr")
    })
    if (detailSortOrder === "desc") sorted.reverse()
    return sorted
  }, [visibleDetailRows, detailSortBy, detailSortOrder])

  const detailTotalPages = Math.max(1, Math.ceil(sortedDetailRows.length / DETAIL_PAGE_SIZE))
  const paginatedDetailRows = useMemo(() => {
    const start = (detailPage - 1) * DETAIL_PAGE_SIZE
    return sortedDetailRows.slice(start, start + DETAIL_PAGE_SIZE)
  }, [sortedDetailRows, detailPage])

  useEffect(() => {
    setDetailPage(1)
  }, [searchQuery, detailFocus, detailSortBy, detailSortOrder])

  useEffect(() => {
    if (detailPage > detailTotalPages) setDetailPage(detailTotalPages)
  }, [detailPage, detailTotalPages])

  const pageSystemStatus: "connected" | "disconnected" | "syncing" =
    loading || exportLoading !== null || correctionLoading || correctionSaving
      ? "syncing"
      : error && !report
        ? "disconnected"
        : "connected"

  const hasActiveTopFilters =
    selectedPeriod !== "weekly" ||
    selectedDate !== new Date().toISOString().slice(0, 10) ||
    selectedDepartmentId !== "all" ||
    selectedPersonIds.length > 0 ||
    customRangeEnabled ||
    includeLateTotals ||
    includeOvertimeTotals

  const recapTotals = useMemo(() => {
    const summary = report?.compliance?.summary
    if (!summary) {
      return {
        totalExpectedDays: 0,
        totalOkDays: 0,
        workedMinutes: 0,
        lateMinutes: 0,
        overtimeMinutes: 0,
      }
    }

    const overtimeByPersonDate = new Map<string, number>()
    for (const item of report?.corrections ?? []) {
      if (item.overtime_hours == null) continue
      overtimeByPersonDate.set(`${item.person_id}|${item.date}`, Math.max(0, Math.round(item.overtime_hours * 60)))
    }

    let workedMinutes = 0
    let lateMinutes = 0
    let overtimeMinutes = 0

    for (const row of attendanceDetailRows) {
      workedMinutes += minutesBetween(row.arrivalIso, row.departureIso)
      if (row.arrivalDeltaMinutes != null && row.arrivalDeltaMinutes > 0) {
        lateMinutes += row.arrivalDeltaMinutes
      }
      const key = `${row.personId}|${row.date}`
      if (overtimeByPersonDate.has(key)) {
        overtimeMinutes += overtimeByPersonDate.get(key) ?? 0
      } else if (row.departureDeltaMinutes != null && row.departureDeltaMinutes > 0) {
        overtimeMinutes += row.departureDeltaMinutes
      }
    }

    return {
      totalExpectedDays: summary.expected_work_days ?? 0,
      totalOkDays: summary.compliant_days ?? 0,
      workedMinutes,
      lateMinutes,
      overtimeMinutes,
    }
  }, [attendanceDetailRows, report?.compliance?.summary, report?.corrections])

  const togglePerson = (personId: string) => {
    setSelectedPersonIds((current) =>
      current.includes(personId) ? current.filter((value) => value !== personId) : [...current, personId]
    )
  }

  const handleExport = async (format: AttendanceReportExportFormat) => {
    setExportLoading(format)
    setError(null)
    try {
      const { blob, filename } = await downloadAttendanceReport(
        {
          period: selectedPeriod,
          date: !customRangeEnabled && selectedPeriod === "daily" ? selectedDate : undefined,
          startDate: customRangeEnabled ? customStartDate : undefined,
          endDate: customRangeEnabled ? customEndDate : undefined,
          tenant: tenantCode,
          personIds: selectedPersonIds,
          departmentId: selectedDepartmentId === "all" ? undefined : selectedDepartmentId,
        },
        format
      )
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(objectUrl)
      toast.success(`Rapport exporté en ${format.toUpperCase()}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'exporter le rapport."
      setError(message)
      toast.error("Erreur lors de l'export du rapport")
    } finally {
      setExportLoading(null)
    }
  }

  const handleSaveCorrection = async () => {
    if (!selectedCorrectionPersonId) {
      setCorrectionMessage("Selectionnez une personne pour enregistrer la correction.")
      return
    }
    if (!tenantForCorrection) {
      setCorrectionMessage("Tenant introuvable pour cette personne. Configure NEXT_PUBLIC_HIK_EVENTS_TENANT ou charge un rapport filtre par tenant.")
      return
    }

    const hasArrivalInput = (correctionForm.arrivalTime || "").trim().length > 0
    const hasDepartureInput = (correctionForm.departureTime || "").trim().length > 0
    const normalizedArrival = hasArrivalInput ? normalizeTimeValue(correctionForm.arrivalTime) : null
    const normalizedDeparture = hasDepartureInput ? normalizeTimeValue(correctionForm.departureTime) : null
    if (hasArrivalInput && !normalizedArrival) {
      setCorrectionMessage("Heure d'arrivee invalide ou incomplete. Exemple valide: 08:00.")
      return
    }
    if (hasDepartureInput && !normalizedDeparture) {
      setCorrectionMessage("Heure de depart invalide ou incomplete. Exemple valide: 17:00.")
      return
    }

    const hasBreakStart = (correctionForm.breakStartTime || "").trim().length > 0
    const hasBreakEnd = (correctionForm.breakEndTime || "").trim().length > 0
    if (hasBreakStart !== hasBreakEnd) {
      setCorrectionMessage("Renseigne les deux champs de pause (debut et fin), ou laisse les deux vides.")
      return
    }
    const normalizedBreakStart = hasBreakStart ? normalizeTimeValue(correctionForm.breakStartTime) : null
    const normalizedBreakEnd = hasBreakEnd ? normalizeTimeValue(correctionForm.breakEndTime) : null
    if (hasBreakStart && !normalizedBreakStart) {
      setCorrectionMessage("Heure de debut pause invalide. Exemple valide: 12:30.")
      return
    }
    if (hasBreakEnd && !normalizedBreakEnd) {
      setCorrectionMessage("Heure de fin pause invalide. Exemple valide: 13:00.")
      return
    }
    if (normalizedArrival && normalizedDeparture && normalizedArrival === normalizedDeparture) {
      setCorrectionMessage("L'heure de depart doit etre differente de l'heure d'arrivee.")
      return
    }

    const hasOvertimeInput = (correctionForm.overtimeHours || "").trim().length > 0
    const hasNotesInput = (correctionForm.notes || "").trim().length > 0
    if (!hasArrivalInput && !hasDepartureInput && !hasBreakStart && !hasBreakEnd && !hasOvertimeInput && !hasNotesInput) {
      setCorrectionMessage("Renseigne au moins un champ a corriger (arrivee, depart, pause, heures sup ou commentaire).")
      return
    }

    setCorrectionSaving(true)
    setCorrectionMessage(null)
    try {
      await upsertAttendanceCorrection({
        tenant: tenantForCorrection,
        personId: selectedCorrectionPersonId,
        date: correctionDateValue,
        arrivalTime: hasArrivalInput ? normalizedArrival || undefined : undefined,
        departureTime: hasDepartureInput ? normalizedDeparture || undefined : undefined,
        breakStartTime: hasBreakStart ? normalizedBreakStart || undefined : undefined,
        breakEndTime: hasBreakEnd ? normalizedBreakEnd || undefined : undefined,
        overtimeHours: hasOvertimeInput ? correctionForm.overtimeHours : undefined,
        notes: hasNotesInput ? correctionForm.notes : undefined,
      })
      setCorrectionMessage("Correction enregistree.")
      toast.success("Correction enregistrée avec succès")
      await Promise.all([loadSelectedCorrection(), loadReport()])
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Impossible d'enregistrer la correction."
      if (raw.includes("arrival_time is required")) {
        setCorrectionMessage("Heure d'arrivee obligatoire.")
      } else if (raw.includes("departure_time is required")) {
        setCorrectionMessage("Heure de depart obligatoire.")
      } else if (raw.includes("break_start_time and break_end_time")) {
        setCorrectionMessage("Renseigne les deux champs de pause (debut et fin).")
      } else {
        setCorrectionMessage(raw)
      }
    } finally {
      setCorrectionSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell-content">
        <Header systemStatus={pageSystemStatus} />
        <main className="app-page space-y-8">
          <div className="animate-fade-up">
          <PageContextBar
            title="Rapports"
            description="Analyse de presence, conformite et corrections de pointage exportables."
            stats={[
              { value: report?.summary.total_logs ?? "-", label: "Pointages analyses" },
              { value: report?.summary.total_employees ?? "-", label: "Employes couverts" },
              { value: report?.corrections?.length ?? 0, label: "Corrections chargees", tone: "warning" },
            ]}
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {loading ? "Chargement..." : "Actualiser"}
                </Button>
                <Button
                  size="sm"
                  disabled={loading}
                  onClick={async () => {
                    await loadReport()
                    toast.success("Rapport régénéré")
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasActiveTopFilters}
                  onClick={() => {
                    setSelectedPeriod("weekly")
                    setSelectedDate(new Date().toISOString().slice(0, 10))
                    setSelectedDepartmentId("all")
                    setSelectedPersonIds([])
                    setCustomRangeEnabled(false)
                    setCustomStartDate(new Date().toISOString().slice(0, 10))
                    setCustomEndDate(new Date().toISOString().slice(0, 10))
                    setIncludeLateTotals(false)
                    setIncludeOvertimeTotals(false)
                    toast.success("Filtres de rapport reinitialises")
                  }}
                >
                  Reinitialiser
                </Button>
              </>
            }
          />
          </div>

          {/* Filter Bar */}
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-sm animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              <Filter className="h-3.5 w-3.5" />
              Filtres et parametres
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as AttendanceReportPeriod)}>
                <SelectTrigger className="w-42.5 bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-45 bg-background/50 pl-9"
                  disabled={selectedPeriod !== "daily" || customRangeEnabled}
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/30 px-3 py-2">
                <Switch checked={customRangeEnabled} onCheckedChange={setCustomRangeEnabled} />
                <span className="text-sm text-muted-foreground">Plage personnalisee</span>
              </div>
              {customRangeEnabled ? (
                <>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="w-42.5 bg-background/50"
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="w-42.5 bg-background/50"
                  />
                </>
              ) : null}
              <div className="hidden h-6 w-px bg-border/50 lg:block" />
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger className="w-55 bg-background/50"><Users className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les departements</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-65 justify-between bg-background/50">
                    <span className="truncate text-left">{selectedPeopleLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-80 w-85">
                  <DropdownMenuLabel>Selection des personnes</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Button variant="ghost" size="sm" className="mb-1 w-full justify-start text-xs" onClick={() => setSelectedPersonIds([])}>
                    Reinitialiser
                  </Button>
                  {peopleOptions.map((person) => (
                    <DropdownMenuCheckboxItem key={person.personId} checked={selectedPersonIds.includes(person.personId)} onCheckedChange={() => togglePerson(person.personId)}>
                      {person.name} ({person.personId})
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/30 pt-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Exports</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExport("excel")}
                disabled={loading || exportLoading !== null || !report}
                className="gap-2"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {exportLoading === "excel" ? "Export..." : "Excel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExport("pdf")}
                disabled={loading || exportLoading !== null || !report}
                className="gap-2"
              >
                <FileText className="h-3.5 w-3.5" />
                {exportLoading === "pdf" ? "Export..." : "PDF"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="wow-transition flex items-start gap-3 rounded-xl border border-red-500/25 bg-linear-to-r from-red-500/8 to-red-500/3 p-4 shadow-[0_4px_24px_rgba(239,68,68,0.08)]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-sm leading-relaxed text-red-300">{error}</p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "recap" | "details")} className="animate-fade-up" style={{ animationDelay: "160ms" }}>
            <TabsList className="h-auto flex-wrap gap-1 bg-muted/30 p-1">
              <TabsTrigger value="recap" className="gap-2 text-xs press-effect">
                <TrendingUp className="h-3.5 w-3.5" />
                Rapport recap
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2 text-xs press-effect">
                <Clock className="h-3.5 w-3.5" />
                Rapport arrivees/departs
              </TabsTrigger>
            </TabsList>
            <TabsContent value="recap" className="mt-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/40 bg-muted/10 p-3">
                <div className="flex items-center gap-2">
                  <Switch checked={includeLateTotals} onCheckedChange={setIncludeLateTotals} />
                  <span className="text-sm text-muted-foreground">Inclure total retard</span>
                </div>
                <div className="hidden h-5 w-px bg-border/40 sm:block" />
                <div className="flex items-center gap-2">
                  <Switch checked={includeOvertimeTotals} onCheckedChange={setIncludeOvertimeTotals} />
                  <span className="text-sm text-muted-foreground">Inclure total heures sup</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children animate-fade-up" style={{ animationDelay: "80ms" }}>
                <button
                  type="button"
                  className="text-left"
                  onClick={() => {
                    setActiveTab("details")
                    setDetailFocus("compliant")
                  }}
                >
                <Card className="group wow-transition relative overflow-hidden border-primary/20 bg-linear-to-br from-primary/6 via-card to-card hover:border-primary/35 hover:shadow-[0_8px_32px_rgba(78,155,255,0.1)]">
                  <div className="absolute inset-0 bg-linear-to-br from-primary/4 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardContent className="relative p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Jours OK / Total</p>
                        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                          {recapTotals.totalOkDays}<span className="text-lg font-normal text-muted-foreground"> / {recapTotals.totalExpectedDays}</span>
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    {recapTotals.totalExpectedDays > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all duration-700"
                            style={{ width: `${Math.min(100, (recapTotals.totalOkDays / recapTotals.totalExpectedDays) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </button>
                <Card className="group wow-transition relative overflow-hidden border-blue-500/20 bg-linear-to-br from-blue-500/6 via-card to-card hover:border-blue-500/35 hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)]">
                  <div className="absolute inset-0 bg-linear-to-br from-blue-500/4 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardContent className="relative p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Heures travaillees</p>
                        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">{formatMinutesAsHoursMinutes(recapTotals.workedMinutes)}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 transition-transform duration-300 group-hover:scale-110">
                        <Timer className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {includeLateTotals ? (
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => {
                      setActiveTab("details")
                      setDetailFocus("late")
                    }}
                  >
                  <Card className="group wow-transition relative overflow-hidden border-amber-500/20 bg-linear-to-br from-amber-500/6 via-card to-card hover:border-amber-500/35 hover:shadow-[0_8px_32px_rgba(245,158,11,0.1)]">
                    <div className="absolute inset-0 bg-linear-to-br from-amber-500/4 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <CardContent className="relative p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Total retard</p>
                          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-amber-400">{formatMinutesAsHoursMinutes(recapTotals.lateMinutes)}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 transition-transform duration-300 group-hover:scale-110">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </button>
                ) : null}
                {includeOvertimeTotals ? (
                  <Card className="group wow-transition relative overflow-hidden border-emerald-500/20 bg-linear-to-br from-emerald-500/6 via-card to-card hover:border-emerald-500/35 hover:shadow-[0_8px_32px_rgba(16,185,129,0.1)]">
                    <div className="absolute inset-0 bg-linear-to-br from-emerald-500/4 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <CardContent className="relative p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Heures sup</p>
                          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-400">{formatMinutesAsHoursMinutes(recapTotals.overtimeMinutes)}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 transition-transform duration-300 group-hover:scale-110">
                          <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
                <button
                  type="button"
                  className="text-left"
                  onClick={() => {
                    setActiveTab("details")
                    setDetailFocus("incident")
                  }}
                >
                <Card className="group wow-transition relative overflow-hidden border-violet-500/20 bg-linear-to-br from-violet-500/6 via-card to-card hover:border-violet-500/35 hover:shadow-[0_8px_32px_rgba(139,92,246,0.1)]">
                  <div className="absolute inset-0 bg-linear-to-br from-violet-500/4 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardContent className="relative p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Taux conformite</p>
                        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                          {complianceSummary?.compliance_rate != null ? `${complianceSummary.compliance_rate}` : "-"}<span className="text-lg font-normal text-muted-foreground">%</span>
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 transition-transform duration-300 group-hover:scale-110">
                        <TrendingUp className="h-5 w-5 text-violet-400" />
                      </div>
                    </div>
                    {complianceSummary?.compliance_rate != null && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-500/10">
                          <div
                            className="h-full rounded-full bg-violet-500/60 transition-all duration-700"
                            style={{ width: `${Math.min(100, complianceSummary.compliance_rate)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </button>
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-6 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Rechercher par nom, ID ou departement..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-background/50 pl-10 transition-colors focus:bg-background sm:w-85" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={detailFocus} onValueChange={(value) => setDetailFocus(value as DetailFocus)}>
                    <SelectTrigger className="w-45 bg-background/50">
                      <SelectValue placeholder="Focus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="compliant">Conformes</SelectItem>
                      <SelectItem value="late">Retards</SelectItem>
                      <SelectItem value="missing">Absences</SelectItem>
                      <SelectItem value="incident">Incidents</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={detailSortBy} onValueChange={(value) => setDetailSortBy(value as "date" | "employee" | "department" | "status") }>
                    <SelectTrigger className="w-45 bg-background/50">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Tri" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="employee">Employe</SelectItem>
                      <SelectItem value="department">Departement</SelectItem>
                      <SelectItem value="status">Statut</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setDetailSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}>
                    {detailSortOrder === "asc" ? "Asc" : "Desc"}
                  </Button>
                  <Badge variant="outline" className="w-fit border-border/50 text-xs text-muted-foreground">
                    {sortedDetailRows.length} ligne{sortedDetailRows.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
              <Card className="overflow-hidden border-border/50">
                <div className="overflow-x-auto">
                <CardContent className="p-0">
                  <Table className="min-w-245">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Personne</TableHead>
                        <TableHead className="font-semibold">Departement</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Heure arrivee</TableHead>
                        <TableHead className="font-semibold">Heure depart</TableHead>
                        <TableHead className="font-semibold">Conformite</TableHead>
                        <TableHead className="text-right font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Chargement du rapport…
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && attendanceDetailRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            Aucun détail de présence disponible. Ajustez les filtres ou actualisez le rapport.
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && attendanceDetailRows.length > 0 && sortedDetailRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            Aucun resultat pour ce filtre detaille.
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && paginatedDetailRows
                        .map((row) => (
                          <TableRow key={`${row.tenant}-${row.personId}-${row.date}`} className="group/row">
                            <TableCell>
                              <div className="font-medium text-foreground">{row.employeeName}</div>
                              <div className="font-mono text-[11px] text-muted-foreground/60">{row.personId}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.departmentName}</TableCell>
                            <TableCell className="font-mono text-sm tabular-nums">{row.date}</TableCell>
                            <TableCell className="font-mono text-sm tabular-nums">{formatIsoToHourMinute(row.arrivalIso)}</TableCell>
                            <TableCell className="font-mono text-sm tabular-nums">{formatIsoToHourMinute(row.departureIso)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium ${
                                  row.status === "compliant"
                                    ? "border-green-500/25 bg-green-500/6 text-green-400"
                                    : row.status === "partial"
                                      ? "border-amber-500/25 bg-amber-500/6 text-amber-400"
                                      : row.status === "missing"
                                        ? "border-red-500/25 bg-red-500/6 text-red-400"
                                        : row.status === "unexpected_activity"
                                          ? "border-violet-500/25 bg-violet-500/6 text-violet-400"
                                          : "border-border/40 bg-muted/20 text-muted-foreground"
                                }`}
                              >
                                {row.status === "compliant" && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />}
                                {row.status === "partial" && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />}
                                {row.status === "missing" && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />}
                                {row.statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDetailRow(row)
                                  setDetailDialogOpen(true)
                                }}
                              >
                                <Eye className="mr-1.5 h-4 w-4" />
                                Inspecter
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {sortedDetailRows.length === 0
                      ? "0 resultat"
                      : `Affichage ${Math.min((detailPage - 1) * DETAIL_PAGE_SIZE + 1, sortedDetailRows.length)}-${Math.min(detailPage * DETAIL_PAGE_SIZE, sortedDetailRows.length)} sur ${sortedDetailRows.length}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={detailPage <= 1} onClick={() => setDetailPage((prev) => Math.max(1, prev - 1))}>
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Precedent
                    </Button>
                    <span className="text-xs text-muted-foreground">Page {detailPage}/{detailTotalPages}</span>
                    <Button variant="outline" size="sm" disabled={detailPage >= detailTotalPages} onClick={() => setDetailPage((prev) => Math.min(detailTotalPages, prev + 1))}>
                      Suivant
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Détail de présence</DialogTitle>
                <DialogDescription>Inspection d&apos;une ligne de conformité pour contrôle opérationnel.</DialogDescription>
              </DialogHeader>
              {selectedDetailRow ? (
                <div className="grid gap-3 rounded-lg border border-border/50 bg-muted/10 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Employé</p>
                    <p className="font-medium text-foreground">{selectedDetailRow.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{selectedDetailRow.personId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Département</p>
                    <p className="font-medium text-foreground">{selectedDetailRow.departmentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium text-foreground">{selectedDetailRow.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Statut</p>
                    <p className="font-medium text-foreground">{selectedDetailRow.statusLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Arrivée / Départ</p>
                    <p className="font-medium text-foreground">
                      {formatIsoToHourMinute(selectedDetailRow.arrivalIso)} → {formatIsoToHourMinute(selectedDetailRow.departureIso)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retard / Dépassement</p>
                    <p className="font-medium text-foreground">
                      {selectedDetailRow.arrivalDeltaMinutes ?? 0} min / {selectedDetailRow.departureDeltaMinutes ?? 0} min
                    </p>
                  </div>
                </div>
              ) : null}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!selectedDetailRow) return
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(selectedDetailRow, null, 2))
                      toast.success("Ligne copiée")
                    } catch {
                      toast.error("Copie impossible")
                    }
                  }}
                  disabled={!selectedDetailRow}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copier JSON
                </Button>
                <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="overflow-hidden border-border/50">
            <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                Correction de pointage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="rounded-lg border border-border/40 bg-linear-to-r from-muted/20 to-transparent p-3 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground/80">Aide :</span> Arrivee = premiere entree de la journee. Depart = sortie de fin de journee. Pause = debut et fin de pause.
                Heures sup = nombre d&apos;heures supplementaires (ex: 1.5).
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={selectedCorrectionPersonId || "__empty__"} onValueChange={(value) => setSelectedCorrectionPersonId(value === "__empty__" ? "" : value)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Choisir une personne" />
                  </SelectTrigger>
                  <SelectContent>
                    {peopleOptions.length === 0 && <SelectItem value="__empty__">Aucune personne</SelectItem>}
                    {peopleOptions.map((person) => (
                      <SelectItem key={person.personId} value={person.personId}>
                        {person.name} ({person.personId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start bg-background/50 text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {correctionDateValue}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayCalendar
                      mode="single"
                      selected={correctionDate}
                      onSelect={(day) => {
                        if (day) setCorrectionDate(day)
                      }}
                      modifiers={{
                        corrected: (day) => correctedDateSet.has(toDateInputValue(day)),
                      }}
                      modifiersClassNames={{
                        corrected: "bg-emerald-500/20 text-emerald-300",
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex items-center rounded-lg border border-border/40 bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                  {selectedCorrectionPerson ? (
                    <span><span className="font-medium text-foreground/80">{selectedCorrectionPerson.name}</span> <span className="font-mono text-xs text-muted-foreground/60">({selectedCorrectionPerson.personId})</span></span>
                  ) : (
                    <span className="text-muted-foreground/50">Selection requise</span>
                  )}
                  {tenantForCorrection ? <Badge variant="outline" className="ml-auto text-[10px]">{tenantForCorrection}</Badge> : <span className="ml-auto text-[10px] text-muted-foreground/40">Tenant: non detecte</span>}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <TimeSelectField
                  label="Heure d'arrivee"
                  value={correctionForm.arrivalTime}
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, arrivalTime: value }))}
                />
                <TimeSelectField
                  label="Heure de depart"
                  value={correctionForm.departureTime}
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, departureTime: value }))}
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Heures sup (optionnel)</p>
                  <Input type="number" min="0" step="0.25" value={correctionForm.overtimeHours} onChange={(event) => setCorrectionForm((prev) => ({ ...prev, overtimeHours: event.target.value }))} placeholder="Ex: 2 ou 1.5" />
                </div>
                <TimeSelectField
                  label="Debut pause (optionnel)"
                  value={correctionForm.breakStartTime}
                  optional
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, breakStartTime: value }))}
                />
                <TimeSelectField
                  label="Fin pause (optionnel)"
                  value={correctionForm.breakEndTime}
                  optional
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, breakEndTime: value }))}
                />
              </div>

              <Textarea value={correctionForm.notes} onChange={(event) => setCorrectionForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Commentaire (optionnel)" />

              {correctionMessage && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${
                  correctionMessage.includes("enregistree")
                    ? "border-emerald-500/25 bg-emerald-500/6 text-emerald-400"
                    : "border-amber-500/25 bg-amber-500/6 text-amber-400"
                }`}>{correctionMessage}</div>
              )}

              <div className="flex flex-wrap gap-3 border-t border-border/30 pt-4">
                <Button onClick={() => void handleSaveCorrection()} disabled={correctionSaving || correctionLoading || !selectedCorrectionPersonId || !tenantForCorrection} className="gap-2">
                  <Download className="h-4 w-4" />
                  {correctionSaving ? "Enregistrement..." : "Enregistrer la correction"}
                </Button>
                <Button variant="outline" onClick={() => void loadSelectedCorrection()} disabled={correctionLoading || !selectedCorrectionPersonId || !tenantForCorrection} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  {correctionLoading ? "Chargement..." : "Recharger"}
                </Button>
              </div>
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  )
}
