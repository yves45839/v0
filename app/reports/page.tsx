"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { Checkbox } from "@/components/ui/checkbox"
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
import { getActiveTenantCode } from "@/lib/api/auth"
import { useI18n } from "@/lib/i18n/context"
import {
  ATTENDANCE_EXPORT_FIELD_IDS,
  reportsPageDict,
  type AttendanceExportFieldId,
} from "@/lib/i18n/pages/reports-page"

type DirectoryPerson = {
  personId: string
  name: string
  departmentId: number | null
}

const PERIOD_VALUES: AttendanceReportPeriod[] = ["daily", "weekly", "monthly"]

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
  status: "compliant" | "partial" | "missing" | "unexpected_activity" | "rest"
  statusLabel: string
  arrivalIso: string | null
  departureIso: string | null
  arrivalDeltaMinutes: number | null
  departureDeltaMinutes: number | null
}

type DetailFocus = "all" | "compliant" | "late" | "missing" | "incident"

const DETAIL_PAGE_SIZE = 20
const EXPORT_FIELDS_STORAGE_KEY = "reports.attendance.export.fields.v1"
const EXPORT_VIEWS_STORAGE_KEY = "reports.attendance.export.views.v1"

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"))

type SavedAttendanceExportView = {
  name: string
  fieldIds: AttendanceExportFieldId[]
  updatedAt: string
}

const DEFAULT_ATTENDANCE_EXPORT_FIELD_IDS: AttendanceExportFieldId[] = [
  "person_id",
  "employee_name",
  "department_name",
  "date",
  "arrival_time",
  "departure_time",
  "status",
]

const ATTENDANCE_EXPORT_FIELD_ID_SET = new Set<AttendanceExportFieldId>(ATTENDANCE_EXPORT_FIELD_IDS)

const CORRECTION_SUCCESS_MESSAGES = new Set([
  reportsPageDict.en.correctionSaved,
  reportsPageDict.fr.correctionSaved,
])

function sanitizeAttendanceExportFieldIds(value: unknown): AttendanceExportFieldId[] {
  if (!Array.isArray(value)) return [...DEFAULT_ATTENDANCE_EXPORT_FIELD_IDS]
  const selected: AttendanceExportFieldId[] = []
  for (const item of value) {
    const fieldId = String(item || "").trim() as AttendanceExportFieldId
    if (!ATTENDANCE_EXPORT_FIELD_ID_SET.has(fieldId)) continue
    if (selected.includes(fieldId)) continue
    selected.push(fieldId)
  }
  return selected.length > 0 ? selected : [...DEFAULT_ATTENDANCE_EXPORT_FIELD_IDS]
}

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

function formatIsoToHourMinute(
  isoValue: string | null | undefined,
  formatTime: (value: Date) => string
): string {
  if (!isoValue) return "-"
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return "-"
  return formatTime(date)
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
  clearLabel: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
}

function TimeSelectField({ label, clearLabel, value, onChange, optional = false }: TimeSelectFieldProps) {
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
            {clearLabel}
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

type ReportTone = "green" | "red" | "amber" | "blue" | "violet" | "orange"

const reportToneClass: Record<ReportTone, { text: string; bar: string; bg: string; ring: string }> = {
  green: { text: "text-[var(--success)]", bar: "bg-[var(--success)]", bg: "bg-[#0d2a1a]", ring: "ring-[var(--success)]/40" },
  red: { text: "text-[var(--destructive)]", bar: "bg-[var(--destructive)]", bg: "bg-[#2a0e0e]", ring: "ring-[var(--destructive)]/40" },
  amber: { text: "text-[var(--warning)]", bar: "bg-[var(--brand-accent)]", bg: "bg-[#2a1e06]", ring: "ring-[var(--warning)]/40" },
  blue: { text: "text-[var(--info)]", bar: "bg-[var(--info)]", bg: "bg-[#0d1e2e]", ring: "ring-[var(--info)]/40" },
  violet: { text: "text-[#a78bfa]", bar: "bg-[#a78bfa]", bg: "bg-[#1e1530]", ring: "ring-[#a78bfa]/40" },
  orange: { text: "text-[var(--brand-accent)]", bar: "bg-[var(--brand-accent)]", bg: "bg-[#2a1408]", ring: "ring-[var(--brand-accent)]/40" },
}

function ReportsMetricCard({
  label,
  value,
  note,
  tone,
  icon: Icon,
  onClick,
  progress,
}: {
  label: string
  value: string | number
  note?: string
  tone: ReportTone
  icon: typeof CheckCircle2
  onClick?: () => void
  progress?: number
}) {
  const styles = reportToneClass[tone]
  const Component = onClick ? "button" : "article"
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative min-h-22 border border-[#1c2133] bg-[#111318] p-3 text-left transition ${
        onClick ? "hover:border-[var(--brand-accent)]/40 hover:bg-[#1a1f2e]/50" : ""
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-[3px] ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#4a5568]">{label}</p>
          <p className={`mt-1 font-display text-2xl font-bold leading-none tabular-nums ${styles.text}`}>
            {value}
          </p>
        </div>
        <div className={`flex size-7 items-center justify-center ${styles.bg} ${styles.text}`}>
          <Icon className="size-3.5" />
        </div>
      </div>
      {note ? (
        <div className={`mt-2 inline-flex px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${styles.bg} ${styles.text}`}>
          {note}
        </div>
      ) : null}
      {progress != null ? (
        <div className="mt-2 h-1 w-full overflow-hidden bg-[#1c2133]">
          <div
            className={`h-full transition-all duration-700 ${styles.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
    </Component>
  )
}

const STATUS_TONE: Record<string, ReportTone> = {
  compliant: "green",
  partial: "amber",
  missing: "red",
  unexpected_activity: "violet",
  rest: "blue",
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const { locale, localeTag, formatDate, formatTime } = useI18n()
  const tr = reportsPageDict[locale]
  const tenantCode = getActiveTenantCode()
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
  const [exportFieldsDialogOpen, setExportFieldsDialogOpen] = useState(false)
  const [selectedExportFieldIds, setSelectedExportFieldIds] = useState<AttendanceExportFieldId[]>(
    DEFAULT_ATTENDANCE_EXPORT_FIELD_IDS
  )
  const [savedExportViews, setSavedExportViews] = useState<SavedAttendanceExportView[]>([])
  const [exportViewName, setExportViewName] = useState("")
  const [exportViewNameError, setExportViewNameError] = useState(false)

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
    if (selectedPersonIds.length === 0) return tr.allPeople
    if (selectedPersonIds.length === 1) {
      const match = people.find((person) => person.personId === selectedPersonIds[0])
      return match ? `${match.name} (${match.personId})` : selectedPersonIds[0]
    }
    return tr.peopleCount(selectedPersonIds.length)
  }, [people, selectedPersonIds, tr])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const rawFields = window.localStorage.getItem(EXPORT_FIELDS_STORAGE_KEY)
      if (rawFields) {
        const parsed = JSON.parse(rawFields) as unknown
        setSelectedExportFieldIds(sanitizeAttendanceExportFieldIds(parsed))
      }
    } catch {
      setSelectedExportFieldIds([...DEFAULT_ATTENDANCE_EXPORT_FIELD_IDS])
    }

    try {
      const rawViews = window.localStorage.getItem(EXPORT_VIEWS_STORAGE_KEY)
      if (!rawViews) return
      const parsed = JSON.parse(rawViews) as unknown
      if (!Array.isArray(parsed)) return
      const normalizedViews: SavedAttendanceExportView[] = []
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue
        const name = String((item as { name?: unknown }).name || "").trim()
        if (!name) continue
        const fields = sanitizeAttendanceExportFieldIds((item as { fieldIds?: unknown }).fieldIds)
        const updatedAt = String((item as { updatedAt?: unknown }).updatedAt || new Date().toISOString())
        normalizedViews.push({ name, fieldIds: fields, updatedAt })
      }
      setSavedExportViews(normalizedViews)
    } catch {
      setSavedExportViews([])
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(EXPORT_FIELDS_STORAGE_KEY, JSON.stringify(selectedExportFieldIds))
  }, [selectedExportFieldIds])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(EXPORT_VIEWS_STORAGE_KEY, JSON.stringify(savedExportViews))
  }, [savedExportViews])

  const toggleExportField = (fieldId: AttendanceExportFieldId, checked: boolean) => {
    setSelectedExportFieldIds((current) => {
      if (checked) {
        if (current.includes(fieldId)) return current
        return [...current, fieldId]
      }
      if (current.length <= 1) {
        toast.warning(tr.selectAtLeastOneField)
        return current
      }
      return current.filter((value) => value !== fieldId)
    })
  }

  const handleSaveExportView = () => {
    const trimmedName = exportViewName.trim()
    if (!trimmedName) {
      setExportViewNameError(true)
      toast.warning(tr.viewNameRequiredToast)
      return
    }
    setExportViewNameError(false)
    const nextView: SavedAttendanceExportView = {
      name: trimmedName,
      fieldIds: selectedExportFieldIds,
      updatedAt: new Date().toISOString(),
    }
    setSavedExportViews((current) => {
      const withoutSameName = current.filter((view) => view.name.toLowerCase() !== trimmedName.toLowerCase())
      return [nextView, ...withoutSameName]
    })
    setExportViewName("")
    toast.success(tr.viewSaved(trimmedName))
  }

  const applySavedExportView = (view: SavedAttendanceExportView) => {
    setSelectedExportFieldIds(view.fieldIds)
    toast.success(tr.viewApplied(view.name))
  }

  const deleteSavedExportView = (viewNameToDelete: string) => {
    setSavedExportViews((current) => current.filter((view) => view.name !== viewNameToDelete))
    toast.success(tr.viewDeleted(viewNameToDelete))
  }

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
      const message = err instanceof Error ? err.message : tr.directoryLoadError
      setError(message)
    }
  }, [tenantCode, tr])

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
      const message = err instanceof Error ? err.message : tr.reportLoadError
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
    tr,
  ])

  useEffect(() => {
    const initialSearch = searchParams.get("search")
    const initialFocus = searchParams.get("focus")
    const initialTab = searchParams.get("tab")
    const initialAction = searchParams.get("action")

    if (initialSearch !== null) {
      setSearchQuery(initialSearch)
      setActiveTab("details")
    }

    if (initialTab === "recap" || initialTab === "details") {
      setActiveTab(initialTab)
    }

    if (initialFocus === "absences") {
      setActiveTab("details")
      setDetailFocus("missing")
    } else if (initialFocus === "late-arrivals") {
      setActiveTab("details")
      setDetailFocus("late")
    } else if (initialFocus === "corrections") {
      setActiveTab("recap")
    }

    if (initialAction === "generate-report") {
      void loadReport()
    }
  }, [loadReport, searchParams])

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
      setCorrectionMessage(tr.tenantNotFound)
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
      const message = err instanceof Error ? err.message : tr.correctionLoadError
      setCorrectionMessage(message)
    } finally {
      setCorrectionLoading(false)
    }
  }, [correctionDate, selectedCorrectionPersonId, tenantForCorrection, tr])

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
        departmentName: employee.department_name || tr.unassigned,
        date: detail.date,
        status: detail.status,
        statusLabel: tr.statusLabels[detail.status],
        arrivalIso: detail.actual_checkin_at ?? null,
        departureIso: detail.actual_checkout_at ?? null,
        arrivalDeltaMinutes: detail.arrival_delta_minutes ?? null,
        departureDeltaMinutes: detail.departure_delta_minutes ?? null,
      }))
    )
  }, [report?.compliance?.employees, tr])

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
      if (detailSortBy === "employee") return a.employeeName.localeCompare(b.employeeName, localeTag)
      if (detailSortBy === "department") return a.departmentName.localeCompare(b.departmentName, localeTag)
      if (detailSortBy === "status") return a.statusLabel.localeCompare(b.statusLabel, localeTag)
      return a.date.localeCompare(b.date, localeTag)
    })
    if (detailSortOrder === "desc") sorted.reverse()
    return sorted
  }, [visibleDetailRows, detailSortBy, detailSortOrder, localeTag])

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
    // Custom range validation
    if (customRangeEnabled && customStartDate && customEndDate && customEndDate < customStartDate) {
      setError(tr.endDateBeforeStart)
      return
    }
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
          fields: selectedExportFieldIds,
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
      toast.success(tr.exportSuccess(format.toUpperCase()))
    } catch (err) {
      const message = err instanceof Error ? err.message : tr.exportReportError
      setError(message)
      toast.error(tr.exportErrorToast)
    } finally {
      setExportLoading(null)
    }
  }

  const handleSaveCorrection = async () => {
    if (!selectedCorrectionPersonId) {
      setCorrectionMessage(tr.selectPersonToSave)
      return
    }
    if (!tenantForCorrection) {
      setCorrectionMessage(tr.tenantNotFound)
      return
    }

    const hasArrivalInput = (correctionForm.arrivalTime || "").trim().length > 0
    const hasDepartureInput = (correctionForm.departureTime || "").trim().length > 0
    const normalizedArrival = hasArrivalInput ? normalizeTimeValue(correctionForm.arrivalTime) : null
    const normalizedDeparture = hasDepartureInput ? normalizeTimeValue(correctionForm.departureTime) : null
    if (hasArrivalInput && !normalizedArrival) {
      setCorrectionMessage(tr.invalidArrival)
      return
    }
    if (hasDepartureInput && !normalizedDeparture) {
      setCorrectionMessage(tr.invalidDeparture)
      return
    }

    const hasBreakStart = (correctionForm.breakStartTime || "").trim().length > 0
    const hasBreakEnd = (correctionForm.breakEndTime || "").trim().length > 0
    if (hasBreakStart !== hasBreakEnd) {
      setCorrectionMessage(tr.breakBothOrNone)
      return
    }
    const normalizedBreakStart = hasBreakStart ? normalizeTimeValue(correctionForm.breakStartTime) : null
    const normalizedBreakEnd = hasBreakEnd ? normalizeTimeValue(correctionForm.breakEndTime) : null
    if (hasBreakStart && !normalizedBreakStart) {
      setCorrectionMessage(tr.invalidBreakStart)
      return
    }
    if (hasBreakEnd && !normalizedBreakEnd) {
      setCorrectionMessage(tr.invalidBreakEnd)
      return
    }
    if (normalizedArrival && normalizedDeparture && normalizedArrival === normalizedDeparture) {
      setCorrectionMessage(tr.departureEqualsArrival)
      return
    }

    const hasOvertimeInput = (correctionForm.overtimeHours || "").trim().length > 0
    const hasNotesInput = (correctionForm.notes || "").trim().length > 0
    if (!hasArrivalInput && !hasDepartureInput && !hasBreakStart && !hasBreakEnd && !hasOvertimeInput && !hasNotesInput) {
      setCorrectionMessage(tr.atLeastOneField)
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
      setCorrectionMessage(tr.correctionSaved)
      toast.success(tr.correctionSavedToast)
      await Promise.all([loadSelectedCorrection(), loadReport()])
    } catch (err) {
      const raw = err instanceof Error ? err.message : tr.correctionSaveError
      if (raw.includes("arrival_time is required")) {
        setCorrectionMessage(tr.arrivalRequired)
      } else if (raw.includes("departure_time is required")) {
        setCorrectionMessage(tr.departureRequired)
      } else if (raw.includes("break_start_time and break_end_time")) {
        setCorrectionMessage(tr.breakBothRequired)
      } else {
        setCorrectionMessage(raw)
      }
    } finally {
      setCorrectionSaving(false)
    }
  }

  return (
    <div className="legacy-theme app-shell bg-[#0b0d13] text-[#e2e8f0]">
      <AppSidebar />
      <div className="app-shell-content">
        <Header systemStatus={pageSystemStatus} hideRouteInfo />

        <main className="mx-auto w-full max-w-430 space-y-3 px-3 py-3 md:px-4 2xl:max-w-none">
          {/* ── Page header ── */}
          <section className="border border-[#1c2133] bg-[#111318]">
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">
                  {tr.pageKicker}
                </p>
                <h1 className="mt-1 font-display text-[22px] font-bold uppercase leading-none tracking-[0.08em] text-[#e2e8f0]">
                  {tr.pageTitle}
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-[#7a8599]">
                  {tr.pageSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--info)]/60 hover:bg-[#1a1f2e] hover:text-[var(--info)]"
                  onClick={() => void loadReport()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                  )}
                  {loading ? tr.loading : tr.refresh}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
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
                    toast.success(tr.filtersReset)
                  }}
                >
                  {tr.reset}
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] shadow-none hover:bg-[var(--brand-accent)]"
                  disabled={loading}
                  onClick={async () => {
                    await loadReport()
                    toast.success(tr.reportRegenerated)
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {tr.generate}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
              <ReportsMetricCard
                label={tr.metricLogsLabel}
                value={report?.summary.total_logs ?? "-"}
                note={tr.metricLogsNote}
                tone="blue"
                icon={Clock}
              />
              <ReportsMetricCard
                label={tr.metricEmployeesLabel}
                value={report?.summary.total_employees ?? "-"}
                note={tr.metricEmployeesNote}
                tone="green"
                icon={Users}
              />
              <ReportsMetricCard
                label={tr.metricCorrectionsLabel}
                value={report?.corrections?.length ?? 0}
                note={tr.metricCorrectionsNote}
                tone="amber"
                icon={AlertTriangle}
              />
            </div>
          </section>

          {/* ── Filter bar ── */}
          <section className="border border-[#1c2133] bg-[#111318]">
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-[#0d1e2e] text-[var(--info)]">
                  <Filter className="size-4" />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">{tr.settingsKicker}</p>
                  <h2 className="mt-1 font-display text-[15px] font-semibold uppercase leading-none tracking-[0.06em] text-[#e2e8f0]">
                    {tr.filtersTitle}
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3">
              {/* Period pills + date */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center border border-[#1c2133] bg-[#0b0d13] p-1">
                  {PERIOD_VALUES.map((option) => {
                    const isSelected = selectedPeriod === option
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedPeriod(option)}
                        className={`px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors ${
                          isSelected ? "bg-[var(--brand-accent)] text-[#0b0d13]" : "text-[#4a5568] hover:text-[#e2e8f0]"
                        }`}
                      >
                        {tr.periodLabels[option]}
                      </button>
                    )
                  })}
                </div>

                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#4a5568]" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="h-9 w-44 rounded-none border-[#1c2133] bg-[#1a1f2e] pl-9 font-mono text-xs text-[#e2e8f0]"
                    disabled={selectedPeriod !== "daily" || customRangeEnabled}
                  />
                </div>

                <label className="flex items-center gap-2 border border-[#1c2133] bg-[#0b0d13] px-3 py-1.5">
                  <Switch checked={customRangeEnabled} onCheckedChange={setCustomRangeEnabled} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.customRange}
                  </span>
                </label>

                {customRangeEnabled ? (
                  <>
                    <Input
                      type="date"
                      aria-label={tr.startDateAria}
                      value={customStartDate}
                      onChange={(event) => setCustomStartDate(event.target.value)}
                      className="h-9 w-40 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-xs text-[#e2e8f0]"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">→</span>
                    <Input
                      type="date"
                      aria-label={tr.endDateAria}
                      value={customEndDate}
                      min={customStartDate}
                      onChange={(event) => setCustomEndDate(event.target.value)}
                      className={`h-9 w-40 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-xs text-[#e2e8f0] ${customEndDate && customEndDate < customStartDate ? "border-red-500/70" : ""}`}
                    />
                    {customEndDate && customEndDate < customStartDate ? (
                      <span className="w-full font-mono text-[10px] text-red-400">
                        {tr.endDateBeforeStart}
                      </span>
                    ) : null}
                    {customStartDate && customEndDate && customEndDate >= customStartDate &&
                      Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / 86400000) > 92 ? (
                      <span className="w-full font-mono text-[10px] text-amber-400">
                        {tr.longRangeWarning}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>

              {/* Dept + persons */}
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0]">
                    <Users className="mr-2 size-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allDepartments}</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 justify-between rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0] hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)]"
                    >
                      <span className="truncate normal-case tracking-normal text-[12px] text-[#e2e8f0]">
                        {selectedPeopleLabel}
                      </span>
                      <ChevronDown className="ml-2 size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-80 w-80">
                    <DropdownMenuLabel>{tr.peopleSelection}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-1 w-full justify-start text-xs"
                      onClick={() => setSelectedPersonIds([])}
                    >
                      {tr.reset}
                    </Button>
                    {peopleOptions.map((person) => (
                      <DropdownMenuCheckboxItem
                        key={person.personId}
                        checked={selectedPersonIds.includes(person.personId)}
                        onCheckedChange={() => togglePerson(person.personId)}
                      >
                        {person.name} ({person.personId})
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Exports */}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-[#1c2133] pt-3">
                <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.exportsLabel}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportFieldsDialogOpen(true)}
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#a78bfa]/60 hover:text-[#a78bfa]"
                >
                  <Filter className="mr-2 h-3.5 w-3.5" />
                  {tr.fieldsButton(selectedExportFieldIds.length)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExport("excel")}
                  disabled={loading || exportLoading !== null || !report}
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--success)]/60 hover:text-[var(--success)]"
                >
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                  {exportLoading === "excel" ? tr.exporting : "Excel"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExport("pdf")}
                  disabled={loading || exportLoading !== null || !report}
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
                >
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  {exportLoading === "pdf" ? tr.exporting : "PDF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExport("csv")}
                  disabled={loading || exportLoading !== null || !report}
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  {exportLoading === "csv" ? tr.exporting : "CSV"}
                </Button>
              </div>
            </div>
          </section>

          {error && (
            <div role="alert" className="border border-[var(--destructive)]/40 bg-[#2a0e0e]/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center bg-[#2a0e0e] text-[var(--destructive)]">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--destructive)]/70">{tr.errorKicker}</p>
                  <p className="mt-1 text-sm text-[var(--destructive)]">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "recap" | "details")}>
            <TabsList className="grid w-full grid-cols-2 rounded-none border border-[#1c2133] bg-[#0b0d13] p-1 sm:w-auto sm:inline-grid">
              <TabsTrigger
                value="recap"
                className="rounded-none font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-[var(--brand-accent)] data-[state=active]:text-[#0b0d13]"
              >
                <TrendingUp className="mr-2 h-3.5 w-3.5" />
                {tr.tabRecap}
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="rounded-none font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-[var(--brand-accent)] data-[state=active]:text-[#0b0d13]"
              >
                <Clock className="mr-2 h-3.5 w-3.5" />
                {tr.tabDetails}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recap" className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-3 border border-[#1c2133] bg-[#111318] px-4 py-3">
                <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  <Switch checked={includeLateTotals} onCheckedChange={setIncludeLateTotals} />
                  {tr.includeLateTotals}
                </label>
                <span className="hidden h-5 w-px bg-[#1c2133] sm:block" />
                <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  <Switch checked={includeOvertimeTotals} onCheckedChange={setIncludeOvertimeTotals} />
                  {tr.includeOvertimeTotals}
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <ReportsMetricCard
                  label={tr.metricOkDaysLabel}
                  value={`${recapTotals.totalOkDays} / ${recapTotals.totalExpectedDays}`}
                  note={tr.metricOkDaysNote}
                  tone="orange"
                  icon={CheckCircle2}
                  onClick={() => {
                    setActiveTab("details")
                    setDetailFocus("compliant")
                  }}
                  progress={
                    recapTotals.totalExpectedDays > 0
                      ? (recapTotals.totalOkDays / recapTotals.totalExpectedDays) * 100
                      : undefined
                  }
                />
                <ReportsMetricCard
                  label={tr.metricWorkedLabel}
                  value={formatMinutesAsHoursMinutes(recapTotals.workedMinutes)}
                  note={tr.metricPeriodNote}
                  tone="blue"
                  icon={Timer}
                />
                {includeLateTotals ? (
                  <ReportsMetricCard
                    label={tr.metricLateLabel}
                    value={formatMinutesAsHoursMinutes(recapTotals.lateMinutes)}
                    note={tr.metricLateNote}
                    tone="amber"
                    icon={AlertTriangle}
                    onClick={() => {
                      setActiveTab("details")
                      setDetailFocus("late")
                    }}
                  />
                ) : null}
                {includeOvertimeTotals ? (
                  <ReportsMetricCard
                    label={tr.metricOvertimeLabel}
                    value={formatMinutesAsHoursMinutes(recapTotals.overtimeMinutes)}
                    note={tr.metricPeriodNote}
                    tone="green"
                    icon={TrendingUp}
                  />
                ) : null}
                <ReportsMetricCard
                  label={tr.metricComplianceLabel}
                  value={
                    complianceSummary?.compliance_rate != null
                      ? `${complianceSummary.compliance_rate}%`
                      : "-"
                  }
                  note={tr.metricComplianceNote}
                  tone="violet"
                  icon={TrendingUp}
                  onClick={() => {
                    setActiveTab("details")
                    setDetailFocus("incident")
                  }}
                  progress={complianceSummary?.compliance_rate ?? undefined}
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-3 space-y-3">
              <div className="border border-[#1c2133] bg-[#111318] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a5568]" />
                    <Input
                      placeholder={tr.searchPlaceholder}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] pl-10 text-sm text-[#e2e8f0] placeholder:text-[#4a5568] focus-visible:ring-[var(--brand-accent)]/35"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center border border-[#1c2133] bg-[#0b0d13] p-1">
                      {(["all", "compliant", "late", "missing", "incident"] as const).map((option) => {
                        const labels = tr.focusLabels
                        const isSelected = detailFocus === option
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setDetailFocus(option)}
                            className={`px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] transition-colors ${
                              isSelected ? "bg-[var(--brand-accent)] text-[#0b0d13]" : "text-[#4a5568] hover:text-[#e2e8f0]"
                            }`}
                          >
                            {labels[option]}
                          </button>
                        )
                      })}
                    </div>

                    <Select
                      value={detailSortBy}
                      onValueChange={(value) =>
                        setDetailSortBy(value as "date" | "employee" | "department" | "status")
                      }
                    >
                      <SelectTrigger className="h-9 w-36 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.08em] text-[#e2e8f0]">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <SelectValue placeholder={tr.sortPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">{tr.sortDate}</SelectItem>
                        <SelectItem value="employee">{tr.sortEmployee}</SelectItem>
                        <SelectItem value="department">{tr.sortDepartment}</SelectItem>
                        <SelectItem value="status">{tr.sortStatus}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                      className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)]"
                    >
                      {detailSortOrder === "asc" ? tr.sortAsc : tr.sortDesc}
                    </Button>
                    <span className="border border-[#1c2133] bg-[#0b0d13] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] tabular-nums">
                      {tr.rowCount(sortedDetailRows.length)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-[#1c2133] bg-[#111318]">
                <div className="overflow-x-auto">
                  <Table className="min-w-245">
                    <TableHeader>
                      <TableRow className="border-b border-[#1c2133] hover:bg-transparent">
                        <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.thPerson}</TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.thDepartment}</TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.thDate}</TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.thArrival}</TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.thDeparture}</TableHead>
                        <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.thCompliance}</TableHead>
                        <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.thAction}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow className="border-[#1c2133]">
                          <TableCell colSpan={7} className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="size-4 animate-spin text-[var(--brand-accent)]" />
                              {tr.loadingReport}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && attendanceDetailRows.length === 0 && (
                        <TableRow className="border-[#1c2133]">
                          <TableCell colSpan={7} className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                            {tr.noDetails}
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && attendanceDetailRows.length > 0 && sortedDetailRows.length === 0 && (
                        <TableRow className="border-[#1c2133]">
                          <TableCell colSpan={7} className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                            {tr.noFilterResults}
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading &&
                        paginatedDetailRows.map((row) => {
                          const tone = STATUS_TONE[row.status] ?? "blue"
                          const styles = reportToneClass[tone]
                          return (
                            <TableRow
                              key={`${row.tenant}-${row.personId}-${row.date}`}
                              className="border-b border-[#1c2133] transition hover:bg-[#1a1f2e]/40"
                            >
                              <TableCell>
                                <div className="font-display text-sm font-semibold uppercase tracking-[0.04em] text-[#e2e8f0]">
                                  {row.employeeName}
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                                  {row.personId}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs uppercase tracking-[0.06em] text-[#7a8599]">
                                {row.departmentName}
                              </TableCell>
                              <TableCell className="font-mono text-sm tabular-nums text-[#e2e8f0]">
                                {row.date}
                              </TableCell>
                              <TableCell className="font-mono text-sm tabular-nums text-[#e2e8f0]">
                                {formatIsoToHourMinute(row.arrivalIso, formatTime)}
                              </TableCell>
                              <TableCell className="font-mono text-sm tabular-nums text-[#e2e8f0]">
                                {formatIsoToHourMinute(row.departureIso, formatTime)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${styles.bg} ${styles.text} border-[#1c2133]`}
                                >
                                  <span className={`size-1.5 rounded-full ${styles.bar}`} />
                                  {row.statusLabel}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)]"
                                  onClick={() => {
                                    setSelectedDetailRow(row)
                                    setDetailDialogOpen(true)
                                  }}
                                >
                                  <Eye className="mr-1 h-3.5 w-3.5" />
                                  {tr.inspect}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between border-t border-[#1c2133] px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568] tabular-nums">
                    {sortedDetailRows.length === 0
                      ? tr.zeroResults
                      : `${Math.min((detailPage - 1) * DETAIL_PAGE_SIZE + 1, sortedDetailRows.length)}-${Math.min(detailPage * DETAIL_PAGE_SIZE, sortedDetailRows.length)} / ${sortedDetailRows.length}`}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={detailPage <= 1}
                      onClick={() => setDetailPage((prev) => Math.max(1, prev - 1))}
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)]"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      {tr.prev}
                    </Button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] tabular-nums">
                      {detailPage}/{detailTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={detailPage >= detailTotalPages}
                      onClick={() => setDetailPage((prev) => Math.min(detailTotalPages, prev + 1))}
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)]"
                    >
                      {tr.next}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* ── Export fields dialog ── */}
          <Dialog open={exportFieldsDialogOpen} onOpenChange={setExportFieldsDialogOpen}>
            <DialogContent className="sm:max-w-3xl rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  <div className="flex size-9 items-center justify-center bg-[#1e1530] text-[#a78bfa]">
                    <Filter className="h-4 w-4" />
                  </div>
                  {tr.exportFieldsTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.exportFieldsDescription}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 border border-[#1c2133] bg-[#0b0d13] px-3 py-2">
                  <span className="border border-[#1c2133] bg-[#1a1f2e] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] tabular-nums">
                    {tr.fieldsCount(selectedExportFieldIds.length, ATTENDANCE_EXPORT_FIELD_IDS.length)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--success)]/60 hover:text-[var(--success)]"
                    onClick={() => setSelectedExportFieldIds([...ATTENDANCE_EXPORT_FIELD_IDS])}
                  >
                    {tr.selectAll}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
                    onClick={() => setSelectedExportFieldIds([...DEFAULT_ATTENDANCE_EXPORT_FIELD_IDS])}
                  >
                    {tr.reset}
                  </Button>
                </div>

                <div className="grid max-h-72 gap-1.5 overflow-y-auto border border-[#1c2133] bg-[#0b0d13] p-2 md:grid-cols-2">
                  {ATTENDANCE_EXPORT_FIELD_IDS.map((fieldId) => (
                    <label
                      key={fieldId}
                      className="flex cursor-pointer items-start gap-3 border border-[#1c2133] bg-[#111318] p-2 transition hover:border-[var(--brand-accent)]/40"
                    >
                      <Checkbox
                        checked={selectedExportFieldIds.includes(fieldId)}
                        onCheckedChange={(checked) => toggleExportField(fieldId, checked === true)}
                      />
                      <span className="space-y-0.5">
                        <span className="block font-display text-xs font-semibold uppercase tracking-[0.04em] text-[#e2e8f0]">
                          {tr.exportFields[fieldId].label}
                        </span>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599]">
                          {tr.exportFields[fieldId].hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2 border border-[#1c2133] bg-[#0b0d13] p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7a8599]">{tr.saveViewTitle}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={exportViewName}
                      onChange={(event) => {
                        setExportViewName(event.target.value)
                        if (exportViewNameError && event.target.value.trim()) setExportViewNameError(false)
                      }}
                      placeholder={tr.viewNamePlaceholder}
                      aria-invalid={exportViewNameError}
                      className={`h-9 rounded-none bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568] sm:flex-1 ${exportViewNameError ? "border-red-500" : "border-[#1c2133]"}`}
                    />
                    <Button
                      type="button"
                      onClick={handleSaveExportView}
                      className="h-9 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--brand-accent)]"
                    >
                      {tr.saveButton}
                    </Button>
                  </div>
                  {exportViewNameError ? (
                    <p className="font-mono text-[10px] text-red-400">{tr.viewNameRequiredInline}</p>
                  ) : null}
                  {savedExportViews.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      {savedExportViews.map((view) => (
                        <div
                          key={view.name}
                          className="flex items-center gap-2 border border-[#1c2133] bg-[#111318] px-2 py-1.5"
                        >
                          <span className="truncate font-display text-xs font-semibold uppercase tracking-[0.04em] text-[#e2e8f0]">
                            {view.name}
                          </span>
                          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-[#4a5568] tabular-nums">
                            {formatDate(new Date(view.updatedAt))}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-none border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                            onClick={() => applySavedExportView(view)}
                          >
                            {tr.applyButton}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-none border border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599] hover:border-[var(--destructive)]/60 hover:text-[var(--destructive)]"
                            onClick={() => deleteSavedExportView(view.name)}
                          >
                            {tr.deleteButton}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                      {tr.noSavedViews}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setExportFieldsDialogOpen(false)}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {tr.close}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Detail row dialog ── */}
          <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
            <DialogContent className="sm:max-w-xl rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {tr.detailTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.detailDescription}
                </DialogDescription>
              </DialogHeader>
              {selectedDetailRow ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.dlgEmployee}</p>
                    <p className="mt-1 font-display text-sm font-semibold text-[#e2e8f0]">{selectedDetailRow.employeeName}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">{selectedDetailRow.personId}</p>
                  </div>
                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.dlgDepartment}</p>
                    <p className="mt-1 font-display text-sm font-semibold text-[#e2e8f0]">{selectedDetailRow.departmentName}</p>
                  </div>
                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.dlgDate}</p>
                    <p className="mt-1 font-mono text-sm tabular-nums text-[#e2e8f0]">{selectedDetailRow.date}</p>
                  </div>
                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.dlgStatus}</p>
                    <p className="mt-1 font-display text-sm font-semibold text-[#e2e8f0]">{selectedDetailRow.statusLabel}</p>
                  </div>
                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.dlgArrivalDeparture}</p>
                    <p className="mt-1 font-mono text-sm tabular-nums text-[#e2e8f0]">
                      {formatIsoToHourMinute(selectedDetailRow.arrivalIso, formatTime)} → {formatIsoToHourMinute(selectedDetailRow.departureIso, formatTime)}
                    </p>
                  </div>
                  <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.dlgLateOverrun}</p>
                    <p className="mt-1 font-mono text-sm tabular-nums text-[#e2e8f0]">
                      {tr.deltaMinutes(selectedDetailRow.arrivalDeltaMinutes ?? 0, selectedDetailRow.departureDeltaMinutes ?? 0)}
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
                      toast.success(tr.rowCopied)
                    } catch {
                      toast.error(tr.copyFailed)
                    }
                  }}
                  disabled={!selectedDetailRow}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {tr.copyJson}
                </Button>
                <Button
                  variant="outline"
                  disabled={!selectedDetailRow}
                  onClick={() => {
                    if (!selectedDetailRow) return
                    setDetailDialogOpen(false)
                    setSelectedCorrectionPersonId(selectedDetailRow.personId)
                    const parsed = new Date(selectedDetailRow.date)
                    if (!Number.isNaN(parsed.getTime())) setCorrectionDate(parsed)
                    // Scroll to correction section after dialog closes
                    setTimeout(() => {
                      document.getElementById("correction-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }, 150)
                  }}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)]"
                >
                  {tr.correctThisEntry}
                </Button>
                <Button
                  onClick={() => setDetailDialogOpen(false)}
                  className="h-9 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--brand-accent)]"
                >
                  {tr.close}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Correction de pointage ── */}
          <section id="correction-section" className="border border-[#1c2133] bg-[#111318]">
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-[#2a1408] text-[var(--brand-accent)]">
                  <Clock className="size-4" />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">{tr.adjustmentKicker}</p>
                  <h2 className="mt-1 font-display text-[15px] font-semibold uppercase leading-none tracking-[0.06em] text-[#e2e8f0]">
                    {tr.correctionTitle}
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3">
              <div className="border border-[#1c2133] bg-[#0b0d13] p-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">
                <span className="text-[var(--warning)]">{tr.helpLabel}</span> {tr.helpText}
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <Select
                  value={selectedCorrectionPersonId || "__empty__"}
                  onValueChange={(value) =>
                    setSelectedCorrectionPersonId(value === "__empty__" ? "" : value)
                  }
                >
                  <SelectTrigger className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0]">
                    <SelectValue placeholder={tr.choosePerson} />
                  </SelectTrigger>
                  <SelectContent>
                    {peopleOptions.length === 0 && <SelectItem value="__empty__">{tr.noPeople}</SelectItem>}
                    {peopleOptions.map((person) => (
                      <SelectItem key={person.personId} value={person.personId}>
                        {person.name} ({person.personId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 justify-start rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0] hover:border-[var(--brand-accent)]/60"
                    >
                      <Calendar className="mr-2 h-4 w-4 text-[#7a8599]" />
                      <span className="tabular-nums">{correctionDateValue}</span>
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
                        corrected: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <div className="flex items-center border border-[#1c2133] bg-[#0b0d13] px-3 py-2">
                  {selectedCorrectionPerson ? (
                    <span className="truncate text-xs">
                      <span className="font-display font-semibold uppercase tracking-[0.04em] text-[#e2e8f0]">
                        {selectedCorrectionPerson.name}
                      </span>
                      <span className="ml-1 font-mono text-[10px] text-[#4a5568]">
                        ({selectedCorrectionPerson.personId})
                      </span>
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                      {tr.selectionRequired}
                    </span>
                  )}
                  {tenantForCorrection ? (
                    <span className="ml-auto border border-[#1c2133] bg-[#0d1e2e] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--info)]">
                      {tenantForCorrection}
                    </span>
                  ) : (
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em] text-[#4a5568]">
                      {tr.tenantNotDetected}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <TimeSelectField
                  label={tr.arrivalTimeLabel}
                  clearLabel={tr.clear}
                  value={correctionForm.arrivalTime}
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, arrivalTime: value }))}
                />
                <TimeSelectField
                  label={tr.departureTimeLabel}
                  clearLabel={tr.clear}
                  value={correctionForm.departureTime}
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, departureTime: value }))}
                />
                <div className="space-y-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.overtimeOptionalLabel}</p>
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    value={correctionForm.overtimeHours}
                    onChange={(event) =>
                      setCorrectionForm((prev) => ({ ...prev, overtimeHours: event.target.value }))
                    }
                    placeholder={tr.overtimePlaceholder}
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] tabular-nums"
                  />
                </div>
                <TimeSelectField
                  label={tr.breakStartOptionalLabel}
                  clearLabel={tr.clear}
                  value={correctionForm.breakStartTime}
                  optional
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, breakStartTime: value }))}
                />
                <TimeSelectField
                  label={tr.breakEndOptionalLabel}
                  clearLabel={tr.clear}
                  value={correctionForm.breakEndTime}
                  optional
                  onChange={(value) => setCorrectionForm((prev) => ({ ...prev, breakEndTime: value }))}
                />
              </div>

              <Textarea
                value={correctionForm.notes}
                onChange={(event) => setCorrectionForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder={tr.notesPlaceholder}
                className="rounded-none border-[#1c2133] bg-[#1a1f2e] text-sm text-[#e2e8f0] placeholder:text-[#4a5568]"
              />

              {correctionMessage && (
                <div
                  className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] ${
                    CORRECTION_SUCCESS_MESSAGES.has(correctionMessage)
                      ? "border-[var(--success)]/30 bg-[#0d2a1a]/60 text-[var(--success)]"
                      : "border-[var(--warning)]/30 bg-[#2a1e06]/60 text-[var(--warning)]"
                  }`}
                >
                  {correctionMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 border-t border-[#1c2133] pt-3">
                <Button
                  onClick={() => void handleSaveCorrection()}
                  disabled={correctionSaving || correctionLoading || !selectedCorrectionPersonId || !tenantForCorrection}
                  className="h-9 rounded-none border border-[var(--brand-accent)] bg-[var(--brand-accent)] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[var(--brand-accent)]"
                >
                  {correctionSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {correctionSaving ? tr.savingButton : tr.saveCorrectionButton}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void loadSelectedCorrection()}
                  disabled={correctionLoading || !selectedCorrectionPersonId || !tenantForCorrection}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[var(--info)]/60 hover:text-[var(--info)]"
                >
                  {correctionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  {correctionLoading ? tr.loading : tr.reloadButton}
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}