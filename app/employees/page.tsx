"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { EmployeeStats } from "@/components/employees/employee-stats"
import { EmployeeFilters } from "@/components/employees/employee-filters"
import { EmployeeTable } from "@/components/employees/employee-table"
import { EmployeeDrawer } from "@/components/employees/employee-drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  Download,
  Upload,
  Plus,
} from "lucide-react"

export type Employee = {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  photoUrl: string
  cardNumber: string
  accessGroups: string[]
  syncStatus: "synced" | "pending" | "error"
  biometricStatus: {
    hasFacePhoto: boolean
    hasFingerprint: boolean
  }
  hireDate: string
  lastAccess: string
  accessLogs: {
    id: string
    device: string
    status: "granted" | "denied"
    timestamp: string
  }[]
}

// Mock data
const employees: Employee[] = [
  {
    id: "1",
    employeeId: "EMP-001",
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    phone: "+33 6 12 34 56 78",
    department: "Engineering",
    position: "Senior Developer",
    photoUrl: "",
    cardNumber: "4A:3B:2C:1D",
    accessGroups: ["Building A", "Server Room", "Parking"],
    syncStatus: "synced",
    biometricStatus: { hasFacePhoto: true, hasFingerprint: true },
    hireDate: "2022-03-15",
    lastAccess: "2024-01-15 09:03:22",
    accessLogs: [
      { id: "l1", device: "Main Entrance A", status: "granted", timestamp: "09:03:22" },
      { id: "l2", device: "Server Room", status: "granted", timestamp: "08:45:11" },
      { id: "l3", device: "Parking Gate", status: "granted", timestamp: "08:30:05" },
    ],
  },
  {
    id: "2",
    employeeId: "EMP-042",
    name: "Michael Torres",
    email: "michael.torres@company.com",
    phone: "+33 6 98 76 54 32",
    department: "Marketing",
    position: "Marketing Manager",
    photoUrl: "",
    cardNumber: "5B:4C:3D:2E",
    accessGroups: ["Building A", "Marketing Floor"],
    syncStatus: "synced",
    biometricStatus: { hasFacePhoto: true, hasFingerprint: false },
    hireDate: "2021-07-20",
    lastAccess: "2024-01-15 09:02:58",
    accessLogs: [
      { id: "l1", device: "Floor 3 Access", status: "granted", timestamp: "09:02:58" },
      { id: "l2", device: "Main Entrance A", status: "granted", timestamp: "08:55:32" },
    ],
  },
  {
    id: "3",
    employeeId: "EMP-156",
    name: "Emily Watson",
    email: "emily.watson@company.com",
    phone: "+33 6 55 44 33 22",
    department: "Finance",
    position: "Financial Analyst",
    photoUrl: "",
    cardNumber: "6C:5D:4E:3F",
    accessGroups: ["Building A", "Finance Office"],
    syncStatus: "pending",
    biometricStatus: { hasFacePhoto: false, hasFingerprint: false },
    hireDate: "2023-11-01",
    lastAccess: "2024-01-15 09:02:31",
    accessLogs: [
      { id: "l1", device: "Server Room", status: "denied", timestamp: "09:02:31" },
      { id: "l2", device: "Main Entrance B", status: "granted", timestamp: "08:45:00" },
    ],
  },
  {
    id: "4",
    employeeId: "EMP-089",
    name: "James Liu",
    email: "james.liu@company.com",
    phone: "+33 6 11 22 33 44",
    department: "Engineering",
    position: "DevOps Engineer",
    photoUrl: "",
    cardNumber: "7D:6E:5F:4G",
    accessGroups: ["Building A", "Server Room", "Data Center"],
    syncStatus: "synced",
    biometricStatus: { hasFacePhoto: true, hasFingerprint: true },
    hireDate: "2020-09-10",
    lastAccess: "2024-01-15 09:01:45",
    accessLogs: [
      { id: "l1", device: "Main Entrance B", status: "granted", timestamp: "09:01:45" },
      { id: "l2", device: "Data Center", status: "granted", timestamp: "Yesterday 18:30" },
    ],
  },
  {
    id: "5",
    employeeId: "EMP-203",
    name: "Anna Kowalski",
    email: "anna.kowalski@company.com",
    phone: "+33 6 77 88 99 00",
    department: "HR",
    position: "HR Director",
    photoUrl: "",
    cardNumber: "8E:7F:6G:5H",
    accessGroups: ["Building A", "HR Office", "All Floors"],
    syncStatus: "error",
    biometricStatus: { hasFacePhoto: true, hasFingerprint: true },
    hireDate: "2019-01-15",
    lastAccess: "2024-01-15 09:00:12",
    accessLogs: [
      { id: "l1", device: "HR Office", status: "granted", timestamp: "09:00:12" },
      { id: "l2", device: "Main Entrance A", status: "granted", timestamp: "08:50:45" },
    ],
  },
  {
    id: "6",
    employeeId: "EMP-078",
    name: "David Kim",
    email: "david.kim@company.com",
    phone: "+33 6 44 55 66 77",
    department: "Sales",
    position: "Sales Director",
    photoUrl: "",
    cardNumber: "9F:8G:7H:6I",
    accessGroups: ["Building A", "Sales Floor", "Conference Rooms"],
    syncStatus: "synced",
    biometricStatus: { hasFacePhoto: true, hasFingerprint: false },
    hireDate: "2021-03-22",
    lastAccess: "2024-01-15 08:59:33",
    accessLogs: [
      { id: "l1", device: "Main Entrance A", status: "granted", timestamp: "08:59:33" },
    ],
  },
  {
    id: "7",
    employeeId: "EMP-112",
    name: "Rachel Green",
    email: "rachel.green@company.com",
    phone: "+33 6 22 33 44 55",
    department: "Design",
    position: "Lead Designer",
    photoUrl: "",
    cardNumber: "AG:9H:8I:7J",
    accessGroups: ["Building C", "Creative Lab"],
    syncStatus: "pending",
    biometricStatus: { hasFacePhoto: false, hasFingerprint: true },
    hireDate: "2022-06-15",
    lastAccess: "2024-01-15 08:58:17",
    accessLogs: [
      { id: "l1", device: "Creative Lab", status: "granted", timestamp: "08:58:17" },
      { id: "l2", device: "Building C Entrance", status: "granted", timestamp: "08:50:00" },
    ],
  },
  {
    id: "8",
    employeeId: "EMP-245",
    name: "Thomas Martin",
    email: "thomas.martin@company.com",
    phone: "+33 6 88 77 66 55",
    department: "IT",
    position: "IT Support",
    photoUrl: "",
    cardNumber: "BH:AI:9J:8K",
    accessGroups: ["All Buildings", "Server Room", "Data Center"],
    syncStatus: "synced",
    biometricStatus: { hasFacePhoto: true, hasFingerprint: true },
    hireDate: "2023-02-28",
    lastAccess: "2024-01-15 08:55:00",
    accessLogs: [
      { id: "l1", device: "Server Room", status: "granted", timestamp: "08:55:00" },
      { id: "l2", device: "Data Center", status: "granted", timestamp: "08:45:30" },
    ],
  },
]

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [syncFilter, setSyncFilter] = useState("all")
  const [accessGroupFilter, setAccessGroupFilter] = useState("all")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Calculate stats
  const totalActive = employees.filter((e) => e.syncStatus === "synced").length
  const pendingSync = employees.filter((e) => e.syncStatus === "pending").length
  const biometricAlerts = employees.filter(
    (e) => !e.biometricStatus.hasFacePhoto || !e.biometricStatus.hasFingerprint
  ).length

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.cardNumber.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment =
      departmentFilter === "all" || employee.department === departmentFilter

    const matchesSync =
      syncFilter === "all" || employee.syncStatus === syncFilter

    const matchesAccessGroup =
      accessGroupFilter === "all" ||
      employee.accessGroups.includes(accessGroupFilter)

    return matchesSearch && matchesDepartment && matchesSync && matchesAccessGroup
  })

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDrawerOpen(true)
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
                Employes <span className="text-muted-foreground">({employees.length})</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gestion des employes et synchronisation HikCentral
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Importer
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un employe
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, matricule ou numero de carte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="mb-6">
            <EmployeeStats
              totalActive={totalActive}
              pendingSync={pendingSync}
              biometricAlerts={biometricAlerts}
            />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <EmployeeFilters
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              syncFilter={syncFilter}
              setSyncFilter={setSyncFilter}
              accessGroupFilter={accessGroupFilter}
              setAccessGroupFilter={setAccessGroupFilter}
            />
          </div>

          {/* Employee Table */}
          <EmployeeTable
            employees={filteredEmployees}
            onEmployeeClick={handleEmployeeClick}
          />

          {/* Employee Drawer */}
          <EmployeeDrawer
            employee={selectedEmployee}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </main>
      </div>
    </div>
  )
}
