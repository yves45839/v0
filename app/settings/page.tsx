"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { useI18n } from "@/lib/i18n/context"
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
  const tenantCode = process.env.NEXT_PUBLIC_HIK_EVENTS_TENANT
  const searchParams = useSearchParams()
  const { locale, setLocale } = useI18n()
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
  const VALID_TABS = ["organization", "planning", "hikcentral", "security", "notifications", "general"] as const
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
  const [language, setLanguage] = useState<string>(() => locale)
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
    language !== savedPreferences.language

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
      const message = "Nom et organisation sont obligatoires pour le département."
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
      toast.success(editingDepartment ? "Département modifié" : "Département créé")
    } catch (error) {
      setDepartmentError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du departement.")
      toast.error("Erreur lors de l'enregistrement du département")
    } finally {
      setIsSavingDepartment(false)
    }
  }

  const submitGroup = async () => {
    if (!tenantId || !groupForm.name.trim()) {
      const message = "Le nom du groupe est obligatoire."
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
      toast.success(editingGroup?.backendId ? "Groupe d'accès modifié" : "Groupe d'accès créé")
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du groupe.")
      toast.error("Erreur lors de l'enregistrement du groupe")
    } finally {
      setIsSavingGroup(false)
    }
  }

  const submitSchedule = async () => {
    if (!tenantId || !scheduleForm.name.trim()) {
      const message = "Le nom du planning est obligatoire."
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
      toast.success(editingSchedule ? "Planning modifié" : "Planning créé")
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du planning.")
      toast.error("Erreur lors de l'enregistrement du planning")
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const submitWorkShift = async () => {
    if (!tenantId || !workShiftForm.name.trim()) {
      const message = "Le nom du quart de travail est obligatoire."
      setWorkShiftError(message)
      toast.error(message)
      return
    }
    setWorkShiftError(null)
    setIsSavingWorkShift(true)
    try {
      const overtimeMinutesRaw = workShiftForm.overtime_minutes.trim()
      if (overtimeMinutesRaw && Number.isNaN(Number(overtimeMinutesRaw))) {
        setWorkShiftError("Les heures supplementaires doivent etre un nombre valide.")
        return
      }
      const lateAllowableRaw = workShiftForm.late_allowable_minutes.trim()
      if (lateAllowableRaw && Number.isNaN(Number(lateAllowableRaw))) {
        setWorkShiftError("Le retard tolere doit etre un nombre valide.")
        return
      }
      const earlyLeaveAllowableRaw = workShiftForm.early_leave_allowable_minutes.trim()
      if (earlyLeaveAllowableRaw && Number.isNaN(Number(earlyLeaveAllowableRaw))) {
        setWorkShiftError("La marge de depart anticipe doit etre un nombre valide.")
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
      toast.success(editingWorkShift ? "Quart de travail modifié" : "Quart de travail créé")
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du quart.")
      toast.error("Erreur lors de l'enregistrement du quart de travail")
    } finally {
      setIsSavingWorkShift(false)
    }
  }

  const removeDepartment = async (id: number) => {
    setDepartmentError(null)
    try {
      await deleteDepartmentApi(id)
      setApiDepartments((prev) => prev.filter((department) => department.id !== id))
      toast.success("Département supprimé")
    } catch (error) {
      setDepartmentError(error instanceof Error ? error.message : "Erreur lors de la suppression du departement.")
      toast.error("Erreur lors de la suppression du département")
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
      toast.success("Groupe d'accès supprimé")
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : "Erreur lors de la suppression du groupe.")
      toast.error("Erreur lors de la suppression du groupe")
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
      toast.success("Planning supprimé")
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de la suppression du planning.")
      toast.error("Erreur lors de la suppression du planning")
    }
  }

  const addAssignment = async () => {
    if (!assignmentForm.planningId || !assignmentForm.targetId) {
      const message = "Sélectionnez un planning et une cible avant attribution."
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
        toast.success("Planning attribué avec succès")
        return
      }
      const targetGroup = groups.find((group) => group.id === assignmentForm.targetId)
      if (!targetGroup?.backendId) return
      const saved = await updateAccessGroup(targetGroup.backendId, { planning: Number(assignmentForm.planningId) })
      const mapped = mapAccessGroupToUi(saved)
      setGroups((prev) => prev.map((group) => (group.id === mapped.id ? mapped : group)))
      toast.success("Planning attribué avec succès")
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de l'attribution du planning.")
      toast.error("Erreur lors de l'attribution du planning")
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
        toast.success("Attribution retirée")
        return
      }
      const targetGroup = groups.find((group) => group.id === assignment.targetId)
      if (!targetGroup?.backendId) return
      const saved = await updateAccessGroup(targetGroup.backendId, { planning: null })
      const mapped = mapAccessGroupToUi(saved)
      setGroups((prev) => prev.map((group) => (group.id === mapped.id ? mapped : group)))
      toast.success("Attribution retirée")
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de la suppression de l'attribution.")
      toast.error("Erreur lors de la suppression de l'attribution")
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
      toast.success("Quart de travail supprimé")
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : "Erreur lors de la suppression du quart.")
      toast.error("Erreur lors de la suppression du quart de travail")
    }
  }

  const submitDepartmentShiftAssignment = async () => {
    if (!departmentShiftForm.departmentId || !departmentShiftForm.workShiftId) {
      const message = "Sélectionnez un département et un quart pour l'attribution."
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
      toast.success("Quart de travail attribué au département")
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : "Erreur d'attribution du quart au departement.")
      toast.error("Erreur d'attribution du quart au département")
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
      toast.success("Préférences de notification enregistrées")
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
      toast.success("Paramètres de sécurité enregistrés")
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const saveGeneralSettings = async () => {
    const trimmedName = companyName.trim()
    const trimmedTimezone = timezone.trim()
    if (!trimmedName) {
      toast.error("Le nom d'entreprise est obligatoire.")
      return
    }
    if (!trimmedTimezone || !trimmedTimezone.includes("/")) {
      toast.error("Le fuseau horaire doit suivre le format Région/Ville.")
      return
    }

    setIsSavingPreferences(true)
    try {
      const next = {
        ...savedPreferences,
        companyName: trimmedName,
        timezone: trimmedTimezone,
        language,
      }
      savePreferenceSnapshot(next)
      setCompanyName(trimmedName)
      setTimezone(trimmedTimezone)
      setLocale(language as "fr" | "en")
      toast.success("Paramètres généraux enregistrés")
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
    toast.info("Modifications de notifications annulées")
  }

  const resetSecuritySettings = () => {
    setSyncEnabled(savedPreferences.syncEnabled)
    setSecurityTimeRestrictionEnabled(savedPreferences.securityTimeRestrictionEnabled)
    setSessionTimeout(savedPreferences.sessionTimeout)
    toast.info("Modifications de sécurité annulées")
  }

  const resetGeneralSettings = () => {
    setCompanyName(savedPreferences.companyName)
    setTimezone(savedPreferences.timezone)
    setLanguage(locale)
    toast.info("Modifications générales annulées")
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
        setGroupError(error instanceof Error ? error.message : "Impossible de charger les groupes d'acces.")
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
      const parsed = JSON.parse(raw) as typeof savedPreferences
      setSavedPreferences(parsed)
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
      if (parsed.alertOnAccessDenied !== undefined) setAlertOnAccessDenied(parsed.alertOnAccessDenied)
      if (parsed.alertOnIntrusion !== undefined) setAlertOnIntrusion(parsed.alertOnIntrusion)
      if (parsed.alertOnLateArrival !== undefined) setAlertOnLateArrival(parsed.alertOnLateArrival)
      if (parsed.alertOnDeviceFault !== undefined) setAlertOnDeviceFault(parsed.alertOnDeviceFault)
      if (parsed.dailyDigest !== undefined) setDailyDigest(parsed.dailyDigest)
    } catch {
      // Ignore invalid local cache.
    }
  }, [])

  // Sync the local language select with the global locale (e.g., changed via header button)
  useEffect(() => {
    setLanguage(locale)
  }, [locale])

  // ── Helpers ──────────────────────────────────────────────────
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }

  const settingsNav = [
    { id: "organization", label: "Organisation", icon: Building2, badge: apiDepartments.length + groups.length },
    { id: "planning", label: "Horaires", icon: CalendarDays, badge: apiPlannings.length + apiWorkShifts.length },
    { id: "hikcentral", label: "HikCentral", icon: Server, badge: tenants.length },
    { id: "security", label: "Sécurité", icon: Shield, badge: null },
    { id: "notifications", label: "Notifications", icon: Bell, badge: null },
    { id: "general", label: "Général", icon: Globe, badge: null },
  ] as const

  return (
    <div className="app-shell">
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">Administration</p>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Paramètres</h1>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Configuration globale : organisation, groupes d&apos;accès, horaires, notifications et sécurité.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: tenants.length, label: "Tenants", icon: Building },
                    { value: apiDepartments.length, label: "Depts", icon: Building2 },
                    { value: groups.length, label: "Groupes", icon: DoorOpen },
                    { value: apiReaders.length, label: "Lecteurs", icon: Cpu },
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
                  Chargement des paramètres...
                </div>
              )}
            </div>
          </section>

          {/* ── Settings Layout : nav verticale + contenu ── */}
          <div className="mt-6 flex flex-col gap-6 lg:flex-row">

            {/* ── Navigation latérale ── */}
            <aside className="w-full shrink-0 lg:w-52">
              <nav className="sticky top-6 overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <p className="mb-1 px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Sections</p>
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
                      { label: "Organisations", value: apiOrganizations.length, color: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-400/20", icon: Building2 },
                      { label: "Départements", value: apiDepartments.length, color: "text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-400/20", icon: Building },
                      { label: "Groupes d'accès", value: groups.length, color: "text-purple-400", bg: "bg-purple-500/10", ring: "ring-purple-400/20", icon: DoorOpen },
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
                          <h3 className="text-base font-semibold text-foreground">Départements</h3>
                          <p className="text-sm text-muted-foreground">Ajout, modification et suppression</p>
                        </div>
                      </div>
                      <Dialog open={depDialogOpen} onOpenChange={setDepDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingDepartment(null); resetDepartmentForm() }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouveau
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingDepartment ? "Modifier" : "Créer"} un département</DialogTitle>
                            <DialogDescription>Renseignez les informations du département.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={depForm.name} onChange={(e) => setDepForm((p) => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Code</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={depForm.code} onChange={(e) => setDepForm((p) => ({ ...p, code: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Organisation</Label>
                              <Select value={depForm.organizationId} onValueChange={(value) => setDepForm((p) => ({ ...p, organizationId: value }))}>
                                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                  <SelectValue placeholder="Sélectionner une organisation" />
                                </SelectTrigger>
                                <SelectContent>
                                  {apiOrganizations.map((organization) => (
                                    <SelectItem key={organization.id} value={String(organization.id)}>{organization.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Parent (optionnel)</Label>
                              <Select value={depForm.parentId} onValueChange={(value) => setDepForm((p) => ({ ...p, parentId: value === "__none__" ? "" : value }))}>
                                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                  <SelectValue placeholder="Aucun parent" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Aucun parent</SelectItem>
                                  {apiDepartments.filter((d) => d.id !== editingDepartment?.id).map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setDepDialogOpen(false)}>Annuler</Button>
                            <Button className="h-10 rounded-xl" onClick={submitDepartment} disabled={isSavingDepartment}>
                              {isSavingDepartment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Enregistrer
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
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "department", id: dep.id, label: `Supprimer le département ${dep.name}` })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      {apiDepartments.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                          <Building className="mb-3 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">Aucun département configuré.</p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditingDepartment(null); resetDepartmentForm(); setDepDialogOpen(true) }}>
                            <Plus className="mr-2 h-3.5 w-3.5" />Créer un département
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
                          <h3 className="text-base font-semibold text-foreground">Groupes d&apos;accès</h3>
                          <p className="text-sm text-muted-foreground">Planning + lecteurs autorisés</p>
                        </div>
                      </div>
                      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingGroup(null); resetGroupForm() }}>
                            <DoorOpen className="mr-2 h-4 w-4" />
                            Nouveau groupe
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingGroup ? "Modifier" : "Créer"} un groupe</DialogTitle>
                            <DialogDescription>Définissez le groupe : planning + lecteurs.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Emploi de temps</Label>
                              <Select value={groupForm.planningId} onValueChange={(value) => setGroupForm((p) => ({ ...p, planningId: value === "__none__" ? "" : value }))}>
                                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                  <SelectValue placeholder="Sélectionner un planning" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Aucun planning</SelectItem>
                                  {apiPlannings.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Lecteurs autorisés</Label>
                              <div className="max-h-44 space-y-2 overflow-auto rounded-xl border border-border/60 bg-background/40 p-3">
                                {apiReaders.length === 0 && <p className="text-xs text-muted-foreground">Aucun lecteur disponible.</p>}
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
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setGroupDialogOpen(false)}>Annuler</Button>
                            <Button className="h-10 rounded-xl" onClick={submitGroup} disabled={isSavingGroup}>
                              {isSavingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Enregistrer
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {activeTenantName && (
                        <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">Tenant actif :</span> {activeTenantName}
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
                                <Cpu className="h-2.5 w-2.5" />{group.deviceCount} lecteur{group.deviceCount !== 1 ? "s" : ""}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "group", id: group.id, label: `Supprimer le groupe ${group.name}` })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {groups.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                          <DoorOpen className="mb-3 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">Aucun groupe d&apos;accès configuré.</p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditingGroup(null); resetGroupForm(); setGroupDialogOpen(true) }}>
                            <Plus className="mr-2 h-3.5 w-3.5" />Créer un groupe
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
                      { label: "Plannings", value: apiPlannings.length, color: "text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-400/20", icon: CalendarDays },
                      { label: "Quarts", value: apiWorkShifts.length, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-400/20", icon: Clock },
                      { label: "Attributions", value: assignments.length, color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-400/20", icon: CheckCircle2 },
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
                          <h3 className="text-base font-semibold text-foreground">Plannings</h3>
                          <p className="text-sm text-muted-foreground">Modèles de calendriers de présence</p>
                        </div>
                      </div>
                      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingSchedule(null); resetScheduleForm() }}>
                            <Plus className="mr-2 h-4 w-4" />Nouveau
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingSchedule ? "Modifier" : "Créer"} un planning</DialogTitle>
                            <DialogDescription>Configurez les métadonnées du planning.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.name} onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Code</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.code} onChange={(e) => setScheduleForm((p) => ({ ...p, code: e.target.value }))} placeholder="Optionnel" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Timezone</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.timezone} onChange={(e) => setScheduleForm((p) => ({ ...p, timezone: e.target.value }))} placeholder="Africa/Abidjan" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.description} onChange={(e) => setScheduleForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setScheduleDialogOpen(false)}>Annuler</Button>
                            <Button className="h-10 rounded-xl" onClick={submitSchedule} disabled={isSavingSchedule}>
                              {isSavingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "planning", id: schedule.id, label: `Supprimer le planning ${schedule.name}` })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {apiPlannings.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">Aucun planning configuré.</p>
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
                          <h3 className="text-base font-semibold text-foreground">Quarts de travail</h3>
                          <p className="text-sm text-muted-foreground">Horaires, pauses et tolérances</p>
                        </div>
                      </div>
                      <Dialog open={workShiftDialogOpen} onOpenChange={setWorkShiftDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { setEditingWorkShift(null); resetWorkShiftForm() }}>
                            <Plus className="mr-2 h-4 w-4" />Nouveau quart
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border/60 bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{editingWorkShift ? "Modifier" : "Créer"} un quart de travail</DialogTitle>
                            <DialogDescription>Définissez les horaires et tolérances du quart.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.name} onChange={(e) => setWorkShiftForm((p) => ({ ...p, name: e.target.value }))} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Code</Label>
                                <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.code} onChange={(e) => setWorkShiftForm((p) => ({ ...p, code: e.target.value }))} placeholder="Optionnel" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prise de service</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Début</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.start_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, start_time: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Fin</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.end_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, end_time: e.target.value }))} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pause</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Début pause</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.break_start_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_start_time: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Fin pause</Label>
                                  <Input type="time" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.break_end_time} onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_end_time: e.target.value }))} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tolérances & Heures sup.</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">HS (min)</Label>
                                  <Input type="number" min="0" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.overtime_minutes} onChange={(e) => setWorkShiftForm((p) => ({ ...p, overtime_minutes: e.target.value }))} placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Retard (min)</Label>
                                  <Input type="number" min="0" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.late_allowable_minutes} onChange={(e) => setWorkShiftForm((p) => ({ ...p, late_allowable_minutes: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Départ tôt (min)</Label>
                                  <Input type="number" min="0" className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.early_leave_allowable_minutes} onChange={(e) => setWorkShiftForm((p) => ({ ...p, early_leave_allowable_minutes: e.target.value }))} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                              <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={workShiftForm.description} onChange={(e) => setWorkShiftForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setWorkShiftDialogOpen(false)}>Annuler</Button>
                            <Button className="h-10 rounded-xl" onClick={() => void submitWorkShift()} disabled={isSavingWorkShift}>
                              {isSavingWorkShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
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
                                      Pause {shift.break_start_time}–{shift.break_end_time}
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "work-shift", id: shift.id, label: `Supprimer le quart ${shift.name}` })}>
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
                          <p className="text-sm text-muted-foreground">Aucun quart configuré pour ce tenant.</p>
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
                          <h3 className="text-base font-semibold text-foreground">Attribution des plannings</h3>
                          <p className="text-sm text-muted-foreground">Affectez un planning à un département ou un groupe</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 px-6 pb-6">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <Select value={assignmentForm.planningId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, planningId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder="Planning" /></SelectTrigger>
                          <SelectContent>{apiPlannings.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={assignmentForm.targetType} onValueChange={(v: Assignment["targetType"]) => setAssignmentForm((p) => ({ ...p, targetType: v, targetId: "" }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Departement">Département</SelectItem>
                            <SelectItem value="Groupe">Groupe</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={assignmentForm.targetId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, targetId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent>{availableTargets.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={() => void addAssignment()} disabled={isAssigningPlanning}>
                          {isAssigningPlanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Attribuer
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
                              <span className="font-medium text-foreground">{schedule?.name ?? "Planning supprimé"}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className={`rounded-md px-2 py-0.5 text-xs ${asgn.targetType === "Departement" ? "bg-sky-500/10 text-sky-400" : "bg-violet-500/10 text-violet-400"}`}>
                                {asgn.targetType}
                              </span>
                              <span className="truncate text-muted-foreground">{target?.name ?? "Cible supprimée"}</span>
                              <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 shrink-0 text-destructive" onClick={() => setPendingSensitiveAction({ kind: "assignment", assignment: asgn, label: `Retirer l'attribution ${schedule?.name ?? "planning"}` })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )
                        })}
                        {assignments.length === 0 && (
                          <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                            <CheckCircle2 className="mb-3 h-7 w-7 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">Aucune attribution de planning.</p>
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
                          <h3 className="text-base font-semibold text-foreground">Quart par département</h3>
                          <p className="text-sm text-muted-foreground">Assignez un quart de travail à chaque département</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 px-6 pb-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Select value={departmentShiftForm.departmentId} onValueChange={(v) => setDepartmentShiftForm((p) => ({ ...p, departmentId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder="Département" /></SelectTrigger>
                          <SelectContent>{apiDepartments.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={departmentShiftForm.workShiftId} onValueChange={(v) => setDepartmentShiftForm((p) => ({ ...p, workShiftId: v }))}>
                          <SelectTrigger className="rounded-xl border-border/60 bg-background/60"><SelectValue placeholder="Quart de travail" /></SelectTrigger>
                          <SelectContent>{apiWorkShifts.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={() => void submitDepartmentShiftAssignment()} disabled={isAssigningWorkShift}>
                          {isAssigningWorkShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Attribuer
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
                              {dep.effective_work_shift?.name ?? "Aucun quart"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════ HIKCENTRAL ═══════════════ */}
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
                            <h3 className="text-base font-semibold text-foreground">Connexion HikCentral Professional</h3>
                            <p className="text-sm text-muted-foreground">État de la liaison avec le serveur de contrôle d&apos;accès</p>
                          </div>
                        </div>
                        <Badge className={`rounded-lg border px-3 py-1.5 ${pageSystemStatus === "connected" ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300" : pageSystemStatus === "syncing" ? "border-amber-400/25 bg-amber-500/10 text-amber-500 dark:text-amber-300" : "border-rose-400/25 bg-rose-500/10 text-rose-500 dark:text-rose-300"}`}>
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${pageSystemStatus === "connected" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : pageSystemStatus === "syncing" ? "animate-pulse bg-amber-400" : "bg-rose-400"}`} />
                          {pageSystemStatus === "connected" ? "Connecté" : pageSystemStatus === "syncing" ? "Synchronisation..." : "Déconnecté"}
                        </Badge>
                      </div>
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <RefreshCw className="h-4 w-4 text-emerald-400" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Synchronisation auto</p>
                              <p className="text-xs text-muted-foreground">Toutes les 5 minutes</p>
                            </div>
                          </div>
                          <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Zap className="h-4 w-4 text-amber-400" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Événements temps réel</p>
                              <p className="text-xs text-muted-foreground">Webhook HikCentral actif</p>
                            </div>
                          </div>
                          <Badge className="border border-amber-400/20 bg-amber-500/10 text-amber-400 text-xs">Actif</Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void saveSecuritySettings()} disabled={!hasSecurityChanges || isSavingPreferences}>
                          {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Sauvegarder
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetSecuritySettings} disabled={!hasSecurityChanges || isSavingPreferences}>
                          <RotateCcw className="mr-2 h-4 w-4" />Annuler
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
                          <h3 className="text-base font-semibold text-foreground">Tenants configurés</h3>
                          <p className="text-sm text-muted-foreground">Organisations rattachées à HikCentral</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {tenants.length === 0 && isInitialLoading && (
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />Chargement des tenants...
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
                              <Badge className="shrink-0 border border-sky-400/20 bg-sky-500/10 text-sky-400 text-xs">Actif</Badge>
                            )}
                          </div>
                        )
                      })}
                      {tenants.length === 0 && !isInitialLoading && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          <Building className="mb-3 h-7 w-7 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">Aucun tenant disponible.</p>
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
                            <h3 className="text-base font-semibold text-foreground">Lecteurs enregistrés</h3>
                            <p className="text-sm text-muted-foreground">Dispositifs de contrôle d&apos;accès actifs</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 tabular-nums">
                          {apiReaders.length} lecteur{apiReaders.length !== 1 ? "s" : ""}
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
                            <p className="truncate text-sm font-medium text-foreground">{reader.name || `Lecteur ${reader.dev_index}`}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{reader.serial_number} · DEV-{reader.dev_index}</p>
                          </div>
                          <Badge className="shrink-0 border border-emerald-400/20 bg-emerald-500/10 text-emerald-400 text-xs">En ligne</Badge>
                        </div>
                      ))}
                      {apiReaders.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          <Cpu className="mb-3 h-7 w-7 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">Aucun lecteur détecté.</p>
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
                          <h3 className="text-base font-semibold text-foreground">Politique d&apos;accès</h3>
                          <p className="text-sm text-muted-foreground">Règles de sécurité globales de l&apos;application</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 px-6 pb-6">
                      {[
                        {
                          icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10",
                          title: "Restriction horaire", desc: "Accès bloqué en dehors de 06:00 – 22:00",
                          checked: securityTimeRestrictionEnabled, onChange: setSecurityTimeRestrictionEnabled,
                        },
                        {
                          icon: Lock, color: "text-rose-400", bg: "bg-rose-400/10",
                          title: "Verrou après tentatives échouées", desc: "Verrouillage du compte après 5 échecs de badgeage",
                          checked: false, onChange: () => {},
                        },
                        {
                          icon: Wifi, color: "text-sky-400", bg: "bg-sky-400/10",
                          title: "Accès hors réseau restreint", desc: "Interdire l&apos;accès si le lecteur est hors ligne",
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
                          <h3 className="text-base font-semibold text-foreground">Gestion de session</h3>
                          <p className="text-sm text-muted-foreground">Expiration automatique des sessions inactives</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 px-6 pb-6">
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-sky-400" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Expiration de session</p>
                            <p className="text-xs text-muted-foreground">Déconnexion après inactivité</p>
                          </div>
                        </div>
                        <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                          <SelectTrigger className="h-9 w-36 rounded-xl border-border/60 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 heure</SelectItem>
                            <SelectItem value="120">2 heures</SelectItem>
                            <SelectItem value="480">8 heures</SelectItem>
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
                          <h3 className="text-base font-semibold text-foreground">Accès API & Authentification</h3>
                          <p className="text-sm text-muted-foreground">Clés d&apos;accès et informations d&apos;intégration</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 px-6 pb-6">
                      {[
                        { label: "Tenant actif", value: activeTenantName || "—", icon: Building, mono: false },
                        { label: "Code tenant", value: tenants.find((t) => t.id === tenantId)?.code || "—", icon: Hash, mono: true },
                        { label: "API Base URL", value: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000", icon: Network, mono: true },
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
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveSecuritySettings()} disabled={!hasSecurityChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Sauvegarder les paramètres de sécurité
                    </Button>
                    <Button variant="outline" onClick={resetSecuritySettings} disabled={!hasSecurityChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />Réinitialiser
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
                          <h3 className="text-base font-semibold text-foreground">Canaux de notification</h3>
                          <p className="text-sm text-muted-foreground">Choisissez comment recevoir les alertes</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {[
                        { icon: Mail, color: "text-rose-400", bg: "bg-rose-500/10", title: "Email", desc: "Rapports et alertes par courriel", checked: emailNotifications, onChange: setEmailNotifications },
                        { icon: Smartphone, color: "text-pink-400", bg: "bg-pink-500/10", title: "Push mobile", desc: "Notifications push sur l&apos;application mobile", checked: pushNotifications, onChange: setPushNotifications },
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
                          <h3 className="text-base font-semibold text-foreground">Types d&apos;alertes</h3>
                          <p className="text-sm text-muted-foreground">Sélectionnez les événements à notifier</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 px-6 pb-6 sm:grid-cols-2">
                      {[
                        { icon: DoorOpen, color: "text-rose-400", bg: "bg-rose-500/10", title: "Accès refusé", desc: "Badgeage rejeté ou hors groupe", checked: alertOnAccessDenied, onChange: setAlertOnAccessDenied },
                        { icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10", title: "Intrusion détectée", desc: "Déclenchement d&apos;une alarme anti-intrusion", checked: alertOnIntrusion, onChange: setAlertOnIntrusion },
                        { icon: Clock, color: "text-sky-400", bg: "bg-sky-500/10", title: "Retard employé", desc: "Arrivée hors des plages tolérées", checked: alertOnLateArrival, onChange: setAlertOnLateArrival },
                        { icon: Cpu, color: "text-purple-400", bg: "bg-purple-500/10", title: "Panne de lecteur", desc: "Lecteur hors ligne ou défaillant", checked: alertOnDeviceFault, onChange: setAlertOnDeviceFault },
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
                            <h3 className="text-base font-semibold text-foreground">Résumé quotidien</h3>
                            <p className="text-sm text-muted-foreground">Rapport consolidé envoyé chaque matin à 08:00</p>
                          </div>
                        </div>
                        <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveNotificationSettings()} disabled={!hasNotificationChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Sauvegarder les notifications
                    </Button>
                    <Button variant="outline" onClick={resetNotificationSettings} disabled={!hasNotificationChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />Réinitialiser
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
                          <h3 className="text-base font-semibold text-foreground">Informations entreprise</h3>
                          <p className="text-sm text-muted-foreground">Identité et localisation de votre organisation</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Nom de l&apos;entreprise</Label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10 rounded-xl border-border/60 bg-background/60" placeholder="Nom de l'organisation" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Fuseau horaire</Label>
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
                          <h3 className="text-base font-semibold text-foreground">Langue &amp; Format</h3>
                          <p className="text-sm text-muted-foreground">Localisation de l&apos;interface</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Langue de l&apos;interface</Label>
                        <Select value={language} onValueChange={(v) => setLanguage(v)}>
                          <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Format de date</Label>
                        <Select defaultValue="DD/MM/YYYY">
                          <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">JJ/MM/AAAA</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/JJ/AAAA</SelectItem>
                            <SelectItem value="YYYY-MM-DD">AAAA-MM-JJ (ISO)</SelectItem>
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
                          <h3 className="text-base font-semibold text-foreground">Informations système</h3>
                          <p className="text-sm text-muted-foreground">Versions et configuration de l&apos;infrastructure</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 px-6 pb-6">
                      {[
                        { label: "Version app", value: "v1.0.0", icon: Zap, mono: false },
                        { label: "API endpoint", value: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api", icon: Network, mono: true },
                        { label: "Tenant actif", value: activeTenantName || "—", icon: Building, mono: false },
                        { label: "Statut serveur", value: pageSystemStatus === "connected" ? "Connecté" : pageSystemStatus === "syncing" ? "Synchronisation" : "Déconnecté", icon: Wifi, mono: false },
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
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveGeneralSettings()} disabled={!hasGeneralChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Sauvegarder les paramètres généraux
                    </Button>
                    <Button variant="outline" onClick={resetGeneralSettings} disabled={!hasGeneralChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />Réinitialiser
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
                  Confirmer l&apos;action sensible
                </DialogTitle>
                <DialogDescription>
                  {pendingSensitiveAction?.label}. Cette action peut impacter la configuration active.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingSensitiveAction(null)} disabled={isRunningSensitiveAction}>
                  Annuler
                </Button>
                <Button variant="destructive" onClick={() => void runSensitiveAction()} disabled={!pendingSensitiveAction || isRunningSensitiveAction}>
                  {isRunningSensitiveAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmer la suppression
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </div>
  )
}