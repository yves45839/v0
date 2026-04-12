"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { EmployeeStats } from "@/components/employees/employee-stats"
import { EmployeeFilters } from "@/components/employees/employee-filters"
import { OrganizationTree, type EmployeeScope } from "@/components/employees/organization-tree"
import { EmployeeTable } from "@/components/employees/employee-table"
import { EmployeeDrawer } from "@/components/employees/employee-drawer"
import { AddEmployeeModal } from "@/components/employees/add-employee-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  assignEmployeeWorkShifts,
  createWorkShift,
  fetchAccessGroups,
  fetchDepartments,
  fetchDevices,
  fetchEmployeesDetailed,
  fetchOrganizations,
  fetchWorkShifts,
  isEmployeeApiEnabled,
  updateEmployeeAccessGroups,
  updateEmployeeDepartment,
  type AccessGroupApiItem,
  type DepartmentApiItem,
  type DeviceApiItem,
  type EmployeeApiItem,
  type OrganizationApiItem,
  type WorkShiftApiItem,
} from "@/lib/api/employees"
import {
  Search,
  Download,
  Upload,
  Plus,
  Loader2,
  Clock,
  Building2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users2,
  X,
  Fingerprint,
} from "lucide-react"
import { toast } from "sonner"

export type Employee = {
  id: string
  apiId: number | null
  tenantId: number | null
  employeeId: string
  name: string
  email: string
  phone: string
  departmentId: number | null
  department: string
  organizationId?: number | null
  workShiftId: number | null
  workShift: string
  workShiftIds: number[]
  workShifts: string[]
  position: string
  photoUrl: string
  faceData: string
  cardNumber: string
  deviceIds: number[]
  accessGroupIds: number[]
  accessGroups: string[]
  syncStatus: "synced" | "pending" | "error"
  biometricStatus: {
    hasFacePhoto: boolean
    hasFingerprint: boolean
  }
  fingerprints: Array<{
    fingerIndex: number
    template: string
  }>
  hireDate: string
  lastAccess: string
  accessLogs: {
    id: string
    device: string
    status: "granted" | "denied"
    timestamp: string
  }[]
}

const EMPLOYEE_TENANT_CODE = process.env.NEXT_PUBLIC_EMPLOYEE_TENANT_CODE ?? "HQ-CASA"

function normalizeFaceData(faceData: string): string {
  const trimmed = String(faceData || "").trim()
  if (!trimmed) return ""
  if (trimmed.toLowerCase().startsWith("data:")) {
    const separatorIndex = trimmed.indexOf(",")
    if (separatorIndex >= 0 && separatorIndex < trimmed.length - 1) {
      return trimmed.slice(separatorIndex + 1).trim()
    }
  }
  return trimmed
}

function toFacePreviewUrl(faceData: string): string {
  const trimmed = String(faceData || "").trim()
  if (!trimmed) return ""
  if (trimmed.toLowerCase().startsWith("data:")) return trimmed
  return `data:image/jpeg;base64,${trimmed}`
}

function mapApiEmployeeToUi(
  apiEmployee: EmployeeApiItem,
  departmentById: Map<number, DepartmentApiItem>,
  accessGroupById: Map<number, AccessGroupApiItem>,
  workShiftById: Map<number, WorkShiftApiItem>
): Employee {
  const cardNumber = apiEmployee.cards[0]?.card_no ?? "Non attribue"
  const rawFaceData = String(apiEmployee.face?.face_data ?? "").trim()
  const normalizedFaceData = normalizeFaceData(rawFaceData)
  const hasFacePhoto = normalizedFaceData.length > 0
  const fingerprintRows = (apiEmployee.fingerprints ?? [])
    .map((fingerprint) => ({
      fingerIndex: Number(fingerprint.finger_index),
      template: String(fingerprint.template ?? ""),
    }))
    .filter((fingerprint) => Number.isInteger(fingerprint.fingerIndex) && fingerprint.fingerIndex >= 1 && fingerprint.fingerIndex <= 10)
    .sort((a, b) => a.fingerIndex - b.fingerIndex)
  const hasFingerprint = fingerprintRows.length > 0
  const deviceIds = apiEmployee.devices ?? []
  const workShiftIds = apiEmployee.work_shifts ?? (apiEmployee.work_shift ? [apiEmployee.work_shift] : [])
  const workShifts = workShiftIds
    .map((shiftId) => workShiftById.get(shiftId)?.name)
    .filter((shiftName): shiftName is string => Boolean(shiftName))
  const resolvedWorkShiftName =
    apiEmployee.effective_work_shift?.name ??
    (apiEmployee.work_shift ? workShiftById.get(apiEmployee.work_shift)?.name ?? "Non assigne" : "Non assigne")

  return {
    id: String(apiEmployee.id),
    apiId: apiEmployee.id,
    tenantId: apiEmployee.tenant,
    employeeId: apiEmployee.employee_no,
    name: apiEmployee.name || apiEmployee.employee_no,
    email: apiEmployee.email || "-",
    phone: apiEmployee.phone || "-",
    departmentId: apiEmployee.department,
    department: apiEmployee.department ? (departmentById.get(apiEmployee.department)?.name ?? "Non assigne") : "Non assigne",
    organizationId: apiEmployee.department ? (departmentById.get(apiEmployee.department)?.organization ?? null) : null,
    workShiftId: apiEmployee.work_shift,
    workShift: resolvedWorkShiftName,
    workShiftIds,
    workShifts,
    position: apiEmployee.position || "N/A",
    photoUrl: hasFacePhoto ? toFacePreviewUrl(rawFaceData) : "",
    faceData: normalizedFaceData,
    cardNumber,
    deviceIds,
    accessGroupIds: apiEmployee.access_groups ?? [],
    accessGroups: (apiEmployee.access_groups ?? [])
      .map((groupId) => accessGroupById.get(groupId)?.name)
      .filter((groupName): groupName is string => Boolean(groupName)),
    syncStatus: apiEmployee.needs_gateway_push ? "pending" : "synced",
    biometricStatus: { hasFacePhoto, hasFingerprint },
    fingerprints: fingerprintRows,
    hireDate: new Date().toISOString().split("T")[0],
    lastAccess: "-",
    accessLogs: [],
  }
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [accessGroupFilter, setAccessGroupFilter] = useState("all")
  const [syncStatusFilter, setSyncStatusFilter] = useState("all")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [employeeList, setEmployeeList] = useState<Employee[]>([])
  const [accessGroups, setAccessGroups] = useState<AccessGroupApiItem[]>([])
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([])
  const [organizations, setOrganizations] = useState<OrganizationApiItem[]>([])
  const [workShifts, setWorkShifts] = useState<WorkShiftApiItem[]>([])
  const [devices, setDevices] = useState<DeviceApiItem[]>([])
  const [selectedScope, setSelectedScope] = useState<EmployeeScope>({ type: "all", label: "Tous les employes" })
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [isSavingWorkShift, setIsSavingWorkShift] = useState(false)
  const [createShiftOpen, setCreateShiftOpen] = useState(false)
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null)
  const [newShift, setNewShift] = useState({
    name: "",
    code: "",
    description: "",
    start_time: "08:00",
    end_time: "17:00",
    break_start_time: "12:00",
    break_end_time: "13:00",
    overtime_minutes: "",
  })
  const [employeesError, setEmployeesError] = useState<string | null>(null)
  const [suspendedEmployeeIds, setSuspendedEmployeeIds] = useState<Set<string>>(new Set())

  const accessGroupById = useMemo(
    () => new Map(accessGroups.map((group) => [group.id, group])),
    [accessGroups]
  )
  const departmentById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  )
  const workShiftById = useMemo(
    () => new Map(workShifts.map((workShift) => [workShift.id, workShift])),
    [workShifts]
  )

  const loadEmployeesData = useCallback(async () => {
    if (!isEmployeeApiEnabled()) return

    setIsLoadingEmployees(true)
    setEmployeesError(null)

    try {
      const [employeesData, accessGroupsData, departmentsData, organizationsData, workShiftsData, devicesData] = await Promise.all([
        fetchEmployeesDetailed(EMPLOYEE_TENANT_CODE),
        fetchAccessGroups(EMPLOYEE_TENANT_CODE),
        fetchDepartments(EMPLOYEE_TENANT_CODE),
        fetchOrganizations(EMPLOYEE_TENANT_CODE),
        fetchWorkShifts(EMPLOYEE_TENANT_CODE),
        fetchDevices(EMPLOYEE_TENANT_CODE),
      ])

      const localAccessGroupById = new Map(accessGroupsData.map((group) => [group.id, group]))
      const localDepartmentById = new Map(departmentsData.map((department) => [department.id, department]))
      const localWorkShiftById = new Map(workShiftsData.map((workShift) => [workShift.id, workShift]))

      setAccessGroups(accessGroupsData)
      setDepartments(departmentsData)
      setOrganizations(organizationsData)
      setWorkShifts(workShiftsData)
      setDevices(devicesData)
      setTenantId(employeesData[0]?.tenant ?? departmentsData[0]?.tenant ?? null)
      setEmployeeList(
        employeesData.map((employee) =>
          mapApiEmployeeToUi(employee, localDepartmentById, localAccessGroupById, localWorkShiftById)
        )
      )
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur de chargement des employes")
    } finally {
      setIsLoadingEmployees(false)
    }
  }, [])

  useEffect(() => {
    void loadEmployeesData()
  }, [loadEmployeesData])

  // Calculate stats
  const totalActive = employeeList.filter((e) => e.syncStatus === "synced").length
  const pendingSyncCount = employeeList.filter((employee) => employee.syncStatus === "pending").length
  const biometricAlerts = employeeList.filter(
    (e) => !e.biometricStatus.hasFacePhoto || !e.biometricStatus.hasFingerprint
  ).length
  const biometricCoverage = employeeList.length
    ? Math.round(((employeeList.length - biometricAlerts) / employeeList.length) * 100)
    : 0

  const departmentsByParent = useMemo(() => {
    const map = new Map<number | null, DepartmentApiItem[]>()
    for (const department of departments) {
      const items = map.get(department.parent) ?? []
      items.push(department)
      map.set(department.parent, items)
    }
    return map
  }, [departments])

  const descendantIdsByDepartment = useMemo(() => {
    const collectDescendants = (departmentId: number): number[] => {
      const children = departmentsByParent.get(departmentId) ?? []
      return children.flatMap((child) => [child.id, ...collectDescendants(child.id)])
    }

    const map = new Map<number, Set<number>>()
    for (const department of departments) {
      map.set(department.id, new Set([department.id, ...collectDescendants(department.id)]))
    }
    return map
  }, [departments, departmentsByParent])

  const departmentIdsByOrganization = useMemo(() => {
    const map = new Map<number, Set<number>>()
    for (const department of departments) {
      const items = map.get(department.organization) ?? new Set<number>()
      items.add(department.id)
      map.set(department.organization, items)
    }
    return map
  }, [departments])

  const employeeCountByDepartment = useMemo(() => {
    const map = new Map<number, number>()
    for (const department of departments) {
      const scopedIds = descendantIdsByDepartment.get(department.id) ?? new Set<number>([department.id])
      const count = employeeList.filter(
        (employee) => employee.departmentId !== null && scopedIds.has(employee.departmentId)
      ).length
      map.set(department.id, count)
    }
    return map
  }, [departments, descendantIdsByDepartment, employeeList])

  const employeeCountByOrganization = useMemo(() => {
    const map = new Map<number, number>()
    for (const organization of organizations) {
      const departmentIds = departmentIdsByOrganization.get(organization.id) ?? new Set<number>()
      const count = employeeList.filter(
        (employee) => employee.departmentId !== null && departmentIds.has(employee.departmentId)
      ).length
      map.set(organization.id, count)
    }
    return map
  }, [departmentIdsByOrganization, employeeList, organizations])

  // Filter employees
  const filteredEmployees = employeeList.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.cardNumber.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment =
      departmentFilter === "all" || employee.department === departmentFilter

    const matchesAccessGroup =
      accessGroupFilter === "all" ||
      employee.accessGroups.includes(accessGroupFilter)

    const isSuspended = suspendedEmployeeIds.has(employee.id)
    const matchesStatus =
      syncStatusFilter === "all" ||
      (syncStatusFilter === "suspended" && isSuspended) ||
      (syncStatusFilter === "synced" && !isSuspended && employee.syncStatus === "synced") ||
      (syncStatusFilter === "pending" && !isSuspended && employee.syncStatus === "pending")

    let matchesScope = true
    if (selectedScope.type === "organization") {
      const departmentIds = departmentIdsByOrganization.get(selectedScope.organizationId) ?? new Set<number>()
      matchesScope = employee.departmentId !== null && departmentIds.has(employee.departmentId)
    } else if (selectedScope.type === "department") {
      const descendantIds = descendantIdsByDepartment.get(selectedScope.departmentId) ?? new Set<number>()
      matchesScope = employee.departmentId !== null && descendantIds.has(employee.departmentId)
    }

    return matchesSearch && matchesDepartment && matchesAccessGroup && matchesStatus && matchesScope
  })

  const departmentOptions = useMemo(() => {
    const names = departments.map((department) => department.name).filter(Boolean)
    return Array.from(new Set(names))
  }, [departments])

  const accessGroupNameOptions = useMemo(() => {
    const names = accessGroups.map((group) => group.name).filter(Boolean)
    return Array.from(new Set(names))
  }, [accessGroups])
  const visibleDepartmentCount = useMemo(
    () => new Set(filteredEmployees.map((employee) => employee.department).filter(Boolean)).size,
    [filteredEmployees]
  )
  const visibleAccessGroupCount = useMemo(
    () => new Set(filteredEmployees.flatMap((employee) => employee.accessGroups).filter(Boolean)).size,
    [filteredEmployees]
  )
  const hasSearch = searchQuery.trim().length > 0
  const hasEmployeeFilters =
    hasSearch ||
    departmentFilter !== "all" ||
    accessGroupFilter !== "all" ||
    syncStatusFilter !== "all" ||
    selectedScope.type !== "all"
  const activeFilterCount = [
    hasSearch,
    departmentFilter !== "all",
    accessGroupFilter !== "all",
    syncStatusFilter !== "all",
    selectedScope.type !== "all",
  ].filter(Boolean).length

  const pageSystemStatus: "connected" | "disconnected" | "syncing" =
    isLoadingEmployees
      ? "syncing"
      : employeesError && employeeList.length === 0
        ? "disconnected"
        : "connected"

  const suspendedCount = suspendedEmployeeIds.size

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDrawerOpen(true)
  }

  const handleSaveEmployee = (payload: Employee) => {
    const isEdit = employeeList.some((employee) => employee.id === payload.id)
    setEmployeeList((prev) => {
      const exists = prev.some((employee) => employee.id === payload.id)
      if (exists) {
        return prev.map((employee) => (employee.id === payload.id ? payload : employee))
      }
      return [payload, ...prev]
    })
    if (isEmployeeApiEnabled()) {
      void loadEmployeesData()
    }
    toast.success(isEdit ? "Employé modifié avec succès" : "Employé ajouté avec succès")
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    setAddModalOpen(true)
  }

  const handleAddModalChange = (open: boolean) => {
    setAddModalOpen(open)
    if (!open) {
      setEditingEmployee(null)
    }
  }

  const handleAssignAccessGroups = async (employee: Employee, nextAccessGroupIds: number[]) => {
    if (!employee.apiId) return
    setEmployeesError(null)
    try {
      const updatedEmployee = await updateEmployeeAccessGroups(employee.apiId, nextAccessGroupIds)
      setEmployeeList((prev) =>
        prev.map((item) => {
          if (item.id !== employee.id) return item
          const names = (updatedEmployee.access_groups ?? [])
            .map((groupId) => accessGroupById.get(groupId)?.name)
            .filter((groupName): groupName is string => Boolean(groupName))
          return {
            ...item,
            accessGroupIds: updatedEmployee.access_groups ?? [],
            accessGroups: names,
            syncStatus: updatedEmployee.needs_gateway_push ? "pending" : "synced",
          }
        })
      )
      toast.success("Groupes d'accès mis à jour")
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur de mise a jour des groupes d'acces")
      toast.error("Erreur lors de la mise à jour des groupes d'accès")
    }
  }

  const handleAssignWorkShift = async (employee: Employee, workShiftIds: number[]) => {
    if (!employee.apiId) return
    setEmployeesError(null)
    try {
      const updatedEmployee = await assignEmployeeWorkShifts(employee.apiId, workShiftIds)
      setEmployeeList((prev) =>
        prev.map((item) => {
          if (item.id !== employee.id) return item
          const nextWorkShiftIds =
            updatedEmployee.work_shifts ?? (updatedEmployee.work_shift ? [updatedEmployee.work_shift] : [])
          const nextWorkShifts = nextWorkShiftIds
            .map((shiftId) => workShiftById.get(shiftId)?.name)
            .filter((shiftName): shiftName is string => Boolean(shiftName))
          const shiftName =
            updatedEmployee.effective_work_shift?.name ??
            (updatedEmployee.work_shift
              ? workShiftById.get(updatedEmployee.work_shift)?.name ?? "Non assigne"
              : "Non assigne")
          return {
            ...item,
            workShiftId: updatedEmployee.work_shift,
            workShift: shiftName,
            workShiftIds: nextWorkShiftIds,
            workShifts: nextWorkShifts,
            syncStatus: updatedEmployee.needs_gateway_push ? "pending" : "synced",
          }
        })
      )
      toast.success("Quart de travail attribué avec succès")
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur d'attribution du quart de travail")
      toast.error("Erreur lors de l'attribution du quart de travail")
    }
  }

  const handleDropEmployeeOnDepartment = async (department: DepartmentApiItem) => {
    if (!draggedEmployee?.apiId) return
    if (draggedEmployee.departmentId === department.id) {
      setDraggedEmployee(null)
      return
    }

    setEmployeesError(null)
    try {
      const updatedEmployee = await updateEmployeeDepartment(draggedEmployee.apiId, department.id)
      const departmentName = departmentById.get(department.id)?.name ?? department.name

      setEmployeeList((prev) =>
        prev.map((item) =>
          item.id === draggedEmployee.id
            ? {
                ...item,
                departmentId: updatedEmployee.department,
                department: departmentName,
                organizationId: department.organization,
                syncStatus: updatedEmployee.needs_gateway_push ? "pending" : "synced",
              }
            : item
        )
      )

      if (selectedEmployee?.id === draggedEmployee.id) {
        setSelectedEmployee((prev) =>
          prev
            ? {
                ...prev,
                departmentId: updatedEmployee.department,
                department: departmentName,
                organizationId: department.organization,
                syncStatus: updatedEmployee.needs_gateway_push ? "pending" : "synced",
              }
            : prev
        )
      }
      toast.success(`Département mis à jour pour ${draggedEmployee.name}`)
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur de changement de departement")
      toast.error("Erreur lors du changement de département")
    } finally {
      setDraggedEmployee(null)
    }
  }

  const handleCreateWorkShift = async () => {
    if (!tenantId) {
      setEmployeesError("Tenant introuvable pour creer un quart de travail.")
      return
    }
    if (!newShift.name.trim()) {
      setEmployeesError("Le nom du quart est obligatoire.")
      return
    }
    setIsSavingWorkShift(true)
    setEmployeesError(null)
    try {
      const overtimeMinutesRaw = newShift.overtime_minutes.trim()
      if (overtimeMinutesRaw && Number.isNaN(Number(overtimeMinutesRaw))) {
        setEmployeesError("Les heures supplementaires doivent etre un nombre valide.")
        return
      }

      const payload = {
        tenant: tenantId,
        name: newShift.name.trim(),
        code: newShift.code.trim() || undefined,
        description: newShift.description.trim(),
        start_time: newShift.start_time,
        end_time: newShift.end_time,
        break_start_time: newShift.break_start_time || null,
        break_end_time: newShift.break_end_time || null,
      }
      if (overtimeMinutesRaw) {
        Object.assign(payload, { overtime_minutes: Number(overtimeMinutesRaw) })
      }

      await createWorkShift(payload)
      setCreateShiftOpen(false)
      toast.success("Quart de travail créé avec succès")
      setNewShift({
        name: "",
        code: "",
        description: "",
        start_time: "08:00",
        end_time: "17:00",
        break_start_time: "12:00",
        break_end_time: "13:00",
        overtime_minutes: "",
      })
      await loadEmployeesData()
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur de creation du quart de travail")
    } finally {
      setIsSavingWorkShift(false)
    }
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setDepartmentFilter("all")
    setAccessGroupFilter("all")
    setSyncStatusFilter("all")
    setSelectedScope({ type: "all", label: "Tous les employes" })
  }

  const handleToggleEmployeeSuspension = (employee: Employee) => {
    const isSuspended = suspendedEmployeeIds.has(employee.id)
    setSuspendedEmployeeIds((prev) => {
      const next = new Set(prev)
      if (isSuspended) {
        next.delete(employee.id)
      } else {
        next.add(employee.id)
      }
      return next
    })
    toast.success(
      isSuspended
        ? `${employee.name} a ete reactive` 
        : `${employee.name} a ete suspendu`,
      {
        description: isSuspended
          ? "L'employe est de nouveau actif dans la vue operationnelle."
          : "L'employe reste visible et peut etre reactive a tout moment.",
      }
    )
  }

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-shell-content">
        <Header systemStatus={pageSystemStatus} />

        <main className="app-page space-y-0">
          <div className="animate-fade-up">
          <PageContextBar
            title="Employes"
            description="Pilotage des profils, des affectations et de la synchronisation passerelle."
            stats={[
              { value: employeeList.length, label: "Employes" },
              { value: pendingSyncCount, label: "Synchronisation en attente", tone: "warning" },
              { value: biometricAlerts, label: "Alertes biometriques", tone: biometricAlerts > 0 ? "critical" : "success" },
              { value: suspendedCount, label: "Suspendus", tone: suspendedCount > 0 ? "warning" : "neutral" },
            ]}
            actions={
              <>
              <Button variant="outline" size="sm" onClick={() => {
                if (employeeList.length === 0) { toast.warning("Aucun employé à exporter"); return }
                const headers = ["Nom","Prénom","Matricule","Département","Email","Téléphone"]
                const rows = employeeList.map(e => {
                  const parts = e.name.trim().split(/\s+/)
                  const firstName = parts.slice(0, -1).join(" ") || parts[0] || ""
                  const lastName = parts.length > 1 ? parts[parts.length - 1] : ""
                  return [lastName, firstName, e.employeeId, e.department, e.email ?? "", e.phone ?? ""]
                })
                const csv = [headers, ...rows].map(r => r.join(";")).join("\n")
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a"); a.href = url; a.download = `employes-${new Date().toISOString().slice(0,10)}.csv`; a.click()
                URL.revokeObjectURL(url)
                toast.success("Export CSV terminé", { description: `${employeeList.length} employés exportés` })
              }}>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                toast.info("Fonctionnalité d'import", { description: "L'import CSV sera disponible prochainement. Utilisez l'ajout individuel pour l'instant." })
              }}>
                <Upload className="mr-2 h-4 w-4" />
                Importer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateShiftOpen(true)}
              >
                <Clock className="mr-2 h-4 w-4" />
                Nouveau quart
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingEmployee(null)
                  setAddModalOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un employe
              </Button>
              </>
            }
          />
          </div>

          <section className="animate-fade-up relative overflow-hidden rounded-4xl border border-border/70 bg-[linear-gradient(135deg,rgba(78,155,255,0.14),rgba(7,17,29,0.97)_38%,rgba(7,17,29,0.99))] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.36)] sm:p-6 lg:p-8 xl:p-10" style={{ animationDelay: "100ms" }}>
            <div className="soft-grid absolute inset-0 opacity-20" />
            <div className="absolute -right-20 -top-10 h-72 w-72 rounded-full bg-primary/14 blur-[100px]" />
            <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-cyan-400/8 blur-[80px]" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)] xl:items-start">
              <div className="space-y-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/10 bg-white/7 text-white/90 shadow-none backdrop-blur-sm">
                    <Sparkles className="h-3 w-3" />
                    Gestion des employes
                  </Badge>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary backdrop-blur-sm">
                    {selectedScope.label}
                  </Badge>
                  {hasEmployeeFilters && (
                    <Badge variant="outline" className="border-amber-400/25 bg-amber-500/8 text-amber-200 backdrop-blur-sm">
                      <SlidersHorizontal className="h-3 w-3" />
                      {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif{activeFilterCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <h2 className="max-w-3xl text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.1]">
                    Pilotez vos employes, affectations et synchronisations en toute confiance.
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-slate-300/90 sm:text-[15px]">
                    Recherchez, segmentez, reaffectez et consultez les fiches avec une lecture claire des priorites
                    de synchronisation et de la couverture biometrique.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="wow-transition group rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm hover:border-white/14 hover:bg-white/6">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Resultats</p>
                      <Users2 className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <p className="mt-3 text-3xl font-bold tabular-nums text-white">{filteredEmployees.length}</p>
                    <p className="mt-1.5 text-xs text-slate-400/80">Employes affiches dans cette vue.</p>
                  </div>
                  <div className="wow-transition group rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm hover:border-white/14 hover:bg-white/6">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Departements</p>
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <p className="mt-3 text-3xl font-bold tabular-nums text-white">{visibleDepartmentCount}</p>
                    <p className="mt-1.5 text-xs text-slate-400/80">Perimetres distincts apres filtrage.</p>
                  </div>
                  <div className="wow-transition group rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm hover:border-white/14 hover:bg-white/6">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Biometrie</p>
                      <Fingerprint className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <p className="mt-3 text-3xl font-bold tabular-nums text-white">{biometricCoverage}<span className="text-lg text-slate-400">%</span></p>
                    <p className="mt-1.5 text-xs text-slate-400/80">Couverture complete des profils.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-[linear-gradient(180deg,rgba(15,24,36,0.92),rgba(8,14,22,0.96))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md lg:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Vue instantanee</p>
                    <h3 className="mt-1.5 text-base font-semibold text-white lg:text-lg">Posture operationnelle</h3>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Users2 className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-5 grid gap-2.5">
                  <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-200">Synchronises</p>
                      <Badge variant="outline" className="border-amber-400/25 bg-amber-500/8 text-[10px] text-amber-200">
                        {pendingSyncCount} en attente
                      </Badge>
                    </div>
                    <p className="mt-2.5 text-2xl font-bold tabular-nums text-white">{totalActive}</p>
                    <p className="mt-1 text-xs text-slate-500">Profils prets cote passerelle.</p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/6 bg-white/3 p-3.5">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Groupes</p>
                      <p className="mt-2 text-xl font-bold tabular-nums text-white">{visibleAccessGroupCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/3 p-3.5">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Perimetre</p>
                      <p className="mt-2 truncate text-sm font-semibold text-white">{selectedScope.label}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-white/8 bg-black/15 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Astuce</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300/80">
                      {draggedEmployee
                        ? `Deposez ${draggedEmployee.name} sur un departement pour finaliser le reassignment.`
                        : "Cliquez sur une ligne pour ouvrir la fiche, ou glissez un employe vers l'arborescence."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="app-surface relative overflow-hidden p-5 sm:p-6 lg:p-7">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/25 to-transparent" />

            <div className="relative space-y-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Recherche &amp; segmentation
                  </p>
                  <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                    Affinez la population employee
                  </h3>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Combinez recherche libre, departement et groupe d&apos;acces pour naviguer sans perdre de lisibilite.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <Building2 className="h-3 w-3" />
                    {organizations.length} organisation{organizations.length > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5">
                    <ShieldCheck className="h-3 w-3" />
                    {accessGroupNameOptions.length} groupe{accessGroupNameOptions.length > 1 ? "s" : ""}
                  </Badge>
                  {hasEmployeeFilters && (
                    <Button variant="ghost" size="sm" className="h-8 rounded-full px-3" onClick={handleResetFilters}>
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Reinitialiser
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-3 rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, matricule ou numero de carte..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 rounded-xl border-border/60 bg-background/50 pl-11 pr-4 text-sm shadow-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/60 bg-background/35 px-2.5 py-1 tabular-nums">
                      {filteredEmployees.length} employe{filteredEmployees.length > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/35 px-2.5 py-1">
                      {selectedScope.label}
                    </span>
                    {hasSearch && (
                      <span className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-primary">
                        Recherche active
                      </span>
                    )}
                  </div>
                </div>

                <EmployeeFilters
                  departmentFilter={departmentFilter}
                  setDepartmentFilter={setDepartmentFilter}
                  accessGroupFilter={accessGroupFilter}
                  setAccessGroupFilter={setAccessGroupFilter}
                  syncStatusFilter={syncStatusFilter}
                  setSyncStatusFilter={setSyncStatusFilter}
                  departmentOptions={departmentOptions}
                  accessGroupOptions={accessGroupNameOptions}
                />
              </div>

              {(employeesError || isLoadingEmployees || draggedEmployee) && (
                <div className="grid gap-2.5 lg:grid-cols-3">
                  {employeesError && (
                    <div className="animate-fade-up rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-200">
                      {employeesError}
                    </div>
                  )}
                  {isLoadingEmployees && (
                    <div className="animate-fade-up flex items-center gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Chargement des employes depuis le backend...
                    </div>
                  )}
                  {draggedEmployee && (
                    <div className="animate-fade-up rounded-xl border border-emerald-400/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100">
                      Deplacement en cours pour {draggedEmployee.name}.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <EmployeeStats
            totalActive={totalActive}
            totalEmployees={employeeList.length}
            biometricAlerts={biometricAlerts}
          />

          <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="xl:sticky xl:top-24">
              <OrganizationTree
                organizations={organizations}
                departments={departments}
                selectedScope={selectedScope}
                onSelectScope={setSelectedScope}
                employeeCountByOrganization={employeeCountByOrganization}
                employeeCountByDepartment={employeeCountByDepartment}
                onEmployeeDrop={(department) => void handleDropEmployeeOnDepartment(department)}
              />
            </div>

            <div className="space-y-4">
              <div className="app-surface p-5 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Liste operationnelle
                    </p>
                    <h3 className="text-lg font-semibold text-foreground sm:text-xl">{selectedScope.label}</h3>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Cliquez pour ouvrir la fiche, affectez groupes ou quarts, glissez vers l&apos;arborescence pour reclasser.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums">{filteredEmployees.length} resultat{filteredEmployees.length > 1 ? "s" : ""}</Badge>
                    {departmentFilter !== "all" && <Badge variant="outline" className="text-[11px]">Dept. {departmentFilter}</Badge>}
                    {accessGroupFilter !== "all" && <Badge variant="outline" className="text-[11px]">Groupe {accessGroupFilter}</Badge>}
                    {syncStatusFilter !== "all" && <Badge variant="outline" className="text-[11px]">Statut {syncStatusFilter}</Badge>}
                    {hasSearch && <Badge variant="outline" className="text-[11px]">Recherche: {searchQuery}</Badge>}
                  </div>
                </div>
              </div>

              <EmployeeTable
                employees={filteredEmployees}
                onEmployeeClick={handleEmployeeClick}
                onEditEmployee={handleEditEmployee}
                accessGroupOptions={accessGroups.map((group) => ({ id: group.id, name: group.name }))}
                workShiftOptions={workShifts.map((shift) => ({
                  id: shift.id,
                  name: `${shift.name} (${shift.start_time ?? "--:--"} - ${shift.end_time ?? "--:--"})`,
                }))}
                onAssignAccessGroups={handleAssignAccessGroups}
                onAssignWorkShift={handleAssignWorkShift}
                onDragEmployee={setDraggedEmployee}
                suspendedEmployeeIds={suspendedEmployeeIds}
                onToggleSuspension={handleToggleEmployeeSuspension}
              />
            </div>
          </div>

          {/* Employee Drawer */}
          <EmployeeDrawer
            employee={selectedEmployee}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />

          {/* Add Employee Modal */}
          <AddEmployeeModal
            open={addModalOpen}
            onOpenChange={handleAddModalChange}
            onAddEmployee={handleSaveEmployee}
            employeeToEdit={editingEmployee}
            employees={employeeList}
            tenantCode={EMPLOYEE_TENANT_CODE}
            departments={departments.map((department) => ({
              id: department.id,
              tenant: department.tenant,
              name: department.name,
            }))}
            accessGroups={accessGroups.map((group) => ({ id: group.id, name: group.name }))}
            devices={devices.map((device) => ({
              id: device.id,
              dev_index: device.dev_index,
              name: device.name,
              status: device.status,
            }))}
          />

          <Dialog open={createShiftOpen} onOpenChange={setCreateShiftOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Creer un quart de travail</DialogTitle>
                <DialogDescription>
                  Definissez un quart pour l&apos;attribuer ensuite aux employes et departements.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={newShift.name}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex: Quart Matin"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code (optionnel)</label>
                  <Input
                    value={newShift.code}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, code: event.target.value }))}
                    placeholder="Ex: Q-MATIN"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prise de service</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Heure de debut</label>
                      <Input
                        type="time"
                        value={newShift.start_time}
                        onChange={(event) => setNewShift((prev) => ({ ...prev, start_time: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Heure de fin</label>
                      <Input
                        type="time"
                        value={newShift.end_time}
                        onChange={(event) => setNewShift((prev) => ({ ...prev, end_time: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pause</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Heure de debut</label>
                      <Input
                        type="time"
                        value={newShift.break_start_time}
                        onChange={(event) => setNewShift((prev) => ({ ...prev, break_start_time: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Heure de fin</label>
                      <Input
                        type="time"
                        value={newShift.break_end_time}
                        onChange={(event) => setNewShift((prev) => ({ ...prev, break_end_time: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Heures supplementaires (minutes)</label>
                  <Input
                    type="number"
                    min="0"
                    value={newShift.overtime_minutes}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, overtime_minutes: event.target.value }))}
                    placeholder="Ex: 60 (optionnel)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newShift.description}
                    onChange={(event) => setNewShift((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateShiftOpen(false)} disabled={isSavingWorkShift}>
                  Annuler
                </Button>
                <Button onClick={() => void handleCreateWorkShift()} disabled={isSavingWorkShift}>
                  {isSavingWorkShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
