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
  Cpu,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Wifi,
  WifiOff,
  Server,
  Plus,
  AlertTriangle,
  Shield,
  Hash,
  Globe,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { toast } from "sonner"

type DeviceInfo = {
  model: string
  serialNumber: string
  firmwareVersion: string
  deviceType: string
  macAddress: string
}

type AddDeviceByIpDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenants: Array<{ id: number; code: string; name: string }>
  defaultTenantCode?: string
  onDiscover: (ip: string, port: number, protocol: string, password: string) => Promise<DeviceInfo>
  onRegister: (payload: {
    ipAddress: string
    port: number
    serialNumber: string
    name: string
    deviceType: string
    tenantCode: string
    ehomeKey: string
    devicePassword: string
  }) => Promise<void>
}

type DiscoverState = "idle" | "discovering" | "found" | "error"

const DEVICE_TYPES = [
  { value: "door_controller", label: "Contrôleur de porte" },
  { value: "reader", label: "Lecteur de carte" },
  { value: "turnstile", label: "Tourniquet" },
  { value: "fingerprint", label: "Lecteur biométrique" },
  { value: "face_reader", label: "Lecteur facial" },
  { value: "camera", label: "Caméra IP" },
]

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false
  return ip.split(".").every((n) => Number(n) >= 0 && Number(n) <= 255)
}

export function AddDeviceByIpDialog({
  open,
  onOpenChange,
  tenants,
  defaultTenantCode = "",
  onDiscover,
  onRegister,
}: AddDeviceByIpDialogProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<"discover" | "manual">("discover")

  // Discover tab state
  const [ipAddress, setIpAddress] = useState("")
  const [port, setPort] = useState(80)
  const [protocol, setProtocol] = useState("http")
  const [discoverPassword, setDiscoverPassword] = useState("")
  const [discoverState, setDiscoverState] = useState<DiscoverState>("idle")
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [discoverError, setDiscoverError] = useState("")

  // Common registration fields
  const [deviceName, setDeviceName] = useState("")
  const [deviceType, setDeviceType] = useState("door_controller")
  const [tenantCode, setTenantCode] = useState(defaultTenantCode || tenants[0]?.code || "")
  const [ehomeKey, setEhomeKey] = useState("0123456789ABCDEF0123456789ABCDEF")
  const [registrationPassword, setRegistrationPassword] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)

  // Manual fields
  const [manualIp, setManualIp] = useState("")
  const [manualSerial, setManualSerial] = useState("")

  const ipError = ipAddress && !isValidIp(ipAddress)
  const manualIpError = manualIp && !isValidIp(manualIp)

  const handleDiscover = useCallback(async () => {
    if (!isValidIp(ipAddress)) {
      toast.error(t.devices.invalidIp)
      return
    }
    setDiscoverState("discovering")
    setDeviceInfo(null)
    setDiscoverError("")
    setDeviceName("")

    try {
      const info = await onDiscover(ipAddress, port, protocol, discoverPassword)
      setDeviceInfo(info)
      setDiscoverState("found")
      setDeviceName(info.model || `Appareil ${ipAddress}`)
      setDeviceType(info.deviceType || "door_controller")
      toast.success(t.devices.deviceFound, { description: `${info.model} — ${info.serialNumber}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setDiscoverError(msg)
      setDiscoverState("error")
    }
  }, [ipAddress, port, protocol, discoverPassword, onDiscover, t])

  const handleRegister = useCallback(async () => {
    const ip = tab === "discover" ? ipAddress : manualIp
    const serial = tab === "discover" ? (deviceInfo?.serialNumber ?? "") : manualSerial.trim()

    if (!isValidIp(ip)) {
      toast.error(t.devices.invalidIp)
      return
    }
    if (!deviceName.trim()) {
      toast.error(t.common.required, { description: t.devices.deviceName })
      return
    }

    setIsRegistering(true)
    try {
      await onRegister({
        ipAddress: ip,
        port,
        serialNumber: serial,
        name: deviceName.trim(),
        deviceType,
        tenantCode,
        ehomeKey,
        devicePassword: registrationPassword,
      })
      toast.success(t.devices.deviceRegistered, { description: `${deviceName} — ${ip}` })
      onOpenChange(false)
      setIpAddress("")
      setDeviceInfo(null)
      setDiscoverState("idle")
      setManualIp("")
      setManualSerial("")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(t.common.error, { description: msg })
    } finally {
      setIsRegistering(false)
    }
  }, [
    tab, ipAddress, manualIp, deviceInfo, manualSerial,
    deviceName, deviceType, tenantCode, ehomeKey, registrationPassword,
    port, onRegister, onOpenChange, t
  ])

  const canRegister =
    (!tab || tab === "discover"
      ? isValidIp(ipAddress) && (discoverState === "found" || discoverState === "idle")
      : isValidIp(manualIp)) && deviceName.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{t.devices.addByIp}</DialogTitle>
              <DialogDescription>{t.devices.addByIpDesc}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "discover" | "manual")}>
          <TabsList className="w-full">
            <TabsTrigger value="discover" className="flex-1 gap-2">
              <Search className="h-3.5 w-3.5" />
              Découverte auto
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-2">
              <Hash className="h-3.5 w-3.5" />
              Saisie manuelle
            </TabsTrigger>
          </TabsList>

          {/* Discover tab */}
          <TabsContent value="discover" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ipDiscover">
                  <Globe className="mr-1 inline h-3 w-3" />
                  {t.devices.ipAddress} *
                </Label>
                <Input
                  id="ipDiscover"
                  value={ipAddress}
                  onChange={(e) => { setIpAddress(e.target.value); setDiscoverState("idle"); setDeviceInfo(null) }}
                  placeholder={t.devices.ipAddressPlaceholder}
                  className={cn("font-mono", ipError && "border-destructive focus-visible:ring-destructive")}
                />
                {ipError && <p className="text-[11px] text-destructive">{t.devices.invalidIp}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portDiscover">{t.devices.port}</Label>
                <Input
                  id="portDiscover"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.devices.protocol}</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discPassword">
                  <Shield className="mr-1 inline h-3 w-3" />
                  {t.devices.devicePassword}
                </Label>
                <Input
                  id="discPassword"
                  type="password"
                  value={discoverPassword}
                  onChange={(e) => setDiscoverPassword(e.target.value)}
                  placeholder="Mot de passe admin"
                />
              </div>
            </div>

            <Button
              className="w-full gap-2"
              disabled={!isValidIp(ipAddress) || discoverState === "discovering"}
              onClick={handleDiscover}
            >
              {discoverState === "discovering" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {discoverState === "discovering" ? t.devices.discovering : t.devices.discover}
            </Button>

            {/* Discovery result */}
            {discoverState === "found" && deviceInfo && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/8 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {t.devices.connectionSuccess}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">{t.devices.deviceModel}</p>
                    <p className="font-medium text-foreground">{deviceInfo.model || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.devices.serialNumber}</p>
                    <p className="font-mono font-medium text-foreground">{deviceInfo.serialNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.devices.firmwareVersion}</p>
                    <p className="font-medium text-foreground">{deviceInfo.firmwareVersion || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">MAC</p>
                    <p className="font-mono font-medium text-foreground">{deviceInfo.macAddress || "—"}</p>
                  </div>
                </div>
              </div>
            )}
            {discoverState === "error" && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/8 p-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">{t.devices.connectionFailed}</p>
                  <p className="text-xs text-muted-foreground">{discoverError}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Manual tab */}
          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Saisie manuelle — Vérifiez les informations avant d'enregistrer.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="manualIpField">
                  <Globe className="mr-1 inline h-3 w-3" />
                  {t.devices.ipAddress} *
                </Label>
                <Input
                  id="manualIpField"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder={t.devices.ipAddressPlaceholder}
                  className={cn("font-mono", manualIpError && "border-destructive")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manualSerial">{t.devices.serialNumber}</Label>
                <Input
                  id="manualSerial"
                  value={manualSerial}
                  onChange={(e) => setManualSerial(e.target.value)}
                  placeholder="SN-XXXXXXXXX"
                  className="font-mono"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Common registration fields */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Server className="mb-0.5 mr-1 inline h-3 w-3" />
            Informations d'enregistrement
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="deviceName">{t.devices.deviceName} *</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Ex: Lecteur Entrée Hall A"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.devices.deviceType}</Label>
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
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
              <Label htmlFor="ehomeKey">{t.devices.ehomeKey}</Label>
              <Input
                id="ehomeKey"
                value={ehomeKey}
                onChange={(e) => setEhomeKey(e.target.value)}
                placeholder="32 caractères hex"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="regPassword">
                <Shield className="mr-1 inline h-3 w-3" />
                {t.devices.devicePassword}
              </Label>
              <Input
                id="regPassword"
                type="password"
                value={registrationPassword}
                onChange={(e) => setRegistrationPassword(e.target.value)}
                placeholder="Mot de passe admin"
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
