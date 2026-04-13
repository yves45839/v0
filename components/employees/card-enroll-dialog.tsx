"use client"

import { useState, useCallback, useRef } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle,
  Radio,
  AlertTriangle,
  Hash,
  Keyboard,
  Zap,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"
import type { GatewayReaderItem } from "@/lib/api/employees"

type CardEnrollDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  existingCards: Array<{ card_no: string; card_type: string }>
  readers: GatewayReaderItem[]
  onScan: (devIndex: string, timeoutSeconds?: number) => Promise<string>
  onSave: (cardNo: string, cardType: string) => Promise<void>
}

const CARD_TYPES = [
  { value: "normal", label: "Normal" },
  { value: "vip", label: "VIP" },
  { value: "guest", label: "Invité / Guest" },
  { value: "patrol", label: "Ronde / Patrol" },
  { value: "super", label: "Super card" },
]

type ScanState = "idle" | "scanning" | "success" | "error"

export function CardEnrollDialog({
  open,
  onOpenChange,
  employeeName,
  existingCards,
  readers,
  onScan,
  onSave,
}: CardEnrollDialogProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<"physical" | "manual">("physical")
  const [selectedReader, setSelectedReader] = useState<string>(readers[0]?.dev_index ?? "")
  const [scanState, setScanState] = useState<ScanState>("idle")
  const [scannedCard, setScannedCard] = useState("")
  const [scanError, setScanError] = useState("")
  const [manualCard, setManualCard] = useState("")
  const [cardType, setCardType] = useState("normal")
  const [isSaving, setIsSaving] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const onlineReaders = readers.filter((r) => r.status === "online" || r.status === "active")

  const handleScan = useCallback(async () => {
    if (!selectedReader) return
    setScanState("scanning")
    setScanError("")
    setScannedCard("")

    try {
      const cardNo = await onScan(selectedReader, 20)
      setScannedCard(cardNo)
      setScanState("success")
      toast.success(t.biometrics.cardDetected, { description: cardNo })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setScanError(msg)
      setScanState("error")
    }
  }, [selectedReader, onScan, t])

  const handleSave = useCallback(async () => {
    const cardNo = tab === "physical" ? scannedCard : manualCard.trim()
    if (!cardNo) return
    setIsSaving(true)
    try {
      await onSave(cardNo, cardType)
      toast.success(t.common.success, { description: `Carte ${cardNo} enregistrée` })
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(t.common.error, { description: msg })
    } finally {
      setIsSaving(false)
    }
  }, [tab, scannedCard, manualCard, cardType, onSave, onOpenChange, t])

  const activeCard = tab === "physical" ? scannedCard : manualCard.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{t.biometrics.enrollCard}</DialogTitle>
              <DialogDescription>{employeeName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {existingCards.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cartes existantes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {existingCards.map((c) => (
                <Badge key={c.card_no} variant="secondary" className="font-mono text-[11px]">
                  {c.card_no}
                  <span className="ml-1 text-muted-foreground">({c.card_type})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "physical" | "manual"); setScanState("idle"); setScannedCard(""); setScanError("") }}>
          <TabsList className="w-full">
            <TabsTrigger value="physical" className="flex-1 gap-2">
              <Radio className="h-3.5 w-3.5" />
              {t.biometrics.physicalScan}
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-2">
              <Keyboard className="h-3.5 w-3.5" />
              {t.biometrics.manualEntry}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="physical" className="mt-4 space-y-4">
            {onlineReaders.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                {t.biometrics.noReaders}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>{t.biometrics.selectReader}</Label>
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
                            <span className="text-xs text-muted-foreground">{r.device_type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={cn(
                    "flex h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
                    scanState === "idle" && "border-border/60 bg-secondary/20",
                    scanState === "scanning" && "border-primary/60 bg-primary/8 animate-pulse",
                    scanState === "success" && "border-emerald-500/60 bg-emerald-500/8",
                    scanState === "error" && "border-destructive/60 bg-destructive/8"
                  )}
                >
                  {scanState === "idle" && (
                    <div className="text-center text-muted-foreground">
                      <CreditCard className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      <p className="text-xs">{t.biometrics.startScan}</p>
                    </div>
                  )}
                  {scanState === "scanning" && (
                    <div className="text-center text-primary">
                      <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
                      <p className="text-xs font-medium">{t.biometrics.scanning}</p>
                      <p className="text-[11px] text-muted-foreground">Approchez la carte du lecteur...</p>
                    </div>
                  )}
                  {scanState === "success" && (
                    <div className="text-center text-emerald-500">
                      <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm font-bold font-mono">{scannedCard}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{t.biometrics.cardDetected}</p>
                    </div>
                  )}
                  {scanState === "error" && (
                    <div className="text-center text-destructive">
                      <XCircle className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-xs font-medium">{scanError || t.common.error}</p>
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setScanState("idle")}>
                        {t.common.retry}
                      </Button>
                    </div>
                  )}
                </div>

                {scanState === "idle" || scanState === "error" ? (
                  <Button
                    className="w-full gap-2"
                    disabled={!selectedReader || scanState === "scanning"}
                    onClick={handleScan}
                  >
                    <Zap className="h-4 w-4" />
                    {t.biometrics.startScan}
                  </Button>
                ) : scanState === "scanning" ? (
                  <Button variant="outline" className="w-full" onClick={() => setScanState("idle")}>
                    {t.common.cancel}
                  </Button>
                ) : null}
              </>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="manualCardNo">
                <Hash className="mr-1 inline h-3.5 w-3.5" />
                {t.biometrics.cardNumber} *
              </Label>
              <Input
                id="manualCardNo"
                value={manualCard}
                onChange={(e) => setManualCard(e.target.value)}
                placeholder="Ex: 0012345678"
                className="font-mono"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-1.5">
          <Label>{t.biometrics.cardType}</Label>
          <Select value={cardType} onValueChange={setCardType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARD_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={!activeCard || isSaving}
            onClick={handleSave}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t.biometrics.saveCard}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
