"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  DoorOpen,
  AlertTriangle,
  Calendar,
  RefreshCcw,
} from "lucide-react"

type AccessLog = {
  id: string
  employeeId: string
  employeeName: string
  department: string
  deviceId: string
  deviceName: string
  deviceLocation: string
  status: "granted" | "denied"
  reason?: string
  timestamp: string
  date: string
}

// Mock data - comprehensive access logs
const accessLogs: AccessLog[] = [
  {
    id: "log-001",
    employeeId: "EMP-001",
    employeeName: "Sarah Chen",
    department: "Engineering",
    deviceId: "dev-001",
    deviceName: "Main Entrance A",
    deviceLocation: "Building A, Ground Floor",
    status: "granted",
    timestamp: "09:03:22",
    date: "2024-01-15",
  },
  {
    id: "log-002",
    employeeId: "EMP-042",
    employeeName: "Michael Torres",
    department: "Marketing",
    deviceId: "dev-003",
    deviceName: "Floor 3 Access",
    deviceLocation: "Building A, Floor 3",
    status: "granted",
    timestamp: "09:02:58",
    date: "2024-01-15",
  },
  {
    id: "log-003",
    employeeId: "EMP-156",
    employeeName: "Emily Watson",
    department: "Finance",
    deviceId: "dev-005",
    deviceName: "Server Room",
    deviceLocation: "Building B, Basement",
    status: "denied",
    reason: "Access not authorized",
    timestamp: "09:02:31",
    date: "2024-01-15",
  },
  {
    id: "log-004",
    employeeId: "EMP-089",
    employeeName: "James Liu",
    department: "Engineering",
    deviceId: "dev-002",
    deviceName: "Main Entrance B",
    deviceLocation: "Building A, Ground Floor",
    status: "granted",
    timestamp: "09:01:45",
    date: "2024-01-15",
  },
  {
    id: "log-005",
    employeeId: "EMP-203",
    employeeName: "Anna Kowalski",
    department: "HR",
    deviceId: "dev-006",
    deviceName: "HR Office",
    deviceLocation: "Building A, Floor 4",
    status: "granted",
    timestamp: "09:00:12",
    date: "2024-01-15",
  },
  {
    id: "log-006",
    employeeId: "EMP-078",
    employeeName: "David Kim",
    department: "Sales",
    deviceId: "dev-001",
    deviceName: "Main Entrance A",
    deviceLocation: "Building A, Ground Floor",
    status: "granted",
    timestamp: "08:59:33",
    date: "2024-01-15",
  },
  {
    id: "log-007",
    employeeId: "EMP-112",
    employeeName: "Rachel Green",
    department: "Design",
    deviceId: "dev-007",
    deviceName: "Creative Lab",
    deviceLocation: "Building C, Floor 1",
    status: "granted",
    timestamp: "08:58:17",
    date: "2024-01-15",
  },
  {
    id: "log-008",
    employeeId: "EMP-099",
    employeeName: "Unknown Card",
    department: "-",
    deviceId: "dev-001",
    deviceName: "Main Entrance A",
    deviceLocation: "Building A, Ground Floor",
    status: "denied",
    reason: "Card not recognized",
    timestamp: "08:55:44",
    date: "2024-01-15",
  },
  {
    id: "log-009",
    employeeId: "EMP-245",
    employeeName: "Thomas Martin",
    department: "IT",
    deviceId: "dev-005",
    deviceName: "Server Room",
    deviceLocation: "Building B, Basement",
    status: "granted",
    timestamp: "08:55:00",
    date: "2024-01-15",
  },
  {
    id: "log-010",
    employeeId: "EMP-089",
    employeeName: "James Liu",
    department: "Engineering",
    deviceId: "dev-008",
    deviceName: "Parking Gate",
    deviceLocation: "Parking Lot",
    status: "granted",
    timestamp: "08:30:05",
    date: "2024-01-15",
  },
  {
    id: "log-011",
    employeeId: "EMP-001",
    employeeName: "Sarah Chen",
    department: "Engineering",
    deviceId: "dev-008",
    deviceName: "Parking Gate",
    deviceLocation: "Parking Lot",
    status: "granted",
    timestamp: "08:28:22",
    date: "2024-01-15",
  },
  {
    id: "log-012",
    employeeId: "EMP-078",
    employeeName: "David Kim",
    department: "Sales",
    deviceId: "dev-005",
    deviceName: "Server Room",
    deviceLocation: "Building B, Basement",
    status: "denied",
    reason: "Access not authorized",
    timestamp: "18:45:00",
    date: "2024-01-14",
  },
]

export default function AccessLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deviceFilter, setDeviceFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("today")
  const [isLive, setIsLive] = useState(true)

  // Calculate stats
  const todayLogs = accessLogs.filter((log) => log.date === "2024-01-15")
  const totalAccess = todayLogs.length
  const grantedAccess = todayLogs.filter((log) => log.status === "granted").length
  const deniedAccess = todayLogs.filter((log) => log.status === "denied").length

  // Get unique devices for filter
  const devices = [...new Set(accessLogs.map((log) => log.deviceName))]

  // Filter logs
  const filteredLogs = accessLogs.filter((log) => {
    const matchesSearch =
      log.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.deviceName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    const matchesDevice = deviceFilter === "all" || log.deviceName === deviceFilter
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && log.date === "2024-01-15") ||
      (dateFilter === "yesterday" && log.date === "2024-01-14")

    return matchesSearch && matchesStatus && matchesDevice && matchesDate
  })

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
                Journal d&apos;Acces
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Historique complet des evenements d&apos;acces en temps reel
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
              >
                {isLive && (
                  <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-red-500" />
                )}
                {isLive ? "Live" : "Pause"}
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exporter CSV
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <DoorOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Aujourd&apos;hui</p>
                  <p className="text-2xl font-semibold text-foreground">{totalAccess}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acces Autorises</p>
                  <p className="text-2xl font-semibold text-foreground">{grantedAccess}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acces Refuses</p>
                  <p className="text-2xl font-semibold text-foreground">{deniedAccess}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, matricule ou appareil..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="all">Tout</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="granted">Autorise</SelectItem>
                    <SelectItem value="denied">Refuse</SelectItem>
                  </SelectContent>
                </Select>

                {/* Device Filter */}
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <SelectValue placeholder="Appareil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les appareils</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device} value={device}>
                        {device}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Evenements ({filteredLogs.length})
                </CardTitle>
                {isLive && (
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Temps reel
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[100px]">Heure</TableHead>
                    <TableHead>Employe</TableHead>
                    <TableHead>Departement</TableHead>
                    <TableHead>Appareil</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="border-border transition-colors hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono">{log.timestamp}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {log.employeeName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {log.employeeName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.employeeId}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {log.department}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {log.deviceName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {log.deviceLocation}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        {log.status === "granted" ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Autorise
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                            <XCircle className="mr-1 h-3 w-3" />
                            Refuse
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.reason && (
                          <div className="flex items-center gap-1.5 text-sm text-amber-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{log.reason}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
