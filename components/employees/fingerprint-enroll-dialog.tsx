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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Fingerprint,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"
import type { GatewayReaderItem, EnrollFingerprintResponse } from "@/lib/api/employees"

type FingerprintEnrollDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  employeeId: number
  existingFingerprints: Array<{ id?: number; finger_index: number; template: string }>
  readers: GatewayReaderItem[]
  onEnroll: (employeeId: number, fingerIndex: number, devIndex: string) => Promise<EnrollFingerprintResponse>
}

// Hikvision finger index mapping
const FINGERS = [
  { index: 1, label: "Pouce G", labelEn: "Left Thumb", hand: "left" as const, pos: 0 },
  { index: 2, label: "Index G", labelEn: "Left Index", hand: "left" as const, pos: 1 },
  { index: 3, label: "Majeur G", labelEn: "Left Middle", hand: "left" as const, pos: 2 },
  { index: 4, label: "Annulaire G", labelEn: "Left Ring", hand: "left" as const, pos: 3 },
  { index: 5, label: "Auriculaire G", labelEn: "Left Pinky", hand: "left" as const, pos: 4 },
  { index: 6, label: "Pouce D", labelEn: "Right Thumb", hand: "right" as const, pos: 0 },
  { index: 7, label: "Index D", labelEn: "Right Index", hand: "right" as const, pos: 1 },
  { index: 8, label: "Majeur D", labelEn: "Right Middle", hand: "right" as const, pos: 2 },
  { index: 9, label: "Annulaire D", labelEn: "Right Ring", hand: "right" as const, pos: 3 },
  { index: 10, label: "Auriculaire D", labelEn: "Right Pinky", hand: "right" as const, pos: 4 },
]

type EnrollState = "idle" | "enrolling" | "success" | "error"

export function FingerprintEnrollDialog({
  open,
  onOpenChange,
  employeeName,
  employeeId,
  existingFingerprints,
  readers,
  onEnroll,
}: FingerprintEnrollDialogProps) {
  const { t, locale } = useI18n()
  const [selectedFingerIndex, setSelectedFingerIndex] = useState<number>(1)
  const [selectedReader, setSelectedReader] = useState<string>(readers[0]?.dev_index ?? "")
  const [enrollState, setEnrollState] = useState<EnrollState>("idle")
  const [enrollResult, setEnrollResult] = useState<EnrollFingerprintResponse | null>(null)
  const [enrollError, setEnrollError] = useState("")

  const enrolledIndexes = new Set(existingFingerprints.map((f) => f.finger_index))
  const onlineReaders = readers.filter((r) => r.status === "online" || r.status === "active")

  const handleEnroll = useCallback(async () => {
    if (!selectedReader || !selectedFingerIndex) return
    setEnrollState("enrolling")
    setEnrollResult(null)
    setEnrollError("")
    try {
      const result = await onEnroll(employeeId, selectedFingerIndex, selectedReader)
      setEnrollResult(result)
      setEnrollState("success")
      const fingerLabel = locale === "fr"
        ? FINGERS.find((f) => f.index === selectedFingerIndex)?.label
        : FINGERS.find((f) => f.index === selectedFingerIndex)?.labelEn
      toast.success(t.biometrics.fingerprintCaptured, {
        description: `${fingerLabel} — ${result.success_count}/${result.target_readers_count} lecteur(s) OK`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setEnrollError(msg)
      setEnrollState("error")
    }
  }, [selectedReader, selectedFingerIndex, employeeId, onEnroll, t, locale])

  const successRate = enrollResult
    ? Math.round((enrollResult.success_count / Math.max(enrollResult.target_readers_count, 1)) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Fingerprint className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{t.biometrics.enrollFingerprint}</DialogTitle>
              <DialogDescription>{employeeName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Hand visual selector */}
        <div className="space-y-2">
          <Label>{t.biometrics.selectFinger}</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["left", "right"] as const).map((hand) => {
              const handFingers = FINGERS.filter((f) => f.hand === hand)
              const handLabel = hand === "left" ? t.biometrics.leftHand : t.biometrics.rightHand
              return (
                <div key={hand} className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {handLabel}
                  </p>
                  <div className="flex items-end justify-center gap-1">
                    {handFingers.map((f) => {
                      const isEnrolled = enrolledIndexes.has(f.index)
                      const isSelected = selectedFingerIndex === f.index
                      // Heights to simulate finger shape
                      const heights = ["h-8", "h-10", "h-11", "h-9", "h-7"]
                      return (
                        <button
                          key={f.index}
                          type="button"
                          onClick={() => { setSelectedFingerIndex(f.index); setEnrollState("idle"); setEnrollResult(null) }}
                          title={locale === "fr" ? f.label : f.labelEn}
                          className={cn(
                            "w-7 rounded-t-full border-2 transition-all",
                            heights[f.pos],
                            isSelected
                              ? "border-primary bg-primary shadow-[0_0_10px_rgba(78,155,255,0.5)]"
                              : isEnrolled
                                ? "border-emerald-500 bg-emerald-500/20"
                                : "border-border/60 bg-secondary/50 hover:border-primary/50 hover:bg-primary/10"
                          )}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-center gap-1">
                    {handFingers.map((f) => (
                      <span
                        key={f.index}
                        className={cn(
                          "text-center text-[8px]",
                          selectedFingerIndex === f.index ? "font-bold text-primary" : "text-muted-foreground"
                        )}
                        style={{ width: "28px" }}
                      >
                        {locale === "fr" ? f.label.replace(/ [GD]$/, "") : f.labelEn.split(" ").slice(1).join(" ")}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {selectedFingerIndex && (
            <p className="text-center text-xs text-muted-foreground">
              Sélectionné:{" "}
              <span className="font-semibold text-foreground">
                {locale === "fr"
                  ? FINGERS.find((f) => f.index === selectedFingerIndex)?.label
                  : FINGERS.find((f) => f.index === selectedFingerIndex)?.labelEn}
              </span>
              {enrolledIndexes.has(selectedFingerIndex) && (
                <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                  Déjà enregistré
                </Badge>
              )}
            </p>
          )}
        </div>

        {/* Reader selector */}
        <div className="space-y-1.5">
          <Label>{t.biometrics.selectReader}</Label>
          {onlineReaders.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              {t.biometrics.noReaders}
            </div>
          ) : (
            <Select value={selectedReader} onValueChange={setSelectedReader}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {onlineReaders.map((r) => (
                  <SelectItem key={r.dev_index} value={r.dev_index}>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {r.name || r.dev_index}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Status area */}
        {enrollState !== "idle" && (
          <div
            className={cn(
              "rounded-xl border p-4 space-y-3 transition-all",
              enrollState === "enrolling" && "border-primary/40 bg-primary/8",
              enrollState === "success" && "border-emerald-500/40 bg-emerald-500/8",
              enrollState === "error" && "border-destructive/40 bg-destructive/8"
            )}
          >
            {enrollState === "enrolling" && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-semibold text-primary">{t.biometrics.enrolling}</p>
                  <p className="text-xs text-muted-foreground">Placez le doigt sur le lecteur...</p>
                </div>
              </div>
            )}
            {enrollState === "success" && enrollResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {t.biometrics.fingerprintCaptured}
                  </p>
                </div>
                <Progress value={successRate} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-center">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{enrollResult.success_count}</p>
                    <p className="text-muted-foreground">{t.biometrics.successCount}</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 px-2 py-1.5 text-center">
                    <p className="font-bold text-destructive">{enrollResult.error_count}</p>
                    <p className="text-muted-foreground">{t.biometrics.errorCount}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 px-2 py-1.5 text-center">
                    <p className="font-bold text-foreground">{enrollResult.target_readers_count}</p>
                    <p className="text-muted-foreground">Total</p>
                  </div>
                </div>
                {enrollResult.finger_quality !== null && (
                  <p className="text-[11px] text-muted-foreground">
                    {t.biometrics.quality}: {enrollResult.finger_quality}%
                  </p>
                )}
              </div>
            )}
            {enrollState === "error" && (
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{enrollError || t.common.error}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
          <Button
            disabled={!selectedReader || !selectedFingerIndex || enrollState === "enrolling" || onlineReaders.length === 0}
            onClick={handleEnroll}
            className="gap-2"
          >
            {enrollState === "enrolling" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {enrollState === "enrolling" ? t.biometrics.enrolling : t.biometrics.startEnrollment}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
