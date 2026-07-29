"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { useI18n } from "@/lib/i18n/context"
import { settingsPageDict } from "@/lib/i18n/pages/settings-page"
import { getActiveTenantCode } from "@/lib/api/auth"
import { API_BASE_URL } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
// Card components available but replaced with custom premium panels
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  assignDepartmentPlanning,
  assignDepartmentWorkShift,
  createAccessGroup,
  createDepartment,
  createPlanning,
  createWorkShift,
  deleteAccessGroup,
  deleteDepartment as deleteDepartmentApi,
  deletePlanning,
  deleteWorkShift,
  fetchAccessGroups,
  fetchDepartments,
  fetchOrganizations,
  fetchPlannings,
  fetchReaders,
  fetchTenants,
  fetchWorkShifts,
  type DeviceItem,
  type DepartmentItem,
  type OrganizationItem,
  type PlanningItem,
  type TenantItem,
  type WorkShiftItem,
  updateAccessGroup,
  updateDepartment,
  updatePlanning,
  updateWorkShift,
} from "@/lib/api/settings"
import {
  AlertTriangle,
  Bell,
  Building,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  DoorOpen,
  Edit,
  Globe,
  Hash,
  Key,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Shield,
  Smartphone,
  Tag,
  Timer,
  Trash2,
  Users,
  Wifi,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { PunchSitesTab } from "@/components/settings/punch-sites-tab"

type AccessGroup = {
  id: string
  backendId?: number
  name: string
  description: string
  planningId?: string
  planningName?: string
  readerIds: string[]
  deviceCount: number
}

type Assignment = {
  id: string
  planningId: string
  targetType: "Departement" | "Groupe"
  targetId: string
}

type PendingSensitiveAction =
  | { kind: "department"; id: number; label: string }
  | { kind: "group"; id: string; label: string }
  | { kind: "planning"; id: number; label: string }
  | { kind: "work-shift"; id: number; label: string }
  | { kind: "assignment"; assignment: Assignment; label: string }

export default function SettingsPage() {
  const tenantCode = getActiveTenantCode()
  const searchParams = useSearchParams()
  const { locale, setLocale, t } = useI18n()
  const tt = t.settingsPage
  const tr = settingsPageDict[locale]
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [tenants, setTenants] = useState<TenantItem[]>([])
  const [apiOrganizations, setApiOrganizations] = useState<OrganizationItem[]>([])
  const [apiReaders, setApiReaders] = useState<DeviceItem[]>([])
  const [apiPlannings, setApiPlannings] = useState<PlanningItem[]>([])
  const [apiDepartments, setApiDepartments] = useState<DepartmentItem[]>([])
  const [apiWorkShifts, setApiWorkShifts] = useState<WorkShiftItem[]>([])
  const [departmentError, setDepartmentError] = useState<string | null>(null)
  const [planningError, setPlanningError] = useState<string | null>(null)
  const [groupError, setGroupError] = useState<string | null>(null)
  const [workShiftError, setWorkShiftError] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const VALID_TABS = ["organization", "planning", "sites", "hikcentral", "security", "notifications", "general"] as const
  const initialTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<string>(
    VALID_TABS.includes(initialTab as typeof VALID_TABS[number]) ? (initialTab as string) : "organization"
  )
  const [isSavingDepartment, setIsSavingDepartment] = useState(false)
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [isSavingWorkShift, setIsSavingWorkShift] = useState(false)
  const [isAssigningPlanning, setIsAssigningPlanning] = useState(false)
  const [isAssigningWorkShift, setIsAssigningWorkShift] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [pendingSensitiveAction, setPendingSensitiveAction] = useState<PendingSensitiveAction | null>(null)
  const [isRunningSensitiveAction, setIsRunningSensitiveAction] = useState(false)

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [securityTimeRestrictionEnabled, setSecurityTimeRestrictionEnabled] = useState(true)
  const [companyName, setCompanyName] = useState("TechCorp Industries")
  const [timezone, setTimezone] = useState("Europe/Paris")
  // Extended preferences
  const [sessionTimeout, setSessionTimeout] = useState("30")
  const [language, setLanguage] = useState<"fr" | "en">(() => locale)
  const [themePreference, setThemePreference] = useState<"system" | "dark" | "light">("dark")
  const [alertOnAccessDenied, setAlertOnAccessDenied] = useState(true)
  const [alertOnIntrusion, setAlertOnIntrusion] = useState(true)
  const [alertOnLateArrival, setAlertOnLateArrival] = useState(false)
  const [alertOnDeviceFault, setAlertOnDeviceFault] = useState(true)
  const [dailyDigest, setDailyDigest] = useState(false)
  const [savedPreferences, setSavedPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    syncEnabled: true,
    securityTimeRestrictionEnabled: true,
    companyName: "TechCorp Industries",
    timezone: "Europe/Paris",
    sessionTimeout: "30",
    language: locale,
    theme: "dark" as "system" | "dark" | "light",
    alertOnAccessDenied: true,
    alertOnIntrusion: true,
    alertOnLateArrival: false,
    alertOnDeviceFault: true,
    dailyDigest: false,
  })

  const [depDialogOpen, setDepDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null)
  const [depForm, setDepForm] = useState({
    name: "",
    code: "",
    organizationId: "",
    parentId: "",
  })

  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<AccessGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: "", description: "", planningId: "", readerIds: [] as string[] })

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<PlanningItem | null>(null)
  const [scheduleForm, setScheduleForm] = useState<{
    name: string
    code: string
    description: string
    timezone: string
  }>({ name: "", code: "", description: "", timezone: "UTC" })

  const [assignmentForm, setAssignmentForm] = useState({
    planningId: "",
    targetType: "Departement" as Assignment["targetType"],
    targetId: "",
  })
  const [workShiftDialogOpen, setWorkShiftDialogOpen] = useState(false)
  const [editingWorkShift, setEditingWorkShift] = useState<WorkShiftItem | null>(null)
  const [workShiftForm, setWorkShiftForm] = useState({
    name: "",
    code: "",
    description: "",
    start_time: "08:00",
    end_time: "17:00",
    break_start_time: "12:00",
    break_end_time: "13:00",
    overtime_minutes: "",
    late_allowable_minutes: "10",
    early_leave_allowable_minutes: "10",
  })
  const [departmentShiftForm, setDepartmentShiftForm] = useState({
    departmentId: "",
    workShiftId: "",
  })

  const organizationById = useMemo(
    () => new Map(apiOrganizations.map((organization) => [organization.id, organization])),
    [apiOrganizations],
  )
  const departmentById = useMemo(
    () => new Map(apiDepartments.map((department) => [department.id, department])),
    [apiDepartments],
  )
  const departmentTargets = useMemo(
    () => apiDepartments.map((department) => ({ id: String(department.id), name: department.name })),
    [apiDepartments],
  )
  const groupTargets = useMemo(
    () => groups.map((group) => ({ id: group.id, name: group.name })),
    [groups],
  )
  const assignments = useMemo<Assignment[]>(
    () => [
      ...apiDepartments
        .filter((department) => department.planning)
        .map((department) => ({
          id: `dep-${department.id}`,
          planningId: String(department.planning),
          targetType: "Departement" as const,
          targetId: String(department.id),
        })),
      ...groups
        .filter((group) => group.planningId)
        .map((group) => ({
          id: `grp-${group.id}`,
          planningId: group.planningId || "",
          targetType: "Groupe" as const,
          targetId: group.id,
        })),
    ],
    [apiDepartments, groups],
  )
  const availableTargets = useMemo(() => {
    return assignmentForm.targetType === "Departement" ? departmentTargets : groupTargets
  }, [assignmentForm.targetType, departmentTargets, groupTargets])
  const activeTenantName = useMemo(
    () => tenants.find((tenant) => tenant.id === tenantId)?.name ?? "",
    [tenants, tenantId],
  )

  const hasNotificationChanges =
    emailNotifications !== savedPreferences.emailNotifications ||
    pushNotifications !== savedPreferences.pushNotifications ||
    alertOnAccessDenied !== savedPreferences.alertOnAccessDenied ||
    alertOnIntrusion !== savedPreferences.alertOnIntrusion ||
    alertOnLateArrival !== savedPreferences.alertOnLateArrival ||
    alertOnDeviceFault !== savedPreferences.alertOnDeviceFault ||
    dailyDigest !== savedPreferences.dailyDigest
  const hasSecurityChanges =
    syncEnabled !== savedPreferences.syncEnabled ||
    securityTimeRestrictionEnabled !== savedPreferences.securityTimeRestrictionEnabled ||
    sessionTimeout !== savedPreferences.sessionTimeout
  const hasGeneralChanges =
    companyName !== savedPreferences.companyName ||
    timezone !== savedPreferences.timezone ||
    language !== savedPreferences.language ||
    themePreference !== savedPreferences.theme

  const pageSystemStatus: "connected" | "disconnected" | "syncing" =
    isInitialLoading ||
    isSavingDepartment ||
    isSavingGroup ||
    isSavingSchedule ||
    isSavingWorkShift ||
    isAssigningPlanning ||
    isAssigningWorkShift ||
    isSavingPreferences ||
    isRunningSensitiveAction
      ? "syncing"
      : departmentError || planningError || groupError || workShiftError
        ? "disconnected"
        : "connected"

  const resetDepartmentForm = () =>
    setDepForm({
      name: "",
      code: "",
      organizationId: apiOrganizations[0] ? String(apiOrganizations[0].id) : "",
      parentId: "",
    })
  const resetGroupForm = () => setGroupForm({ name: "", description: "", planningId: "", readerIds: [] })
  const resetScheduleForm = () =>
    setScheduleForm({ name: "", code: "", description: "", timezone: "UTC" })
  const resetWorkShiftForm = () =>
    setWorkShiftForm({
      name: "",
      code: "",
      description: "",
      start_time: "08:00",
      end_time: "17:00",
      break_start_time: "12:00",
      break_end_time: "13:00",
      overtime_minutes: "",
      late_allowable_minutes: "10",
      early_leave_allowable_minutes: "10",
    })

  const mapAccessGroupToUi = (group: {
    id: number
    name: string
    description: string
    planning: number | null
    planning_name?: string
    readers?: number[]
    reader_count?: number
  }): AccessGroup => ({
    id: String(group.id),
    backendId: group.id,
    name: group.name,
    description: group.description,
    planningId: group.planning ? String(group.planning) : "",
    planningName: group.planning_name || "",
    readerIds: (group.readers || []).map((id) => String(id)),
    deviceCount: group.reader_count ?? (group.readers || []).length,
  })

  const submitDepartment = async () => {
    if (!tenantId || !depForm.name.trim() || !depForm.organizationId) {
      const message = tr.deptRequired
      setDepartmentError(message)
      toast.error(message)
      return
    }
    setDepartmentError(null)
    setIsSavingDepartment(true)
    try {
      const payload = {
        tenant: tenantId,
        organization: Number(depForm.organizationId),
        parent: depForm.parentId ? Number(depForm.parentId) : null,
        name: depForm.name.trim(),
        code: depForm.code.trim() || undefined,
      }
      const saved = editingDepartment
        ? await updateDepartment(editingDepartment.id, payload)
        : await createDepartment(payload)
      setApiDepartments((prev) => {
        const exists = prev.some((item) => item.id === saved.id)
        if (exists) {
          return prev.map((item) => (item.id === saved.id ? saved : item))
        }
        return [saved, ...prev]
      })
      setDepDialogOpen(false)
      setEditingDepartment(null)
      resetDepartmentForm()
      toast.success(editingDepartment ? tr.deptUpdated : tr.deptCreated)
    } catch (error) {
      setDepartmentError(error instanceof Error ? error.message : tr.deptSaveError)
      toast.error(tr.deptSaveError)
    } finally {
      setIsSavingDepartment(false)
    }
  }

  const submitGroup = async () => {
    if (!tenantId || !groupForm.name.trim()) {
      const message = tr.groupNameRequired
      setGroupError(message)
      toast.error(message)
      return
    }
    setGroupError(null)
    setIsSavingGroup(true)
    try {
      const payload = {
        tenant: tenantId,
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        planning: groupForm.planningId ? Number(groupForm.planningId) : null,
        readers: groupForm.readerIds.map((id) => Number(id)),
      }

      const saved = editingGroup?.backendId
        ? await updateAccessGroup(editingGroup.backendId, payload)
        : await createAccessGroup(payload)

      const uiGroup: AccessGroup = {
        id: String(saved.id),
        backendId: saved.id,
        name: saved.name,
        description: saved.description,
        planningId: saved.planning ? String(saved.planning) : "",
        planningName: saved.planning_name || "",
        readerIds: (saved.readers || []).map((id) => String(id)),
        deviceCount: saved.reader_count ?? (saved.readers || []).length,
      }

      setGroups((prev) => {
        const exists = prev.some((item) => item.id === uiGroup.id)
        if (exists) {
          return prev.map((item) => (item.id === uiGroup.id ? uiGroup : item))
        }
        return [uiGroup, ...prev]
      })

      setGroupDialogOpen(false)
      setEditingGroup(null)
      resetGroupForm()
      toast.success(editingGroup?.backendId ? tr.groupUpdated : tr.groupCreated)
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : tr.groupSaveError)
      toast.error(tr.groupSaveError)
    } finally {
      setIsSavingGroup(false)
    }
  }

  const submitSchedule = async () => {
    if (!tenantId || !scheduleForm.name.trim()) {
      const message = tr.planningNameRequired
      setPlanningError(message)
      toast.error(message)
      return
    }
    setPlanningError(null)
    setIsSavingSchedule(true)
    try {
      const payload = {
        tenant: tenantId,
        name: scheduleForm.name.trim(),
        code: scheduleForm.code.trim() || undefined,
        description: scheduleForm.description.trim(),
        timezone: scheduleForm.timezone.trim() || "UTC",
      }
      const saved = editingSchedule
        ? await updatePlanning(editingSchedule.id, payload)
        : await createPlanning(payload)
      setApiPlannings((prev) => {
        const exists = prev.some((item) => item.id === saved.id)
        if (exists) {
          return prev.map((item) => (item.id === saved.id ? saved : item))
        }
        return [saved, ...prev]
      })
      setScheduleDialogOpen(false)
      setEditingSchedule(null)
      resetScheduleForm()
      toast.success(editingSchedule ? tr.planningUpdated : tr.planningCreated)
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : tr.planningSaveError)
      toast.error(tr.planningSaveError)
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const submitWorkShift = async () => {
    if (!tenantId || !workShiftForm.name.trim()) {
      const message = tr.shiftNameRequired
      setWorkShiftError(message)
      toast.error(message)
      return
    }
    setWorkShiftError(null)
    setIsSavingWorkShift(true)
    try {
      const overtimeMinutesRaw = workShiftForm.overtime_minutes.trim()
      if (overtimeMinutesRaw && Number.isNaN(Number(overtimeMinutesRaw))) {
        setWorkShiftError(tr.overtimeInvalid)
        return
      }
      const lateAllowableRaw = workShiftForm.late_allowable_minutes.trim()
      if (lateAllowableRaw && Number.isNaN(Number(lateAllowableRaw))) {
        setWorkShiftError(tr.lateInvalid)
        return
      }
      const earlyLeaveAllowableRaw = workShiftForm.early_leave_allowable_minutes.trim()
      if (earlyLeaveAllowableRaw && Number.isNaN(Number(earlyLeaveAllowableRaw))) {
        setWorkShiftError(tr.earlyLeaveInvalid)
        return
      }

      const payload = {
        tenant: tenantId,
        name: workShiftForm.name.trim(),
        code: workShiftForm.code.trim() || undefined,
        description: workShiftForm.description.trim(),
        start_time: workShiftForm.start_time,
        end_time: workShiftForm.end_time,
        break_start_time: workShiftForm.break_start_time || null,
        break_end_time: workShiftForm.break_end_time || null,
      }
      if (overtimeMinutesRaw) {
        Object.assign(payload, { overtime_minutes: Number(overtimeMinutesRaw) })
      }
      if (lateAllowableRaw) {
        Object.assign(payload, { late_allowable_minutes: Number(lateAllowableRaw) })
      }
      if (earlyLeaveAllowableRaw) {
        Object.assign(payload, { early_leave_allowable_minutes: Number(earlyLeaveAllowableRaw) })
      }
      const saved = editingWorkShift
        ? await updateWorkShift(editingWorkShift.id, payload)
        : await createWorkShift(payload)

      setApiWorkShifts((prev) => {
        const exists = prev.some((item) => item.id === saved.id)
        if (exists) {
          return prev.map((item) => (item.id === saved.id ? saved : item))
        }
        return [saved, ...prev]
      })

      setWorkShiftDialogOpen(false)
      setEditingWorkShift(null)
      resetWorkShiftForm()
      toast.success(editingWorkShift ? tr.shiftUpdated : tr.shiftCreated)
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : tr.shiftSaveError)
      toast.error(tr.shiftSaveError)
    } finally {
      setIsSavingWorkShift(false)
    }
  }

  const removeDepartment = async (id: number) => {
    setDepartmentError(null)
    try {
      await deleteDepartmentApi(id)
      setApiDepartments((prev) => prev.filter((department) => department.id !== id))
      toast.success(tr.deptDeleted)
    } catch (error) {
      setDepartmentError(error instanceof Error ? error.message : tr.deptDeleteError)
      toast.error(tr.deptDeleteError)
    }
  }

  const deleteGroup = async (id: string) => {
    const target = groups.find((group) => group.id === id)
    if (!target?.backendId) {
      setGroups((prev) => prev.filter((group) => group.id !== id))
      return
    }
    setGroupError(null)
    try {
      await deleteAccessGroup(target.backendId)
      setGroups((prev) => prev.filter((group) => group.id !== id))
      toast.success(tr.groupDeleted)
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : tr.groupDeleteError)
      toast.error(tr.groupDeleteError)
    }
  }

  const deleteSchedule = async (id: number) => {
    setPlanningError(null)
    try {
      await deletePlanning(id)
      setApiPlannings((prev) => prev.filter((planning) => planning.id !== id))
      setGroups((prev) =>
        prev.map((group) =>
          group.planningId === String(id) ? { ...group, planningId: "", planningName: "" } : group,
        ),
      )
      setApiDepartments((prev) =>
        prev.map((department) => (department.planning === id ? { ...department, planning: null } : department)),
      )
      toast.success(tr.planningDeleted)
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : tr.planningDeleteError)
      toast.error(tr.planningDeleteError)
    }
  }

  const addAssignment = async () => {
    if (!assignmentForm.planningId || !assignmentForm.targetId) {
      const message = tr.assignmentSelectRequired
      setPlanningError(message)
      toast.error(message)
      return
    }
    setPlanningError(null)
    setIsAssigningPlanning(true)
    try {
      if (assignmentForm.targetType === "Departement") {
        const updated = await assignDepartmentPlanning(
          Number(assignmentForm.targetId),
          Number(assignmentForm.planningId),
        )
        setApiDepartments((prev) => prev.map((department) => (department.id === updated.id ? updated : department)))
        toast.success(tr.planningAssigned)
        return
      }
      const targetGroup = groups.find((group) => group.id === assignmentForm.targetId)
      if (!targetGroup?.backendId) return
      const saved = await updateAccessGroup(targetGroup.backendId, { planning: Number(assignmentForm.planningId) })
      const mapped = mapAccessGroupToUi(saved)
      setGroups((prev) => prev.map((group) => (group.id === mapped.id ? mapped : group)))
      toast.success(tr.planningAssigned)
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : tr.planningAssignError)
      toast.error(tr.planningAssignError)
    } finally {
      setIsAssigningPlanning(false)
    }
  }

  const removeAssignment = async (assignment: Assignment) => {
    setPlanningError(null)
    try {
      if (assignment.targetType === "Departement") {
        const updated = await updateDepartment(Number(assignment.targetId), { planning: null })
        setApiDepartments((prev) => prev.map((department) => (department.id === updated.id ? updated : department)))
        toast.success(tr.assignmentRemoved)
        return
      }
      const targetGroup = groups.find((group) => group.id === assignment.targetId)
      if (!targetGroup?.backendId) return
      const saved = await updateAccessGroup(targetGroup.backendId, { planning: null })
      const mapped = mapAccessGroupToUi(saved)
      setGroups((prev) => prev.map((group) => (group.id === mapped.id ? mapped : group)))
      toast.success(tr.assignmentRemoved)
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : tr.assignmentRemoveError)
      toast.error(tr.assignmentRemoveError)
    }
  }

  const removeWorkShift = async (id: number) => {
    setWorkShiftError(null)
    try {
      await deleteWorkShift(id)
      setApiWorkShifts((prev) => prev.filter((shift) => shift.id !== id))
      setApiDepartments((prev) =>
        prev.map((department) =>
          department.work_shift === id ? { ...department, work_shift: null, effective_work_shift: null } : department
        )
      )
      toast.success(tr.shiftDeleted)
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : tr.shiftDeleteError)
      toast.error(tr.shiftDeleteError)
    }
  }

  const submitDepartmentShiftAssignment = async () => {
    if (!departmentShiftForm.departmentId || !departmentShiftForm.workShiftId) {
      const message = tr.deptShiftSelectRequired
      setWorkShiftError(message)
      toast.error(message)
      return
    }
    setWorkShiftError(null)
    setIsAssigningWorkShift(true)
    try {
      const updatedDepartment = await assignDepartmentWorkShift(
        Number(departmentShiftForm.departmentId),
        Number(departmentShiftForm.workShiftId),
      )
      setApiDepartments((prev) =>
        prev.map((item) => (item.id === updatedDepartment.id ? updatedDepartment : item))
      )
      setDepartmentShiftForm((prev) => ({ ...prev, workShiftId: "" }))
      toast.success(tr.deptShiftAssigned)
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : tr.deptShiftAssignError)
      toast.error(tr.deptShiftAssignError)
    } finally {
      setIsAssigningWorkShift(false)
    }
  }

  const savePreferenceSnapshot = (next: typeof savedPreferences) => {
    setSavedPreferences(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("settings-ui-preferences", JSON.stringify(next))
    }
  }

  const saveNotificationSettings = async () => {
    setIsSavingPreferences(true)
    try {
      const next = {
        ...savedPreferences,
        emailNotifications,
        pushNotifications,
        alertOnAccessDenied,
        alertOnIntrusion,
        alertOnLateArrival,
        alertOnDeviceFault,
        dailyDigest,
      }
      savePreferenceSnapshot(next)
      toast.success(tr.notifPrefsSaved)
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const saveSecuritySettings = async () => {
    setIsSavingPreferences(true)
    try {
      const next = {
        ...savedPreferences,
        syncEnabled,
        securityTimeRestrictionEnabled,
        sessionTimeout,
      }
      savePreferenceSnapshot(next)
      toast.success(tr.securityPrefsSaved)
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const saveGeneralSettings = async () => {
    const trimmedName = companyName.trim()
    const trimmedTimezone = timezone.trim()
    if (!trimmedName) {
      toast.error(tr.companyNameRequired)
      return
    }
    if (!trimmedTimezone || !trimmedTimezone.includes("/")) {
      toast.error(tr.timezoneFormatInvalid)
      return
    }

    setIsSavingPreferences(true)
    try {
      const next = {
        ...savedPreferences,
        companyName: trimmedName,
        timezone: trimmedTimezone,
        language,
        theme: themePreference,
      }
      savePreferenceSnapshot(next)
      setCompanyName(trimmedName)
      setTimezone(trimmedTimezone)
      setLocale(language)
      setTheme(themePreference === "system" ? "dark" : themePreference)
      toast.success(tr.generalPrefsSaved)
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const resetNotificationSettings = () => {
    setEmailNotifications(savedPreferences.emailNotifications)
    setPushNotifications(savedPreferences.pushNotifications)
    setAlertOnAccessDenied(savedPreferences.alertOnAccessDenied)
    setAlertOnIntrusion(savedPreferences.alertOnIntrusion)
    setAlertOnLateArrival(savedPreferences.alertOnLateArrival)
    setAlertOnDeviceFault(savedPreferences.alertOnDeviceFault)
    setDailyDigest(savedPreferences.dailyDigest)
    toast.info(tr.notifChangesReverted)
  }

  const resetSecuritySettings = () => {
    setSyncEnabled(savedPreferences.syncEnabled)
    setSecurityTimeRestrictionEnabled(savedPreferences.securityTimeRestrictionEnabled)
    setSessionTimeout(savedPreferences.sessionTimeout)
    toast.info(tr.securityChangesReverted)
  }

  const resetGeneralSettings = () => {
    setCompanyName(savedPreferences.companyName)
    setTimezone(savedPreferences.timezone)
    setLanguage(savedPreferences.language)
    setThemePreference(savedPreferences.theme)
    toast.info(tr.generalChangesReverted)
  }

  const runSensitiveAction = async () => {
    if (!pendingSensitiveAction) return

    setIsRunningSensitiveAction(true)
    try {
      switch (pendingSensitiveAction.kind) {
        case "department":
          await removeDepartment(pendingSensitiveAction.id)
          break
        case "group":
          await deleteGroup(pendingSensitiveAction.id)
          break
        case "planning":
          await deleteSchedule(pendingSensitiveAction.id)
          break
        case "work-shift":
          await removeWorkShift(pendingSensitiveAction.id)
          break
        case "assignment":
          await removeAssignment(pendingSensitiveAction.assignment)
          break
      }
      setPendingSensitiveAction(null)
    } finally {
      setIsRunningSensitiveAction(false)
    }
  }

  const toggleReader = (readerId: string, checked: boolean) => {
    setGroupForm((prev) => {
      if (checked) {
        if (prev.readerIds.includes(readerId)) return prev
        return { ...prev, readerIds: [...prev.readerIds, readerId] }
      }
      return { ...prev, readerIds: prev.readerIds.filter((id) => id !== readerId) }
    })
  }

  useEffect(() => {
    let active = true
    const loadAccessGroupData = async () => {
      setIsInitialLoading(true)
      setGroupError(null)
      setDepartmentError(null)
      setPlanningError(null)
      try {
        const tenantList = await fetchTenants()
        if (!active) return
        setTenants(tenantList)

        const resolvedTenant = tenantCode
          ? tenantList.find((item) => item.code.toLowerCase() === tenantCode.toLowerCase())
          : tenantList[0]
        if (!resolvedTenant) return

        setTenantId(resolvedTenant.id)
        const [plannings, readers, accessGroups, organizationsList, departmentsList, workShiftsList] = await Promise.all([
          fetchPlannings(resolvedTenant.code),
          fetchReaders(resolvedTenant.code),
          fetchAccessGroups(resolvedTenant.code),
          fetchOrganizations(resolvedTenant.code),
          fetchDepartments(resolvedTenant.code),
          fetchWorkShifts(resolvedTenant.code),
        ])
        if (!active) return

        setApiPlannings(plannings)
        setApiReaders(readers)
        setApiOrganizations(organizationsList)
        setApiDepartments(departmentsList)
        setApiWorkShifts(workShiftsList)
        setDepForm((prev) => ({
          ...prev,
          organizationId: prev.organizationId || (organizationsList[0] ? String(organizationsList[0].id) : ""),
        }))
        setDepartmentShiftForm({
          departmentId: departmentsList[0] ? String(departmentsList[0].id) : "",
          workShiftId: workShiftsList[0] ? String(workShiftsList[0].id) : "",
        })
        setGroups(accessGroups.map((group) => mapAccessGroupToUi(group)))
      } catch (error) {
        if (!active) return
        setGroupError(error instanceof Error ? error.message : tr.loadError)
      } finally {
        if (active) {
          setIsInitialLoading(false)
        }
      }
    }

    void loadAccessGroupData()
    return () => {
      active = false
    }
  }, [tenantCode])

  useEffect(() => {
    if (depForm.organizationId || !apiOrganizations[0]) return
    setDepForm((prev) => ({ ...prev, organizationId: String(apiOrganizations[0].id) }))
  }, [apiOrganizations, depForm.organizationId])

  useEffect(() => {
    setAssignmentForm((prev) => {
      const planningIds = apiPlannings.map((planning) => String(planning.id))
      const targetIds =
        prev.targetType === "Departement"
          ? apiDepartments.map((department) => String(department.id))
          : groups.map((group) => group.id)

      const nextPlanningId =
        prev.planningId && planningIds.includes(prev.planningId) ? prev.planningId : (planningIds[0] ?? "")
      const nextTargetId =
        prev.targetId && targetIds.includes(prev.targetId) ? prev.targetId : (targetIds[0] ?? "")

      if (nextPlanningId === prev.planningId && nextTargetId === prev.targetId) {
        return prev
      }
      return {
        ...prev,
        planningId: nextPlanningId,
        targetId: nextTargetId,
      }
    })
  }, [apiPlannings, apiDepartments, groups])

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem("settings-ui-preferences")
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as typeof savedPreferences & { theme?: "system" | "dark" | "light" }
      const parsedTheme =
        parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "system"
          ? parsed.theme
          : "dark"
      setSavedPreferences({ ...parsed, theme: parsedTheme })
      setEmailNotifications(parsed.emailNotifications)
      setPushNotifications(parsed.pushNotifications)
      setSyncEnabled(parsed.syncEnabled)
      setSecurityTimeRestrictionEnabled(parsed.securityTimeRestrictionEnabled)
      setCompanyName(parsed.companyName)
      setTimezone(parsed.timezone)
      if (parsed.sessionTimeout) setSessionTimeout(parsed.sessionTimeout)
      if (parsed.language === "fr" || parsed.language === "en") {
        setLanguage(parsed.language)
        setLocale(parsed.language)
      }
      setThemePreference(parsedTheme)
      setTheme(parsedTheme === "system" ? "dark" : parsedTheme)
      if (parsed.alertOnAccessDenied !== undefined) setAlertOnAccessDenied(parsed.alertOnAccessDenied)
      if (parsed.alertOnIntrusion !== undefined) setAlertOnIntrusion(parsed.alertOnIntrusion)
      if (parsed.alertOnLateArrival !== undefined) setAlertOnLateArrival(parsed.alertOnLateArrival)
      if (parsed.alertOnDeviceFault !== undefined) setAlertOnDeviceFault(parsed.alertOnDeviceFault)
      if (parsed.dailyDigest !== undefined) setDailyDigest(parsed.dailyDigest)
    } catch {
      // Ignore invalid local cache.
    }
  }, [])

  // Sync language and theme controls with global providers.
  useEffect(() => {
    setLanguage(locale)
  }, [locale])

  useEffect(() => {
    // Ne pas écraser le choix "system" de l'utilisateur si déjà sélectionné.
    setThemePreference((current) => {
      if (current === "system") return current
      if (theme === "dark" || theme === "light") return theme
      if (resolvedTheme === "dark" || resolvedTheme === "light") return resolvedTheme
      return current
    })
  }, [theme, resolvedTheme])

  // ── Helpers ──────────────────────────────────────────────────
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }

  const settingsNav = [
    { id: "organization", label: tt.navOrganization, icon: Building2, badge: apiDepartments.length + groups.length },
    { id: "planning", label: tt.navPlanning, icon: CalendarDays, badge: apiPlannings.length + apiWorkShifts.length },
    { id: "sites", label: tr.sites.navLabel, icon: MapPin, badge: null },
    { id: "hikcentral", label: tt.navHikcentral, icon: Server, badge: tenants.length },
    { id: "security", label: tt.navSecurity, icon: Shield, badge: null },
    { id: "notifications", label: tt.navNotifications, icon: Bell, badge: null },
    { id: "general", label: tt.navGeneral, icon: Globe, badge: null },
  ] as const

  return (
    <div className="app-shell black-orange-theme settings-orange-theme">
      <AppSidebar />

      <div className="app-shell-content">
        <Header systemStatus={pageSystemStatus} />

        <main className="app-page">
          {/* ── Hero Section ── */}
          <section className="relative animate-fade-up overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="absolute inset-0 bg-linear-to-br from-primary/4 via-transparent to-primary/2" />
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-primary/3 blur-2xl" />
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">{tt.administration}</p>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{tt.title}</h1>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {tt.description}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: tenants.length, label: tt.statTenants, icon: Building },
                    { value: apiDepartments.length, label: tt.statDepts, icon: Building2 },
                    { value: groups.length, label: tt.statGroups, icon: DoorOpen },
                    { value: apiReaders.length, label: tt.statReaders, icon: Cpu },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-center">
                      <stat.icon className="mb-0.5 h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xl font-bold tabular-nums text-foreground">{stat.value}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {isInitialLoading && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {tt.loading}
                </div>
              )}
            </div>
          </section>

          {/* ── Settings Layout : nav verticale + contenu ── */}
          <div className="mt-6 flex flex-col gap-6 lg:flex-row">

            {/* ── Navigation latérale ── */}
            <aside className="w-full shrink-0 lg:w-52">
              <nav className="sticky top-6 overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <p className="mb-1 px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{tt.sectionsLabel}</p>
                <div className="flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
                  {settingsNav.map((item) => {
                    const active = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex w-full min-w-28 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all lg:min-w-0 ${
                          active
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge !== null && item.badge > 0 && (
                          <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </nav>
            </aside>

            {/* ── Contenu principal ── */}
            <div className="min-w-0 flex-1 space-y-6">

              {/* ═══════════════ ORGANISATION ═══════════════ */}
              {activeTab === "organization" && (
                <>
                  {/* Stats strip */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: tr.statOrganizations, value: apiOrganizations.length, color: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-400/20", icon: Building2 },
                      { label: tr.statDepartments, value: apiDepartments.length, color: "text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-400/20", icon: Building },
                      { label: tr.statAccessGroups, value: groups.length, color: "text-purple-400", bg: "bg-purple-500/10", ring: "ring-purple-400/20", icon: DoorOpen },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg} ring-1 ${s.ring}`}>
                          <s.icon className={`h-5 w-5 ${s.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Départements */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-sky-500 to-blue-600 opacity-70" />
                    <div className="flex items-center justify-between gap-4 p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500/20 to-blue-500/10 ring-1 ring-sky-400/20">
                          <Building className="h-5 w-5 text-sky-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.departmentsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.departmentsDesc}</p>
                        </div>
                      </div>
                      <Dialog open={depDialogOpen} onOpenChange={setDepDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingDepartment(null); resetDepartmentForm() }}>
                            <Plus className="mr-2 h-4 w-4" />
                            {tr.newButton}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingDepartment ? tr.editDepartmentTitle : tr.createDepartmentTitle}</DialogTitle>
                            <DialogDescription>{tr.depDialogDesc}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.nameLabel}</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={depForm.name} onChange={(e) => setDepForm((p) => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.codeLabel}</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={depForm.code} onChange={(e) => setDepForm((p) => ({ ...p, code: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.organizationLabel}</Label>
                              <Select value={depForm.organizationId} onValueChange={(value) => setDepForm((p) => ({ ...p, organizationId: value }))}>
                                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                  <SelectValue placeholder={tr.selectOrganizationPlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {apiOrganizations.map((organization) => (
                                    <SelectItem key={organization.id} value={String(organization.id)}>{organization.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.parentLabel}</Label>
                              <Select value={depForm.parentId} onValueChange={(value) => setDepForm((p) => ({ ...p, parentId: value === "__none__" ? "" : value }))}>
                                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                  <SelectValue placeholder={tr.noParent} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">{tr.noParent}</SelectItem>
                                  {apiDepartments.filter((d) => d.id !== editingDepartment?.id).map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setDepDialogOpen(false)}>{tr.cancel}</Button>
                            <Button className="h-10 rounded-xl" onClick={submitDepartment} disabled={isSavingDepartment}>
                              {isSavingDepartment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {tr.save}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {departmentError && (
                        <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">{departmentError}</div>
                      )}
                      {apiDepartments.map((dep) => {
                        const organization = organizationById.get(dep.organization)
                        const parent = dep.parent ? departmentById.get(dep.parent) : null
                        const planningName = dep.effective_planning?.name
                        const shiftName = dep.effective_work_shift?.name
                        return (
                          <div key={dep.id} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-border hover:bg-muted/50">
                            {parent && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />}
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/15 transition-transform group-hover:scale-105">
                              <Building className="h-4 w-4 text-sky-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">{dep.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {dep.code && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                    <Hash className="h-2.5 w-2.5" />{dep.code}
                                  </span>
                                )}
                                {organization && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-400">
                                    <Building2 className="h-2.5 w-2.5" />{organization.name}
                                  </span>
                                )}
                                {parent && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    <ChevronRight className="h-2.5 w-2.5" />{parent.name}
                                  </span>
                                )}
                                {planningName && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">
                                    <CalendarDays className="h-2.5 w-2.5" />{planningName}
                                  </span>
                                )}
                                {shiftName && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                                    <Clock className="h-2.5 w-2.5" />{shiftName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                setEditingDepartment(dep)
                                setDepForm({ name: dep.name, code: dep.code || "", organizationId: String(dep.organization), parentId: dep.parent ? String(dep.parent) : "" })
                                setDepDialogOpen(true)
                              }}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "department", id: dep.id, label: tr.deleteDeptLabel(dep.name) })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      {apiDepartments.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                          <Building className="mb-3 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">{tr.noDepartments}</p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditingDepartment(null); resetDepartmentForm(); setDepDialogOpen(true) }}>
                            <Plus className="mr-2 h-3.5 w-3.5" />{tr.createDepartmentCta}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Groupes d'accès */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-500 to-purple-600 opacity-70" />
                    <div className="flex items-center justify-between gap-4 p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-purple-500/10 ring-1 ring-violet-400/20">
                          <DoorOpen className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.groupsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.groupsDesc}</p>
                        </div>
                      </div>
                      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingGroup(null); resetGroupForm() }}>
                            <DoorOpen className="mr-2 h-4 w-4" />
                            {tr.newGroupButton}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingGroup ? tr.editGroupTitle : tr.createGroupTitle}</DialogTitle>
                            <DialogDescription>{tr.groupDialogDesc}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.nameLabel}</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.descriptionLabel}</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.scheduleLabel}</Label>
                              <Select value={groupForm.planningId} onValueChange={(value) => setGroupForm((p) => ({ ...p, planningId: value === "__none__" ? "" : value }))}>
                                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                  <SelectValue placeholder={tr.selectPlanningPlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">{tr.noPlanningOption}</SelectItem>
                                  {apiPlannings.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.readersLabel}</Label>
                              <div className="max-h-44 space-y-2 overflow-auto rounded-xl border border-border/60 bg-background/40 p-3">
                                {apiReaders.length === 0 && <p className="text-xs text-muted-foreground">{tr.noReadersAvailable}</p>}
                                {apiReaders.map((reader) => {
                                  const readerId = String(reader.id)
                                  return (
                                    <label key={reader.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                      <Checkbox checked={groupForm.readerIds.includes(readerId)} onCheckedChange={(v) => toggleReader(readerId, v === true)} />
                                      <span>{reader.name || reader.dev_index}</span>
                                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">{reader.serial_number}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setGroupDialogOpen(false)}>{tr.cancel}</Button>
                            <Button className="h-10 rounded-xl" onClick={submitGroup} disabled={isSavingGroup}>
                              {isSavingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {tr.save}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {activeTenantName && (
                        <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">{tr.activeTenantLabel}</span> {activeTenantName}
                        </p>
                      )}
                      {groupError && (
                        <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">{groupError}</div>
                      )}
                      {groups.map((group) => (
                        <div key={group.id} className="group/card flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-border hover:bg-muted/50">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-400/15 transition-transform group-hover/card:scale-105">
                            <DoorOpen className="h-4 w-4 text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{group.name}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {group.planningName && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">
                                  <CalendarDays className="h-2.5 w-2.5" />{group.planningName}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                <Cpu className="h-2.5 w-2.5" />{tr.readerCount(group.deviceCount)}
                              </span>
                              {group.description && (
                                <span className="truncate text-[11px] text-muted-foreground">{group.description}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditingGroup(group)
                              setGroupForm({ name: group.name, description: group.description, planningId: group.planningId || "", readerIds: group.readerIds })
                              setGroupDialogOpen(true)
                            }}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "group", id: group.id, label: tr.deleteGroupLabel(group.name) })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {groups.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                          <DoorOpen className="mb-3 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">{tr.noGroups}</p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditingGroup(null); resetGroupForm(); setGroupDialogOpen(true) }}>
                            <Plus className="mr-2 h-3.5 w-3.5" />{tr.createGroupCta}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════ HORAIRES & PLANNINGS ═══════════════ */}
              {activeTab === "planning" && (
                <>
                  {/* Stats strip */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: tr.statPlannings, value: apiPlannings.length, color: "text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-400/20", icon: CalendarDays },
                      { label: tr.statShifts, value: apiWorkShifts.length, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-400/20", icon: Clock },
                      { label: tr.statAssignments, value: assignments.length, color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-400/20", icon: CheckCircle2 },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg} ring-1 ${s.ring}`}>
                          <s.icon className={`h-5 w-5 ${s.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Plannings backends */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-500 to-indigo-600 opacity-70" />
                    <div className="flex items-center justify-between gap-4 p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-indigo-500/10 ring-1 ring-violet-400/20">
                          <CalendarDays className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.planningsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.planningsDesc}</p>
                        </div>
                      </div>
                      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingSchedule(null); resetScheduleForm() }}>
                            <Plus className="mr-2 h-4 w-4" />{tr.newButton}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingSchedule ? tr.editPlanningTitle : tr.createPlanningTitle}</DialogTitle>
                            <DialogDescription>{tr.planningDialogDesc}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.nameLabel}</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.name} onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">{tr.codeLabel}</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.code} onChange={(e) => setScheduleForm((p) => ({ ...p, code: e.target.value }))} placeholder={tr.optionalPlaceholder} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">{tr.timezoneLabel}</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.timezone} onChange={(e) => setScheduleForm((p) => ({ ...p, timezone: e.target.value }))} placeholder="Africa/Abidjan" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.descriptionLabel}</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.description} onChange={(e) => setScheduleForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setScheduleDialogOpen(false)}>{tr.cancel}</Button>
                            <Button className="h-10 rounded-xl" onClick={submitSchedule} disabled={isSavingSchedule}>
                              {isSavingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr.save}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {planningError && (
                        <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">{planningError}</div>
                      )}
                      {apiPlannings.map((schedule) => (
                        <div key={schedule.id} className="group/p flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-border hover:bg-muted/50">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-400/15 transition-transform group-hover/p:scale-105">
                            <CalendarDays className="h-4 w-4 text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{schedule.name}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {schedule.code && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                  <Hash className="h-2.5 w-2.5" />{schedule.code}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">
                                <Globe className="h-2.5 w-2.5" />{schedule.timezone || "UTC"}
                              </span>
                              {schedule.description && <span className="truncate text-[11px] text-muted-foreground">{schedule.description}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditingSchedule(schedule)
                              setScheduleForm({ name: schedule.name, code: schedule.code || "", description: schedule.description || "", timezone: schedule.timezone || "UTC" })
                              setScheduleDialogOpen(true)
                            }}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "planning", id: schedule.id, label: tr.deletePlanningLabel(schedule.name) })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {apiPlannings.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">{tr.noPlannings}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quarts de travail — avec barre temporelle */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-teal-600 opacity-70" />
                    <div className="flex items-center justify-between gap-4 p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/10 ring-1 ring-emerald-400/20">
                          <Clock className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.shiftsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.shiftsDesc}</p>
                        </div>
                      </div>
                      <Dialog open={workShiftDialogOpen} onOpenChange={setWorkShiftDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingWorkShift(null); resetWorkShiftForm() }}>
                            <Plus className="mr-2 h-4 w-4" />{tr.newShiftButton}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingWorkShift ? tr.editShiftTitle : tr.createShiftTitle}</DialogTitle>
                            <DialogDescription>{tr.shiftDialogDesc}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">{tr.nameLabel}</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.name} onChange={(e) => setWorkShiftForm((p) => ({ ...p, name: e.target.value }))} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">{tr.codeLabel}</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.code} onChange={(e) => setWorkShiftForm((p) => ({ ...p, code: e.target.value }))} placeholder={tr.optionalPlaceholder} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.serviceSection}</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">{tr.startLabel}</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.start_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, start_time: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">{tr.endLabel}</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.end_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, end_time: e.target.value }))} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.breakSection}</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">{tr.breakStartLabel}</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.break_start_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_start_time: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">{tr.breakEndLabel}</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.break_end_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_end_time: e.target.value }))} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.tolerancesSection}</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">{tr.overtimeLabel}</Label>
                                  <Input type="number" min="0" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.overtime_minutes} onChange={(e) => setWorkShiftForm((p) => ({ ...p, overtime_minutes: e.target.value }))} placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">{tr.lateLabel}</Label>
                                  <Input type="number" min="0" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.late_allowable_minutes} onChange={(e) => setWorkShiftForm((p) => ({ ...p, late_allowable_minutes: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">{tr.earlyLeaveLabel}</Label>
                                  <Input type="number" min="0" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.early_leave_allowable_minutes} onChange={(e) => setWorkShiftForm((p) => ({ ...p, early_leave_allowable_minutes: e.target.value }))} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">{tr.descriptionLabel}</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.description} onChange={(e) => setWorkShiftForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setWorkShiftDialogOpen(false)}>{tr.cancel}</Button>
                            <Button className="h-10 rounded-xl" onClick={() => void submitWorkShift()} disabled={isSavingWorkShift}>
                              {isSavingWorkShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr.save}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-3 px-6 pb-6">
                      {workShiftError && (
                        <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">{workShiftError}</div>
                      )}
                      {apiWorkShifts.map((shift) => {
                        const startMin = timeToMinutes(shift.start_time ?? "08:00")
                        const endMin = timeToMinutes(shift.end_time ?? "17:00")
                        const breakStartMin = shift.break_start_time ? timeToMinutes(shift.break_start_time) : null
                        const breakEndMin = shift.break_end_time ? timeToMinutes(shift.break_end_time) : null
                        const totalMins = 24 * 60
                        const barLeft = `${(startMin / totalMins) * 100}%`
                        const barWidth = `${((endMin - startMin) / totalMins) * 100}%`
                        const breakLeft = breakStartMin !== null ? `${((breakStartMin - startMin) / (endMin - startMin)) * 100}%` : null
                        const breakWidth = breakStartMin !== null && breakEndMin !== null ? `${((breakEndMin - breakStartMin) / (endMin - startMin)) * 100}%` : null
                        return (
                          <div key={shift.id} className="group/ws overflow-hidden rounded-xl border border-border/60 bg-background/40 transition-colors hover:border-border hover:bg-muted/50">
                            <div className="flex items-center gap-3 p-4 pb-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/15 transition-transform group-hover/ws:scale-105">
                                <Clock className="h-4 w-4 text-emerald-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-foreground">{shift.name}</p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span className="tabular-nums text-[11px] font-semibold text-emerald-400">{shift.start_time ?? "--:--"} → {shift.end_time ?? "--:--"}</span>
                                  {shift.code && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                      <Tag className="h-2.5 w-2.5" />{shift.code}
                                    </span>
                                  )}
                                  {shift.late_allowable_minutes ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                                      <Timer className="h-2.5 w-2.5" />+{shift.late_allowable_minutes}&apos;
                                    </span>
                                  ) : null}
                                  {shift.break_start_time && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      {tr.breakBadge(shift.break_start_time, shift.break_end_time)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                  setEditingWorkShift(shift)
                                  setWorkShiftForm({
                                    name: shift.name, code: shift.code, description: shift.description || "",
                                    start_time: shift.start_time ?? "08:00", end_time: shift.end_time ?? "17:00",
                                    break_start_time: shift.break_start_time ?? "12:00", break_end_time: shift.break_end_time ?? "13:00",
                                    overtime_minutes: shift.overtime_minutes ? String(shift.overtime_minutes) : "",
                                    late_allowable_minutes: shift.late_allowable_minutes ? String(shift.late_allowable_minutes) : "10",
                                    early_leave_allowable_minutes: shift.early_leave_allowable_minutes ? String(shift.early_leave_allowable_minutes) : "10",
                                  })
                                  setWorkShiftDialogOpen(true)
                                }}><Edit className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "work-shift", id: shift.id, label: tr.deleteShiftLabel(shift.name) })}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {/* Barre temporelle visuelle */}
                            <div className="relative mx-4 mb-3 h-2 overflow-hidden rounded-full bg-muted/60">
                              <div className="absolute h-full rounded-full bg-emerald-500/40" style={{ left: barLeft, width: barWidth }} />
                              {breakLeft && breakWidth && (
                                <div className="absolute h-full rounded-full bg-amber-400/60" style={{ left: `calc(${barLeft} + ${breakLeft})`, width: breakWidth }} />
                              )}
                            </div>
                            <div className="flex items-center justify-between px-4 pb-3 text-[10px] text-muted-foreground/60">
                              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                            </div>
                          </div>
                        )
                      })}
                      {apiWorkShifts.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                          <Clock className="mb-3 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">{tr.noShifts}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attribution plannings */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-orange-500 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400/20 to-orange-400/10 ring-1 ring-amber-400/20">
                          <CheckCircle2 className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.assignPlanningsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.assignPlanningsDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 px-6 pb-6">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <Select value={assignmentForm.planningId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, planningId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder={tr.planningPlaceholder} /></SelectTrigger>
                          <SelectContent>{apiPlannings.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={assignmentForm.targetType} onValueChange={(v: Assignment["targetType"]) => setAssignmentForm((p) => ({ ...p, targetType: v, targetId: "" }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Departement">{tr.targetDepartment}</SelectItem>
                            <SelectItem value="Groupe">{tr.targetGroup}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={assignmentForm.targetId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, targetId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder={tr.selectPlaceholder} /></SelectTrigger>
                          <SelectContent>{availableTargets.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={() => void addAssignment()} disabled={isAssigningPlanning}>
                          {isAssigningPlanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr.assignButton}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {assignments.map((asgn) => {
                          const schedule = apiPlannings.find((s) => String(s.id) === asgn.planningId)
                          const target = asgn.targetType === "Departement"
                            ? departmentById.get(Number(asgn.targetId))
                            : groups.find((g) => g.id === asgn.targetId)
                          return (
                            <div key={asgn.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 text-sm transition-colors hover:border-border">
                              <CalendarDays className="h-4 w-4 shrink-0 text-amber-400" />
                              <span className="font-medium text-foreground">{schedule?.name ?? tr.deletedPlanning}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className={`rounded-md px-2 py-0.5 text-xs ${asgn.targetType === "Departement" ? "bg-sky-500/10 text-sky-400" : "bg-violet-500/10 text-violet-400"}`}>
                                {asgn.targetType === "Departement" ? tr.targetDepartment : tr.targetGroup}
                              </span>
                              <span className="truncate text-muted-foreground">{target?.name ?? tr.deletedTarget}</span>
                              <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 shrink-0 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "assignment", assignment: asgn, label: tr.removeAssignmentLabel(schedule?.name) })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )
                        })}
                        {assignments.length === 0 && (
                          <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                            <CheckCircle2 className="mb-3 h-7 w-7 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">{tr.noAssignments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attribution quarts aux départements */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-teal-500 to-emerald-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-teal-500/20 to-emerald-500/10 ring-1 ring-teal-400/20">
                          <Building className="h-5 w-5 text-teal-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.shiftByDeptTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.shiftByDeptDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 px-6 pb-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Select value={departmentShiftForm.departmentId} onValueChange={(v) => setDepartmentShiftForm((p) => ({ ...p, departmentId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder={tr.departmentPlaceholder} /></SelectTrigger>
                          <SelectContent>{apiDepartments.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={departmentShiftForm.workShiftId} onValueChange={(v) => setDepartmentShiftForm((p) => ({ ...p, workShiftId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder={tr.shiftPlaceholder} /></SelectTrigger>
                          <SelectContent>{apiWorkShifts.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={() => void submitDepartmentShiftAssignment()} disabled={isAssigningWorkShift}>
                          {isAssigningWorkShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr.assignButton}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {apiDepartments.map((dep) => (
                          <div key={dep.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-2.5 text-sm transition-colors hover:border-border">
                            <div className="flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                              <span className="text-foreground">{dep.name}</span>
                            </div>
                            <Badge variant="secondary" className={dep.effective_work_shift ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border border-border/60 bg-muted text-muted-foreground"}>
                              {dep.effective_work_shift?.name ?? tr.noShiftBadge}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════ HIKCENTRAL ═══════════════ */}
              {/* ═══════════════ SITES DE POINTAGE ═══════════════ */}
              {activeTab === "sites" && <PunchSitesTab />}

              {activeTab === "hikcentral" && (
                <>
                  {/* Connexion status */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-green-600 opacity-70" />
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-green-500/10 ring-1 ring-emerald-400/20">
                            <Network className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{tr.hikConnTitle}</h3>
                            <p className="text-sm text-muted-foreground">{tr.hikConnDesc}</p>
                          </div>
                        </div>
                        <Badge className={`rounded-lg border px-3 py-1.5 ${pageSystemStatus === "connected" ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300" : pageSystemStatus === "syncing" ? "border-amber-400/25 bg-amber-500/10 text-amber-500 dark:text-amber-300" : "border-rose-400/25 bg-rose-500/10 text-rose-500 dark:text-rose-300"}`}>
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${pageSystemStatus === "connected" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : pageSystemStatus === "syncing" ? "animate-pulse bg-amber-400" : "bg-rose-400"}`} />
                          {pageSystemStatus === "connected" ? tr.statusConnected : pageSystemStatus === "syncing" ? tr.statusSyncing : tr.statusDisconnected}
                        </Badge>
                      </div>
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <RefreshCw className="h-4 w-4 text-emerald-400" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{tr.autoSyncTitle}</p>
                              <p className="text-xs text-muted-foreground">{tr.autoSyncDesc}</p>
                            </div>
                          </div>
                          <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Zap className="h-4 w-4 text-amber-400" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{tr.realtimeTitle}</p>
                              <p className="text-xs text-muted-foreground">{tr.realtimeDesc}</p>
                            </div>
                          </div>
                          <Badge className="border border-amber-400/20 bg-amber-500/10 text-amber-400 text-xs">{tr.activeBadge}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void saveSecuritySettings()} disabled={!hasSecurityChanges || isSavingPreferences}>
                          {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {tr.saveShort}
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetSecuritySettings} disabled={!hasSecurityChanges || isSavingPreferences}>
                          <RotateCcw className="mr-2 h-4 w-4" />{tr.cancel}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Tenants */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-sky-500 to-blue-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500/20 to-blue-500/10 ring-1 ring-sky-400/20">
                          <Building className="h-5 w-5 text-sky-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.tenantsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.tenantsDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {tenants.length === 0 && isInitialLoading && (
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />{tr.loadingTenants}
                        </div>
                      )}
                      {tenants.map((tenant) => {
                        const active = tenant.id === tenantId
                        return (
                          <div key={tenant.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${active ? "border-sky-400/30 bg-sky-500/5" : "border-border/60 bg-background/40"}`}>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-sky-500/20" : "bg-muted"}`}>
                              <Building className={`h-4 w-4 ${active ? "text-sky-400" : "text-muted-foreground"}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">{tenant.code}</p>
                            </div>
                            {active && (
                              <Badge className="shrink-0 border border-sky-400/20 bg-sky-500/10 text-sky-400 text-xs">{tr.activeBadge}</Badge>
                            )}
                          </div>
                        )
                      })}
                      {tenants.length === 0 && !isInitialLoading && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          <Building className="mb-3 h-7 w-7 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">{tr.noTenants}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lecteurs / devices */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-purple-500 to-violet-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-500/20 to-violet-500/10 ring-1 ring-purple-400/20">
                            <Cpu className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{tr.readersTitle}</h3>
                            <p className="text-sm text-muted-foreground">{tr.readersDesc}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 tabular-nums">
                          {tr.readerCount(apiReaders.length)}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {apiReaders.map((reader) => (
                        <div key={reader.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 transition-colors hover:border-border">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                            <Cpu className="h-4 w-4 text-purple-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{reader.name || tr.readerFallback(reader.dev_index)}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{reader.serial_number} · DEV-{reader.dev_index}</p>
                          </div>
                          <Badge className="shrink-0 border border-emerald-400/20 bg-emerald-500/10 text-emerald-400 text-xs">{tr.onlineBadge}</Badge>
                        </div>
                      ))}
                      {apiReaders.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          <Cpu className="mb-3 h-7 w-7 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">{tr.noReaders}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════ SÉCURITÉ ═══════════════ */}
              {activeTab === "security" && (
                <>
                  {/* Politique d'accès */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-yellow-500 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400/20 to-yellow-400/10 ring-1 ring-amber-400/20">
                          <Shield className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.accessPolicyTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.accessPolicyDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 px-6 pb-6">
                      {[
                        {
                          icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10",
                          title: tr.timeRestrictionTitle, desc: tr.timeRestrictionDesc,
                          checked: securityTimeRestrictionEnabled, onChange: setSecurityTimeRestrictionEnabled,
                        },
                        {
                          icon: Lock, color: "text-rose-400", bg: "bg-rose-400/10",
                          title: tr.lockoutTitle, desc: tr.lockoutDesc,
                          checked: false, onChange: () => {},
                        },
                        {
                          icon: Wifi, color: "text-sky-400", bg: "bg-sky-400/10",
                          title: tr.offlineRestrictTitle, desc: tr.offlineRestrictDesc,
                          checked: true, onChange: () => {},
                        },
                      ].map((item) => (
                        <div key={item.title} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3.5 transition-colors hover:border-border">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}>
                              <item.icon className={`h-4 w-4 ${item.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                          <Switch checked={item.checked} onCheckedChange={item.onChange} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Session */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-sky-500 to-blue-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500/20 to-blue-500/10 ring-1 ring-sky-400/20">
                          <Timer className="h-5 w-5 text-sky-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.sessionTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.sessionDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 px-6 pb-6">
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-sky-400" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{tr.sessionTimeoutTitle}</p>
                            <p className="text-xs text-muted-foreground">{tr.sessionTimeoutDesc}</p>
                          </div>
                        </div>
                        <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                          <SelectTrigger className="h-9 w-36 rounded-xl border-border/60 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">{tr.timeout15}</SelectItem>
                            <SelectItem value="30">{tr.timeout30}</SelectItem>
                            <SelectItem value="60">{tr.timeout60}</SelectItem>
                            <SelectItem value="120">{tr.timeout120}</SelectItem>
                            <SelectItem value="480">{tr.timeout480}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* API & Accès */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-500 to-purple-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-purple-500/10 ring-1 ring-violet-400/20">
                          <Key className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.apiAccessTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.apiAccessDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 px-6 pb-6">
                      {[
                        { label: tr.activeTenantRow, value: activeTenantName || "—", icon: Building, mono: false },
                        { label: tr.tenantCodeRow, value: tenants.find((t) => t.id === tenantId)?.code || "—", icon: Hash, mono: true },
                        { label: tr.apiBaseUrlRow, value: API_BASE_URL, icon: Network, mono: true },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                          <row.icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                          <span className="w-28 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                          <span className={`min-w-0 flex-1 truncate text-sm ${row.mono ? "font-mono text-violet-400" : "text-foreground"}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save/Reset */}
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-300">
                    {tr.localPrefsNotice}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveSecuritySettings()} disabled={!hasSecurityChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {tr.saveSecurityButton}
                    </Button>
                    <Button variant="outline" onClick={resetSecuritySettings} disabled={!hasSecurityChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />{tr.reset}
                    </Button>
                  </div>
                </>
              )}

              {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
              {activeTab === "notifications" && (
                <>
                  {/* Canaux principaux */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-rose-500 to-pink-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-rose-500/20 to-pink-500/10 ring-1 ring-rose-400/20">
                          <Bell className="h-5 w-5 text-rose-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.channelsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.channelsDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {[
                        { icon: Mail, color: "text-rose-400", bg: "bg-rose-500/10", title: tr.emailChannelTitle, desc: tr.emailChannelDesc, checked: emailNotifications, onChange: setEmailNotifications },
                        { icon: Smartphone, color: "text-pink-400", bg: "bg-pink-500/10", title: tr.pushChannelTitle, desc: tr.pushChannelDesc, checked: pushNotifications, onChange: setPushNotifications },
                      ].map((ch) => (
                        <div key={ch.title} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3.5 transition-colors hover:border-border">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ch.bg}`}>
                              <ch.icon className={`h-4 w-4 ${ch.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{ch.title}</p>
                              <p className="text-xs text-muted-foreground">{ch.desc}</p>
                            </div>
                          </div>
                          <Switch checked={ch.checked} onCheckedChange={ch.onChange} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Types d'alertes */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-orange-500 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400/20 to-orange-400/10 ring-1 ring-amber-400/20">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.alertTypesTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.alertTypesDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 px-6 pb-6 sm:grid-cols-2">
                      {[
                        { icon: DoorOpen, color: "text-rose-400", bg: "bg-rose-500/10", title: tr.alertAccessDeniedTitle, desc: tr.alertAccessDeniedDesc, checked: alertOnAccessDenied, onChange: setAlertOnAccessDenied },
                        { icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10", title: tr.alertIntrusionTitle, desc: tr.alertIntrusionDesc, checked: alertOnIntrusion, onChange: setAlertOnIntrusion },
                        { icon: Clock, color: "text-sky-400", bg: "bg-sky-500/10", title: tr.alertLateTitle, desc: tr.alertLateDesc, checked: alertOnLateArrival, onChange: setAlertOnLateArrival },
                        { icon: Cpu, color: "text-purple-400", bg: "bg-purple-500/10", title: tr.alertDeviceFaultTitle, desc: tr.alertDeviceFaultDesc, checked: alertOnDeviceFault, onChange: setAlertOnDeviceFault },
                      ].map((alert) => (
                        <div key={alert.title} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3.5 transition-colors hover:border-border">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alert.bg}`}>
                            <alert.icon className={`h-4 w-4 ${alert.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{alert.title}</p>
                            <p className="text-xs text-muted-foreground">{alert.desc}</p>
                          </div>
                          <Switch checked={alert.checked} onCheckedChange={alert.onChange} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Résumé quotidien */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-sky-500 to-indigo-600 opacity-70" />
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500/20 to-indigo-500/10 ring-1 ring-sky-400/20">
                            <Bell className="h-5 w-5 text-sky-400" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{tr.dailyDigestTitle}</h3>
                            <p className="text-sm text-muted-foreground">{tr.dailyDigestDesc}</p>
                          </div>
                        </div>
                        <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-300">
                    {tr.localPrefsNotice}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveNotificationSettings()} disabled={!hasNotificationChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {tr.saveNotificationsButton}
                    </Button>
                    <Button variant="outline" onClick={resetNotificationSettings} disabled={!hasNotificationChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />{tr.reset}
                    </Button>
                  </div>
                </>
              )}

              {/* ═══════════════ GÉNÉRAL ═══════════════ */}
              {activeTab === "general" && (
                <>
                  {/* Informations entreprise */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-cyan-500 to-blue-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/20 to-blue-500/10 ring-1 ring-cyan-400/20">
                          <Building2 className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.companyInfoTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.companyInfoDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{tr.companyNameLabel}</Label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10 rounded-xl border-border/60 bg-background/60" placeholder={tr.companyNamePlaceholder} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{tr.timezoneGeneralLabel}</Label>
                        <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 rounded-xl border-border/60 bg-background/60" placeholder="Europe/Paris" />
                      </div>
                    </div>
                  </div>

                  {/* Préférences d'affichage */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-500 to-indigo-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-indigo-500/10 ring-1 ring-violet-400/20">
                          <Globe className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.displayPrefsTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.displayPrefsDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{tr.languageLabel}</Label>
                        <Select value={language} onValueChange={(v) => setLanguage(v === "en" ? "en" : "fr")}>
                          <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fr">{tr.langFrench}</SelectItem>
                            <SelectItem value="en">{tr.langEnglish}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{tr.themeLabel}</Label>
                        <Select
                          value={themePreference}
                          onValueChange={(value) => {
                            const nextTheme = value as "system" | "dark" | "light"
                            setThemePreference(nextTheme)
                            // "Par défaut" applique le thème sombre (défaut de l'application)
                            setTheme(nextTheme === "system" ? "dark" : nextTheme)
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">{tr.themeSystem}</SelectItem>
                            <SelectItem value="dark">{tr.themeDark}</SelectItem>
                            <SelectItem value="light">{tr.themeLight}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{tr.dateFormatLabel}</Label>
                        <Select defaultValue="DD/MM/YYYY">
                          <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">{tr.dateFormatDMY}</SelectItem>
                            <SelectItem value="MM/DD/YYYY">{tr.dateFormatMDY}</SelectItem>
                            <SelectItem value="YYYY-MM-DD">{tr.dateFormatISO}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Infos système */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-teal-600 opacity-70" />
                    <div className="p-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/10 ring-1 ring-emerald-400/20">
                          <Server className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{tr.systemInfoTitle}</h3>
                          <p className="text-sm text-muted-foreground">{tr.systemInfoDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {[
                        { label: tr.appVersionRow, value: "v1.0.0", icon: Zap, mono: false },
                        { label: tr.apiEndpointRow, value: `${API_BASE_URL}/api`, icon: Network, mono: true },
                        { label: tr.activeTenantRow, value: activeTenantName || "—", icon: Building, mono: false },
                        { label: tr.serverStatusRow, value: pageSystemStatus === "connected" ? tr.statusConnected : pageSystemStatus === "syncing" ? tr.statusSyncingShort : tr.statusDisconnected, icon: Wifi, mono: false },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                          <row.icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                          <span className="w-28 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                          <span className={`min-w-0 flex-1 truncate text-sm ${row.mono ? "font-mono text-emerald-400" : "text-foreground"}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-300">
                    {tr.localPrefsNotice}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveGeneralSettings()} disabled={!hasGeneralChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {tr.saveGeneralButton}
                    </Button>
                    <Button variant="outline" onClick={resetGeneralSettings} disabled={!hasGeneralChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />{tr.reset}
                    </Button>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ── Dialogue de confirmation d'action sensible ── */}
          <Dialog open={pendingSensitiveAction !== null} onOpenChange={(open) => !open && setPendingSensitiveAction(null)}>
            <DialogContent className="max-w-lg rounded-2xl border-border/60 bg-card">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  {tr.sensitiveTitle}
                </DialogTitle>
                <DialogDescription>
                  {pendingSensitiveAction ? tr.sensitiveDesc(pendingSensitiveAction.label) : null}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingSensitiveAction(null)} disabled={isRunningSensitiveAction}>
                  {tr.cancel}
                </Button>
                <Button variant="destructive" onClick={() => void runSensitiveAction()} disabled={!pendingSensitiveAction || isRunningSensitiveAction}>
                  {isRunningSensitiveAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tr.confirmDelete}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </div>
  )
}
