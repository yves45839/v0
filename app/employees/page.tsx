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
} from "lucide-react"

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
  const biometricAlerts = employeeList.filter(
    (e) => !e.biometricStatus.hasFacePhoto || !e.biometricStatus.hasFingerprint
  ).length

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

    let matchesScope = true
    if (selectedScope.type === "organization") {
      const departmentIds = departmentIdsByOrganization.get(selectedScope.organizationId) ?? new Set<number>()
      matchesScope = employee.departmentId !== null && departmentIds.has(employee.departmentId)
    } else if (selectedScope.type === "department") {
      const descendantIds = descendantIdsByDepartment.get(selectedScope.departmentId) ?? new Set<number>()
      matchesScope = employee.departmentId !== null && descendantIds.has(employee.departmentId)
    }

    return matchesSearch && matchesDepartment && matchesAccessGroup && matchesScope
  })

  const departmentOptions = useMemo(() => {
    const names = departments.map((department) => department.name).filter(Boolean)
    return Array.from(new Set(names))
  }, [departments])

  const accessGroupNameOptions = useMemo(() => {
    const names = accessGroups.map((group) => group.name).filter(Boolean)
    return Array.from(new Set(names))
  }, [accessGroups])

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDrawerOpen(true)
  }

  const handleSaveEmployee = (payload: Employee) => {
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
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur de mise a jour des groupes d'acces")
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
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur d'attribution du quart de travail")
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
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur de changement de departement")
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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="p-6">
          <PageContextBar
            title="Employes"
            description="Pilotage des profils, des affectations et de la synchronisation passerelle."
            stats={[
              { value: employeeList.length, label: "Employes" },
              { value: employeeList.filter((employee) => employee.syncStatus === "pending").length, label: "Synchronisation en attente", tone: "warning" },
              { value: biometricAlerts, label: "Alertes biometriques", tone: biometricAlerts > 0 ? "critical" : "success" },
            ]}
            actions={
              <>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              <Button variant="outline" size="sm">
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

          {employeesError && (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {employeesError}
            </p>
          )}

          {isLoadingEmployees && (
            <p className="mb-4 rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              Chargement des employes depuis le backend...
            </p>
          )}

          {/* Stats Cards */}
          <div className="mb-6">
            <EmployeeStats
              totalActive={totalActive}
              totalEmployees={employeeList.length}
              biometricAlerts={biometricAlerts}
            />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <EmployeeFilters
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              accessGroupFilter={accessGroupFilter}
              setAccessGroupFilter={setAccessGroupFilter}
              departmentOptions={departmentOptions}
              accessGroupOptions={accessGroupNameOptions}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <OrganizationTree
              organizations={organizations}
              departments={departments}
              selectedScope={selectedScope}
              onSelectScope={setSelectedScope}
              employeeCountByOrganization={employeeCountByOrganization}
              employeeCountByDepartment={employeeCountByDepartment}
              onEmployeeDrop={(department) => void handleDropEmployeeOnDepartment(department)}
            />

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">{selectedScope.label}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredEmployees.length} employe{filteredEmployees.length > 1 ? "s" : ""} affiches
                </p>
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
                  <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-2 gap-3">
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
