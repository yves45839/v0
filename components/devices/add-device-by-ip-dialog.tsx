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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Cpu,
  Loader2,
  Server,
  Plus,
  AlertTriangle,
  Shield,
  Hash,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { devicesPageDict } from "@/lib/i18n/pages/devices-page"
import { toast } from "sonner"

type AddDeviceByIpDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenants: Array<{ id: number; code: string; name: string }>
  defaultTenantCode?: string
  onRegister: (payload: {
    serialNumber: string
    name: string
    deviceType: string
    tenantCode: string
    ehomeKey: string
    devicePassword: string
  }) => Promise<void>
}

const DEVICE_TYPE_VALUES = [
  "door_controller",
  "reader",
  "turnstile",
  "fingerprint",
  "face_reader",
  "camera",
] as const

/**
 * Onboarding manuel d'un appareil via POST /api/devices/onboard/.
 * L'utilisateur saisit lui-même le numéro de série et les identifiants ;
 * il n'y a pas de découverte réseau côté backend.
 */
export function AddDeviceByIpDialog({
  open,
  onOpenChange,
  tenants,
  defaultTenantCode = "",
  onRegister,
}: AddDeviceByIpDialogProps) {
  const { t, locale } = useI18n()
  const tr = devicesPageDict[locale]

  const [serialNumber, setSerialNumber] = useState("")
  const [deviceName, setDeviceName] = useState("")
  const [deviceType, setDeviceType] = useState("door_controller")
  const [tenantCode, setTenantCode] = useState(defaultTenantCode || tenants[0]?.code || "")
  const [ehomeKey, setEhomeKey] = useState("0123456789ABCDEF0123456789ABCDEF")
  const [registrationPassword, setRegistrationPassword] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)

  const handleRegister = useCallback(async () => {
    const serial = serialNumber.trim()
    if (!serial) {
      toast.error(t.common.required, { description: t.devices.serialNumber })
      return
    }
    if (!deviceName.trim()) {
      toast.error(t.common.required, { description: t.devices.deviceName })
      return
    }
    if (!tenantCode.trim()) {
      toast.error(t.common.required, { description: t.devices.tenantCode })
      return
    }
    if (!ehomeKey.trim()) {
      toast.error(t.common.required, { description: t.devices.ehomeKey })
      return
    }
    if (!registrationPassword.trim()) {
      toast.error(t.common.required, { description: t.devices.devicePassword })
      return
    }

    setIsRegistering(true)
    try {
      await onRegister({
        serialNumber: serial,
        name: deviceName.trim(),
        deviceType,
        tenantCode: tenantCode.trim(),
        ehomeKey: ehomeKey.trim(),
        devicePassword: registrationPassword,
      })
      toast.success(t.devices.deviceRegistered, { description: `${deviceName} — ${serial}` })
      onOpenChange(false)
      setSerialNumber("")
      setDeviceName("")
      setRegistrationPassword("")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(t.common.error, { description: msg })
    } finally {
      setIsRegistering(false)
    }
  }, [
    serialNumber, deviceName, deviceType, tenantCode, ehomeKey,
    registrationPassword, onRegister, onOpenChange, t,
  ])

  const canRegister =
    serialNumber.trim().length > 0 &&
    deviceName.trim().length > 0 &&
    tenantCode.trim().length > 0 &&
    ehomeKey.trim().length > 0 &&
    registrationPassword.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{t.devices.registerDevice}</DialogTitle>
              <DialogDescription>
                {tr.manualDialogDesc}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
          {tr.manualWarning}
        </div>

        <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Server className="mb-0.5 mr-1 inline h-3 w-3" />
            {tr.registrationInfo}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="manualSerial">
                <Hash className="mr-1 inline h-3 w-3" />
                {t.devices.serialNumber} *
              </Label>
              <Input
                id="manualSerial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="SN-XXXXXXXXX"
                className="font-mono"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="deviceName">{t.devices.deviceName} *</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={tr.deviceNamePlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.devices.deviceType}</Label>
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tr.deviceTypes[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.devices.tenantCode}</Label>
              {tenants.length > 0 ? (
                <Select value={tenantCode} onValueChange={setTenantCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tn) => (
                      <SelectItem key={tn.id} value={tn.code}>
                        {tn.code} — {tn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="HQ-CASA"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ehomeKey">{t.devices.ehomeKey} *</Label>
              <Input
                id="ehomeKey"
                value={ehomeKey}
                onChange={(e) => setEhomeKey(e.target.value)}
                placeholder={tr.ehomeKeyPlaceholder}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="regPassword">
                <Shield className="mr-1 inline h-3 w-3" />
                {t.devices.devicePassword} *
              </Label>
              <Input
                id="regPassword"
                type="password"
                value={registrationPassword}
                onChange={(e) => setRegistrationPassword(e.target.value)}
                placeholder={tr.adminPasswordPlaceholder}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={!canRegister || isRegistering}
            onClick={handleRegister}
            className="gap-2"
          >
            {isRegistering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isRegistering ? t.devices.registering : t.devices.registerDevice}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
