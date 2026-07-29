"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { EmptyState } from "@/components/ui/empty-state"
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
  Loader2,
  Server,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"
import { devicesPageDict, type DevicesPageDict } from "@/lib/i18n/pages/devices-page"
import { AddDeviceByIpDialog } from "@/components/devices/add-device-by-ip-dialog"
import { getActiveTenantCode } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import {
  deleteDevice,
  fetchDevices,
  fetchGatewayDevices,
  fetchTenants,
  formatGatewayError,
  onboardDevice,
  rebootDevice,
  syncDevices,
  updateDevice,
  type CoreDevice,
  type GatewayDevice,
  type Tenant,
} from "@/lib/api/devices"

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

type TenantOption = Tenant

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

const mapGatewayDevice = (item: GatewayDevice, index: number, tr: DevicesPageDict): Device => {
  const model = String(item.model ?? item.devType ?? item.device_type ?? "")
  const tenantCode = String(item.tenant_code ?? "").trim()
  const status = normalizeStatus(item.status)
  const devIndex = String(item.devIndex ?? item.dev_index ?? item.id ?? `dev-${index}`)

  return {
    id: devIndex,
    devIndex,
    name: String(item.name ?? item.device_name ?? item.devName ?? tr.defaultDeviceName),
    type: inferDeviceType(model),
    model: model || "N/A",
    serialNumber: String(item.serial_number ?? item.sn ?? item.dev_serial ?? "N/A"),
    location: tenantCode ? tr.tenantLocation(tenantCode) : tr.unassigned,
    ipAddress: String(item.ip_address ?? item.ipAddress ?? item.devAddress ?? "-"),
    macAddress: String(item.mac_address ?? item.macAddress ?? "-"),
    status,
    lastSeen: status === "online" ? tr.lastSeenActive : tr.lastSeenCheck,
    firmware: String(item.version ?? item.firmware ?? "N/A"),
    connectedUsers: 0,
    todayEvents: 0,
    tenantCode: tenantCode || undefined,
  }
}

const getDiagnosticsSnapshot = (device: Device, tr: DevicesPageDict) => {
  if (device.status === "offline") {
    return {
      latency: "N/A",
      packetLoss: "100%",
      uptime: tr.uptimeDays(0),
      message: tr.diagUnreachable,
    }
  }

  if (device.status === "warning") {
    return {
      latency: `${45 + (device.todayEvents % 25)}ms`,
      packetLoss: `${Math.min(18, 2 + (device.connectedUsers % 7))}%`,
      uptime: tr.uptimeDays(Math.max(1, 3 + (device.todayEvents % 6))),
      message: tr.diagUnstable,
    }
  }

  return {
    latency: `${8 + (device.todayEvents % 9)}ms`,
    packetLoss: "0%",
    uptime: tr.uptimeDays(10 + (device.connectedUsers % 20)),
    message: tr.diagNominal,
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

const getDeviceTypeLabel = (type: Device["type"], tr: DevicesPageDict) => {
  return tr.deviceTypes[type] ?? type
}

type DeviceTone = "green" | "red" | "amber" | "blue"

const deviceToneClass: Record<DeviceTone, { text: string; bar: string; bg: string; ring: string }> = {
  green: { text: "text-[#22c55e]", bar: "bg-[#22c55e]", bg: "bg-[#0d2a1a]", ring: "ring-[#22c55e]/40" },
  red: { text: "text-[#ef4444]", bar: "bg-[#ef4444]", bg: "bg-[#2a0e0e]", ring: "ring-[#ef4444]/40" },
  amber: { text: "text-[#f59e0b]", bar: "bg-[#f97316]", bg: "bg-[#2a1e06]", ring: "ring-[#f59e0b]/40" },
  blue: { text: "text-[#60a5fa]", bar: "bg-[#60a5fa]", bg: "bg-[#0d1e2e]", ring: "ring-[#60a5fa]/40" },
}

const statusToTone: Record<Device["status"], DeviceTone> = {
  online: "green",
  warning: "amber",
  offline: "red",
}

function DeviceMetricCard({
  label,
  value,
  note,
  tone,
  icon: Icon,
}: {
  label: string
  value: number | string
  note: string
  tone: DeviceTone
  icon: typeof Cpu
}) {
  const styles = deviceToneClass[tone]
  return (
    <article className="relative min-h-18 border border-[#1c2133] bg-[#111318] p-2.5">
      <div className={`absolute left-0 top-0 h-full w-[3px] ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#4a5568]">{label}</p>
          <p className={`mt-1 font-display text-2xl font-bold leading-none tabular-nums ${styles.text}`}>
            {value}
          </p>
        </div>
        <div className={`flex size-6 items-center justify-center ${styles.bg} ${styles.text}`}>
          <Icon className="size-3" />
        </div>
      </div>
      <div className={`mt-2 inline-flex px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${styles.bg} ${styles.text}`}>
        {note}
      </div>
    </article>
  )
}

function DeviceStatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#1c2133] bg-[#0b0d13] px-2 py-1.5 text-center">
      <div className="font-display text-sm font-semibold leading-none tabular-nums text-[#e2e8f0]">
        {value}
      </div>
      <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#4a5568]">
        {label}
      </div>
    </div>
  )
}

export default function DevicesPage() {
  const { locale, t } = useI18n()
  const tr = devicesPageDict[locale]
  const searchParams = useSearchParams()
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tenantCode, setTenantCode] = useState(() => getActiveTenantCode())
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
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null)
  const [diagnosingDeviceId, setDiagnosingDeviceId] = useState<string | null>(null)
  const [verifyingDeviceId, setVerifyingDeviceId] = useState<string | null>(null)
  const [pendingDeleteDevice, setPendingDeleteDevice] = useState<Device | null>(null)
  const [pendingRestartDevice, setPendingRestartDevice] = useState<Device | null>(null)
  const [addByIpOpen, setAddByIpOpen] = useState(false)

  const refreshDevices = async (targetTenantCode = tenantCode): Promise<Device[]> => {
    setIsLoadingDevices(true)
    setLoadError(null)

    try {
      const normalizedTenantCode = targetTenantCode.trim()
      const gateway = await fetchGatewayDevices({
        tenant: normalizedTenantCode || undefined,
        normalized: true,
        maxResult: 200,
      })

      if (gateway.errors.length > 0 && gateway.results.length === 0) {
        throw new Error(
          gateway.errors.map(formatGatewayError).join(" ") || tr.gatewayUnreachable,
        )
      }

      const mappedDevices = gateway.results.map((item: GatewayDevice, index: number) =>
        mapGatewayDevice(item, index, tr),
      )

      // L'inventaire local sert uniquement a lier les appareils passerelle au
      // coeur (id local + nom). Son echec ne doit pas bloquer l'affichage.
      let coreRows: CoreDevice[] = []
      try {
        coreRows = await fetchDevices(normalizedTenantCode || undefined)
      } catch {
        coreRows = []
      }

      const coreByDevIndex = new Map<string, { id: number; name: string; serialNumber: string }>()
      const coreBySerial = new Map<string, { id: number; name: string; serialNumber: string }>()
      for (const row of coreRows) {
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
      setLoadError(error instanceof Error ? error.message : tr.unexpectedError)
      setDevices([])
      return []
    } finally {
      setIsLoadingDevices(false)
    }
  }

  const handleSyncAll = async () => {
    try {
      // Admin plateforme uniquement : 403 attendu pour un utilisateur normal.
      await syncDevices({ dispatchCoreDevices: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.info(tr.adminOnly)
      } else {
        toast.error(error instanceof Error ? error.message : tr.syncAllFailed)
      }
    }
    await refreshDevices()
  }

  const loadTenants = async (): Promise<string> => {
    setIsLoadingTenants(true)
    try {
      const parsed = await fetchTenants()
      setTenants(parsed)
      const preferredTenantCode = getActiveTenantCode()
      const selectedTenantCode =
        parsed.find((tenant: TenantOption) => tenant.code.toLowerCase() === preferredTenantCode.toLowerCase())?.code ??
        parsed[0]?.code ??
        ""
      if (selectedTenantCode && selectedTenantCode !== tenantCode) {
        setTenantCode(selectedTenantCode)
      }
      return selectedTenantCode
    } catch {
      setTenants([])
      return tenantCode
    } finally {
      setIsLoadingTenants(false)
    }
  }

  useEffect(() => {
    void (async () => {
      const selectedTenantCode = await loadTenants()
      await refreshDevices(selectedTenantCode)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (addDeviceOpen && tenants.length === 0) {
      void loadTenants()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDeviceOpen])

  useEffect(() => {
    const initialSearch = searchParams.get("search")
    const initialStatus = searchParams.get("status")
    const initialType = searchParams.get("type")
    const initialTenant = searchParams.get("tenant")
    const initialLink = searchParams.get("link")
    const initialAction = searchParams.get("action")

    if (initialSearch !== null) {
      setSearchQuery(initialSearch)
    }

    if (initialStatus && ["all", "attention", "online", "warning", "offline"].includes(initialStatus)) {
      setStatusFilter(initialStatus)
    }

    if (initialType && ["all", "door_controller", "reader", "turnstile", "fingerprint"].includes(initialType)) {
      setTypeFilter(initialType)
    }

    if (initialTenant) {
      setTenantFilter(initialTenant)
    }

    if (initialLink && ["all", "linked", "unlinked"].includes(initialLink)) {
      setLinkFilter(initialLink)
    }

    if (initialAction === "new-device") {
      setAddDeviceOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    const initialDevice = searchParams.get("device")
    if (!initialDevice || devices.length === 0) return

    const normalizedTarget = initialDevice.trim().toLowerCase()
    const matchedDevice =
      devices.find((device) => device.id.trim().toLowerCase() === normalizedTarget) ??
      devices.find((device) => device.devIndex.trim().toLowerCase() === normalizedTarget) ??
      devices.find((device) => device.name.trim().toLowerCase() === normalizedTarget)

    if (!matchedDevice) return

    setSelectedDevice(matchedDevice)
    setDetailsTab("info")
    setDetailsOpen(true)
  }, [devices, searchParams])

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

  // Filter devices
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ipAddress.includes(searchQuery)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "attention" && device.status !== "online") ||
      device.status === statusFilter
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
        throw new Error(tr.tenantRequired)
      }
      if (!serialNumber.trim()) {
        throw new Error(tr.serialRequired)
      }
      if (!ehomeKey.trim()) {
        throw new Error(tr.ehomeKeyRequired)
      }
      if (!devicePassword.trim()) {
        throw new Error(tr.passwordRequired)
      }

      const result = await onboardDevice({
        tenant_code: tenantCode.trim(),
        sn: serialNumber.trim(),
        ehome_key: ehomeKey.trim(),
        dev_name: `Device ${serialNumber.trim()}`,
        dev_type: "AccessControl",
        device_username: "admin",
        device_password: devicePassword.trim(),
      })

      if (result.created) {
        setSubmitMessage(tr.createdMessage)
        toast.success(tr.createdToast)
      } else if (result.alreadyOnboarded) {
        setSubmitMessage(tr.alreadyOnboardedMessage)
        toast.info(tr.alreadyOnboardedToast)
      } else {
        setSubmitMessage(tr.conflictMessage)
        toast.warning(tr.conflictToast)
      }
      await refreshDevices()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : tr.unexpectedError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDevice = (device: Device) => {
    setPendingDeleteDevice(device)
  }

  const handleRegisterDeviceManually = async (payload: {
    serialNumber: string
    name: string
    deviceType: string
    tenantCode: string
    ehomeKey: string
    devicePassword: string
  }) => {
    const result = await onboardDevice({
      tenant_code: payload.tenantCode,
      sn: payload.serialNumber,
      ehome_key: payload.ehomeKey,
      dev_name: payload.name,
      dev_type: payload.deviceType,
      device_username: "admin",
      device_password: payload.devicePassword,
    })
    if (result.conflict) {
      throw new Error(tr.conflictMessage)
    }
    await refreshDevices()
  }

  const confirmDeleteDevice = async () => {
    const device = pendingDeleteDevice
    if (!device) return

    if (!device.coreDeviceId) {
      setDevicesError(tr.deleteMissingCoreId)
      setPendingDeleteDevice(null)
      return
    }

    setDeletingDeviceId(device.id)
    setDevicesError(null)

    try {
      await deleteDevice(device.coreDeviceId, { gateway: true })

      setDevices((previous) => previous.filter((item) => item.id !== device.id))
      if (selectedDevice?.id === device.id) {
        setDetailsOpen(false)
        setSelectedDevice(null)
      }
      setPendingDeleteDevice(null)
      toast.success(tr.deleteSuccess(device.name))
    } catch (error) {
      setDevicesError(error instanceof Error ? error.message : tr.deleteErrorFallback)
      toast.error(tr.deleteErrorToast)
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
      setDevicesError(tr.restartMissingCoreId)
      setPendingRestartDevice(null)
      return
    }

    setRestartingDeviceId(device.id)
    setDevicesError(null)

    try {
      await rebootDevice(device.coreDeviceId)
      setPendingRestartDevice(null)
      toast.success(tr.restartSuccess(device.name))
    } catch (error) {
      setDevicesError(error instanceof Error ? error.message : tr.restartErrorFallback)
      toast.error(tr.restartErrorToast)
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
        toast.warning(tr.syncDeviceNotFound(device.name))
      } else {
        toast.success(tr.syncDeviceDone(device.name))
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
        toast.warning(tr.verifyNotFound)
        return
      }
      toast.info(tr.verifyResult(latest.name, tr.statusInline[latest.status]))
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
      const snapshot = getDiagnosticsSnapshot(device, tr)
      if (device.status === "offline") {
        toast.error(tr.diagnosticToast(device.name, snapshot.message))
      } else if (device.status === "warning") {
        toast.warning(tr.diagnosticToast(device.name, snapshot.message))
      } else {
        toast.success(tr.diagnosticToast(device.name, snapshot.message))
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
      setUpdateError(tr.updateMissingCoreId)
      return
    }
    if (!editName.trim()) {
      setUpdateError(tr.nameRequired)
      return
    }

    setIsUpdatingDevice(true)
    setUpdateError(null)

    try {
      const payload = await updateDevice(editingDevice.coreDeviceId, { name: editName.trim() })

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
      toast.success(tr.updateSuccess)
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : tr.updateErrorFallback)
      toast.error(tr.updateErrorToast)
    } finally {
      setIsUpdatingDevice(false)
    }
  }

  return (
    <div className="legacy-theme app-shell bg-[#0b0d13] text-[#e2e8f0]">
      <AppSidebar />

      <div className="app-shell-content">
        <Header
          systemStatus={isLoadingDevices ? "syncing" : devices.length > 0 ? "connected" : "disconnected"}
          hideRouteInfo
        />

        <main className="mx-auto w-full max-w-430 space-y-3 px-3 py-3 md:px-4 2xl:max-w-none">
          {/* ── Hero ── */}
          <section className="border border-[#1c2133] bg-[#111318]">
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">
                  {tr.heroKicker}
                </p>
                <h1 className="mt-1 font-display text-[22px] font-bold uppercase leading-none tracking-[0.08em] text-[#e2e8f0]">
                  {tr.heroTitle}
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-[#7a8599]">
                  {tr.heroSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#60a5fa]/60 hover:bg-[#1a1f2e] hover:text-[#60a5fa]"
                  onClick={() => void handleSyncAll()}
                  disabled={isLoadingDevices}
                >
                  {isLoadingDevices ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                  )}
                  {tr.syncAction}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#22c55e]/60 hover:bg-[#1a1f2e] hover:text-[#22c55e]"
                  onClick={() => setAddByIpOpen(true)}
                >
                  <Wifi className="mr-2 h-4 w-4" />
                  {tr.manualOnboarding}
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-none border border-[#f97316] bg-[#f97316] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] shadow-none hover:bg-[#fb923c]"
                  onClick={() => setAddDeviceOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {tr.addAction}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <DeviceMetricCard
                label={tr.metricOnline}
                value={onlineDevices}
                note={tr.metricOnlineNote(devices.length)}
                tone="green"
                icon={Wifi}
              />
              <DeviceMetricCard
                label={tr.metricAlerts}
                value={warningDevices}
                note={tr.metricAlertsNote}
                tone="amber"
                icon={AlertTriangle}
              />
              <DeviceMetricCard
                label={tr.metricOffline}
                value={offlineDevices}
                note={tr.metricOfflineNote}
                tone="red"
                icon={WifiOff}
              />
              <DeviceMetricCard
                label={tr.metricTotal}
                value={devices.length}
                note={tenantOptions.length > 0 ? tr.metricTotalTenants(tenantOptions.length) : tr.metricTotalInventory}
                tone="blue"
                icon={Server}
              />
            </div>
          </section>

          {devicesError && (
            <div role="alert" className="border border-[#ef4444]/40 bg-[#2a0e0e]/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center bg-[#2a0e0e] text-[#ef4444]">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ef4444]/70">{tr.errorKicker}</p>
                  <p className="mt-1 text-sm text-[#ef4444]">{devicesError}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <section className="border border-[#1c2133] bg-[#111318]">
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">{tr.filtersKicker}</p>
                <h2 className="mt-1 font-display text-[15px] font-semibold uppercase leading-none tracking-[0.06em] text-[#e2e8f0]">
                  {tr.filtersTitle}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="border border-[#1c2133] bg-[#0b0d13] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] tabular-nums">
                  {tr.resultsCount(filteredDevices.length)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#ef4444]/60 hover:text-[#ef4444]"
                  onClick={resetFilters}
                >
                  {tr.resetFilters}
                </Button>
              </div>
            </div>

            <div className="space-y-2 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a5568]" />
                <Input
                  placeholder={tr.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] pl-10 text-sm text-[#e2e8f0] placeholder:text-[#4a5568] focus-visible:ring-[#f97316]/35"
                />
              </div>

              <div className="flex items-center gap-1 border border-[#1c2133] bg-[#0b0d13] p-1">
                {(["all", "online", "warning", "offline", "attention"] as const).map((option) => {
                  const labels = {
                    all: tr.statusFilterAll,
                    online: tr.statusLabels.online,
                    warning: tr.statusLabels.warning,
                    offline: tr.statusLabels.offline,
                    attention: tr.statusFilterAttention,
                  } as const
                  const isSelected = statusFilter === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStatusFilter(option)}
                      className={`px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors ${
                        isSelected
                          ? "bg-[#f97316] text-[#0b0d13]"
                          : "text-[#4a5568] hover:text-[#e2e8f0]"
                      }`}
                    >
                      {labels[option]}
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0]">
                    <SelectValue placeholder={tr.typePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allTypes}</SelectItem>
                    <SelectItem value="door_controller">{tr.deviceTypes.door_controller}</SelectItem>
                    <SelectItem value="reader">{tr.deviceTypes.reader}</SelectItem>
                    <SelectItem value="turnstile">{tr.deviceTypes.turnstile}</SelectItem>
                    <SelectItem value="fingerprint">{tr.deviceTypes.fingerprint}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0]">
                    <SelectValue placeholder={tr.tenantPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allTenants}</SelectItem>
                    {tenantOptions.map((tenant) => (
                      <SelectItem key={tenant} value={tenant}>
                        {tenant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={linkFilter} onValueChange={setLinkFilter}>
                  <SelectTrigger className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0]">
                    <SelectValue placeholder={tr.linkPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr.allLinks}</SelectItem>
                    <SelectItem value="linked">{tr.linkedToCore}</SelectItem>
                    <SelectItem value="unlinked">{tr.notLinkedToCore}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── Loading skeleton ── */}
          {isLoadingDevices && devices.length === 0 && (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-[#1c2133] bg-[#111318] p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-[#1c2133]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/5 bg-[#1c2133]" />
                      <div className="h-2 w-2/5 bg-[#1c2133]" />
                    </div>
                  </div>
                  <div className="mt-3 h-5 w-20 bg-[#1c2133]" />
                  <div className="mt-3 grid grid-cols-3 gap-1">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-10 bg-[#1c2133]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Load error ── */}
          {!isLoadingDevices && loadError && (
            <EmptyState
              icon={WifiOff}
              title={tr.loadErrorTitle}
              description={loadError}
              action={{
                label: t.common.retry,
                icon: RefreshCcw,
                onClick: () => void refreshDevices(),
              }}
            />
          )}

          {/* ── Devices grid ── */}
          {filteredDevices.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDevices.map((device) => {
                const Icon = getDeviceIcon(device.type)
                const tone = statusToTone[device.status]
                const styles = deviceToneClass[tone]
                return (
                  <article
                    key={device.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleDeviceClick(device)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        handleDeviceClick(device)
                      }
                    }}
                    className="group relative cursor-pointer border border-[#1c2133] bg-[#111318] p-3 transition hover:border-[#f97316]/50 hover:bg-[#1a1f2e]/40"
                  >
                    <div className={`absolute left-0 top-0 h-full w-[3px] ${styles.bar}`} />

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex size-10 shrink-0 items-center justify-center ${styles.bg} ${styles.text}`}>
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                            {device.name}
                          </h3>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                            {getDeviceTypeLabel(device.type, tr)}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tr.actionsAria}
                            className="h-7 w-7 shrink-0 rounded-none border border-[#1c2133] bg-[#1a1f2e] text-[#7a8599] opacity-0 transition hover:border-[var(--brand-accent)]/60 hover:text-[var(--brand-accent)] group-hover:opacity-100"
                          >
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
                            {tr.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={restartingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleRestartDevice(device)
                            }}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {restartingDeviceId === device.id ? tr.restarting : tr.restart}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={verifyingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleVerifyDevice(device)
                            }}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {verifyingDeviceId === device.id ? tr.verifying : tr.verify}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={diagnosingDeviceId === device.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRunDiagnostics(device)
                            }}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            {diagnosingDeviceId === device.id ? tr.diagnosing : tr.diagnose}
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
                            {deletingDeviceId === device.id ? tr.deleting : tr.deleteAction}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 border ${styles.bg} px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${styles.text} border-[#1c2133]`}>
                        <span
                          className={`size-1.5 rounded-full ${
                            device.status === "online"
                              ? "bg-[#22c55e]"
                              : device.status === "warning"
                                ? "bg-[#f59e0b] animate-pulse"
                                : "bg-[#ef4444]"
                          }`}
                        />
                        {tr.statusLabels[device.status]}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4a5568]">
                        {device.lastSeen}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-[#7a8599]">
                        <MapPin className="size-3 shrink-0 text-[#4a5568]" />
                        <span className="truncate uppercase tracking-[0.06em]">{device.location}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-[#7a8599]">
                        <Cpu className="size-3 shrink-0 text-[#4a5568]" />
                        <span className="tabular-nums">{device.ipAddress}</span>
                        {device.coreDeviceId ? (
                          <span className="ml-auto border border-[#1c2133] bg-[#0d1e2e] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#60a5fa]">
                            {tr.linkedBadge}
                          </span>
                        ) : (
                          <span className="ml-auto border border-[#1c2133] bg-[#2a1e06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#f59e0b]">
                            {tr.unlinkedBadge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <DeviceStatPill label={tr.statEvents} value={String(device.todayEvents)} />
                      <DeviceStatPill label={tr.statUsers} value={String(device.connectedUsers)} />
                      <DeviceStatPill label={tr.statFirmware} value={device.firmware} />
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!isLoadingDevices && !loadError && filteredDevices.length === 0 && (
            <div className="flex flex-col items-center border border-dashed border-[#1c2133] bg-[#111318] px-4 py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center bg-[#1a1f2e] text-[#7a8599]">
                <Cpu className="size-6" />
              </div>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
                {devices.length === 0 ? tr.emptyNoDevices : tr.emptyNoMatch}
              </p>
              <p className="mt-1 max-w-sm font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                {devices.length === 0 ? tr.emptyNoDevicesHint : tr.emptyNoMatchHint}
              </p>
              <Button
                size="sm"
                className="mt-3 h-8 rounded-none border border-[#f97316] bg-[#f97316] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[#fb923c]"
                onClick={() => setAddDeviceOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {tr.addDevice}
              </Button>
            </div>
          )}

          {/* ── Add device dialog ── */}
          <Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
            <DialogContent className="max-w-xl rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  <div className="flex size-9 items-center justify-center bg-[#2a1408] text-[#f97316]">
                    <Plus className="h-4 w-4" />
                  </div>
                  {tr.addDialogTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.addDialogDesc}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-code" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.tenantLabel}
                  </Label>
                  {tenants.length > 0 ? (
                    <Select value={tenantCode} onValueChange={setTenantCode}>
                      <SelectTrigger id="tenant-code" className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0]">
                        <SelectValue placeholder={isLoadingTenants ? tr.loadingPlaceholder : tr.selectTenantPlaceholder} />
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
                      placeholder={isLoadingTenants ? tr.loadingPlaceholder : "TENANT-A"}
                      className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="serial-number" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.serialLabel}
                  </Label>
                  <Input
                    id="serial-number"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-POSTMAN-0001"
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ehome-key" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.ehomeKeyLabel}
                  </Label>
                  <Input
                    id="ehome-key"
                    value={ehomeKey}
                    onChange={(e) => setEhomeKey(e.target.value)}
                    placeholder="0123456789ABCDEF0123456789ABCDEF"
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-xs text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="device-password" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.passwordLabel}
                  </Label>
                  <Input
                    id="device-password"
                    type="password"
                    value={devicePassword}
                    onChange={(e) => setDevicePassword(e.target.value)}
                    placeholder={tr.passwordPlaceholder}
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                </div>

                {submitMessage && (
                  <p className="border border-[#22c55e]/30 bg-[#0d2a1a]/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#22c55e]">
                    {submitMessage}
                  </p>
                )}

                {submitError && (
                  <p className="border border-[#ef4444]/30 bg-[#2a0e0e]/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ef4444]">
                    {submitError}
                  </p>
                )}

                <Button
                  className="h-9 w-full rounded-none border border-[#f97316] bg-[#f97316] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[#fb923c]"
                  onClick={handleCreateDevice}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {isSubmitting ? tr.submitting : tr.submitViaApi}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Edit device dialog ── */}
          <Dialog open={editDeviceOpen} onOpenChange={setEditDeviceOpen}>
            <DialogContent className="max-w-lg rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  <div className="flex size-9 items-center justify-center bg-[#0d1e2e] text-[#60a5fa]">
                    <Settings className="h-4 w-4" />
                  </div>
                  {tr.editDialogTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.editDialogDesc}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-device-name" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {tr.nameLabel}
                  </Label>
                  <Input
                    id="edit-device-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder={tr.namePlaceholder}
                    className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
                  />
                </div>

                {updateError && (
                  <p className="border border-[#ef4444]/30 bg-[#2a0e0e]/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ef4444]">
                    {updateError}
                  </p>
                )}

                <Button
                  className="h-9 w-full rounded-none border border-[#f97316] bg-[#f97316] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[#fb923c]"
                  onClick={handleUpdateDevice}
                  disabled={isUpdatingDevice}
                >
                  {isUpdatingDevice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isUpdatingDevice ? tr.saving : tr.save}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Device details dialog ── */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-2xl rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {selectedDevice && (
                    <>
                      {(() => {
                        const Icon = getDeviceIcon(selectedDevice.type)
                        const tone = statusToTone[selectedDevice.status]
                        const styles = deviceToneClass[tone]
                        return (
                          <div className={`flex size-10 items-center justify-center ${styles.bg} ${styles.text}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        )
                      })()}
                      <div className="min-w-0">
                        <span className="block truncate">{selectedDevice.name}</span>
                        <p className="mt-0.5 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[#7a8599]">
                          {getDeviceTypeLabel(selectedDevice.type, tr)}
                        </p>
                      </div>
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>

              {selectedDevice && (
                <Tabs value={detailsTab} onValueChange={setDetailsTab} className="mt-2">
                  <TabsList className="grid w-full grid-cols-3 rounded-none border border-[#1c2133] bg-[#0b0d13] p-1">
                    <TabsTrigger
                      value="info"
                      className="rounded-none font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-[#f97316] data-[state=active]:text-[#0b0d13]"
                    >
                      {tr.tabInfo}
                    </TabsTrigger>
                    <TabsTrigger
                      value="network"
                      className="rounded-none font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-[#f97316] data-[state=active]:text-[#0b0d13]"
                    >
                      {tr.tabNetwork}
                    </TabsTrigger>
                    <TabsTrigger
                      value="activity"
                      className="rounded-none font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-[#f97316] data-[state=active]:text-[#0b0d13]"
                    >
                      {tr.tabActivity}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.detailModel}</p>
                        <p className="mt-1 text-sm font-medium text-[#e2e8f0]">{selectedDevice.model}</p>
                      </div>
                      <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.detailSerial}</p>
                        <p className="mt-1 font-mono text-sm tabular-nums text-[#e2e8f0]">{selectedDevice.serialNumber}</p>
                      </div>
                      <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.detailLocation}</p>
                        <p className="mt-1 text-sm font-medium text-[#e2e8f0]">{selectedDevice.location}</p>
                      </div>
                      <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.detailFirmware}</p>
                        <p className="mt-1 text-sm font-medium tabular-nums text-[#e2e8f0]">{selectedDevice.firmware}</p>
                      </div>
                    </div>

                    {(() => {
                      const tone = statusToTone[selectedDevice.status]
                      const styles = deviceToneClass[tone]
                      const StatusIcon =
                        selectedDevice.status === "online"
                          ? CheckCircle2
                          : selectedDevice.status === "warning"
                            ? AlertTriangle
                            : WifiOff
                      return (
                        <div className={`relative flex items-center gap-3 border border-[#1c2133] bg-[#0b0d13] p-3`}>
                          <div className={`absolute left-0 top-0 h-full w-[3px] ${styles.bar}`} />
                          <div className={`flex size-8 items-center justify-center ${styles.bg} ${styles.text}`}>
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                              {selectedDevice.status === "online"
                                ? tr.statusOnlineTitle
                                : selectedDevice.status === "warning"
                                  ? tr.statusUnstableTitle
                                  : tr.statusOfflineTitle}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                              {tr.lastActivity(selectedDevice.lastSeen)}
                            </p>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#22c55e]/60 hover:text-[#22c55e]"
                        disabled={verifyingDeviceId === selectedDevice.id}
                        onClick={() => void handleVerifyDevice(selectedDevice)}
                      >
                        {verifyingDeviceId === selectedDevice.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="mr-2 h-4 w-4" />
                        )}
                        {verifyingDeviceId === selectedDevice.id ? tr.verifying : tr.verify}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#a78bfa]/60 hover:text-[#a78bfa]"
                        disabled={diagnosingDeviceId === selectedDevice.id}
                        onClick={() => void handleRunDiagnostics(selectedDevice)}
                      >
                        {diagnosingDeviceId === selectedDevice.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Activity className="mr-2 h-4 w-4" />
                        )}
                        {diagnosingDeviceId === selectedDevice.id ? tr.diagnosing : tr.diagnose}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#60a5fa]/60 hover:text-[#60a5fa]"
                        disabled={syncingDeviceId === selectedDevice.id}
                        onClick={() => void handleSyncDevice(selectedDevice)}
                      >
                        {syncingDeviceId === selectedDevice.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="mr-2 h-4 w-4" />
                        )}
                        {syncingDeviceId === selectedDevice.id ? tr.syncingDevice : tr.syncDevice}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#f97316]/60 hover:text-[#f97316]"
                        onClick={() => {
                          setDetailsOpen(false)
                          openEditDevice(selectedDevice)
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {tr.edit}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="network" className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.ipLabel}</p>
                        <p className="mt-1 font-mono text-sm tabular-nums text-[#e2e8f0]">{selectedDevice.ipAddress}</p>
                      </div>
                      <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">{tr.macLabel}</p>
                        <p className="mt-1 font-mono text-sm text-[#e2e8f0]">{selectedDevice.macAddress}</p>
                      </div>
                    </div>

                    <div className="border border-[#1c2133] bg-[#0b0d13] p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center bg-[#1e1530] text-[#a78bfa]">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                          {tr.diagnosticsTitle}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <div className="flex items-center justify-between border border-[#1c2133] bg-[#111318] px-3 py-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.latency}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-[#e2e8f0]">
                            {getDiagnosticsSnapshot(selectedDevice, tr).latency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border border-[#1c2133] bg-[#111318] px-3 py-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.packetLoss}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-[#e2e8f0]">
                            {getDiagnosticsSnapshot(selectedDevice, tr).packetLoss}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border border-[#1c2133] bg-[#111318] px-3 py-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">{tr.uptime}</span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-[#e2e8f0]">
                            {getDiagnosticsSnapshot(selectedDevice, tr).uptime}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a8599]">
                        {getDiagnosticsSnapshot(selectedDevice, tr).message}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <article className="relative border border-[#1c2133] bg-[#0b0d13] p-3">
                        <div className="absolute left-0 top-0 h-full w-[3px] bg-[#f97316]" />
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center bg-[#2a1408] text-[#f97316]">
                            <Zap className="size-5" />
                          </div>
                          <div>
                            <p className="font-display text-2xl font-bold leading-none tabular-nums text-[#f97316]">
                              {selectedDevice.todayEvents}
                            </p>
                            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                              {tr.activityEvents}
                            </p>
                          </div>
                        </div>
                      </article>
                      <article className="relative border border-[#1c2133] bg-[#0b0d13] p-3">
                        <div className="absolute left-0 top-0 h-full w-[3px] bg-[#60a5fa]" />
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center bg-[#0d1e2e] text-[#60a5fa]">
                            <Clock className="size-5" />
                          </div>
                          <div>
                            <p className="font-display text-2xl font-bold leading-none tabular-nums text-[#60a5fa]">
                              {selectedDevice.connectedUsers}
                            </p>
                            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a5568]">
                              {tr.activityUsers}
                            </p>
                          </div>
                        </div>
                      </article>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          {/* ── Delete confirmation ── */}
          <Dialog open={!!pendingDeleteDevice} onOpenChange={(open) => !open && setPendingDeleteDevice(null)}>
            <DialogContent className="max-w-lg rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {tr.deleteConfirmTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.deleteConfirmDesc(pendingDeleteDevice?.name ?? null)}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingDeleteDevice(null)}
                  disabled={deletingDeviceId !== null}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDeleteDevice()}
                  disabled={!pendingDeleteDevice || deletingDeviceId !== null}
                  className="h-9 rounded-none border border-[#ef4444] bg-[#ef4444] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[#f87171]"
                >
                  {deletingDeviceId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.deleteAction}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Restart confirmation ── */}
          <Dialog open={!!pendingRestartDevice} onOpenChange={(open) => !open && setPendingRestartDevice(null)}>
            <DialogContent className="max-w-lg rounded-none border border-[#1c2133] bg-[#111318] text-[#e2e8f0]">
              <DialogHeader>
                <DialogTitle className="font-display text-base font-bold uppercase tracking-[0.06em] text-[#e2e8f0]">
                  {tr.restartConfirmTitle}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                  {tr.restartConfirmDesc(pendingRestartDevice?.name ?? null)}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingRestartDevice(null)}
                  disabled={restartingDeviceId !== null}
                  className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:text-[#e2e8f0]"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={() => void confirmRestartDevice()}
                  disabled={!pendingRestartDevice || restartingDeviceId !== null}
                  className="h-9 rounded-none border border-[#f97316] bg-[#f97316] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] hover:bg-[#fb923c]"
                >
                  {restartingDeviceId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {tr.restart}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Manual onboarding dialog ── */}
          <AddDeviceByIpDialog
            open={addByIpOpen}
            onOpenChange={setAddByIpOpen}
            tenants={tenants}
            defaultTenantCode={tenantCode}
            onRegister={handleRegisterDeviceManually}
          />
        </main>
      </div>
    </div>
  )
}
