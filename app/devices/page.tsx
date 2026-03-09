"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
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
} from "lucide-react"

type Device = {
  id: string
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

// Mock data
const devices: Device[] = [
  {
    id: "dev-001",
    name: "Main Entrance A",
    type: "door_controller",
    model: "DS-K1T671M",
    serialNumber: "HK2024001234",
    location: "Building A, Ground Floor",
    ipAddress: "192.168.1.101",
    macAddress: "00:1A:2B:3C:4D:01",
    status: "online",
    lastSeen: "Just now",
    firmware: "v2.3.5",
    connectedUsers: 256,
    todayEvents: 342,
  },
  {
    id: "dev-002",
    name: "Main Entrance B",
    type: "door_controller",
    model: "DS-K1T671M",
    serialNumber: "HK2024001235",
    location: "Building A, Ground Floor",
    ipAddress: "192.168.1.102",
    macAddress: "00:1A:2B:3C:4D:02",
    status: "online",
    lastSeen: "Just now",
    firmware: "v2.3.5",
    connectedUsers: 256,
    todayEvents: 298,
  },
  {
    id: "dev-003",
    name: "Floor 2 Access",
    type: "door_controller",
    model: "DS-K1T341AM",
    serialNumber: "HK2024001236",
    location: "Building A, Floor 2",
    ipAddress: "192.168.1.103",
    macAddress: "00:1A:2B:3C:4D:03",
    status: "online",
    lastSeen: "Just now",
    firmware: "v2.3.4",
    connectedUsers: 45,
    todayEvents: 87,
  },
  {
    id: "dev-004",
    name: "Floor 3 Access",
    type: "door_controller",
    model: "DS-K1T341AM",
    serialNumber: "HK2024001237",
    location: "Building A, Floor 3",
    ipAddress: "192.168.1.104",
    macAddress: "00:1A:2B:3C:4D:04",
    status: "online",
    lastSeen: "Just now",
    firmware: "v2.3.4",
    connectedUsers: 52,
    todayEvents: 95,
  },
  {
    id: "dev-005",
    name: "Server Room",
    type: "reader",
    model: "DS-K1F820-F",
    serialNumber: "HK2024001238",
    location: "Building B, Basement",
    ipAddress: "192.168.1.105",
    macAddress: "00:1A:2B:3C:4D:05",
    status: "warning",
    lastSeen: "2 min ago",
    firmware: "v1.8.2",
    connectedUsers: 12,
    todayEvents: 23,
  },
  {
    id: "dev-006",
    name: "HR Office",
    type: "door_controller",
    model: "DS-K1T341AM",
    serialNumber: "HK2024001239",
    location: "Building A, Floor 4",
    ipAddress: "192.168.1.106",
    macAddress: "00:1A:2B:3C:4D:06",
    status: "online",
    lastSeen: "Just now",
    firmware: "v2.3.4",
    connectedUsers: 8,
    todayEvents: 34,
  },
  {
    id: "dev-007",
    name: "Creative Lab",
    type: "door_controller",
    model: "DS-K1T671M",
    serialNumber: "HK2024001240",
    location: "Building C, Floor 1",
    ipAddress: "192.168.2.101",
    macAddress: "00:1A:2B:3C:4D:07",
    status: "online",
    lastSeen: "Just now",
    firmware: "v2.3.5",
    connectedUsers: 25,
    todayEvents: 56,
  },
  {
    id: "dev-008",
    name: "Parking Gate",
    type: "turnstile",
    model: "DS-K3B501-R",
    serialNumber: "HK2024001241",
    location: "Parking Lot",
    ipAddress: "192.168.3.101",
    macAddress: "00:1A:2B:3C:4D:08",
    status: "online",
    lastSeen: "Just now",
    firmware: "v3.1.0",
    connectedUsers: 200,
    todayEvents: 412,
  },
  {
    id: "dev-009",
    name: "Data Center",
    type: "fingerprint",
    model: "DS-K1T804MF",
    serialNumber: "HK2024001242",
    location: "Building B, Basement",
    ipAddress: "192.168.1.107",
    macAddress: "00:1A:2B:3C:4D:09",
    status: "online",
    lastSeen: "Just now",
    firmware: "v2.0.1",
    connectedUsers: 8,
    todayEvents: 15,
  },
  {
    id: "dev-010",
    name: "Emergency Exit B2",
    type: "door_controller",
    model: "DS-K1T341AM",
    serialNumber: "HK2024001243",
    location: "Building A, Basement",
    ipAddress: "192.168.1.108",
    macAddress: "00:1A:2B:3C:4D:10",
    status: "offline",
    lastSeen: "5 hours ago",
    firmware: "v2.3.4",
    connectedUsers: 0,
    todayEvents: 0,
  },
]

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
  const [baseUrl, setBaseUrl] = useState("http://localhost:8000")
  const [tenantCode, setTenantCode] = useState("HQ-CASA")
  const [serialNumber, setSerialNumber] = useState("SN-POSTMAN-0001")
  const [ehomeKey, setEhomeKey] = useState("0123456789ABCDEF0123456789ABCDEF")
  const [deviceName, setDeviceName] = useState("Pointeuse Entrée Principale")
  const [deviceType, setDeviceType] = useState("AccessControl")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  const handleOnboardDevice = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitMessage(null)

    try {
      const normalizedBaseUrl = baseUrl.replace(/\/$/, "")

      const tokenResponse = await fetch(`${normalizedBaseUrl}/api/auth/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "admin",
          password: "Lsg@2020",
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error(`Echec authentification (${tokenResponse.status})`)
      }

      const tokenData = await tokenResponse.json()
      if (!tokenData?.access) {
        throw new Error("Token d'accès manquant dans la réponse JWT")
      }

      const onboardResponse = await fetch(`${normalizedBaseUrl}/api/devices/onboard/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.access}`,
        },
        body: JSON.stringify({
          tenant_code: tenantCode,
          sn: serialNumber,
          ehome_key: ehomeKey,
          dev_name: deviceName,
          dev_type: deviceType,
        }),
      })

      const responseData = await onboardResponse.json().catch(() => ({}))

      if (![200, 201, 409].includes(onboardResponse.status)) {
        throw new Error(
          responseData?.detail || responseData?.message || `Echec onboarding (${onboardResponse.status})`,
        )
      }

      if (onboardResponse.status === 409) {
        setSubmitMessage("Conflit: ce numéro de série est déjà affecté à un autre tenant.")
      } else if (onboardResponse.status === 201) {
        setSubmitMessage("Appareil ajouté avec succès via /api/devices/onboard/ (201).")
      } else {
        setSubmitMessage("Appareil déjà onboardé sur ce tenant (200).")
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erreur inattendue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="p-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Appareils <span className="text-muted-foreground">({devices.length})</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gestion des controleurs et lecteurs HikVision
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Synchroniser
              </Button>
              <Button size="sm" onClick={() => setAddDeviceOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un appareil
              </Button>
            </div>
          </div>

          <Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Ajouter un appareil (API Hikvision)</DialogTitle>
                <DialogDescription>
                  Authentification automatique via <code>/api/auth/token/</code> avec admin,
                  puis onboarding avec <code>/api/devices/onboard/</code>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="base-url">Base URL API</Label>
                  <Input
                    id="base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-code">Tenant code</Label>
                  <Input
                    id="tenant-code"
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value)}
                    placeholder="HQ-CASA"
                  />
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
                  <Label htmlFor="device-name">dev_name</Label>
                  <Input
                    id="device-name"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Pointeuse Entrée Principale"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-type">dev_type</Label>
                  <Input
                    id="device-type"
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    placeholder="AccessControl"
                  />
                </div>

                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Login utilisé : <span className="font-mono">admin</span> — Password :
                  <span className="font-mono"> Lsg@2020</span>
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

                <Button className="w-full" onClick={handleOnboardDevice} disabled={isSubmitting}>
                  {isSubmitting ? "Ajout en cours..." : "Ajouter via API"}
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
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Configurer
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Redemarrer
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Power className="mr-2 h-4 w-4" />
                            {device.status === "offline" ? "Activer" : "Desactiver"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
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
