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
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
  Scan,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  User,
  Zap,
  ImagePlus,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"
import type { GatewayReaderItem, EnrollFaceResponse } from "@/lib/api/employees"

type FaceEnrollDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  employeeId: number
  hasFace: boolean
  readers: GatewayReaderItem[]
  onEnrollViaReader: (employeeId: number, devIndex: string) => Promise<EnrollFaceResponse>
  onUploadPhoto: (employeeId: number, base64Photo: string) => Promise<void>
}

type EnrollState = "idle" | "capturing" | "success" | "error"

const MAX_PHOTO_BYTES = 200 * 1024 // 200 KB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip data:image/...;base64, prefix
      const base64 = result.split(",")[1] ?? result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("Erreur lecture fichier"))
    reader.readAsDataURL(file)
  })
}

export function FaceEnrollDialog({
  open,
  onOpenChange,
  employeeName,
  employeeId,
  hasFace,
  readers,
  onEnrollViaReader,
  onUploadPhoto,
}: FaceEnrollDialogProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<"reader" | "upload">("reader")
  const [selectedReader, setSelectedReader] = useState<string>(readers[0]?.dev_index ?? "")
  const [enrollState, setEnrollState] = useState<EnrollState>("idle")
  const [enrollResult, setEnrollResult] = useState<EnrollFaceResponse | null>(null)
  const [enrollError, setEnrollError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onlineReaders = readers.filter(
    (r) => r.status === "online" || r.status === "active"
  )

  const handleEnrollViaReader = useCallback(async () => {
    if (!selectedReader) return
    setEnrollState("capturing")
    setEnrollResult(null)
    setEnrollError("")
    try {
      const result = await onEnrollViaReader(employeeId, selectedReader)
      setEnrollResult(result)
      setEnrollState("success")
      toast.success(t.biometrics.faceRegistered, {
        description: `${result.success_count}/${result.target_readers_count} lecteur(s) OK`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setEnrollError(msg)
      setEnrollState("error")
    }
  }, [selectedReader, employeeId, onEnrollViaReader, t])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Format invalide", { description: "Sélectionnez une image (JPG, PNG, WebP)" })
      return
    }
    if (file.size > MAX_PHOTO_BYTES * 10) {
      toast.warning("Fichier volumineux", { description: "L'image sera compressée automatiquement" })
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      const base64 = await fileToBase64(selectedFile)
      await onUploadPhoto(employeeId, base64)
      toast.success(t.biometrics.faceRegistered, { description: employeeName })
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(t.common.error, { description: msg })
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, employeeId, onUploadPhoto, employeeName, onOpenChange, t])

  const successRate = enrollResult
    ? Math.round((enrollResult.success_count / Math.max(enrollResult.target_readers_count, 1)) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Scan className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{t.biometrics.enrollFace}</DialogTitle>
              <DialogDescription>
                {employeeName}
                {hasFace && (
                  <span className="ml-2 text-xs text-emerald-500">✓ Visage déjà enregistré</span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "reader" | "upload"); setEnrollState("idle"); setEnrollResult(null) }}>
          <TabsList className="w-full">
            <TabsTrigger value="reader" className="flex-1 gap-2">
              <Scan className="h-3.5 w-3.5" />
              {t.biometrics.viaReader}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 gap-2">
              <ImagePlus className="h-3.5 w-3.5" />
              {t.biometrics.uploadPhoto}
            </TabsTrigger>
          </TabsList>

          {/* Via Reader */}
          <TabsContent value="reader" className="mt-4 space-y-4">
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

                {/* Status area */}
                <div
                  className={cn(
                    "flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
                    enrollState === "idle" && "border-border/60 bg-secondary/20",
                    enrollState === "capturing" && "border-primary/60 bg-primary/8 animate-pulse",
                    enrollState === "success" && "border-emerald-500/60 bg-emerald-500/8",
                    enrollState === "error" && "border-destructive/60 bg-destructive/8"
                  )}
                >
                  {enrollState === "idle" && (
                    <div className="text-center text-muted-foreground">
                      <User className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      <p className="text-xs">{t.biometrics.startCapture}</p>
                      <p className="text-[11px] text-muted-foreground/60">L'employé doit se présenter devant le lecteur</p>
                    </div>
                  )}
                  {enrollState === "capturing" && (
                    <div className="text-center text-primary">
                      <Loader2 className="mx-auto mb-2 h-10 w-10 animate-spin" />
                      <p className="text-sm font-medium">{t.biometrics.capturing}</p>
                      <p className="text-[11px] text-muted-foreground">Placez-vous devant le lecteur facial...</p>
                    </div>
                  )}
                  {enrollState === "success" && enrollResult && (
                    <div className="w-full space-y-2 px-4 text-center">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {t.biometrics.faceRegistered}
                      </p>
                      <Progress value={successRate} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground">
                        {enrollResult.success_count}/{enrollResult.target_readers_count} lecteur(s)
                      </p>
                    </div>
                  )}
                  {enrollState === "error" && (
                    <div className="text-center text-destructive">
                      <XCircle className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-xs font-medium">{enrollError || t.common.error}</p>
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setEnrollState("idle")}>
                        {t.common.retry}
                      </Button>
                    </div>
                  )}
                </div>

                {enrollResult && enrollResult.results.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.biometrics.results}
                    </p>
                    {enrollResult.results.map((r) => (
                      <div key={r.dev_index} className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">{r.dev_index}</span>
                        <span className={cn(
                          "font-semibold",
                          r.status === "ok" ? "text-emerald-500" : r.status === "partial" ? "text-amber-400" : "text-destructive"
                        )}>
                          {r.status === "ok" ? "✓ OK" : r.status === "partial" ? "~ Partiel" : "✗ Erreur"}
                          {r.detail && ` — ${r.detail}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Upload photo */}
          <TabsContent value="upload" className="mt-4 space-y-4">
            <div
              className={cn(
                "flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all hover:border-primary/50 hover:bg-primary/5",
                previewUrl ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/20"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="h-full w-full rounded-xl object-cover object-center" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Upload className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium">Glissez ou cliquez pour sélectionner</p>
                  <p className="text-[11px] text-muted-foreground/70">JPG, PNG, WebP — Visage bien éclairé de face</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            {selectedFile && (
              <p className="text-center text-xs text-muted-foreground">
                {selectedFile.name} — {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
          {tab === "reader" ? (
            <Button
              disabled={!selectedReader || enrollState === "capturing" || onlineReaders.length === 0}
              onClick={handleEnrollViaReader}
              className="gap-2"
            >
              {enrollState === "capturing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {enrollState === "capturing" ? t.biometrics.capturing : t.biometrics.startCapture}
            </Button>
          ) : (
            <Button
              disabled={!selectedFile || isUploading}
              onClick={handleUpload}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? t.common.loading : t.biometrics.uploadPhoto}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
