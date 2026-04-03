"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Plus,
  Cpu,
  DoorOpen,
  Fingerprint,
  Radio,
  MoreVertical,
  RefreshCcw,
  Settings,
  Trash2,
  Power,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Activity,
  Zap,
  ExternalLink,
} from "lucide-react"

type Device = {
  id: string
  devIndex: string
  coreDeviceId?: number
  name: string
  type: "door_controller" | "reader" | "turnstile" | "fingerprint"
  model: string
  serialNumber: string
  location: string
  ipAddress: string
  macAddress: string
  status: "online" | "offline" | "warning"
  lastSeen: string
  firmware: string
  connectedUsers: number
  todayEvents: number
}

type GatewayDevice = Record<string, unknown>
type TenantOption = { id: number; code: string; name: string }

const API_BASE_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_BASE_URL ?? "http://localhost:8000"
const API_USERNAME = process.env.NEXT_PUBLIC_EMPLOYEE_API_USERNAME ?? "admin"
const API_PASSWORD = process.env.NEXT_PUBLIC_EMPLOYEE_API_PASSWORD ?? "admin12345"
const RAW_DEVICE_CONFIG_PATH = process.env.NEXT_PUBLIC_DEVICE_CONFIG_PATH ?? "/doc/index.html#/dashboard"
const DEVICE_CONFIG_PATH = RAW_DEVICE_CONFIG_PATH.startsWith("/")
  ? RAW_DEVICE_CONFIG_PATH
  : `/${RAW_DEVICE_CONFIG_PATH}`
const DEVICE_CONFIG_SCHEME =
  (process.env.NEXT_PUBLIC_DEVICE_CONFIG_SCHEME ?? "https").toLowerCase() === "https" ? "https" : "http"

const getConfigHostCandidate = (rawIpAddress: string): string | null => {
  const value = String(rawIpAddress ?? "").trim()
  if (!value || value === "-" || value.toLowerCase() === "n/a") {
    return null
  }
  if (value.includes(":") || value.includes("/")) {
    return null
  }
  return value
}

const normalizeStatus = (value: unknown): Device["status"] => {
  const status = String(value ?? "").toLowerCase()
  if (status.includes("online") || status === "active") return "online"
  if (status.includes("offline") || status === "inactive") return "offline"
  return "warning"
}

const inferDeviceType = (rawModel: string): Device["type"] => {
  const model = rawModel.toLowerCase()
  if (model.includes("finger")) return "fingerprint"
  if (model.includes("turnstile")) return "turnstile"
  if (model.includes("reader")) return "reader"
  return "door_controller"
}

const mapGatewayDevice = (item: GatewayDevice, index: number): Device => {
  const model = String(item.model ?? item.devType ?? item.device_type ?? "")
  const tenantCode = String(item.tenant_code ?? "").trim()
  const status = normalizeStatus(item.status)
  const devIndex = String(item.devIndex ?? item.dev_index ?? item.id ?? `dev-${index}`)

  return {
    id: devIndex,
    devIndex,
    name: String(item.name ?? item.device_name ?? item.devName ?? "Appareil Hikvision"),
    type: inferDeviceType(model),
    model: model || "N/A",
    serialNumber: String(item.serial_number ?? item.sn ?? item.dev_serial ?? "N/A"),
    location: tenantCode ? `Tenant ${tenantCode}` : "Non assigne",
    ipAddress: String(item.ip_address ?? item.ipAddress ?? item.devAddress ?? "-"),
    macAddress: String(item.mac_address ?? item.macAddress ?? "-"),
    status,
    lastSeen: status === "online" ? "Actif" : "A verifier",
    firmware: String(item.version ?? item.firmware ?? "N/A"),
    connectedUsers: 0,
    todayEvents: 0,
  }
}

const getDeviceIcon = (type: Device["type"]) => {
  switch (type) {
    case "door_controller":
      return DoorOpen
    case "reader":
      return Radio
    case "turnstile":
      return Cpu
    case "fingerprint":
      return Fingerprint
    default:
      return Cpu
  }
}

const getDeviceTypeLabel = (type: Device["type"]) => {
  switch (type) {
    case "door_controller":
      return "Controleur de porte"
    case "reader":
      return "Lecteur de carte"
    case "turnstile":
      return "Tourniquet"
    case "fingerprint":
      return "Lecteur biometrique"
    default:
      return type
  }
}

export default function DevicesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [addDeviceOpen, setAddDeviceOpen] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [tenantCode, setTenantCode] = useState("")
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [isLoadingTenants, setIsLoadingTenants] = useState(false)
  const [serialNumber, setSerialNumber] = useState("SN-POSTMAN-0001")
  const [ehomeKey, setEhomeKey] = useState("0123456789ABCDEF0123456789ABCDEF")
  const [devicePassword, setDevicePassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null)
  const [restartingDeviceId, setRestartingDeviceId] = useState<string | null>(null)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [editDeviceOpen, setEditDeviceOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [isUpdatingDevice, setIsUpdatingDevice] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [configuringDeviceId, setConfiguringDeviceId] = useState<string | null>(null)

  const getAccessToken = async (normalizedBaseUrl: string) => {
    const tokenResponse = await fetch(`${normalizedBaseUrl}/api/auth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: API_USERNAME,
        password: API_PASSWORD,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Echec authentification API (${tokenResponse.status})`)
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData?.access) {
      throw new Error("Token d'acces manquant dans la reponse JWT")
    }
    return String(tokenData.access)
  }

  const refreshDevices = async () => {
    setIsLoadingDevices(true)
    setDevicesError(null)

    try {
      const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "")
      const accessToken = await getAccessToken(normalizedBaseUrl)

      await fetch(`${normalizedBaseUrl}/api/hikgateway/sync-devices/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ dispatch_core_devices: true }),
      }).catch(() => null)

      const query = tenantCode.trim()
        ? `?tenant=${encodeURIComponent(tenantCode.trim())}&normalized=1&max_result=200`
        : "?normalized=1&max_result=200"

      const response = await fetch(`${normalizedBaseUrl}/api/hikgateway/devices/${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Echec lecture devices (${response.status})`)
      }

      const data = await response.json()
      const results = Array.isArray(data?.results) ? data.results : []
      const mappedDevices = results.map((item: GatewayDevice, index: number) => mapGatewayDevice(item, index))

      const coreDevicesResponse = await fetch(`${normalizedBaseUrl}/api/devices/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const coreByDevIndex = new Map<string, { id: number; name: string; serialNumber: string }>()
      const coreBySerial = new Map<string, { id: number; name: string; serialNumber: string }>()
      if (coreDevicesResponse.ok) {
        const corePayload = await coreDevicesResponse.json()
        const coreRows = Array.isArray(corePayload)
          ? corePayload
          : Array.isArray(corePayload?.results)
            ? corePayload.results
            : []

        for (const row of coreRows as Array<Record<string, unknown>>) {
          const rowId = Number(row.id)
          const rowDevIndex = String(row.dev_index ?? "").trim()
          const rowName = String(row.name ?? "").trim()
          const rowSerialNumber = String(row.serial_number ?? "").trim()
          if (!Number.isFinite(rowId)) {
            continue
          }
          const normalized = {
            id: rowId,
            name: rowName,
            serialNumber: rowSerialNumber,
          }
          if (rowDevIndex) {
            coreByDevIndex.set(rowDevIndex, normalized)
          }
          if (rowSerialNumber) {
            coreBySerial.set(rowSerialNumber, normalized)
          }
        }
      }

      setDevices(
        mappedDevices.map((device: Device) => ({
          ...device,
          coreDeviceId:
            coreByDevIndex.get(device.devIndex)?.id ?? coreBySerial.get(device.serialNumber)?.id,
          name:
            coreByDevIndex.get(device.devIndex)?.name ||
            coreBySerial.get(device.serialNumber)?.name ||
            device.name,
        })),
      )
    } catch (error) {
      setDevices([])
      setDevicesError(error instanceof Error ? error.message : "Erreur chargement des appareils")
    } finally {
      setIsLoadingDevices(false)
    }
  }

  const loadTenants = async () => {
    setIsLoadingTenants(true)
    try {
      const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "")
      const accessToken = await getAccessToken(normalizedBaseUrl)
      const response = await fetch(`${normalizedBaseUrl}/api/tenants/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Echec lecture tenants (${response.status})`)
      }

      const data = await response.json()
      const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      const parsed = rows
        .map((item: Record<string, unknown>) => ({
          id: Number(item.id),
          code: String(item.code ?? "").trim(),
          name: String(item.name ?? "").trim(),
        }))
        .filter((item: TenantOption) => Number.isFinite(item.id) && item.code)

      setTenants(parsed)
      if (!tenantCode && parsed.length > 0) {
        setTenantCode(parsed[0].code)
      }
    } catch {
      setTenants([])
    } finally {
      setIsLoadingTenants(false)
    }
  }

  useEffect(() => {
    void refreshDevices()
    void loadTenants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (addDeviceOpen && tenants.length === 0) {
      void loadTenants()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDeviceOpen])

  // Calculate stats
  const onlineDevices = devices.filter((d) => d.status === "online").length
  const warningDevices = devices.filter((d) => d.status === "warning").length
  const offlineDevices = devices.filter((d) => d.status === "offline").length

  // Filter devices
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ipAddress.includes(searchQuery)

    const matchesStatus = statusFilter === "all" || device.status === statusFilter
    const matchesType = typeFilter === "all" || device.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device)
    setDetailsOpen(true)
  }

  const handleCreateDevice = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitMessage(null)

    try {
      if (!tenantCode.trim()) {
        throw new Error("Le champ tenant_code est obligatoire.")
      }
      if (!serialNumber.trim()) {
        throw new Error("Le champ serial_number/sn est obligatoire.")
      }
      if (!ehomeKey.trim()) {
        throw new Error("Le champ ehome_key est obligatoire.")
      }
      if (!devicePassword.trim()) {
        throw new Error("Le champ device_password est obligatoire.")
      }

      const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "")
      const accessToken = await getAccessToken(normalizedBaseUrl)

      const createResponse = await fetch(`${normalizedBaseUrl}/api/devices/onboard/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tenant_code: tenantCode.trim(),
          sn: serialNumber.trim(),
          ehome_key: ehomeKey.trim(),
          dev_name: `Device ${serialNumber.trim()}`,
          dev_type: "AccessControl",
          device_username: "admin",
          device_password: devicePassword.trim(),
        }),
      })

      const responseData = await createResponse.json().catch(() => ({}))

      if (![200, 201, 409].includes(createResponse.status)) {
        throw new Error(
          responseData?.detail || responseData?.message || `Echec onboarding device (${createResponse.status})`,
        )
      }

      if (createResponse.status === 201) {
        setSubmitMessage("Appareil ajoute avec succes via /api/devices/onboard/ (201).")
      } else if (createResponse.status === 200) {
        setSubmitMessage("Appareil deja onboarde sur ce tenant (200).")
      } else {
        setSubmitMessage("Conflit: ce numero de serie est deja affecte a un autre tenant.")
      }
      await refreshDevices()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erreur inattendue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDevice = async (device: Device) => {
    if (!device.coreDeviceId) {
      setDevicesError("Impossible de supprimer: id local introuvable. Lance une synchronisation puis reessaie.")
      return
    }

    const confirmed = window.confirm(`Supprimer l'appareil "${device.name}" ?`)
    if (!confirmed) {
      return
    }

    setDeletingDeviceId(device.id)
    setDevicesError(null)

    try {
      const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "")
      const accessToken = await getAccessToken(normalizedBaseUrl)
      const response = await fetch(`${normalizedBaseUrl}/api/devices/${device.coreDeviceId}/?gateway=1`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(
          String(
            errorPayload?.detail ??
              errorPayload?.message ??
              `Echec suppression device (${response.status})`,
          ),
        )
      }

      setDevices((previous) => previous.filter((item) => item.id !== device.id))
      if (selectedDevice?.id === device.id) {
        setDetailsOpen(false)
        setSelectedDevice(null)
      }
    } catch (error) {
      setDevicesError(error instanceof Error ? error.message : "Erreur suppression appareil")
    } finally {
      setDeletingDeviceId(null)
    }
  }

  const handleRestartDevice = async (device: Device) => {
    if (!device.coreDeviceId) {
      setDevicesError("Impossible de redemarrer: id local introuvable. Lance une synchronisation puis reessaie.")
      return
    }

    const confirmed = window.confirm(`Redemarrer l'appareil "${device.name}" ?`)
    if (!confirmed) {
      return
    }

    setRestartingDeviceId(device.id)
    setDevicesError(null)

    try {
      const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "")
      const accessToken = await getAccessToken(normalizedBaseUrl)
      const response = await fetch(`${normalizedBaseUrl}/api/devices/${device.coreDeviceId}/reboot/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          String(payload?.detail ?? payload?.message ?? `Echec redemarrage device (${response.status})`),
        )
      }
    } catch (error) {
      setDevicesError(error instanceof Error ? error.message : "Erreur redemarrage appareil")
    } finally {
      setRestartingDeviceId(null)
    }
  }

  const openEditDevice = (device: Device) => {
    setEditingDevice(device)
    setEditName(device.name)
    setUpdateError(null)
    setEditDeviceOpen(true)
  }

  const handleUpdateDevice = async () => {
    if (!editingDevice) {
      return
    }
    if (!editingDevice.coreDeviceId) {
      setUpdateError("Impossible de modifier: id local introuvable. Lance une synchronisation puis reessaie.")
      return
    }
    if (!editName.trim()) {
      setUpdateError("Le nom est obligatoire.")
      return
    }

    setIsUpdatingDevice(true)
    setUpdateError(null)

    try {
      const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "")
      const accessToken = await getAccessToken(normalizedBaseUrl)
      const response = await fetch(`${normalizedBaseUrl}/api/devices/${editingDevice.coreDeviceId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          String(payload?.detail ?? payload?.message ?? `Echec modification device (${response.status})`),
        )
      }

      setDevices((previous) =>
        previous.map((item) =>
          item.id === editingDevice.id
            ? {
                ...item,
                name: String(payload?.name ?? editName.trim()),
              }
            : item,
        ),
      )
      setSelectedDevice((previous) =>
        previous && previous.id === editingDevice.id
          ? { ...previous, name: String(payload?.name ?? editName.trim()) }
          : previous,
      )
      setEditDeviceOpen(false)
      setEditingDevice(null)
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Erreur modification appareil")
    } finally {
      setIsUpdatingDevice(false)
    }
  }

  const handleOpenDeviceConfiguration = async (device: Device) => {
    if (!device.coreDeviceId) {
      setDevicesError("Impossible d'ouvrir la configuration: id local introuvable. Lance une synchronisation puis reessaie.")
      return
    }

    setConfiguringDeviceId(device.id)
    setDevicesError(null)

    let popup: Window | null = null
    try {
      popup = window.open("", "_blank", "noopener,noreferrer")

      const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "")
      const accessToken = await getAccessToken(normalizedBaseUrl)
      const query = new URLSearchParams({
        scheme: DEVICE_CONFIG_SCHEME,
        path: DEVICE_CONFIG_PATH,
      })
      let hostCandidate = getConfigHostCandidate(device.ipAddress)
      if (!hostCandidate) {
        const manualHost = window.prompt(
          "IP/hostname du terminal (optionnel).\nExemple: 192.168.1.90\nLaisse vide pour utiliser la configuration via Gateway ISAPI.",
          "",
        )
        hostCandidate = getConfigHostCandidate(manualHost ?? "")
      }
      if (hostCandidate) {
        query.set("host", hostCandidate)
      } else {
        query.set("allow_gateway_fallback", "1")
      }

      const response = await fetch(
        `${normalizedBaseUrl}/api/devices/${device.coreDeviceId}/config-page/?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          String(payload?.detail ?? payload?.message ?? `Echec ouverture config device (${response.status})`),
        )
      }

      const configurationUrl = String(payload?.configuration_url ?? "").trim()
      if (!configurationUrl) {
        throw new Error("URL de configuration introuvable pour cet appareil.")
      }

      if (popup && !popup.closed) {
        popup.location.replace(configurationUrl)
        popup.focus()
      } else {
        window.open(configurationUrl, "_blank", "noopener,noreferrer")
      }
    } catch (error) {
      if (popup && !popup.closed) {
        popup.close()
      }
      setDevicesError(error instanceof Error ? error.message : "Erreur ouverture configuration appareil")
    } finally {
      setConfiguringDeviceId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="p-6">
          <PageContextBar
            title="Appareils"
            description="Inventaire, sante et actions de maintenance sur les controleurs et lecteurs Hikvision."
            stats={[
              { value: devices.length, label: "Appareils suivis" },
              { value: devices.filter((device) => device.status === "offline").length, label: "Hors ligne", tone: "critical" },
              { value: devices.filter((device) => device.status === "warning").length, label: "A surveiller", tone: "warning" },
            ]}
            actions={
              <>
              <Button variant="outline" size="sm" onClick={() => void refreshDevices()} disabled={isLoadingDevices}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isLoadingDevices ? "Synchronisation..." : "Synchroniser"}
              </Button>
              <Button size="sm" onClick={() => setAddDeviceOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un appareil
              </Button>
              </>
            }
          />

          {devicesError && (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {devicesError}
            </p>
          )}

          <Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Ajouter un appareil (API Hikvision)</DialogTitle>
                <DialogDescription>
                  Tenants recuperes automatiquement. Champs requis: tenant_code, SN, ehome_key, device_password.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant-code">tenant_code</Label>
                  {tenants.length > 0 ? (
                    <Select value={tenantCode} onValueChange={setTenantCode}>
                      <SelectTrigger id="tenant-code">
                        <SelectValue placeholder={isLoadingTenants ? "Chargement..." : "Selectionner un tenant"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.code}>
                            {tenant.name || tenant.code} ({tenant.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="tenant-code"
                      value={tenantCode}
                      onChange={(e) => setTenantCode(e.target.value)}
                      placeholder={isLoadingTenants ? "Chargement..." : "TENANT-A"}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial-number">SN</Label>
                  <Input
                    id="serial-number"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-POSTMAN-0001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ehome-key">ehome_key</Label>
                  <Input
                    id="ehome-key"
                    value={ehomeKey}
                    onChange={(e) => setEhomeKey(e.target.value)}
                    placeholder="0123456789ABCDEF0123456789ABCDEF"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-password">device_password</Label>
                  <Input
                    id="device-password"
                    type="password"
                    value={devicePassword}
                    onChange={(e) => setDevicePassword(e.target.value)}
                    placeholder="requis"
                  />
                </div>

                {submitMessage && (
                  <p className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
                    {submitMessage}
                  </p>
                )}

                {submitError && (
                  <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                    {submitError}
                  </p>
                )}

                <Button className="w-full" onClick={handleCreateDevice} disabled={isSubmitting}>
                  {isSubmitting ? "Ajout en cours..." : "Ajouter via API"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editDeviceOpen} onOpenChange={setEditDeviceOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Modifier l&apos;appareil</DialogTitle>
                <DialogDescription>
                  Champs modifiables via API locale: nom (et autres champs autorises cote backend).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-device-name">Nom</Label>
                  <Input
                    id="edit-device-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Nom de l'appareil"
                  />
                </div>

                {updateError && (
                  <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                    {updateError}
                  </p>
                )}

                <Button className="w-full" onClick={handleUpdateDevice} disabled={isUpdatingDevice}>
                  {isUpdatingDevice ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <Wifi className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En ligne</p>
                  <p className="text-2xl font-semibold text-foreground">{onlineDevices}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avertissement</p>
                  <p className="text-2xl font-semibold text-foreground">{warningDevices}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                  <WifiOff className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hors ligne</p>
                  <p className="text-2xl font-semibold text-foreground">{offlineDevices}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, localisation ou IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="online">En ligne</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="offline">Hors ligne</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="door_controller">Controleur de porte</SelectItem>
                <SelectItem value="reader">Lecteur de carte</SelectItem>
                <SelectItem value="turnstile">Tourniquet</SelectItem>
                <SelectItem value="fingerprint">Lecteur biometrique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Devices Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDevices.map((device) => {
              const Icon = getDeviceIcon(device.type)
              return (
                <Card
                  key={device.id}
                  className="cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
                  onClick={() => handleDeviceClick(device)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            device.status === "online"
                              ? "bg-green-500/10"
                              : device.status === "warning"
                                ? "bg-amber-500/10"
                                : "bg-red-500/10"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              device.status === "online"
                                ? "text-green-500"
                                : device.status === "warning"
                                  ? "text-amber-500"
                                  : "text-red-500"
                            }`}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{device.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {getDeviceTypeLabel(device.type)}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation()
                              openEditDevice(device)
                            }}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={restartingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRestartDevice(device)
                            }}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {restartingDeviceId === device.id ? "Redemarrage..." : "Redemarrer"}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Power className="mr-2 h-4 w-4" />
                            {device.status === "offline" ? "Activer" : "Desactiver"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={deletingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDeleteDevice(device)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingDeviceId === device.id ? "Suppression..." : "Supprimer"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${
                          device.status === "online"
                            ? "border-green-500/30 text-green-500"
                            : device.status === "warning"
                              ? "border-amber-500/30 text-amber-500"
                              : "border-red-500/30 text-red-500"
                        }`}
                      >
                        {device.status === "online" && (
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                        )}
                        {device.status === "warning" && (
                          <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        )}
                        {device.status === "offline" && (
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                        {device.status === "online"
                          ? "En ligne"
                          : device.status === "warning"
                            ? "Avertissement"
                            : "Hors ligne"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{device.lastSeen}</span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{device.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Cpu className="h-3.5 w-3.5" />
                        <span>{device.ipAddress}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">
                          {device.todayEvents}
                        </p>
                        <p className="text-xs text-muted-foreground">Evenements</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">
                          {device.connectedUsers}
                        </p>
                        <p className="text-xs text-muted-foreground">Utilisateurs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">{device.firmware}</p>
                        <p className="text-xs text-muted-foreground">Firmware</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {!isLoadingDevices && filteredDevices.length === 0 && (
            <p className="mt-4 rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Aucun appareil trouvé avec les filtres actuels.
            </p>
          )}

          {/* Device Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedDevice && (
                    <>
                      {(() => {
                        const Icon = getDeviceIcon(selectedDevice.type)
                        return (
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              selectedDevice.status === "online"
                                ? "bg-green-500/10"
                                : selectedDevice.status === "warning"
                                  ? "bg-amber-500/10"
                                  : "bg-red-500/10"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                selectedDevice.status === "online"
                                  ? "text-green-500"
                                  : selectedDevice.status === "warning"
                                    ? "text-amber-500"
                                    : "text-red-500"
                              }`}
                            />
                          </div>
                        )
                      })()}
                      {selectedDevice.name}
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedDevice && getDeviceTypeLabel(selectedDevice.type)}
                </DialogDescription>
              </DialogHeader>

              {selectedDevice && (
                <Tabs defaultValue="info" className="mt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="info" className="flex-1">
                      Informations
                    </TabsTrigger>
                    <TabsTrigger value="network" className="flex-1">
                      Reseau
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1">
                      Activite
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Modele</p>
                        <p className="font-medium">{selectedDevice.model}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Numero de serie</p>
                        <p className="font-mono text-sm">{selectedDevice.serialNumber}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Localisation</p>
                        <p className="font-medium">{selectedDevice.location}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Firmware</p>
                        <p className="font-medium">{selectedDevice.firmware}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                      {selectedDevice.status === "online" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : selectedDevice.status === "warning" ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {selectedDevice.status === "online"
                            ? "Appareil en ligne"
                            : selectedDevice.status === "warning"
                              ? "Connexion instable"
                              : "Appareil hors ligne"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Derniere activite: {selectedDevice.lastSeen}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={configuringDeviceId === selectedDevice.id}
                      onClick={() => void handleOpenDeviceConfiguration(selectedDevice)}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {configuringDeviceId === selectedDevice.id
                        ? "Ouverture de l'interface..."
                        : "Ouvrir l'interface de configuration"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="network" className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Adresse IP</p>
                        <p className="font-mono text-sm">{selectedDevice.ipAddress}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Adresse MAC</p>
                        <p className="font-mono text-sm">{selectedDevice.macAddress}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="font-medium">Diagnostics reseau</span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Latence</span>
                          <span className="font-mono">12ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Paquets perdus</span>
                          <span className="font-mono">0%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Uptime</span>
                          <span className="font-mono">14 jours</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Card className="border-border">
                        <CardContent className="flex items-center gap-3 p-4">
                          <Zap className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-2xl font-semibold">
                              {selectedDevice.todayEvents}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Evenements aujourd&apos;hui
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-border">
                        <CardContent className="flex items-center gap-3 p-4">
                          <Clock className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-2xl font-semibold">
                              {selectedDevice.connectedUsers}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Utilisateurs connectes
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}



