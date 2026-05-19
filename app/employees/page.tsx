"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DEMO_EMPLOYEES_RAW,
  DEMO_DEPARTMENTS_DATA,
  DEMO_ORGANIZATIONS_DATA,
  DEMO_WORK_SHIFTS_DATA,
  DEMO_ACCESS_GROUPS_DATA,
} from "@/lib/mock-data/demo-employees"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { OrganizationTree, type EmployeeScope } from "@/components/employees/organization-tree"
import { EmployeeTable } from "@/components/employees/employee-table"
import { EmployeeDrawer } from "@/components/employees/employee-drawer"
import { AddEmployeeModal } from "@/components/employees/add-employee-modal"
import { ImportEmployeesDialog, type EmployeeImportRow } from "@/components/employees/import-employees-dialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter, useSearchParams } from "next/navigation"
import {
  assignEmployeeWorkShifts,
  createDepartment,
  createWorkShift,
  deleteEmployee,
  fetchAccessGroups,
  fetchDepartments,
  fetchDevices,
  fetchEmployeesDetailed,
  fetchOnlineReaders,
  fetchOrganizations,
  fetchWorkShifts,
  isEmployeeApiEnabled,
  readCardFromReader,
  enrollFingerprintFromReader,
  enrollFaceFromReader,
  setEmployeeActive,
  updateEmployee,
  updateEmployeeAccessGroups,
  updateEmployeeDepartment,
  type AccessGroupApiItem,
  type DepartmentApiItem,
  type DeviceApiItem,
  type EmployeeApiItem,
  type EnrollFaceResponse,
  type EnrollFingerprintResponse,
  type GatewayReaderItem,
  type OrganizationApiItem,
  type WorkShiftApiItem,
} from "@/lib/api/employees"
import { CardEnrollDialog } from "@/components/employees/card-enroll-dialog"
import { FingerprintEnrollDialog } from "@/components/employees/fingerprint-enroll-dialog"
import { FaceEnrollDialog } from "@/components/employees/face-enroll-dialog"
import {
  Search,
  Download,
  Upload,
  Plus,
  Loader2,
  Clock,
  CalendarDays,
  CalendarRange,
  Building2,
  Users,
  ChevronDown,
  UserCheck,
  UserX,
  ShieldCheck,
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
  isActive: boolean
  biometricStatus: {
    hasFacePhoto: boolean
    hasFingerprint: boolean
  }
  fingerprints: Array<{
    fingerIndex: number
    template: string
  }>
  hireDate: string
  validityStart: string
  validityEnd: string
  lastAccess: string
  accessLogs: {
    id: string
    device: string
    status: "granted" | "denied"
    timestamp: string
  }[]
}

const EMPLOYEE_TENANT_CODE = (() => {
  const code = process.env.NEXT_PUBLIC_EMPLOYEE_TENANT_CODE
  if (!code && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[LR Time] NEXT_PUBLIC_EMPLOYEE_TENANT_CODE is not set — configure it in .env.local")
  }
  return code ?? ""
})()

function addYearsToDate(dateIso: string, years: number): string {
  const date = new Date(dateIso)
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().split("T")[0]
}

function normalizeLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function createLocalEmployeeId(seed: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local-${seed || "employee"}-${crypto.randomUUID()}`
  }
  return `local-${seed || "employee"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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

type PeopleMetricTone = "green" | "red" | "amber" | "blue"

const peopleMetricToneClass: Record<PeopleMetricTone, { text: string; bar: string; bg: string }> = {
  green: { text: "text-[#22c55e]", bar: "bg-[#22c55e]", bg: "bg-[#0d2a1a]" },
  red: { text: "text-[#ef4444]", bar: "bg-[#ef4444]", bg: "bg-[#2a0e0e]" },
  amber: { text: "text-[#f59e0b]", bar: "bg-[#f97316]", bg: "bg-[#2a1e06]" },
  blue: { text: "text-[#60a5fa]", bar: "bg-[#60a5fa]", bg: "bg-[#0d1e2e]" },
}

function PeopleMetricCard({
  label,
  value,
  note,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  note: string
  tone: PeopleMetricTone
  icon: typeof Users
}) {
  const toneStyles = peopleMetricToneClass[tone]

  return (
    <article className="relative min-h-18 border border-[#1c2133] bg-[#111318] p-2.5">
      <div className={`absolute left-0 top-0 h-full w-[3px] ${toneStyles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#4a5568]">{label}</p>
          <p className={`mt-1 font-display text-2xl font-bold leading-none tabular-nums ${toneStyles.text}`}>
            {value}
          </p>
        </div>
        <div className={`flex size-6 items-center justify-center ${toneStyles.bg} ${toneStyles.text}`}>
          <Icon className="size-3" />
        </div>
      </div>
      <div className={`mt-2 inline-flex px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${toneStyles.bg} ${toneStyles.text}`}>
        {note}
      </div>
    </article>
  )
}

function mapApiEmployeeToUi(
  apiEmployee: EmployeeApiItem,
  departmentById: Map<number, DepartmentApiItem>,
  accessGroupById: Map<number, AccessGroupApiItem>,
  workShiftById: Map<number, WorkShiftApiItem>
): Employee {
  const defaultStartDate = new Date().toISOString().split("T")[0]
  const defaultEndDate = addYearsToDate(defaultStartDate, 10)
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
    isActive: apiEmployee.is_active !== false,
    biometricStatus: { hasFacePhoto, hasFingerprint },
    fingerprints: fingerprintRows,
    hireDate: defaultStartDate,
    validityStart: defaultStartDate,
    validityEnd: defaultEndDate,
    lastAccess: "-",
    accessLogs: [],
  }
}

export default function EmployeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [accessGroupFilter, setAccessGroupFilter] = useState("all")
  const [syncStatusFilter, setSyncStatusFilter] = useState("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
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
  const [togglingEmployeeIds, setTogglingEmployeeIds] = useState<Set<string>>(new Set())
  const [createDepartmentOpen, setCreateDepartmentOpen] = useState(false)
  const [createDepartmentContext, setCreateDepartmentContext] = useState<{
    organizationId: number
    parentId: number | null
  } | null>(null)
  const [newDepartment, setNewDepartment] = useState({ name: "" })
  const [isSavingDepartment, setIsSavingDepartment] = useState(false)

  // Biometric enrollment state
  const [availableReaders, setAvailableReaders] = useState<GatewayReaderItem[]>([])
  const [cardEnrollOpen, setCardEnrollOpen] = useState(false)
  const [fingerprintEnrollOpen, setFingerprintEnrollOpen] = useState(false)
  const [faceEnrollOpen, setFaceEnrollOpen] = useState(false)
  const [biometricTargetEmployee, setBiometricTargetEmployee] = useState<Employee | null>(null)

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
  const departmentByName = useMemo(
    () => new Map(departments.map((department) => [normalizeLookupValue(department.name), department])),
    [departments]
  )

  const loadEmployeesData = useCallback(async () => {
    if (!isEmployeeApiEnabled()) {
      // Mode demonstration : charger les donnees fictives
      setAccessGroups(DEMO_ACCESS_GROUPS_DATA as AccessGroupApiItem[])
      setDepartments(DEMO_DEPARTMENTS_DATA as DepartmentApiItem[])
      setOrganizations(DEMO_ORGANIZATIONS_DATA as OrganizationApiItem[])
      setWorkShifts(DEMO_WORK_SHIFTS_DATA as WorkShiftApiItem[])
      setEmployeeList(DEMO_EMPLOYEES_RAW as unknown as Employee[])
      setAvailableReaders([])
      return
    }

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

      const readersData = await fetchOnlineReaders(EMPLOYEE_TENANT_CODE).catch(() => [] as GatewayReaderItem[])

      setAccessGroups(accessGroupsData)
      setDepartments(departmentsData)
      setOrganizations(organizationsData)
      setWorkShifts(workShiftsData)
      setDevices(devicesData)
      setAvailableReaders(readersData)
      setTenantId(employeesData[0]?.tenant ?? departmentsData[0]?.tenant ?? null)
      // Si l'API ne renvoie aucun employé, on retombe sur les données de
      // démonstration (employés + orgs + départements + groupes d'accès +
      // quarts) afin que la page soit cohérente et utilisable.
      if (employeesData.length === 0) {
        setEmployeeList(DEMO_EMPLOYEES_RAW as unknown as Employee[])
        setAccessGroups(DEMO_ACCESS_GROUPS_DATA as AccessGroupApiItem[])
        setDepartments(DEMO_DEPARTMENTS_DATA as DepartmentApiItem[])
        setOrganizations(DEMO_ORGANIZATIONS_DATA as OrganizationApiItem[])
        setWorkShifts(DEMO_WORK_SHIFTS_DATA as WorkShiftApiItem[])
      } else {
        setEmployeeList(
          employeesData.map((employee) =>
            mapApiEmployeeToUi(employee, localDepartmentById, localAccessGroupById, localWorkShiftById)
          )
        )
      }
    } catch (error) {
      setEmployeesError(error instanceof Error ? error.message : "Erreur de chargement des employes")
      // En cas d'échec API, on retombe sur les données de démonstration
      // afin que la liste employés et l'arbre organisations restent visibles.
      setEmployeeList(DEMO_EMPLOYEES_RAW as unknown as Employee[])
      setAccessGroups(DEMO_ACCESS_GROUPS_DATA as AccessGroupApiItem[])
      setDepartments(DEMO_DEPARTMENTS_DATA as DepartmentApiItem[])
      setOrganizations(DEMO_ORGANIZATIONS_DATA as OrganizationApiItem[])
      setWorkShifts(DEMO_WORK_SHIFTS_DATA as WorkShiftApiItem[])
    } finally {
      setIsLoadingEmployees(false)
    }
  }, [])

  useEffect(() => {
    void loadEmployeesData()
  }, [loadEmployeesData])

  useEffect(() => {
    const initialSearch = searchParams.get("search")
    const initialStatus = searchParams.get("status")
    const initialAction = searchParams.get("action")
    const initialFocus = searchParams.get("focus")
    const initialEditId = searchParams.get("edit_id")
    const initialActive = searchParams.get("active")

    if (initialActive && ["all", "active", "inactive"].includes(initialActive)) {
      setActiveFilter(initialActive as "all" | "active" | "inactive")
    }

    // Le edit_id est traité dans son propre useEffect (dépendant de employeeList).
    void initialEditId

    if (initialSearch !== null) {
      setSearchQuery(initialSearch)
    }

    if (initialStatus && ["all", "synced", "pending", "suspended"].includes(initialStatus)) {
      setSyncStatusFilter(initialStatus)
    }

    if (initialFocus === "pending-sync") {
      setSyncStatusFilter("pending")
    }

    if (initialFocus === "present-today") {
      setSyncStatusFilter("synced")
    }

    if (initialFocus === "organization") {
      setSelectedScope({ type: "all", label: "Tous les employes" })
    }

    if (initialAction === "new-employee") {
      setEditingEmployee(null)
      setAddModalOpen(true)
    }

    if (initialAction === "new-shift") {
      setCreateShiftOpen(true)
    }

    if (initialAction === "import") {
      setImportDialogOpen(true)
    }
  }, [searchParams])

  // Ouvre le modal d'édition une fois la liste chargée si ?edit_id= est présent.
  useEffect(() => {
    const editId = searchParams.get("edit_id")
    if (!editId || employeeList.length === 0) return
    const target = employeeList.find((employee) => String(employee.apiId ?? "") === editId)
    if (target) {
      setEditingEmployee(target)
      setAddModalOpen(true)
    }
  }, [searchParams, employeeList])

  const demoModeEnabled = !isEmployeeApiEnabled()

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
  const normalizedSearchQuery = normalizeLookupValue(searchQuery)

  const filteredEmployees = employeeList.filter((employee) => {
    const searchableText = normalizeLookupValue(
      [
        employee.id,
        employee.employeeId,
        employee.name,
        employee.email,
        employee.phone,
        employee.position,
        employee.department,
        employee.workShift,
        employee.workShifts.join(" "),
        employee.cardNumber,
        employee.accessGroups.join(" "),
        employee.deviceIds.join(" "),
        employee.syncStatus,
        employee.hireDate,
        employee.validityStart,
        employee.validityEnd,
        employee.lastAccess,
        employee.biometricStatus.hasFacePhoto ? "visage face ok" : "visage face absent",
        employee.biometricStatus.hasFingerprint ? "empreinte ok" : "empreinte absente",
        employee.fingerprints.map((fingerprint) => String(fingerprint.fingerIndex)).join(" "),
        employee.isActive ? "actif valide" : "inactif desactive suspendu",
      ].join(" ")
    )

    const matchesSearch =
      normalizedSearchQuery.length === 0 || searchableText.includes(normalizedSearchQuery)

    const matchesDepartment =
      departmentFilter === "all" || employee.department === departmentFilter

    const matchesAccessGroup =
      accessGroupFilter === "all" ||
      employee.accessGroups.includes(accessGroupFilter)

    const isInactive = employee.isActive === false
    const matchesStatus =
      syncStatusFilter === "all" ||
      (syncStatusFilter === "suspended" && isInactive) ||
      (syncStatusFilter === "synced" && !isInactive && employee.syncStatus === "synced") ||
      (syncStatusFilter === "pending" && !isInactive && employee.syncStatus === "pending")

    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "active" && !isInactive) ||
      (activeFilter === "inactive" && isInactive)

    let matchesScope = true
    if (selectedScope.type === "organization") {
      const departmentIds = departmentIdsByOrganization.get(selectedScope.organizationId) ?? new Set<number>()
      matchesScope = employee.departmentId !== null && departmentIds.has(employee.departmentId)
    } else if (selectedScope.type === "department") {
      const descendantIds = descendantIdsByDepartment.get(selectedScope.departmentId) ?? new Set<number>()
      matchesScope = employee.departmentId !== null && descendantIds.has(employee.departmentId)
    }

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesAccessGroup &&
      matchesStatus &&
      matchesActive &&
      matchesScope
    )
  })

  const hasSearch = searchQuery.trim().length > 0

  const pageSystemStatus: "connected" | "disconnected" | "syncing" =
    isLoadingEmployees
      ? "syncing"
      : employeesError && employeeList.length === 0
        ? "disconnected"
        : "connected"
  const activeEmployeesCount = employeeList.filter((employee) => employee.isActive !== false).length
  const inactiveEmployeesCount = Math.max(employeeList.length - activeEmployeesCount, 0)
  const pendingSyncCount = employeeList.filter(
    (employee) => employee.isActive !== false && employee.syncStatus === "pending"
  ).length
  const biometricReadyCount = employeeList.filter(
    (employee) =>
      employee.biometricStatus.hasFacePhoto ||
      employee.biometricStatus.hasFingerprint ||
      employee.fingerprints.length > 0
  ).length

  const handleEmployeeClick = (employee: Employee) => {
    if (employee.apiId) {
      router.push(`/employees/${employee.apiId}`)
      return
    }
    // Mode démo / employé local : on garde l'aperçu rapide via le drawer.
    setSelectedEmployee(employee)
    setDrawerOpen(true)
  }

  const handleEmployeePreview = (employee: Employee) => {
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

  const handleImportEmployees = useCallback((rows: EmployeeImportRow[]) => {
    let createdCount = 0
    let updatedCount = 0

    setEmployeeList((prev) => {
      const nextEmployees = [...prev]

      for (const row of rows) {
        const employeeId = row.employeeId.trim()
        const existingIndex = employeeId
          ? nextEmployees.findIndex(
              (employee) => normalizeLookupValue(employee.employeeId) === normalizeLookupValue(employeeId)
            )
          : -1
        const existingEmployee = existingIndex >= 0 ? nextEmployees[existingIndex] : null
        const matchedDepartment = departmentByName.get(normalizeLookupValue(row.department))

        const mappedEmployee: Employee = {
          id: existingEmployee?.id ?? createLocalEmployeeId(employeeId || row.name),
          apiId: existingEmployee?.apiId ?? null,
          tenantId: existingEmployee?.tenantId ?? tenantId,
          employeeId: employeeId || existingEmployee?.employeeId || `EMP-${Date.now()}`,
          name: row.name.trim() || existingEmployee?.name || "Employe sans nom",
          email: row.email.trim() || existingEmployee?.email || "-",
          phone: row.phone.trim() || existingEmployee?.phone || "-",
          departmentId: matchedDepartment?.id ?? existingEmployee?.departmentId ?? null,
          department: row.department.trim() || existingEmployee?.department || matchedDepartment?.name || "Non assigne",
          organizationId: matchedDepartment?.organization ?? existingEmployee?.organizationId ?? null,
          workShiftId: existingEmployee?.workShiftId ?? null,
          workShift: existingEmployee?.workShift || "Non assigne",
          workShiftIds: existingEmployee?.workShiftIds ?? [],
          workShifts: existingEmployee?.workShifts ?? [],
          position: row.position.trim() || existingEmployee?.position || "N/A",
          photoUrl: existingEmployee?.photoUrl || "",
          faceData: existingEmployee?.faceData || "",
          cardNumber: existingEmployee?.cardNumber || "Non attribue",
          deviceIds: existingEmployee?.deviceIds ?? [],
          accessGroupIds: existingEmployee?.accessGroupIds ?? [],
          accessGroups: existingEmployee?.accessGroups ?? [],
          syncStatus: existingEmployee?.syncStatus ?? "pending",
          isActive: existingEmployee?.isActive ?? true,
          biometricStatus: existingEmployee?.biometricStatus ?? {
            hasFacePhoto: false,
            hasFingerprint: false,
          },
          fingerprints: existingEmployee?.fingerprints ?? [],
          hireDate: existingEmployee?.hireDate ?? new Date().toISOString().split("T")[0],
          validityStart: existingEmployee?.validityStart ?? existingEmployee?.hireDate ?? new Date().toISOString().split("T")[0],
          validityEnd:
            existingEmployee?.validityEnd ??
            addYearsToDate(existingEmployee?.validityStart ?? existingEmployee?.hireDate ?? new Date().toISOString().split("T")[0], 10),
          lastAccess: existingEmployee?.lastAccess ?? "-",
          accessLogs: existingEmployee?.accessLogs ?? [],
        }

        if (existingIndex >= 0) {
          nextEmployees[existingIndex] = mappedEmployee
          updatedCount += 1
        } else {
          nextEmployees.unshift(mappedEmployee)
          createdCount += 1
        }
      }

      return nextEmployees
    })

    toast.success("Import CSV termine", {
      description: `${createdCount} ajoute(s), ${updatedCount} mis a jour dans la vue front.`,
    })
  }, [departmentByName, tenantId])

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

  // ---------- Biometric enrollment handlers ----------

  const openCardEnroll = useCallback((employee: Employee) => {
    setBiometricTargetEmployee(employee)
    setCardEnrollOpen(true)
  }, [])

  const openFingerprintEnroll = useCallback((employee: Employee) => {
    setBiometricTargetEmployee(employee)
    setFingerprintEnrollOpen(true)
  }, [])

  const openFaceEnroll = useCallback((employee: Employee) => {
    setBiometricTargetEmployee(employee)
    setFaceEnrollOpen(true)
  }, [])

  const handleScanCard = useCallback(async (devIndex: string, timeoutSeconds?: number) => {
    const result = await readCardFromReader(devIndex, { timeoutSeconds })
    return result.card_no
  }, [])

  const handleSaveCard = useCallback(async (cardNo: string, cardType: string) => {
    if (!biometricTargetEmployee?.apiId) return
    const existing = biometricTargetEmployee.cardNumber !== "Non attribue"
      ? [{ card_no: biometricTargetEmployee.cardNumber, card_type: "normal" }]
      : []
    await updateEmployee(biometricTargetEmployee.apiId, {
      cards: [...existing, { card_no: cardNo, card_type: cardType }],
    })
    void loadEmployeesData()
  }, [biometricTargetEmployee, loadEmployeesData])

  const handleEnrollFingerprint = useCallback(async (
    employeeId: number,
    fingerIndex: number,
    devIndex: string,
  ): Promise<EnrollFingerprintResponse> => {
    const device = devices.find((d) => d.dev_index === devIndex)
    if (!device) throw new Error("Lecteur introuvable")
    return enrollFingerprintFromReader(device.id, { employee_id: employeeId, finger_index: fingerIndex })
  }, [devices])

  const handleEnrollFaceViaReader = useCallback(async (
    employeeId: number,
    devIndex: string,
  ): Promise<EnrollFaceResponse> => {
    const device = devices.find((d) => d.dev_index === devIndex)
    if (!device) throw new Error("Lecteur introuvable")
    return enrollFaceFromReader(device.id, { employee_id: employeeId })
  }, [devices])

  const handleUploadFacePhoto = useCallback(async (employeeId: number, base64Photo: string) => {
    await updateEmployee(employeeId, { face: { face_data: base64Photo } })
    void loadEmployeesData()
  }, [loadEmployeesData])

  // ---------- End biometric handlers ----------

  const handleToggleEmployeeSuspension = useCallback(async (employee: Employee) => {
    const targetActive = !(employee.isActive ?? true)
    if (!employee.apiId) {
      // Mode démo : bascule locale uniquement.
      setEmployeeList((prev) =>
        prev.map((item) =>
          item.id === employee.id ? { ...item, isActive: targetActive } : item
        )
      )
      toast.success(
        targetActive
          ? `${employee.name} a été réactivé`
          : `${employee.name} a été désactivé`
      )
      return
    }

    setTogglingEmployeeIds((prev) => new Set(prev).add(employee.id))
    setEmployeesError(null)
    try {
      const updated = await setEmployeeActive(employee.apiId, targetActive)
      setEmployeeList((prev) =>
        prev.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                isActive: updated.is_active !== false,
                syncStatus: updated.needs_gateway_push ? "pending" : "synced",
              }
            : item
        )
      )
      toast.success(
        targetActive
          ? `${employee.name} a été réactivé`
          : `${employee.name} a été désactivé`,
        {
          description: targetActive
            ? "L'employé peut à nouveau pointer."
            : "L'employé ne pourra plus pointer tant qu'il restera désactivé.",
        }
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors du changement d'état"
      setEmployeesError(message)
      toast.error(message)
    } finally {
      setTogglingEmployeeIds((prev) => {
        const next = new Set(prev)
        next.delete(employee.id)
        return next
      })
    }
  }, [])

  const handleDeleteEmployee = useCallback(async (employee: Employee) => {
    if (!employee.apiId) {
      // Mode démo : suppression locale.
      setEmployeeList((prev) => prev.filter((item) => item.id !== employee.id))
      toast.success(`${employee.name} a été supprimé`)
      return
    }

    setEmployeesError(null)
    try {
      await deleteEmployee(employee.apiId)
      setEmployeeList((prev) => prev.filter((item) => item.id !== employee.id))
      toast.success(`${employee.name} a été supprimé`, {
        description: "L'employé a été retiré du tenant et des lecteurs liés.",
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la suppression"
      setEmployeesError(message)
      toast.error(message)
      throw error
    }
  }, [])

  const handleOpenCreateDepartment = (organizationId: number, parentId: number | null) => {
    setCreateDepartmentContext({ organizationId, parentId })
    setNewDepartment({ name: "" })
    setCreateDepartmentOpen(true)
  }

  const handleCreateDepartment = async () => {
    if (!createDepartmentContext) return
    if (!newDepartment.name.trim()) {
      toast.error("Le nom du département est obligatoire.")
      return
    }
    const departmentTenantId = tenantId ?? organizations.find((o) => o.id === createDepartmentContext.organizationId)?.tenant
    if (!departmentTenantId) {
      toast.error("Tenant introuvable.")
      return
    }
    setIsSavingDepartment(true)
    try {
      await createDepartment({
        tenant: departmentTenantId,
        organization: createDepartmentContext.organizationId,
        parent: createDepartmentContext.parentId ?? undefined,
        name: newDepartment.name.trim(),
      })
      setCreateDepartmentOpen(false)
      toast.success("Département créé avec succès")
      await loadEmployeesData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création du département")
    } finally {
      setIsSavingDepartment(false)
    }
  }

  return (
    <div className="legacy-theme app-shell bg-[#0b0d13] text-[#e2e8f0]">
      <AppSidebar />

      <div className="app-shell-content">
        <Header systemStatus={pageSystemStatus} hideRouteInfo />

        <main className="mx-auto w-full max-w-430 space-y-3 px-3 py-3 md:px-4 2xl:max-w-none">
          <section className="border border-[#1c2133] bg-[#111318]">
            <div className="flex flex-col gap-3 border-b border-[#1c2133] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#4a5568]">
                  Annuaire operationnel
                </p>
                <h1 className="mt-1 font-display text-[22px] font-bold uppercase leading-none tracking-[0.08em] text-[#e2e8f0]">
                  Personnes
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-[#7a8599]">
                  Profils, affectations, badges, biometrie et synchronisation Hikvision.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#f97316]/60 hover:bg-[#1a1f2e] hover:text-[#f97316]"
                  onClick={() => {
                    if (employeeList.length === 0) {
                      toast.warning("Aucun employe a exporter")
                      return
                    }
                    const headers = ["Nom", "Prenom", "Matricule", "Departement", "Email", "Telephone"]
                    const rows = employeeList.map((employee) => {
                      const parts = employee.name.trim().split(/\s+/)
                      const firstName = parts.slice(0, -1).join(" ") || parts[0] || ""
                      const lastName = parts.length > 1 ? parts[parts.length - 1] : ""
                      return [lastName, firstName, employee.employeeId, employee.department, employee.email ?? "", employee.phone ?? ""]
                    })
                    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n")
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement("a")
                    link.href = url
                    link.download = `employes-${new Date().toISOString().slice(0, 10)}.csv`
                    link.click()
                    URL.revokeObjectURL(url)
                    toast.success("Export CSV termine", { description: `${employeeList.length} employes exportes` })
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#60a5fa]/60 hover:bg-[#1a1f2e] hover:text-[#60a5fa]"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importer
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none border-[#1c2133] bg-[#1a1f2e] font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599] hover:border-[#f59e0b]/60 hover:bg-[#1a1f2e] hover:text-[#f59e0b]"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Planning
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Assigner</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => router.push("/planning?action=assign-planning&scope=employees")}>
                      <Users className="mr-2 h-4 w-4" />
                      Personnes
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push("/planning?action=assign-planning&scope=departments")}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Departements
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Consulter</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => router.push("/planning?view=schedule")}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Planning personnes
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push("/planning?view=timetable")}>
                      <CalendarRange className="mr-2 h-4 w-4" />
                      Planning departements
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  className="h-8 rounded-none border border-[#f97316] bg-[#f97316] font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#0b0d13] shadow-none hover:bg-[#fb923c]"
                  onClick={() => {
                    setEditingEmployee(null)
                    setAddModalOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <PeopleMetricCard
                label="Actifs"
                value={activeEmployeesCount}
                note={`${employeeList.length} profils`}
                tone="green"
                icon={UserCheck}
              />
              <PeopleMetricCard
                label="Inactifs"
                value={inactiveEmployeesCount}
                note="Acces suspendus"
                tone="red"
                icon={UserX}
              />
              <PeopleMetricCard
                label="Sync attente"
                value={pendingSyncCount}
                note="Gateway Hik"
                tone="amber"
                icon={ShieldCheck}
              />
              <PeopleMetricCard
                label="Biometrie"
                value={biometricReadyCount}
                note="Face ou empreinte"
                tone="blue"
                icon={Fingerprint}
              />
            </div>
          </section>

          <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="xl:sticky xl:top-24">
              <OrganizationTree
                organizations={organizations}
                departments={departments}
                selectedScope={selectedScope}
                onSelectScope={setSelectedScope}
                employeeCountByOrganization={employeeCountByOrganization}
                employeeCountByDepartment={employeeCountByDepartment}
                onEmployeeDrop={(department) => void handleDropEmployeeOnDepartment(department)}
                onCreateDepartment={handleOpenCreateDepartment}
              />
            </div>

            <div className="min-w-0 space-y-3">
              {(employeesError || isLoadingEmployees || draggedEmployee) && (
                <div className="space-y-2">
                  {employeesError && (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                      {employeesError}
                    </div>
                  )}
                  {isLoadingEmployees && (
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Chargement des employes...
                    </div>
                  )}
                  {draggedEmployee && (
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100">
                      Deplacement en cours pour {draggedEmployee.name}.
                    </div>
                  )}
                </div>
              )}

              <section className="min-w-0 border border-[#1c2133] bg-[#111318]">
                <div className="flex flex-col gap-2 border-b border-[#1c2133] px-3 py-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a5568]" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Rechercher dans tous les attributs..."
                      className="h-9 rounded-none border-[#1c2133] bg-[#1a1f2e] pl-10 text-sm text-[#e2e8f0] placeholder:text-[#4a5568] focus-visible:ring-[#f97316]/35"
                    />
                  </div>
                  <div className="flex items-center gap-1 border border-[#1c2133] bg-[#0b0d13] p-1">
                    {(["all", "active", "inactive"] as const).map((option) => {
                      const labels = { all: "Tous", active: "Actifs", inactive: "Inactifs" } as const
                      const isSelected = activeFilter === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setActiveFilter(option)}
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
                </div>
                <div className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7a8599]">
                    {filteredEmployees.length} resultat{filteredEmployees.length > 1 ? "s" : ""} dans {selectedScope.label}.
                    {hasSearch ? " Recherche active." : ""}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
                    {demoModeEnabled ? "Mode demonstration" : "Donnees HikCentral en direct"}
                  </p>
                </div>

                <EmployeeTable
                  employees={filteredEmployees}
                  onEmployeeClick={handleEmployeeClick}
                  onPreviewEmployee={handleEmployeePreview}
                  onEditEmployee={handleEditEmployee}
                  accessGroupOptions={accessGroups.map((group) => ({ id: group.id, name: group.name }))}
                  workShiftOptions={workShifts.map((shift) => ({
                    id: shift.id,
                    name: `${shift.name} (${shift.start_time ?? "--:--"} - ${shift.end_time ?? "--:--"})`,
                  }))}
                  onAssignAccessGroups={handleAssignAccessGroups}
                  onAssignWorkShift={handleAssignWorkShift}
                  onDragEmployee={setDraggedEmployee}
                  togglingEmployeeIds={togglingEmployeeIds}
                  onToggleSuspension={handleToggleEmployeeSuspension}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              </section>
            </div>
          </div>

          <EmployeeDrawer
            employee={selectedEmployee}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onRequestFacePhotoUpload={(employee) => {
              setSelectedEmployee(employee)
              setDrawerOpen(false)
              handleEditEmployee(employee)
            }}
            onRequestCardEnroll={openCardEnroll}
            onRequestFingerprintEnroll={openFingerprintEnroll}
            onRequestFaceEnroll={openFaceEnroll}
          />

          {/* Card Enrollment */}
          {biometricTargetEmployee && (
            <CardEnrollDialog
              open={cardEnrollOpen}
              onOpenChange={setCardEnrollOpen}
              employeeName={biometricTargetEmployee.name}
              existingCards={
                biometricTargetEmployee.cardNumber !== "Non attribue"
                  ? [{ card_no: biometricTargetEmployee.cardNumber, card_type: "normal" }]
                  : []
              }
              readers={availableReaders}
              onScan={handleScanCard}
              onSave={handleSaveCard}
            />
          )}

          {/* Fingerprint Enrollment */}
          {biometricTargetEmployee?.apiId && (
            <FingerprintEnrollDialog
              open={fingerprintEnrollOpen}
              onOpenChange={setFingerprintEnrollOpen}
              employeeName={biometricTargetEmployee.name}
              employeeId={biometricTargetEmployee.apiId}
              existingFingerprints={biometricTargetEmployee.fingerprints.map((fingerprint) => ({
                finger_index: fingerprint.fingerIndex,
                template: fingerprint.template,
              }))}
              readers={availableReaders}
              onEnroll={handleEnrollFingerprint}
            />
          )}

          {/* Face Enrollment */}
          {biometricTargetEmployee?.apiId && (
            <FaceEnrollDialog
              open={faceEnrollOpen}
              onOpenChange={setFaceEnrollOpen}
              employeeName={biometricTargetEmployee.name}
              employeeId={biometricTargetEmployee.apiId}
              hasFace={biometricTargetEmployee.biometricStatus.hasFacePhoto}
              readers={availableReaders}
              onEnrollViaReader={handleEnrollFaceViaReader}
              onUploadPhoto={handleUploadFacePhoto}
            />
          )}

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
              parent: department.parent,
              organization: department.organization,
            }))}
            accessGroups={accessGroups.map((group) => ({ id: group.id, name: group.name }))}
            devices={devices.map((device) => ({
              id: device.id,
              dev_index: device.dev_index,
              name: device.name,
              status: device.status,
            }))}
          />

          <ImportEmployeesDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            onImport={handleImportEmployees}
          />

          <Dialog open={createDepartmentOpen} onOpenChange={setCreateDepartmentOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {createDepartmentContext?.parentId
                    ? "Créer un sous-département"
                    : "Créer un département"}
                </DialogTitle>
                <DialogDescription>
                  {createDepartmentContext?.parentId
                    ? `Nouveau sous-département rattaché à ${departments.find((d) => d.id === createDepartmentContext.parentId)?.name ?? "..."}.`
                    : `Nouveau département rattaché à ${organizations.find((o) => o.id === createDepartmentContext?.organizationId)?.name ?? "..."}.`}
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={newDepartment.name}
                    onChange={(event) => setNewDepartment((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex: Ressources humaines"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleCreateDepartment()
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDepartmentOpen(false)} disabled={isSavingDepartment}>
                  Annuler
                </Button>
                <Button onClick={() => void handleCreateDepartment()} disabled={isSavingDepartment}>
                  {isSavingDepartment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
