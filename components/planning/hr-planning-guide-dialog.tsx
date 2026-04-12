"use client"

import { useMemo, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react"

type Scope = "employee" | "department"
type WeekendMode = "rest" | "same" | "different"

export type HrQuickAssignPayload = {
  scope: Scope
  createFromScratch: boolean
  planningName: string
  shiftName: string
  timezone: string
  serviceStart: string
  serviceEnd: string
  breakEnabled: boolean
  breakStart: string
  breakEnd: string
  lateAllowableMinutes: number
  earlyLeaveAllowableMinutes: number
  weekendMode: WeekendMode
  weekendStart: string
  weekendEnd: string
  severalShifts: boolean
  rotating: boolean
  temporaryExceptions: boolean
}

type HrPlanningGuideDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCreateShiftDialog: () => void
  onOpenCreatePlanningDialog: () => void
  onRunQuickAssignFlow: (payload: HrQuickAssignPayload) => void | Promise<void>
  isPreparingAssign?: boolean
  stats: {
    shiftCount: number
    planningCount: number
    employeeCount: number
    assignedEmployeeCount: number
  }
}

const steps = [
  "Avez-vous plusieurs quarts ?",
  "Les quarts sont-ils tournants ?",
  "Comment gerer le week-end ?",
  "Le planning cible des employes ou des departements ?",
  "Y a-t-il des exceptions temporaires ?",
]

function isValidTime24h(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())
}

export function HrPlanningGuideDialog({
  open,
  onOpenChange,
  onOpenCreateShiftDialog,
  onOpenCreatePlanningDialog,
  onRunQuickAssignFlow,
  isPreparingAssign = false,
  stats,
}: HrPlanningGuideDialogProps) {
  const [step, setStep] = useState(0)
  const [severalShifts, setSeveralShifts] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [weekendMode, setWeekendMode] = useState<WeekendMode>("rest")
  const [scope, setScope] = useState<Scope>("employee")
  const [temporaryExceptions, setTemporaryExceptions] = useState(false)

  const [createFromScratch, setCreateFromScratch] = useState(true)
  const [planningName, setPlanningName] = useState("Planning RH")
  const [shiftName, setShiftName] = useState("Quart Jour")
  const [timezone, setTimezone] = useState("Africa/Abidjan")
  const [serviceStart, setServiceStart] = useState("08:00")
  const [serviceEnd, setServiceEnd] = useState("17:00")
  const [breakEnabled, setBreakEnabled] = useState(true)
  const [breakStart, setBreakStart] = useState("12:00")
  const [breakEnd, setBreakEnd] = useState("13:00")
  const [weekendStart, setWeekendStart] = useState("09:00")
  const [weekendEnd, setWeekendEnd] = useState("14:00")
  const [lateAllowableMinutes, setLateAllowableMinutes] = useState("10")
  const [earlyLeaveAllowableMinutes, setEarlyLeaveAllowableMinutes] = useState("10")
  const [setupError, setSetupError] = useState<string | null>(null)

  const currentQuestion = steps[step] ?? ""
  const isLastStep = step === steps.length - 1

  const recommendations = useMemo(() => {
    const points: string[] = []
    points.push(severalShifts ? "Utiliser plusieurs quarts." : "Garder un quart principal.")
    points.push(rotating ? "Choisir un planning tournant." : "Choisir un planning fixe.")
    if (weekendMode === "rest") {
      points.push("Definir le week-end en repos.")
    } else if (weekendMode === "different") {
      points.push("Appliquer des horaires week-end differents.")
    } else {
      points.push("Conserver les horaires semaine le week-end.")
    }
    points.push(scope === "employee" ? "Attribuer aux employes." : "Attribuer aux departements.")
    if (temporaryExceptions) {
      points.push("Prevoir des exceptions datees pour les periodes speciales.")
    }
    return points
  }, [rotating, scope, severalShifts, temporaryExceptions, weekendMode])

  const resetWizard = () => {
    setStep(0)
    setSeveralShifts(true)
    setRotating(false)
    setWeekendMode("rest")
    setScope("employee")
    setTemporaryExceptions(false)

    setCreateFromScratch(true)
    setPlanningName("Planning RH")
    setShiftName("Quart Jour")
    setTimezone("Africa/Abidjan")
    setServiceStart("08:00")
    setServiceEnd("17:00")
    setBreakEnabled(true)
    setBreakStart("12:00")
    setBreakEnd("13:00")
    setWeekendStart("09:00")
    setWeekendEnd("14:00")
    setLateAllowableMinutes("10")
    setEarlyLeaveAllowableMinutes("10")
    setSetupError(null)
  }

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetWizard()
    }
    onOpenChange(nextOpen)
  }

  const handleContinue = () => {
    if (isLastStep) return
    setStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (step === 0) return
    setStep((prev) => prev - 1)
  }

  const openShiftDialog = () => {
    closeDialog(false)
    onOpenCreateShiftDialog()
  }

  const openPlanningDialog = () => {
    closeDialog(false)
    onOpenCreatePlanningDialog()
  }

  const assistantProgress = useMemo(() => {
    if (steps.length <= 1) return 100
    return Math.round((step / (steps.length - 1)) * 100)
  }, [step])

  const completionItems = useMemo(
    () => [
      { label: "Quarts", done: stats.shiftCount > 0, value: stats.shiftCount },
      { label: "Plannings", done: stats.planningCount > 0, value: stats.planningCount },
      {
        label: "Employes attribues",
        done: stats.employeeCount > 0 && stats.assignedEmployeeCount >= stats.employeeCount,
        value: `${stats.assignedEmployeeCount}/${stats.employeeCount}`,
      },
    ],
    [stats.assignedEmployeeCount, stats.employeeCount, stats.planningCount, stats.shiftCount]
  )

  const buildPayload = (): HrQuickAssignPayload | null => {
    setSetupError(null)

    const parsedLate = Number(lateAllowableMinutes.trim())
    const parsedEarly = Number(earlyLeaveAllowableMinutes.trim())
    if (!Number.isInteger(parsedLate) || parsedLate < 0) {
      setSetupError("Le retard tolere doit etre un entier positif.")
      return null
    }
    if (!Number.isInteger(parsedEarly) || parsedEarly < 0) {
      setSetupError("La marge de depart anticipe doit etre un entier positif.")
      return null
    }

    if (createFromScratch) {
      if (!isValidTime24h(serviceStart) || !isValidTime24h(serviceEnd)) {
        setSetupError("Heures de service invalides. Format attendu: HH:MM.")
        return null
      }
      if (breakEnabled) {
        if (!breakStart.trim() || !breakEnd.trim()) {
          setSetupError("Renseignez la pause complete: debut et fin.")
          return null
        }
        if (!isValidTime24h(breakStart) || !isValidTime24h(breakEnd)) {
          setSetupError("Heures de pause invalides. Format attendu: HH:MM.")
          return null
        }
      }
      if (weekendMode === "different") {
        if (!isValidTime24h(weekendStart) || !isValidTime24h(weekendEnd)) {
          setSetupError("Heures week-end invalides. Format attendu: HH:MM.")
          return null
        }
      }
    }

    return {
      scope,
      createFromScratch,
      planningName: planningName.trim(),
      shiftName: shiftName.trim(),
      timezone: timezone.trim(),
      serviceStart: serviceStart.trim(),
      serviceEnd: serviceEnd.trim(),
      breakEnabled,
      breakStart: breakStart.trim(),
      breakEnd: breakEnd.trim(),
      lateAllowableMinutes: parsedLate,
      earlyLeaveAllowableMinutes: parsedEarly,
      weekendMode,
      weekendStart: weekendStart.trim(),
      weekendEnd: weekendEnd.trim(),
      severalShifts,
      rotating,
      temporaryExceptions,
    }
  }

  const runQuickAssign = () => {
    const payload = buildPayload()
    if (!payload) return
    closeDialog(false)
    void onRunQuickAssignFlow(payload)
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="w-[min(96vw,900px)] max-w-[min(96vw,900px)] rounded-[6px] border-white/10 bg-[#2f3138] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#ffd37a]" />
            Assistant RH - Attribution des quarts
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Configurez les horaires comme une creation complete d&apos;emploi du temps, puis attribuez en une fois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-white/10 bg-black/15 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-white/70">
              <span>Avancement assistant</span>
              <span>{assistantProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#7f8cff] transition-all" style={{ width: `${assistantProgress}%` }} />
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-white/55">Etat actuel de la configuration</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {completionItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    item.done
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.08em]">{item.label}</div>
                  <div className="mt-1 font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/70">
            Etape {step + 1}/{steps.length}: {currentQuestion}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#30343d] p-3">
            {step === 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={severalShifts ? "default" : "outline"}
                  className={severalShifts ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setSeveralShifts(true)}
                >
                  Oui
                </Button>
                <Button
                  type="button"
                  variant={!severalShifts ? "default" : "outline"}
                  className={!severalShifts ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setSeveralShifts(false)}
                >
                  Non
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={rotating ? "default" : "outline"}
                  className={rotating ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setRotating(true)}
                >
                  Oui (tournants)
                </Button>
                <Button
                  type="button"
                  variant={!rotating ? "default" : "outline"}
                  className={!rotating ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setRotating(false)}
                >
                  Non (fixes)
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={weekendMode === "rest" ? "default" : "outline"}
                  className={weekendMode === "rest" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setWeekendMode("rest")}
                >
                  Repos
                </Button>
                <Button
                  type="button"
                  variant={weekendMode === "same" ? "default" : "outline"}
                  className={weekendMode === "same" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setWeekendMode("same")}
                >
                  Meme horaires
                </Button>
                <Button
                  type="button"
                  variant={weekendMode === "different" ? "default" : "outline"}
                  className={weekendMode === "different" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setWeekendMode("different")}
                >
                  Horaires differents
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scope === "employee" ? "default" : "outline"}
                  className={scope === "employee" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setScope("employee")}
                >
                  Employes
                </Button>
                <Button
                  type="button"
                  variant={scope === "department" ? "default" : "outline"}
                  className={scope === "department" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setScope("department")}
                >
                  Departements
                </Button>
              </div>
            )}

            {step === 4 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={temporaryExceptions ? "default" : "outline"}
                  className={temporaryExceptions ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setTemporaryExceptions(true)}
                >
                  Oui
                </Button>
                <Button
                  type="button"
                  variant={!temporaryExceptions ? "default" : "outline"}
                  className={!temporaryExceptions ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setTemporaryExceptions(false)}
                >
                  Non
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#30343d] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-widest text-white/65">
                Configuration creation a partir de zero
              </p>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <Switch checked={createFromScratch} onCheckedChange={setCreateFromScratch} />
                Creer un nouveau planning
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Nom du planning</p>
                <Input value={planningName} onChange={(event) => setPlanningName(event.target.value)} className="border-white/10 bg-black/20 text-white" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Nom du quart</p>
                <Input value={shiftName} onChange={(event) => setShiftName(event.target.value)} className="border-white/10 bg-black/20 text-white" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Fuseau horaire</p>
                <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="border-white/10 bg-black/20 text-white" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Retard tolere (minutes)</p>
                <Input
                  type="number"
                  min={0}
                  value={lateAllowableMinutes}
                  onChange={(event) => setLateAllowableMinutes(event.target.value)}
                  className="border-white/10 bg-black/20 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Debut service</p>
                <Input
                  type="time"
                  value={serviceStart}
                  onChange={(event) => setServiceStart(event.target.value)}
                  className="border-white/10 bg-black/20 text-white"
                  disabled={!createFromScratch}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Fin service</p>
                <Input
                  type="time"
                  value={serviceEnd}
                  onChange={(event) => setServiceEnd(event.target.value)}
                  className="border-white/10 bg-black/20 text-white"
                  disabled={!createFromScratch}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Depart anticipe tolere (minutes)</p>
                <Input
                  type="number"
                  min={0}
                  value={earlyLeaveAllowableMinutes}
                  onChange={(event) => setEarlyLeaveAllowableMinutes(event.target.value)}
                  className="border-white/10 bg-black/20 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white/65">Pause</p>
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <Switch checked={breakEnabled} onCheckedChange={setBreakEnabled} />
                  Activer la pause
                </label>
              </div>
            </div>

            {breakEnabled ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs text-white/65">Debut pause</p>
                  <Input
                    type="time"
                    value={breakStart}
                    onChange={(event) => setBreakStart(event.target.value)}
                    className="border-white/10 bg-black/20 text-white"
                    disabled={!createFromScratch}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-white/65">Fin pause</p>
                  <Input
                    type="time"
                    value={breakEnd}
                    onChange={(event) => setBreakEnd(event.target.value)}
                    className="border-white/10 bg-black/20 text-white"
                    disabled={!createFromScratch}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-white/65">Mode week-end</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={weekendMode === "rest" ? "default" : "outline"}
                  className={weekendMode === "rest" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setWeekendMode("rest")}
                  disabled={!createFromScratch}
                >
                  Repos
                </Button>
                <Button
                  type="button"
                  variant={weekendMode === "same" ? "default" : "outline"}
                  className={weekendMode === "same" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setWeekendMode("same")}
                  disabled={!createFromScratch}
                >
                  Meme horaires
                </Button>
                <Button
                  type="button"
                  variant={weekendMode === "different" ? "default" : "outline"}
                  className={weekendMode === "different" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                  onClick={() => setWeekendMode("different")}
                  disabled={!createFromScratch}
                >
                  Horaires differents
                </Button>
              </div>
            </div>

            {weekendMode === "different" ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs text-white/65">Debut week-end</p>
                  <Input
                    type="time"
                    value={weekendStart}
                    onChange={(event) => setWeekendStart(event.target.value)}
                    className="border-white/10 bg-black/20 text-white"
                    disabled={!createFromScratch}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-white/65">Fin week-end</p>
                  <Input
                    type="time"
                    value={weekendEnd}
                    onChange={(event) => setWeekendEnd(event.target.value)}
                    className="border-white/10 bg-black/20 text-white"
                    disabled={!createFromScratch}
                  />
                </div>
              </div>
            ) : null}

            {!createFromScratch ? (
              <p className="mt-3 text-xs text-[#ffe5a7]">
                Mode reutilisation active: l&apos;assistant attribuera le dernier planning existant.
              </p>
            ) : null}

            {setupError ? (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {setupError}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-widest text-emerald-200/80">Plan recommande</p>
            <div className="space-y-1.5 text-sm text-emerald-100">
              {recommendations.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={handleBack}
            disabled={step === 0 || isPreparingAssign}
          >
            Precedent
          </Button>
          {!isLastStep ? (
            <Button type="button" onClick={handleContinue} disabled={isPreparingAssign}>
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            className="bg-[#ffd37a] text-[#2a2110] hover:bg-[#ffe09b]"
            onClick={runQuickAssign}
            disabled={isPreparingAssign}
          >
            {isPreparingAssign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Attribution express
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#7f8cff]/35 bg-[#7f8cff]/12 text-[#d7dcff] hover:bg-[#7f8cff]/20"
            onClick={openPlanningDialog}
            disabled={isPreparingAssign}
          >
            Mode manuel: planning
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#5cc0a8]/40 bg-[#5cc0a8]/10 text-[#b9f2e4] hover:bg-[#5cc0a8]/20"
            onClick={openShiftDialog}
            disabled={isPreparingAssign}
          >
            Mode manuel: quart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
