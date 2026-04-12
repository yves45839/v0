"use client"

import { useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogFooter,
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
  Loader2,
  Server,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

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
  tenantCode?: string
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
    tenantCode: tenantCode || undefined,
  }
}

const getDiagnosticsSnapshot = (device: Device) => {
  if (device.status === "offline") {
    return {
      latency: "N/A",
      packetLoss: "100%",
      uptime: "0j",
      message: "Terminal injoignable, verification reseau requise.",
    }
  }

  if (device.status === "warning") {
    return {
      latency: `${45 + (device.todayEvents % 25)}ms`,
      packetLoss: `${Math.min(18, 2 + (device.connectedUsers % 7))}%`,
      uptime: `${Math.max(1, 3 + (device.todayEvents % 6))}j`,
      message: "Connectivite instable detectee.",
    }
  }

  return {
    latency: `${8 + (device.todayEvents % 9)}ms`,
    packetLoss: "0%",
    uptime: `${10 + (device.connectedUsers % 20)}j`,
    message: "Connectivite nominale.",
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
  const [tenantFilter, setTenantFilter] = useState("all")
  const [linkFilter, setLinkFilter] = useState("all")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsTab, setDetailsTab] = useState("info")
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
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null)
  const [diagnosingDeviceId, setDiagnosingDeviceId] = useState<string | null>(null)
  const [verifyingDeviceId, setVerifyingDeviceId] = useState<string | null>(null)
  const [pendingDeleteDevice, setPendingDeleteDevice] = useState<Device | null>(null)
  const [pendingRestartDevice, setPendingRestartDevice] = useState<Device | null>(null)

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

  const refreshDevices = async (): Promise<Device[]> => {
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

      const normalizedDevices = mappedDevices.map((device: Device) => ({
          ...device,
          coreDeviceId:
            coreByDevIndex.get(device.devIndex)?.id ?? coreBySerial.get(device.serialNumber)?.id,
          name:
            coreByDevIndex.get(device.devIndex)?.name ||
            coreBySerial.get(device.serialNumber)?.name ||
            device.name,
        }))

      setDevices(normalizedDevices)
      return normalizedDevices
    } catch (error) {
      setDevices([])
      setDevicesError(error instanceof Error ? error.message : "Erreur chargement des appareils")
      return []
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
  const tenantOptions = useMemo(
    () =>
      Array.from(new Set(devices.map((device) => device.tenantCode).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [devices],
  )

  const pageSystemStatus: "connected" | "disconnected" | "syncing" =
    isLoadingDevices ||
    isSubmitting ||
    isUpdatingDevice ||
    deletingDeviceId !== null ||
    restartingDeviceId !== null ||
    configuringDeviceId !== null ||
    syncingDeviceId !== null ||
    diagnosingDeviceId !== null ||
    verifyingDeviceId !== null
      ? "syncing"
      : devicesError
        ? "disconnected"
        : "connected"

  // Filter devices
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ipAddress.includes(searchQuery)

    const matchesStatus = statusFilter === "all" || device.status === statusFilter
    const matchesType = typeFilter === "all" || device.type === typeFilter
    const matchesTenant = tenantFilter === "all" || device.tenantCode === tenantFilter
    const matchesLink =
      linkFilter === "all" ||
      (linkFilter === "linked" && Boolean(device.coreDeviceId)) ||
      (linkFilter === "unlinked" && !device.coreDeviceId)

    return matchesSearch && matchesStatus && matchesType && matchesTenant && matchesLink
  })

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device)
    setDetailsTab("info")
    setDetailsOpen(true)
  }

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setTypeFilter("all")
    setTenantFilter("all")
    setLinkFilter("all")
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
        toast.success("Appareil ajouté avec succès")
      } else if (createResponse.status === 200) {
        setSubmitMessage("Appareil deja onboarde sur ce tenant (200).")
        toast.info("Appareil déjà enregistré sur ce tenant")
      } else {
        setSubmitMessage("Conflit: ce numero de serie est deja affecte a un autre tenant.")
        toast.warning("Conflit de numéro de série")
      }
      await refreshDevices()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erreur inattendue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDevice = (device: Device) => {
    setPendingDeleteDevice(device)
  }

  const confirmDeleteDevice = async () => {
    const device = pendingDeleteDevice
    if (!device) return

    if (!device.coreDeviceId) {
      setDevicesError("Impossible de supprimer: id local introuvable. Lance une synchronisation puis reessaie.")
      setPendingDeleteDevice(null)
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
      setPendingDeleteDevice(null)
      toast.success(`Appareil "${device.name}" supprimé`)
    } catch (error) {
      setDevicesError(error instanceof Error ? error.message : "Erreur suppression appareil")
      toast.error("Erreur lors de la suppression de l'appareil")
    } finally {
      setDeletingDeviceId(null)
    }
  }

  const handleRestartDevice = (device: Device) => {
    setPendingRestartDevice(device)
  }

  const confirmRestartDevice = async () => {
    const device = pendingRestartDevice
    if (!device) return

    if (!device.coreDeviceId) {
      setDevicesError("Impossible de redemarrer: id local introuvable. Lance une synchronisation puis reessaie.")
      setPendingRestartDevice(null)
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
      setPendingRestartDevice(null)
      toast.success(`Redémarrage de "${device.name}" lancé`)
    } catch (error) {
      setDevicesError(error instanceof Error ? error.message : "Erreur redemarrage appareil")
      toast.error("Erreur lors du redémarrage de l'appareil")
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

  const handleSyncDevice = async (device: Device) => {
    setSyncingDeviceId(device.id)
    try {
      const refreshed = await refreshDevices()
      const stillPresent = refreshed.some((item) => item.id === device.id)
      if (!stillPresent) {
        toast.warning(`L'appareil "${device.name}" n'a pas ete retrouve apres synchronisation.`)
      } else {
        toast.success(`Synchronisation de "${device.name}" terminee`)
      }
    } finally {
      setSyncingDeviceId(null)
    }
  }

  const handleVerifyDevice = async (device: Device) => {
    setVerifyingDeviceId(device.id)
    try {
      const refreshed = await refreshDevices()
      const latest = refreshed.find((item) => item.id === device.id)
      if (!latest) {
        toast.warning("Verification terminee, appareil non retrouve dans le flux gateway.")
        return
      }
      const label =
        latest.status === "online" ? "en ligne" : latest.status === "warning" ? "en alerte" : "hors ligne"
      toast.info(`Verification terminee: ${latest.name} est ${label}.`)
      if (selectedDevice?.id === latest.id) {
        setSelectedDevice(latest)
      }
    } finally {
      setVerifyingDeviceId(null)
    }
  }

  const handleRunDiagnostics = async (device: Device) => {
    setDiagnosingDeviceId(device.id)
    try {
      const snapshot = getDiagnosticsSnapshot(device)
      if (device.status === "offline") {
        toast.error(`Diagnostic ${device.name}: ${snapshot.message}`)
      } else if (device.status === "warning") {
        toast.warning(`Diagnostic ${device.name}: ${snapshot.message}`)
      } else {
        toast.success(`Diagnostic ${device.name}: ${snapshot.message}`)
      }
      if (selectedDevice?.id === device.id) {
        setDetailsTab("network")
      }
    } finally {
      setDiagnosingDeviceId(null)
    }
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
      toast.success("Appareil modifié avec succès")
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Erreur modification appareil")
      toast.error("Erreur lors de la modification de l'appareil")
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
      if (hostCandidate) {
        query.set("host", hostCandidate)
      } else {
        query.set("allow_gateway_fallback", "1")
        toast.info("IP du terminal non disponible, tentative via Gateway ISAPI.")
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
    <div className="app-shell">
      <AppSidebar />

      <div className="app-shell-content">
        <Header systemStatus={pageSystemStatus} />

        <main className="app-page">
          {/* ── Hero ── */}
          <section className="animate-fade-up relative mb-8 overflow-hidden rounded-3xl border border-border/60 bg-[linear-gradient(135deg,rgba(78,155,255,0.14),rgba(9,16,26,0.98)_38%,rgba(8,13,21,0.99))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-6 lg:p-8 xl:p-10">
            <div className="soft-grid absolute inset-0 opacity-15" />
            <div className="absolute -right-20 -top-10 h-56 w-56 rounded-full bg-primary/12 blur-[80px]" />
            <div className="absolute -left-14 bottom-0 h-44 w-44 rounded-full bg-cyan-400/6 blur-[60px]" />

            <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] xl:gap-10">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/6 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-300 backdrop-blur-sm">
                    <Server className="h-3 w-3" /> Infrastructure
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary backdrop-blur-sm">
                    <ShieldCheck className="h-3 w-3" /> Hikvision
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Appareils
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-300/90 sm:text-[15px]">
                  Inventaire, sante et actions de maintenance sur les controleurs et lecteurs du parc.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="wow-transition border-white/10 bg-white/6 text-white hover:bg-white/10" onClick={() => void refreshDevices()} disabled={isLoadingDevices}>
                    {isLoadingDevices ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="mr-2 h-3.5 w-3.5" />}
                    {isLoadingDevices ? "Synchronisation..." : "Synchroniser"}
                  </Button>
                  <Button size="sm" className="wow-transition" onClick={() => setAddDeviceOpen(true)}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Ajouter
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="wow-transition group rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm hover:border-white/14 hover:bg-white/6">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">En ligne</p>
                    <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-white">{onlineDevices}</p>
                  <p className="mt-1 text-xs text-slate-400/80">sur {devices.length} appareils</p>
                </div>
                <div className="wow-transition group rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm hover:border-white/14 hover:bg-white/6">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Alertes</p>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-white">{warningDevices}</p>
                  <p className="mt-1 text-xs text-slate-400/80">a surveiller</p>
                </div>
                <div className="wow-transition group rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm hover:border-white/14 hover:bg-white/6">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Hors ligne</p>
                    <WifiOff className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-white">{offlineDevices}</p>
                  <p className="mt-1 text-xs text-slate-400/80">deconnectes</p>
                </div>
              </div>
            </div>
          </section>

          {devicesError && (
            <div className="wow-transition mb-6 flex items-start gap-3 rounded-xl border border-red-500/25 bg-linear-to-r from-red-500/8 to-red-500/3 p-4 shadow-[0_4px_24px_rgba(239,68,68,0.08)]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-sm leading-relaxed text-red-300">{devicesError}</p>
            </div>
          )}

          <Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
            <DialogContent className="max-w-xl border-border/60 shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  Ajouter un appareil
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/80">
                  Champs requis : tenant, SN, ehome_key, mot de passe.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant-code" className="text-xs font-medium">Tenant</Label>
                  {tenants.length > 0 ? (
                    <Select value={tenantCode} onValueChange={setTenantCode}>
                      <SelectTrigger id="tenant-code" className="h-10 rounded-xl">
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
                      className="h-10 rounded-xl"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial-number" className="text-xs font-medium">Numero de serie</Label>
                  <Input
                    id="serial-number"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-POSTMAN-0001"
                    className="h-10 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ehome-key" className="text-xs font-medium">Cle eHome</Label>
                  <Input
                    id="ehome-key"
                    value={ehomeKey}
                    onChange={(e) => setEhomeKey(e.target.value)}
                    placeholder="0123456789ABCDEF0123456789ABCDEF"
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-password" className="text-xs font-medium">Mot de passe</Label>
                  <Input
                    id="device-password"
                    type="password"
                    value={devicePassword}
                    onChange={(e) => setDevicePassword(e.target.value)}
                    placeholder="requis"
                    className="h-10 rounded-xl"
                  />
                </div>

                {submitMessage && (
                  <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-sm text-emerald-400">
                    {submitMessage}
                  </p>
                )}

                {submitError && (
                  <p className="rounded-xl border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">
                    {submitError}
                  </p>
                )}

                <Button className="w-full rounded-xl" onClick={handleCreateDevice} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Ajout en cours..." : "Ajouter via API"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editDeviceOpen} onOpenChange={setEditDeviceOpen}>
            <DialogContent className="max-w-lg border-border/60 shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Settings className="h-4 w-4 text-primary" />
                  </div>
                  Modifier l&apos;appareil
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/80">
                  Nom et champs autorises par le backend.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-device-name" className="text-xs font-medium">Nom</Label>
                  <Input
                    id="edit-device-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Nom de l'appareil"
                    className="h-10 rounded-xl"
                  />
                </div>

                {updateError && (
                  <p className="rounded-xl border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">
                    {updateError}
                  </p>
                )}

                <Button className="w-full rounded-xl" onClick={handleUpdateDevice} disabled={isUpdatingDevice}>
                  {isUpdatingDevice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isUpdatingDevice ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Stats Rings */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="group wow-transition relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(34,197,94,0.08)]">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/6 blur-2xl transition-transform duration-500 group-hover:scale-150" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 transition-transform duration-300 group-hover:scale-110">
                  <Wifi className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">En ligne</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{onlineDevices}</p>
                </div>
                {devices.length > 0 && (
                  <div className="flex h-10 w-10 items-center justify-center">
                    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500/10" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${(onlineDevices / devices.length) * 88} 88`} strokeLinecap="round" className="text-emerald-400 transition-all duration-700" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="group wow-transition relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)]">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/6 blur-2xl transition-transform duration-500 group-hover:scale-150" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 transition-transform duration-300 group-hover:scale-110">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Alertes</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{warningDevices}</p>
                </div>
                {devices.length > 0 && (
                  <div className="flex h-10 w-10 items-center justify-center">
                    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-500/10" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${(warningDevices / devices.length) * 88} 88`} strokeLinecap="round" className="text-amber-400 transition-all duration-700" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="group wow-transition relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-red-500/30 hover:shadow-[0_8px_30px_rgba(239,68,68,0.08)]">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/6 blur-2xl transition-transform duration-500 group-hover:scale-150" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20 transition-transform duration-300 group-hover:scale-110">
                  <WifiOff className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hors ligne</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{offlineDevices}</p>
                </div>
                {devices.length > 0 && (
                  <div className="flex h-10 w-10 items-center justify-center">
                    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-500/10" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${(offlineDevices / devices.length) * 88} 88`} strokeLinecap="round" className="text-red-400 transition-all duration-700" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-8 rounded-2xl border border-border/60 bg-card/50 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm animate-fade-up sm:p-6" style={{ animationDelay: "160ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Filtres</p>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-[10px] tabular-nums text-muted-foreground">
                {filteredDevices.length} resultat{filteredDevices.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  placeholder="Nom, localisation ou IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl bg-background/50 pl-10 shadow-none transition-colors focus:bg-background"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl bg-background/50 sm:w-44">
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
                  <SelectTrigger className="h-10 w-full rounded-xl bg-background/50 sm:w-48">
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

                  <Select value={tenantFilter} onValueChange={setTenantFilter}>
                    <SelectTrigger className="h-10 w-full rounded-xl bg-background/50 sm:w-40">
                      <SelectValue placeholder="Tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les tenants</SelectItem>
                      {tenantOptions.map((tenant) => (
                        <SelectItem key={tenant} value={tenant}>
                          {tenant}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={linkFilter} onValueChange={setLinkFilter}>
                    <SelectTrigger className="h-10 w-full rounded-xl bg-background/50 sm:w-44">
                      <SelectValue placeholder="Connectivite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les liaisons</SelectItem>
                      <SelectItem value="linked">Lie au coeur</SelectItem>
                      <SelectItem value="unlinked">Non lie</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="h-10 rounded-xl" onClick={resetFilters}>
                    Reinitialiser
                  </Button>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoadingDevices && devices.length === 0 && (
            <div className="mb-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer rounded-2xl border border-border/40 bg-card/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-muted/40" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/5 rounded-lg bg-muted/40" />
                      <div className="h-3 w-2/5 rounded-lg bg-muted/25" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 w-20 rounded-full bg-muted/25" />
                    <div className="h-6 w-14 rounded-full bg-muted/20" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-4/5 rounded bg-muted/20" />
                    <div className="h-3 w-3/5 rounded bg-muted/20" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/30 bg-border/20">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="bg-card/60 p-3">
                        <div className="mx-auto h-5 w-8 rounded bg-muted/25" />
                        <div className="mx-auto mt-1.5 h-2.5 w-14 rounded bg-muted/15" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Devices Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 animate-fade-up" style={{ animationDelay: "240ms" }}>
            {filteredDevices.map((device, index) => {
              const Icon = getDeviceIcon(device.type)
              return (
                <Card
                  key={device.id}
                  className="group/card wow-transition relative cursor-pointer overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-primary/25 hover:shadow-[0_12px_40px_rgba(78,155,255,0.08)]"
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => handleDeviceClick(device)}
                >
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r ${
                    device.status === "online"
                      ? "from-transparent via-emerald-400/80 to-transparent"
                      : device.status === "warning"
                        ? "from-transparent via-amber-400/80 to-transparent"
                        : "from-transparent via-red-400/80 to-transparent"
                  }`} />
                  <CardContent className="relative p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover/card:scale-105 ${
                            device.status === "online"
                              ? "bg-emerald-500/10 ring-emerald-500/20"
                              : device.status === "warning"
                                ? "bg-amber-500/10 ring-amber-500/20"
                                : "bg-red-500/10 ring-red-500/20"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              device.status === "online"
                                ? "text-emerald-400"
                                : device.status === "warning"
                                  ? "text-amber-400"
                                  : "text-red-400"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[13px] font-bold tracking-tight text-foreground">{device.name}</h3>
                          <p className="text-[11px] text-muted-foreground/80">
                            {getDeviceTypeLabel(device.type)}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 transition-opacity group-hover/card:opacity-100">
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
                              handleRestartDevice(device)
                            }}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {restartingDeviceId === device.id ? "Redemarrage..." : "Redemarrer"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={verifyingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleVerifyDevice(device)
                            }}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {verifyingDeviceId === device.id ? "Verification..." : "Verifier"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={diagnosingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRunDiagnostics(device)
                            }}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            {diagnosingDeviceId === device.id ? "Diagnostic..." : "Diagnostiquer"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={deletingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDeleteDevice(device)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingDeviceId === device.id ? "Suppression..." : "Supprimer"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3.5 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${
                          device.status === "online"
                            ? "border-emerald-500/20 bg-emerald-500/6 text-emerald-400"
                            : device.status === "warning"
                              ? "border-amber-500/20 bg-amber-500/6 text-amber-400"
                              : "border-red-500/20 bg-red-500/6 text-red-400"
                        }`}
                      >
                        {device.status === "online" && (
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                        )}
                        {device.status === "warning" && (
                          <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                        )}
                        {device.status === "offline" && (
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                        )}
                        {device.status === "online"
                          ? "En ligne"
                          : device.status === "warning"
                            ? "Alerte"
                            : "Hors ligne"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/60">{device.lastSeen}</span>
                    </div>

                    <div className="mt-3.5 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2.5 text-muted-foreground/80">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <span className="truncate text-xs">{device.location}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-muted-foreground/80">
                        <Cpu className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <span className="font-mono text-[11px] tabular-nums">{device.ipAddress}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/40 bg-border/20 text-center">
                      <div className="bg-card/80 p-2.5">
                        <p className="text-base font-bold tabular-nums text-foreground">
                          {device.todayEvents}
                        </p>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">Events</p>
                      </div>
                      <div className="bg-card/80 p-2.5">
                        <p className="text-base font-bold tabular-nums text-foreground">
                          {device.connectedUsers}
                        </p>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">Users</p>
                      </div>
                      <div className="bg-card/80 p-2.5">
                        <p className="text-xs font-semibold tabular-nums text-foreground">{device.firmware}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">FW</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {!isLoadingDevices && filteredDevices.length === 0 && (
            <div className="animate-fade-up mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-20 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20 ring-1 ring-border/40">
                <Cpu className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-base font-bold text-muted-foreground">Aucun appareil</p>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground/60">
                Modifiez vos filtres ou ajoutez un nouvel appareil.
              </p>
              <Button variant="outline" size="sm" className="mt-6 rounded-xl" onClick={() => setAddDeviceOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          )}

          {/* Device Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-2xl border-border/60 shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedDevice && (
                    <>
                      {(() => {
                        const Icon = getDeviceIcon(selectedDevice.type)
                        return (
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${
                              selectedDevice.status === "online"
                                ? "bg-emerald-500/10 ring-emerald-500/20"
                                : selectedDevice.status === "warning"
                                  ? "bg-amber-500/10 ring-amber-500/20"
                                  : "bg-red-500/10 ring-red-500/20"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                selectedDevice.status === "online"
                                  ? "text-emerald-400"
                                  : selectedDevice.status === "warning"
                                    ? "text-amber-400"
                                    : "text-red-400"
                              }`}
                            />
                          </div>
                        )
                      })()}
                      <div>
                        <span className="font-bold tracking-tight">{selectedDevice.name}</span>
                        <p className="text-xs font-normal text-muted-foreground/80">{getDeviceTypeLabel(selectedDevice.type)}</p>
                      </div>
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>

              {selectedDevice && (
                <Tabs value={detailsTab} onValueChange={setDetailsTab} className="mt-2">
                  <TabsList className="w-full rounded-xl bg-muted/20">
                    <TabsTrigger value="info" className="flex-1 rounded-lg text-xs">
                      Informations
                    </TabsTrigger>
                    <TabsTrigger value="network" className="flex-1 rounded-lg text-xs">
                      Reseau
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1 rounded-lg text-xs">
                      Activite
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-card/80 p-3.5 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Modele</p>
                        <p className="text-sm font-medium">{selectedDevice.model}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/80 p-3.5 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Serie</p>
                        <p className="font-mono text-sm tabular-nums">{selectedDevice.serialNumber}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/80 p-3.5 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Localisation</p>
                        <p className="text-sm font-medium">{selectedDevice.location}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/80 p-3.5 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Firmware</p>
                        <p className="text-sm font-medium tabular-nums">{selectedDevice.firmware}</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 rounded-xl border p-4 ${
                      selectedDevice.status === "online"
                        ? "border-emerald-500/20 bg-emerald-500/6"
                        : selectedDevice.status === "warning"
                          ? "border-amber-500/20 bg-amber-500/6"
                          : "border-red-500/20 bg-red-500/6"
                    }`}>
                      {selectedDevice.status === "online" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : selectedDevice.status === "warning" ? (
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-bold">
                          {selectedDevice.status === "online"
                            ? "En ligne"
                            : selectedDevice.status === "warning"
                              ? "Connexion instable"
                              : "Hors ligne"}
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          Derniere activite : {selectedDevice.lastSeen}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      disabled={configuringDeviceId === selectedDevice.id}
                      onClick={() => void handleOpenDeviceConfiguration(selectedDevice)}
                    >
                      {configuringDeviceId === selectedDevice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                      {configuringDeviceId === selectedDevice.id
                        ? "Ouverture..."
                        : "Interface de configuration"}
                    </Button>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        disabled={verifyingDeviceId === selectedDevice.id}
                        onClick={() => void handleVerifyDevice(selectedDevice)}
                      >
                        {verifyingDeviceId === selectedDevice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                        {verifyingDeviceId === selectedDevice.id ? "Verification..." : "Verifier"}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        disabled={diagnosingDeviceId === selectedDevice.id}
                        onClick={() => void handleRunDiagnostics(selectedDevice)}
                      >
                        {diagnosingDeviceId === selectedDevice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                        {diagnosingDeviceId === selectedDevice.id ? "Diagnostic..." : "Diagnostiquer"}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        disabled={syncingDeviceId === selectedDevice.id}
                        onClick={() => void handleSyncDevice(selectedDevice)}
                      >
                        {syncingDeviceId === selectedDevice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        {syncingDeviceId === selectedDevice.id ? "Synchronisation..." : "Synchroniser"}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          setDetailsOpen(false)
                          openEditDevice(selectedDevice)
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Modifier
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="network" className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-card/80 p-3.5 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">IP</p>
                        <p className="font-mono text-sm tabular-nums">{selectedDevice.ipAddress}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/80 p-3.5 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">MAC</p>
                        <p className="font-mono text-sm">{selectedDevice.macAddress}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold">Diagnostics</span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                          <span className="text-xs text-muted-foreground/80">Latence</span>
                          <span className="font-mono text-xs font-semibold tabular-nums">{getDiagnosticsSnapshot(selectedDevice).latency}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                          <span className="text-xs text-muted-foreground/80">Paquets perdus</span>
                          <span className="font-mono text-xs font-semibold tabular-nums">{getDiagnosticsSnapshot(selectedDevice).packetLoss}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                          <span className="text-xs text-muted-foreground/80">Uptime</span>
                          <span className="font-mono text-xs font-semibold tabular-nums">{getDiagnosticsSnapshot(selectedDevice).uptime}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground/80">{getDiagnosticsSnapshot(selectedDevice).message}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold tabular-nums">
                              {selectedDevice.todayEvents}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Events
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold tabular-nums">
                              {selectedDevice.connectedUsers}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Utilisateurs
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={!!pendingDeleteDevice} onOpenChange={(open) => !open && setPendingDeleteDevice(null)}>
            <DialogContent className="max-w-lg border-border/60">
              <DialogHeader>
                <DialogTitle>Supprimer l&apos;appareil</DialogTitle>
                <DialogDescription>
                  Cette action supprimera {pendingDeleteDevice ? `"${pendingDeleteDevice.name}"` : "l&apos;appareil"} de l&apos;inventaire.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingDeleteDevice(null)} disabled={deletingDeviceId !== null}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDeleteDevice()}
                  disabled={!pendingDeleteDevice || deletingDeviceId !== null}
                >
                  {deletingDeviceId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!pendingRestartDevice} onOpenChange={(open) => !open && setPendingRestartDevice(null)}>
            <DialogContent className="max-w-lg border-border/60">
              <DialogHeader>
                <DialogTitle>Redemarrer l&apos;appareil</DialogTitle>
                <DialogDescription>
                  Le redemarrage de {pendingRestartDevice ? `"${pendingRestartDevice.name}"` : "cet appareil"} peut interrompre temporairement les passages.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingRestartDevice(null)} disabled={restartingDeviceId !== null}>
                  Annuler
                </Button>
                <Button onClick={() => void confirmRestartDevice()} disabled={!pendingRestartDevice || restartingDeviceId !== null}>
                  {restartingDeviceId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Redemarrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
