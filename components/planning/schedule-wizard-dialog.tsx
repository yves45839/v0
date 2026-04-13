"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Users,
  Clock,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  CalendarDays,
  Coffee,
  Building2,
  Search,
  X,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import type { WorkShiftApiItem, DepartmentApiItem } from "@/lib/api/employees"

export type ScheduleWizardEmployee = {
  id: string | number
  name: string
  employeeId: string
  department: string
  departmentId: number | null
}

type WizardStep = 1 | 2 | 3 | 4

type ShiftConfig = {
  useExisting: boolean
  existingShiftId: number | null
  name: string
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
  workDays: number[]
}

type PeriodConfig = {
  startDate: string
  endDate: string
  indefinite: boolean
}

type ScheduleWizardDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: ScheduleWizardEmployee[]
  departments: DepartmentApiItem[]
  workShifts: WorkShiftApiItem[]
  tenantId?: number
  onConfirm: (payload: {
    employeeIds: Array<string | number>
    shiftConfig: ShiftConfig
    period: PeriodConfig
    existingShift: WorkShiftApiItem | null
  }) => Promise<void>
}

const WEEK_KEY = ["L", "M", "Me", "J", "V", "S", "D"]
const WEEK_FULL_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
const WEEK_FULL_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const STEP_ICONS = [Users, Clock, CalendarRange, CheckCircle2]

export function ScheduleWizardDialog({
  open,
  onOpenChange,
  employees,
  departments,
  workShifts,
  onConfirm,
}: ScheduleWizardDialogProps) {
  const { t, locale } = useI18n()
  const weekFull = locale === "fr" ? WEEK_FULL_FR : WEEK_FULL_EN

  const [step, setStep] = useState<WizardStep>(1)
  const [deptFilter, setDeptFilter] = useState<string>("all")
  const [empSearch, setEmpSearch] = useState("")
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string | number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [shift, setShift] = useState<ShiftConfig>({
    useExisting: workShifts.length > 0,
    existingShiftId: workShifts[0]?.id ?? null,
    name: "",
    startTime: "08:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    workDays: [0, 1, 2, 3, 4],
  })

  const [period, setPeriod] = useState<PeriodConfig>({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    indefinite: true,
  })

  const filteredEmployees = employees.filter((emp) => {
    const matchDept = deptFilter === "all" || String(emp.departmentId) === deptFilter
    const matchSearch =
      emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(empSearch.toLowerCase())
    return matchDept && matchSearch
  })

  const toggleEmployee = useCallback((id: string | number) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = () => setSelectedEmpIds(new Set(filteredEmployees.map((e) => e.id)))
  const clearAll = () => setSelectedEmpIds(new Set())

  const toggleWorkDay = (day: number) => {
    setShift((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day].sort(),
    }))
  }

  const selectedShift = workShifts.find((s) => s.id === shift.existingShiftId) ?? null

  const canProceed = (s: WizardStep): boolean => {
    if (s === 1) return selectedEmpIds.size > 0
    if (s === 2) {
      if (shift.useExisting) return shift.existingShiftId !== null
      return shift.name.trim().length > 0 && !!shift.startTime && !!shift.endTime
    }
    if (s === 3) return !!period.startDate
    return true
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm({
        employeeIds: Array.from(selectedEmpIds),
        shiftConfig: shift,
        period,
        existingShift: selectedShift,
      })
      onOpenChange(false)
      setStep(1)
      setSelectedEmpIds(new Set())
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepTitles = [
    t.planning.step1SelectEmployees,
    t.planning.step2ConfigureShift,
    t.planning.step3Period,
    t.planning.step4Review,
  ]

  const stepDescs = [
    t.planning.step1Desc,
    t.planning.step2Desc,
    t.planning.step3Desc,
    t.planning.step4Desc,
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Step progress bar */}
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <DialogTitle className="text-base font-semibold">{t.planning.newScheduleWizard}</DialogTitle>
            <span className="ml-auto text-xs text-muted-foreground">
              {t.common.step} {step} {t.common.of} 4
            </span>
          </div>
          {/* Progress steps */}
          <div className="flex items-center gap-1">
            {([1, 2, 3, 4] as WizardStep[]).map((s) => {
              const Icon = STEP_ICONS[s - 1]
              return (
                <div key={s} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all",
                      step === s
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_rgba(78,155,255,0.4)]"
                        : step > s
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                          : "border-border/60 bg-secondary/40 text-muted-foreground"
                    )}
                  >
                    {step > s ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  {s < 4 && (
                    <div className={cn("h-0.5 w-full rounded-full", step > s ? "bg-emerald-500" : "bg-border/50")} />
                  )}
                </div>
              )
            })}
          </div>
          <DialogDescription className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{stepTitles[step - 1]}</span> — {stepDescs[step - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: Select employees */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t.employees.search}
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-44">
                    <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.planning.allDepartments}</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selectedEmpIds.size} / {filteredEmployees.length} {t.planning.selectedEmployees}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAll}>
                    {t.common.all}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={clearAll}>
                    <X className="mr-1 h-3 w-3" />
                    {t.common.none}
                  </Button>
                </div>
              </div>

              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 p-2">
                {filteredEmployees.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">{t.common.noResults}</p>
                )}
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleEmployee(emp.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                      selectedEmpIds.has(emp.id)
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-transparent bg-secondary/30 text-muted-foreground hover:border-border/60 hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Checkbox
                      checked={selectedEmpIds.has(emp.id)}
                      className="pointer-events-none"
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{emp.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {emp.employeeId} — {emp.department}
                      </p>
                    </div>
                    {selectedEmpIds.has(emp.id) && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Configure shift */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  {shift.useExisting ? t.planning.useExistingShift : t.planning.createNewShift}
                </span>
                <Switch
                  checked={shift.useExisting}
                  onCheckedChange={(v) => setShift((p) => ({ ...p, useExisting: v }))}
                />
              </div>

              {shift.useExisting ? (
                <div className="space-y-2">
                  <Label>{t.planning.shifts}</Label>
                  <Select
                    value={String(shift.existingShiftId ?? "")}
                    onValueChange={(v) => setShift((p) => ({ ...p, existingShiftId: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.planning.useExistingShift} />
                    </SelectTrigger>
                    <SelectContent>
                      {workShifts.map((ws) => (
                        <SelectItem key={ws.id} value={String(ws.id)}>
                          <span className="font-medium">{ws.name}</span>
                          {ws.start_time && ws.end_time && (
                            <span className="ml-2 text-muted-foreground">
                              ({ws.start_time.slice(0, 5)} → {ws.end_time.slice(0, 5)})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedShift && (
                    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-2 text-xs text-muted-foreground">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{selectedShift.start_time?.slice(0, 5) ?? "--"} → {selectedShift.end_time?.slice(0, 5) ?? "--"}</span>
                        </div>
                        {selectedShift.break_start_time && (
                          <div className="flex items-center gap-1.5">
                            <Coffee className="h-3.5 w-3.5 text-amber-400" />
                            <span>{selectedShift.break_start_time.slice(0, 5)} → {selectedShift.break_end_time?.slice(0, 5) ?? "--"}</span>
                          </div>
                        )}
                      </div>
                      {selectedShift.description && <p>{selectedShift.description}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="shiftName">{t.planning.shiftName} *</Label>
                      <Input
                        id="shiftName"
                        value={shift.name}
                        onChange={(e) => setShift((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Quart matin 8h-17h"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="startTime">{t.planning.startTime}</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => setShift((p) => ({ ...p, startTime: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endTime">{t.planning.endTime}</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => setShift((p) => ({ ...p, endTime: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="breakStart">{t.planning.breakStart}</Label>
                      <Input
                        id="breakStart"
                        type="time"
                        value={shift.breakStart}
                        onChange={(e) => setShift((p) => ({ ...p, breakStart: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="breakEnd">{t.planning.breakEnd}</Label>
                      <Input
                        id="breakEnd"
                        type="time"
                        value={shift.breakEnd}
                        onChange={(e) => setShift((p) => ({ ...p, breakEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.planning.workDays}</Label>
                    <div className="flex gap-2">
                      {WEEK_KEY.map((key, idx) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleWorkDay(idx)}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold transition-all",
                            shift.workDays.includes(idx)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {shift.workDays.map((d) => weekFull[d]).join(", ") || t.common.none}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Period */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">{t.planning.startDate} *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={period.startDate}
                  onChange={(e) => setPeriod((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                <span className="text-sm font-medium">{t.planning.indefinite}</span>
                <Switch
                  checked={period.indefinite}
                  onCheckedChange={(v) => setPeriod((p) => ({ ...p, indefinite: v, endDate: v ? "" : p.endDate }))}
                />
              </div>
              {!period.indefinite && (
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">{t.planning.endDate}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={period.endDate}
                    min={period.startDate}
                    onChange={(e) => setPeriod((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              )}
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {t.planning.startDate}: <span className="font-medium text-foreground">{period.startDate || "—"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {t.planning.endDate}: <span className="font-medium text-foreground">{period.indefinite ? t.planning.indefinite : period.endDate || "—"}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {t.employees.title} ({selectedEmpIds.size})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(selectedEmpIds).map((id) => {
                    const emp = employees.find((e) => e.id === id)
                    return emp ? (
                      <Badge key={id} variant="secondary" className="text-[11px]">
                        {emp.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t.planning.shifts}
                </h4>
                {shift.useExisting && selectedShift ? (
                  <div className="text-sm text-foreground">
                    <span className="font-medium">{selectedShift.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {selectedShift.start_time?.slice(0, 5) ?? "--"} → {selectedShift.end_time?.slice(0, 5) ?? "--"}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-foreground">
                    <span className="font-medium">{shift.name || "—"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {shift.startTime} → {shift.endTime}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {shift.workDays.map((d) => weekFull[d]).join(", ")}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {t.planning.step3Period}
                </h4>
                <p className="text-sm text-foreground">
                  {period.startDate} → {period.indefinite ? t.planning.indefinite : period.endDate || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/8 px-4 py-3 text-xs text-primary">
                <Sparkles className="mb-1 h-3.5 w-3.5" />
                {t.planning.confirmAssignment}: {selectedEmpIds.size} {t.employees.title.toLowerCase()} seront assignés au quart sélectionné à partir du {period.startDate}.
              </div>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep((s) => (s - 1) as WizardStep) : onOpenChange(false)}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              {step === 1 ? t.common.cancel : t.common.back}
            </Button>
            {step < 4 ? (
              <Button
                disabled={!canProceed(step)}
                onClick={() => setStep((s) => (s + 1) as WizardStep)}
              >
                {t.common.next}
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.planning.assigningSchedule}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t.planning.confirmAssignment}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
