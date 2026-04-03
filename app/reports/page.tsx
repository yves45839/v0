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
import { Calendar, ChevronDown, RefreshCcw, Users } from "lucide-react"
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
          <SelectTrigger className="w-[110px]">
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
          <SelectTrigger className="w-[110px]">
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

  const attendanceDetailRows = useMemo(() => {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'exporter le rapport."
      setError(message)
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
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />
        <main className="space-y-6 p-4 md:p-6">
          <PageContextBar
            title="Rapports"
            description="Analyse de presence, conformite et corrections de pointage exportables."
            stats={[
              { value: report?.summary.total_logs ?? "-", label: "Pointages analyses" },
              { value: report?.summary.total_employees ?? "-", label: "Employes couverts" },
              { value: report?.corrections?.length ?? 0, label: "Corrections chargees", tone: "warning" },
            ]}
          />

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-2">
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as AttendanceReportPeriod)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
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
                  className="w-[180px] pl-9"
                  disabled={selectedPeriod !== "daily" || customRangeEnabled}
                />
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Switch checked={customRangeEnabled} onCheckedChange={setCustomRangeEnabled} />
                <span className="text-sm">Plage personnalisee</span>
              </div>
              {customRangeEnabled ? (
                <>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="w-[170px]"
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="w-[170px]"
                  />
                </>
              ) : null}
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger className="w-[220px]"><Users className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les departements</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[260px] justify-between">
                    <span className="truncate text-left">{selectedPeopleLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[320px] w-[340px]">
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
              <Button variant="outline" onClick={() => void loadReport()} disabled={loading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleExport("excel")}
                disabled={loading || exportLoading !== null}
              >
                {exportLoading === "excel" ? "Export Excel..." : "Exporter Excel"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleExport("pdf")}
                disabled={loading || exportLoading !== null}
              >
                {exportLoading === "pdf" ? "Export PDF..." : "Exporter PDF"}
              </Button>
            </div>
          </div>

          {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

          <Tabs defaultValue="recap">
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="recap">Rapport recap</TabsTrigger>
              <TabsTrigger value="details">Rapport arrivees/departs</TabsTrigger>
            </TabsList>
            <TabsContent value="recap" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-4 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Switch checked={includeLateTotals} onCheckedChange={setIncludeLateTotals} />
                  <span className="text-sm">Inclure total retard</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={includeOvertimeTotals} onCheckedChange={setIncludeOvertimeTotals} />
                  <span className="text-sm">Inclure total heures sup</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Jours OK / Total</CardTitle></CardHeader>
                  <CardContent>{recapTotals.totalOkDays} / {recapTotals.totalExpectedDays}</CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Total heures travaillees</CardTitle></CardHeader>
                  <CardContent>{formatMinutesAsHoursMinutes(recapTotals.workedMinutes)}</CardContent>
                </Card>
                {includeLateTotals ? (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Total retard</CardTitle></CardHeader>
                    <CardContent className="text-amber-500">{formatMinutesAsHoursMinutes(recapTotals.lateMinutes)}</CardContent>
                  </Card>
                ) : null}
                {includeOvertimeTotals ? (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Total heures sup</CardTitle></CardHeader>
                    <CardContent className="text-emerald-500">{formatMinutesAsHoursMinutes(recapTotals.overtimeMinutes)}</CardContent>
                  </Card>
                ) : null}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Taux conformite</CardTitle></CardHeader>
                  <CardContent>{complianceSummary?.compliance_rate != null ? `${complianceSummary.compliance_rate}%` : "-"}</CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-4 space-y-4">
              <Input placeholder="Rechercher..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full md:w-[300px]" />
              <Card>
                <CardContent className="p-0">
                  <Table className="min-w-[980px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personne</TableHead>
                        <TableHead>Departement</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Heure arrivee</TableHead>
                        <TableHead>Heure depart</TableHead>
                        <TableHead>Conformite</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceDetailRows
                        .filter((row) => {
                          const query = searchQuery.trim().toLowerCase()
                          if (!query) return true
                          return (
                            row.employeeName.toLowerCase().includes(query) ||
                            row.personId.toLowerCase().includes(query) ||
                            row.departmentName.toLowerCase().includes(query)
                          )
                        })
                        .map((row) => (
                          <TableRow key={`${row.tenant}-${row.personId}-${row.date}`}>
                            <TableCell>
                              <div className="font-medium">{row.employeeName}</div>
                              <div className="text-xs text-muted-foreground">{row.personId}</div>
                            </TableCell>
                            <TableCell>{row.departmentName}</TableCell>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{formatIsoToHourMinute(row.arrivalIso)}</TableCell>
                            <TableCell>{formatIsoToHourMinute(row.departureIso)}</TableCell>
                            <TableCell className={row.status === "compliant" ? "text-green-500" : "text-amber-500"}>
                              {row.statusLabel}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Correction de pointage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                Arrivee = premiere entree de la journee. Depart = sortie de fin de journee. Pause = debut et fin de pause.
                Heures sup = nombre d'heures supplementaires (ex: 1.5).
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={selectedCorrectionPersonId || "__empty__"} onValueChange={(value) => setSelectedCorrectionPersonId(value === "__empty__" ? "" : value)}>
                  <SelectTrigger>
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
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
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
                <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  {selectedCorrectionPerson ? `${selectedCorrectionPerson.name} (${selectedCorrectionPerson.personId})` : "Selection requise"}
                  {tenantForCorrection ? ` - Tenant: ${tenantForCorrection}` : " - Tenant: non detecte"}
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
                <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{correctionMessage}</div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleSaveCorrection()} disabled={correctionSaving || correctionLoading || !selectedCorrectionPersonId || !tenantForCorrection}>
                  {correctionSaving ? "Enregistrement..." : "Enregistrer la correction"}
                </Button>
                <Button variant="outline" onClick={() => void loadSelectedCorrection()} disabled={correctionLoading || !selectedCorrectionPersonId || !tenantForCorrection}>
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
