"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import { Check, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"
import {
  TimesheetRow,
  type TimesheetItem,
  type TimesheetSeverity,
} from "@/components/timesheet/timesheet-row"
import {
  downloadAttendanceReport,
  fetchAttendanceReport,
  upsertAttendanceCorrection,
  type AttendanceReportResponse,
} from "@/lib/api/reports"
import { cn } from "@/lib/utils"

type ComplianceStatus = "compliant" | "partial" | "missing" | "unexpected_activity" | "rest"

type ValidationItem = Omit<TimesheetItem, "id"> & {
  id: string
  personId: string
  workDate: string
  status: ComplianceStatus
  arrivalTime: string | null
  departureTime: string | null
  corrected: boolean
}

type Tab = "anomalies" | "validated" | "all"

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function colorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return `oklch(0.58 0.13 ${hash % 360})`
}

function isoToHourMinute(isoValue: string | null | undefined): string | null {
  if (!isoValue) return null
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function todayInputValue(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function formatDayLabel(dateStr: string, locale: "fr" | "en"): string {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  const label = format(date, "EEE d MMM", { locale: locale === "en" ? enUS : fr })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function isAnomaly(item: ValidationItem): boolean {
  return !item.corrected && item.status !== "compliant" && item.status !== "rest"
}

function buildItems(report: AttendanceReportResponse, dateStr: string): ValidationItem[] {
  const correctionsByKey = new Map<string, { arrival: string | null; departure: string | null }>()
  for (const correction of report.corrections ?? []) {
    correctionsByKey.set(`${correction.person_id}|${correction.date}`, {
      arrival: correction.arrival_time ? correction.arrival_time.slice(0, 5) : null,
      departure: correction.departure_time ? correction.departure_time.slice(0, 5) : null,
    })
  }

  const items: ValidationItem[] = []
  const complianceEmployees = report.compliance?.employees ?? []

  if (complianceEmployees.length > 0) {
    for (const employee of complianceEmployees) {
      const detail =
        (employee.details ?? []).find((d) => d.date === dateStr) ?? (employee.details ?? [])[0]
      if (!detail) continue
      // Jour de repos sans activité : rien à valider.
      if (detail.status === "rest" && detail.observed.total_logs === 0) continue

      const correction = correctionsByKey.get(`${employee.person_id}|${detail.date}`)
      const corrected = Boolean(correction)
      const arrival = correction?.arrival ?? isoToHourMinute(detail.actual_checkin_at)
      const departure = correction?.departure ?? isoToHourMinute(detail.actual_checkout_at)
      const expectStart = isoToHourMinute(detail.expected_checkin_at) ?? "—"
      const expectEnd = isoToHourMinute(detail.expected_checkout_at) ?? "—"

      const arrivalDelta = detail.arrival_delta_minutes ?? null
      const departureDelta = detail.departure_delta_minutes ?? null

      let severity: TimesheetSeverity = "info"
      let reasonFr = "Conforme au planning"
      let reasonEn = "Matches the schedule"
      let delta = "OK"
      let deltaType: TimesheetSeverity = "info"

      if (detail.status === "missing") {
        severity = "danger"
        reasonFr = "Aucun pointage détecté"
        reasonEn = "No clock events detected"
        delta = "manquant"
        deltaType = "danger"
      } else if (detail.status === "partial") {
        if (arrival && !departure) {
          severity = "danger"
          reasonFr = "Pas de pointage de sortie"
          reasonEn = "No clock-out detected"
          delta = "manquant"
          deltaType = "danger"
        } else if (!arrival && departure) {
          severity = "danger"
          reasonFr = "Pas de pointage d'entrée"
          reasonEn = "No clock-in detected"
          delta = "manquant"
          deltaType = "danger"
        } else {
          severity = "warn"
          reasonFr = "Pointage incomplet"
          reasonEn = "Incomplete clock events"
          delta = "partiel"
          deltaType = "warn"
        }
      } else if (detail.status === "unexpected_activity") {
        severity = "warn"
        reasonFr = "Activité hors planning"
        reasonEn = "Activity outside schedule"
        delta = `${detail.observed.total_logs} evt`
        deltaType = "warn"
      }

      if (arrivalDelta !== null && arrivalDelta > 0) {
        if (detail.status === "compliant") {
          severity = "warn"
          reasonFr = `Arrivée tardive · +${arrivalDelta} min`
          reasonEn = `Late arrival · +${arrivalDelta} min`
        } else {
          reasonFr += ` · retard +${arrivalDelta} min`
          reasonEn += ` · late +${arrivalDelta} min`
        }
        if (delta === "OK") {
          delta = `+${arrivalDelta} min`
          deltaType = "warn"
        }
      } else if (departureDelta !== null && departureDelta < 0 && delta === "OK") {
        delta = `−${Math.abs(departureDelta)} min`
        deltaType = "warn"
        reasonFr = `Sortie anticipée · −${Math.abs(departureDelta)} min`
        reasonEn = `Early clock-out · −${Math.abs(departureDelta)} min`
      } else if (departureDelta !== null && departureDelta > 0 && delta === "OK") {
        delta = `+${departureDelta} min`
        deltaType = "info"
        reasonFr = `Heures sup. · +${departureDelta} min`
        reasonEn = `Overtime · +${departureDelta} min`
      }

      if (corrected) {
        reasonFr = `Corrigé manuellement · ${reasonFr}`
        reasonEn = `Manually corrected · ${reasonEn}`
        severity = "info"
        deltaType = "info"
      }

      const name = employee.employee_name?.trim() || employee.person_id
      items.push({
        id: `${employee.person_id}|${detail.date}`,
        personId: employee.person_id,
        workDate: detail.date,
        status: detail.status,
        corrected,
        arrivalTime: arrival,
        departureTime: departure,
        name,
        initials: initialsFromName(name),
        avatarColor: colorFromId(employee.person_id),
        dateFr: formatDayLabel(detail.date, "fr"),
        dateEn: formatDayLabel(detail.date, "en"),
        reasonFr,
        reasonEn,
        expectStart,
        expectEnd,
        actualStart: arrival ?? "—",
        actualEnd: departure ?? "—",
        delta,
        deltaType,
        severity,
      })
    }
  } else {
    // Repli sans données de conformité : pointages bruts (première entrée / dernière sortie).
    for (const employee of report.employees ?? []) {
      const correction = correctionsByKey.get(`${employee.person_id}|${dateStr}`)
      const corrected = Boolean(correction)
      const arrival = correction?.arrival ?? isoToHourMinute(employee.first_checkin)
      const departure = correction?.departure ?? isoToHourMinute(employee.last_checkout)
      if (!arrival && !departure && employee.total_logs === 0) continue

      const missingOut = Boolean(arrival) && !departure
      const name = employee.employee_name?.trim() || employee.person_id
      items.push({
        id: `${employee.person_id}|${dateStr}`,
        personId: employee.person_id,
        workDate: dateStr,
        status: corrected ? "compliant" : missingOut || !arrival ? "partial" : "compliant",
        corrected,
        arrivalTime: arrival,
        departureTime: departure,
        name,
        initials: initialsFromName(name),
        avatarColor: colorFromId(employee.person_id),
        dateFr: formatDayLabel(dateStr, "fr"),
        dateEn: formatDayLabel(dateStr, "en"),
        reasonFr: corrected
          ? "Corrigé manuellement"
          : missingOut
            ? "Pas de pointage de sortie"
            : !arrival
              ? "Pas de pointage d'entrée"
              : `${employee.total_logs} pointages enregistrés`,
        reasonEn: corrected
          ? "Manually corrected"
          : missingOut
            ? "No clock-out detected"
            : !arrival
              ? "No clock-in detected"
              : `${employee.total_logs} clock events recorded`,
        expectStart: "—",
        expectEnd: "—",
        actualStart: arrival ?? "—",
        actualEnd: departure ?? "—",
        delta: corrected ? "corrigé" : missingOut || !arrival ? "manquant" : "OK",
        deltaType: corrected ? "info" : missingOut || !arrival ? "danger" : "info",
        severity: corrected ? "info" : missingOut || !arrival ? "danger" : "info",
      })
    }
  }

  items.sort((a, b) => {
    const anomalyDiff = Number(isAnomaly(b)) - Number(isAnomaly(a))
    if (anomalyDiff !== 0) return anomalyDiff
    return a.name.localeCompare(b.name, "fr")
  })
  return items
}

type CorrectionDraft = {
  item: ValidationItem
  arrival: string
  departure: string
  notes: string
}

export function TimesheetValidation() {
  const { locale } = useI18n()
  const [dateStr, setDateStr] = useState<string>(() => todayInputValue())
  const [items, setItems] = useState<ValidationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>("anomalies")
  const [draft, setDraft] = useState<CorrectionDraft | null>(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      setSelected(new Set())
      try {
        const report = await fetchAttendanceReport({ period: "daily", date: dateStr })
        if (!mounted) return
        setItems(buildItems(report, dateStr))
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : String(err))
        setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [dateStr, reloadKey])

  const anomalies = useMemo(() => items.filter(isAnomaly), [items])
  const validated = useMemo(() => items.filter((it) => !isAnomaly(it)), [items])

  const visibleItems = tab === "anomalies" ? anomalies : tab === "validated" ? validated : items

  const counts = {
    anomalies: anomalies.length,
    validated: validated.length,
    all: items.length,
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const markCorrected = useCallback((ids: string[], times?: Map<string, { arrival: string; departure: string }>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (!ids.includes(it.id)) return it
        const time = times?.get(it.id)
        return {
          ...it,
          corrected: true,
          severity: "info" as TimesheetSeverity,
          deltaType: "info" as TimesheetSeverity,
          delta: "corrigé",
          reasonFr: "Corrigé manuellement",
          reasonEn: "Manually corrected",
          arrivalTime: time?.arrival ?? it.arrivalTime,
          departureTime: time?.departure ?? it.departureTime,
          actualStart: time?.arrival ?? it.actualStart,
          actualEnd: time?.departure ?? it.actualEnd,
        }
      })
    )
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const approveItem = async (item: ValidationItem) => {
    if (!item.arrivalTime || !item.departureTime) {
      setDraft({
        item,
        arrival: item.arrivalTime ?? "",
        departure: item.departureTime ?? "",
        notes: "",
      })
      return
    }
    setBusyIds((prev) => new Set(prev).add(item.id))
    try {
      await upsertAttendanceCorrection({
        personId: item.personId,
        date: item.workDate,
        arrivalTime: item.arrivalTime,
        departureTime: item.departureTime,
        notes:
          locale === "en"
            ? "Validated from the timesheet screen"
            : "Validé depuis l'écran de validation des pointages",
      })
      markCorrected([item.id])
      toast.success(locale === "en" ? "Timesheet validated" : "Pointage validé")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(locale === "en" ? "Validation failed" : "Échec de la validation", {
        description: message,
      })
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const approveAll = async () => {
    const pool = selected.size > 0 ? visibleItems.filter((it) => selected.has(it.id)) : visibleItems
    const targets = pool.filter((it) => isAnomaly(it) && it.arrivalTime && it.departureTime)
    if (targets.length === 0) {
      toast.message(
        locale === "en"
          ? "No validatable rows (missing times must be corrected first)"
          : "Aucune ligne validable (les heures manquantes doivent d'abord être corrigées)"
      )
      return
    }
    setBusyIds(new Set(targets.map((it) => it.id)))
    const results = await Promise.allSettled(
      targets.map((it) =>
        upsertAttendanceCorrection({
          personId: it.personId,
          date: it.workDate,
          arrivalTime: it.arrivalTime as string,
          departureTime: it.departureTime as string,
          notes:
            locale === "en"
              ? "Validated from the timesheet screen"
              : "Validé depuis l'écran de validation des pointages",
        })
      )
    )
    const okIds = targets.filter((_, i) => results[i].status === "fulfilled").map((it) => it.id)
    const failed = results.filter((r) => r.status === "rejected").length
    markCorrected(okIds)
    setBusyIds(new Set())
    if (okIds.length > 0) {
      toast.success(
        locale === "en" ? `${okIds.length} timesheets validated` : `${okIds.length} pointages validés`
      )
    }
    if (failed > 0) {
      toast.error(locale === "en" ? `${failed} validations failed` : `${failed} validations en échec`)
    }
  }

  const saveDraft = async () => {
    if (!draft) return
    if (!draft.arrival || !draft.departure) {
      toast.error(
        locale === "en"
          ? "Arrival and departure times are required"
          : "Les heures d'arrivée et de départ sont requises"
      )
      return
    }
    setDraftSaving(true)
    try {
      await upsertAttendanceCorrection({
        personId: draft.item.personId,
        date: draft.item.workDate,
        arrivalTime: draft.arrival,
        departureTime: draft.departure,
        notes: draft.notes,
      })
      markCorrected(
        [draft.item.id],
        new Map([[draft.item.id, { arrival: draft.arrival, departure: draft.departure }]])
      )
      toast.success(locale === "en" ? "Correction saved" : "Correction enregistrée")
      setDraft(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(locale === "en" ? "Save failed" : "Échec de l'enregistrement", {
        description: message,
      })
    } finally {
      setDraftSaving(false)
    }
  }

  const exportReport = async () => {
    setExporting(true)
    try {
      const { blob, filename } = await downloadAttendanceReport(
        { period: "daily", date: dateStr },
        "excel"
      )
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(locale === "en" ? "Export failed" : "Échec de l'export", { description: message })
    } finally {
      setExporting(false)
    }
  }

  const allSelected =
    visibleItems.length > 0 && visibleItems.every((it) => selected.has(it.id))

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(visibleItems.map((it) => it.id)))
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "anomalies", label: "Anomalies", count: counts.anomalies },
    {
      key: "validated",
      label: locale === "en" ? "Validated" : "Validés",
      count: counts.validated,
    },
    { key: "all", label: locale === "en" ? "All" : "Tous", count: counts.all },
  ]

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "en" ? "Timesheet validation" : "Validation pointages"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? locale === "en"
                ? "Loading timesheets…"
                : "Chargement des pointages…"
              : locale === "en"
                ? `${counts.anomalies} anomalies to validate on ${formatDayLabel(dateStr, "en")}`
                : `${counts.anomalies} anomalies à valider le ${formatDayLabel(dateStr, "fr")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={exportReport}
            disabled={exporting || loading}
          >
            {exporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            {locale === "en" ? "Export" : "Exporter"}
          </Button>
          <Button
            size="sm"
            className="h-9"
            onClick={approveAll}
            disabled={loading || anomalies.length === 0 || busyIds.size > 0}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "Approve all" : "Tout valider"} (
            {selected.size > 0 ? selected.size : tab === "anomalies" ? anomalies.length : visibleItems.length})
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-fit items-center gap-0 overflow-hidden rounded-lg border border-border/70 bg-card">
          {tabs.map((tabDef) => (
            <button
              key={tabDef.key}
              type="button"
              onClick={() => setTab(tabDef.key)}
              className={cn(
                "px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === tabDef.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tabDef.label}
              <span className="ml-1 opacity-60">{tabDef.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Label htmlFor="timesheet-date" className="text-xs font-medium">
            {locale === "en" ? "Date" : "Date"}
          </Label>
          <Input
            id="timesheet-date"
            type="date"
            className="h-8 w-[150px]"
            value={dateStr}
            max={todayInputValue()}
            onChange={(event) => {
              if (event.target.value) setDateStr(event.target.value)
            }}
          />
        </div>
      </div>

      {visibleItems.length > 0 && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={toggleAll}
            className="font-medium text-foreground hover:underline"
          >
            {allSelected
              ? locale === "en"
                ? "Clear selection"
                : "Tout désélectionner"
              : locale === "en"
                ? "Select all"
                : "Tout sélectionner"}
          </button>
          {selected.size > 0 && (
            <>
              <span>·</span>
              <span>
                {locale === "en"
                  ? `${selected.size} selected`
                  : `${selected.size} sélectionnée(s)`}
              </span>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {locale === "en" ? "Loading attendance report…" : "Chargement du rapport de pointage…"}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-destructive">
              {locale === "en" ? "Unable to load timesheets" : "Impossible de charger les pointages"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 h-8"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              {locale === "en" ? "Retry" : "Réessayer"}
            </Button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">
              {items.length === 0
                ? locale === "en"
                  ? "No timesheets to validate for this date."
                  : "Aucun pointage à valider pour cette date."
                : tab === "anomalies"
                  ? locale === "en"
                    ? "No anomalies — everything is clean."
                    : "Aucune anomalie — tout est propre."
                  : locale === "en"
                    ? "No data on this tab."
                    : "Aucune donnée sur cet onglet."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {locale === "en"
                ? "Pick another date or check the full report on the Reports page."
                : "Choisissez une autre date ou consultez le rapport complet dans la page Rapports."}
            </p>
          </div>
        ) : (
          visibleItems.map((it) => (
            <TimesheetRow
              key={it.id}
              item={it}
              selected={selected.has(it.id)}
              onToggleSelect={() => toggle(it.id)}
              onApprove={() => void approveItem(it)}
              onEdit={() =>
                setDraft({
                  item: it,
                  arrival: it.arrivalTime ?? "",
                  departure: it.departureTime ?? "",
                  notes: "",
                })
              }
              approveDisabled={it.corrected}
              busy={busyIds.has(it.id)}
            />
          ))
        )}
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {locale === "en" ? "Correct timesheet" : "Corriger le pointage"}
            </DialogTitle>
            <DialogDescription>
              {draft
                ? `${draft.item.name} · ${locale === "en" ? draft.item.dateEn : draft.item.dateFr}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="correction-arrival">
                    {locale === "en" ? "Arrival" : "Arrivée"}
                  </Label>
                  <Input
                    id="correction-arrival"
                    type="time"
                    value={draft.arrival}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, arrival: event.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="correction-departure">
                    {locale === "en" ? "Departure" : "Départ"}
                  </Label>
                  <Input
                    id="correction-departure"
                    type="time"
                    value={draft.departure}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, departure: event.target.value } : prev))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correction-notes">
                  {locale === "en" ? "Note (optional)" : "Note (optionnelle)"}
                </Label>
                <Input
                  id="correction-notes"
                  type="text"
                  placeholder={
                    locale === "en" ? "Reason for the correction…" : "Motif de la correction…"
                  }
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={draftSaving}>
              {locale === "en" ? "Cancel" : "Annuler"}
            </Button>
            <Button onClick={() => void saveDraft()} disabled={draftSaving}>
              {draftSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {locale === "en" ? "Save" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
