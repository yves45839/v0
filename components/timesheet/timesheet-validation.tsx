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
import { timesheetDict } from "@/lib/i18n/pages/timesheet"
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
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
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

function buildItems(
  report: AttendanceReportResponse,
  dateStr: string,
  dict: typeof timesheetDict
): ValidationItem[] {
  const trFr = dict.fr
  const trEn = dict.en
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
      let reasonFr = trFr.reasonCompliant
      let reasonEn = trEn.reasonCompliant
      let deltaFr = trFr.deltaOk
      let deltaEn = trEn.deltaOk
      let deltaIsOk = true
      let deltaType: TimesheetSeverity = "info"

      if (detail.status === "missing") {
        severity = "danger"
        reasonFr = trFr.reasonMissing
        reasonEn = trEn.reasonMissing
        deltaFr = trFr.deltaMissing
        deltaEn = trEn.deltaMissing
        deltaIsOk = false
        deltaType = "danger"
      } else if (detail.status === "partial") {
        if (arrival && !departure) {
          severity = "danger"
          reasonFr = trFr.reasonNoClockOut
          reasonEn = trEn.reasonNoClockOut
          deltaFr = trFr.deltaMissing
          deltaEn = trEn.deltaMissing
          deltaIsOk = false
          deltaType = "danger"
        } else if (!arrival && departure) {
          severity = "danger"
          reasonFr = trFr.reasonNoClockIn
          reasonEn = trEn.reasonNoClockIn
          deltaFr = trFr.deltaMissing
          deltaEn = trEn.deltaMissing
          deltaIsOk = false
          deltaType = "danger"
        } else {
          severity = "warn"
          reasonFr = trFr.reasonIncomplete
          reasonEn = trEn.reasonIncomplete
          deltaFr = trFr.deltaPartial
          deltaEn = trEn.deltaPartial
          deltaIsOk = false
          deltaType = "warn"
        }
      } else if (detail.status === "unexpected_activity") {
        severity = "warn"
        reasonFr = trFr.reasonUnexpected
        reasonEn = trEn.reasonUnexpected
        deltaFr = trFr.deltaEvents(detail.observed.total_logs)
        deltaEn = trEn.deltaEvents(detail.observed.total_logs)
        deltaIsOk = false
        deltaType = "warn"
      }

      if (arrivalDelta !== null && arrivalDelta > 0) {
        if (detail.status === "compliant") {
          severity = "warn"
          reasonFr = trFr.reasonLateArrival(arrivalDelta)
          reasonEn = trEn.reasonLateArrival(arrivalDelta)
        } else {
          reasonFr += trFr.reasonLateSuffix(arrivalDelta)
          reasonEn += trEn.reasonLateSuffix(arrivalDelta)
        }
        if (deltaIsOk) {
          deltaFr = trFr.deltaPlus(arrivalDelta)
          deltaEn = trEn.deltaPlus(arrivalDelta)
          deltaIsOk = false
          deltaType = "warn"
        }
      } else if (departureDelta !== null && departureDelta < 0 && deltaIsOk) {
        deltaFr = trFr.deltaMinus(Math.abs(departureDelta))
        deltaEn = trEn.deltaMinus(Math.abs(departureDelta))
        deltaIsOk = false
        deltaType = "warn"
        reasonFr = trFr.reasonEarlyOut(Math.abs(departureDelta))
        reasonEn = trEn.reasonEarlyOut(Math.abs(departureDelta))
      } else if (departureDelta !== null && departureDelta > 0 && deltaIsOk) {
        deltaFr = trFr.deltaPlus(departureDelta)
        deltaEn = trEn.deltaPlus(departureDelta)
        deltaIsOk = false
        deltaType = "info"
        reasonFr = trFr.reasonOvertime(departureDelta)
        reasonEn = trEn.reasonOvertime(departureDelta)
      }

      if (corrected) {
        reasonFr = trFr.reasonCorrectedPrefix(reasonFr)
        reasonEn = trEn.reasonCorrectedPrefix(reasonEn)
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
        deltaFr,
        deltaEn,
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
          ? trFr.reasonCorrected
          : missingOut
            ? trFr.reasonNoClockOut
            : !arrival
              ? trFr.reasonNoClockIn
              : trFr.reasonLogsRecorded(employee.total_logs),
        reasonEn: corrected
          ? trEn.reasonCorrected
          : missingOut
            ? trEn.reasonNoClockOut
            : !arrival
              ? trEn.reasonNoClockIn
              : trEn.reasonLogsRecorded(employee.total_logs),
        expectStart: "—",
        expectEnd: "—",
        actualStart: arrival ?? "—",
        actualEnd: departure ?? "—",
        deltaFr: corrected
          ? trFr.deltaCorrected
          : missingOut || !arrival
            ? trFr.deltaMissing
            : trFr.deltaOk,
        deltaEn: corrected
          ? trEn.deltaCorrected
          : missingOut || !arrival
            ? trEn.deltaMissing
            : trEn.deltaOk,
        deltaType: corrected ? "info" : missingOut || !arrival ? "danger" : "info",
        severity: corrected ? "info" : missingOut || !arrival ? "danger" : "info",
      })
    }
  }

  items.sort((a, b) => {
    const anomalyDiff = Number(isAnomaly(b)) - Number(isAnomaly(a))
    if (anomalyDiff !== 0) return anomalyDiff
    return a.name.localeCompare(b.name)
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
  const tr = timesheetDict[locale]
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
        setItems(buildItems(report, dateStr, timesheetDict))
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
          deltaFr: timesheetDict.fr.deltaCorrected,
          deltaEn: timesheetDict.en.deltaCorrected,
          reasonFr: timesheetDict.fr.reasonCorrected,
          reasonEn: timesheetDict.en.reasonCorrected,
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
        notes: tr.validationNote,
      })
      markCorrected([item.id])
      toast.success(tr.validatedToast)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(tr.validationFailed, {
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
      toast.message(tr.noValidatable)
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
          notes: tr.validationNote,
        })
      )
    )
    const okIds = targets.filter((_, i) => results[i].status === "fulfilled").map((it) => it.id)
    const failed = results.filter((r) => r.status === "rejected").length
    markCorrected(okIds)
    setBusyIds(new Set())
    if (okIds.length > 0) {
      toast.success(tr.validatedCount(okIds.length))
    }
    if (failed > 0) {
      toast.error(tr.failedCount(failed))
    }
  }

  const saveDraft = async () => {
    if (!draft) return
    if (!draft.arrival || !draft.departure) {
      toast.error(tr.timesRequired)
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
      toast.success(tr.correctionSaved)
      setDraft(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(tr.saveFailed, {
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
      toast.error(tr.exportFailed, { description: message })
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
    { key: "anomalies", label: tr.tabAnomalies, count: counts.anomalies },
    { key: "validated", label: tr.tabValidated, count: counts.validated },
    { key: "all", label: tr.tabAll, count: counts.all },
  ]

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-xl font-semibold tracking-tight md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tr.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? tr.loadingSubtitle
              : tr.subtitle(counts.anomalies, formatDayLabel(dateStr, locale))}
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
            {tr.export}
          </Button>
          <Button
            size="sm"
            className="h-9"
            onClick={approveAll}
            disabled={loading || anomalies.length === 0 || busyIds.size > 0}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            {tr.approveAll} (
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
            {tr.dateLabel}
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
            {allSelected ? tr.clearSelection : tr.selectAll}
          </button>
          {selected.size > 0 && (
            <>
              <span>·</span>
              <span>{tr.selectedCount(selected.size)}</span>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tr.loadingReport}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-destructive">{tr.loadError}</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 h-8"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              {tr.retry}
            </Button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">
              {items.length === 0
                ? tr.emptyNone
                : tab === "anomalies"
                  ? tr.emptyNoAnomalies
                  : tr.emptyTab}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{tr.emptyHint}</p>
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
            <DialogTitle>{tr.dialogTitle}</DialogTitle>
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
                  <Label htmlFor="correction-arrival">{tr.arrival}</Label>
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
                  <Label htmlFor="correction-departure">{tr.departure}</Label>
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
                <Label htmlFor="correction-notes">{tr.noteOptional}</Label>
                <Input
                  id="correction-notes"
                  type="text"
                  placeholder={tr.notePlaceholder}
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
              {tr.cancel}
            </Button>
            <Button onClick={() => void saveDraft()} disabled={draftSaving}>
              {draftSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {tr.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
