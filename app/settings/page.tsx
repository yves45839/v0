"use client"

import { useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  Edit,
  Globe,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Server,
  Shield,
  Trash2,
  Users,
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
  const [activeTab, setActiveTab] = useState("organization")
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
  const [savedPreferences, setSavedPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    syncEnabled: true,
    securityTimeRestrictionEnabled: true,
    companyName: "TechCorp Industries",
    timezone: "Europe/Paris",
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
    pushNotifications !== savedPreferences.pushNotifications
  const hasSecurityChanges =
    syncEnabled !== savedPreferences.syncEnabled ||
    securityTimeRestrictionEnabled !== savedPreferences.securityTimeRestrictionEnabled
  const hasGeneralChanges =
    companyName !== savedPreferences.companyName || timezone !== savedPreferences.timezone

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
      }
      savePreferenceSnapshot(next)
      setCompanyName(trimmedName)
      setTimezone(trimmedTimezone)
      toast.success("Paramètres généraux enregistrés")
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const resetNotificationSettings = () => {
    setEmailNotifications(savedPreferences.emailNotifications)
    setPushNotifications(savedPreferences.pushNotifications)
    toast.info("Modifications de notifications annulées")
  }

  const resetSecuritySettings = () => {
    setSyncEnabled(savedPreferences.syncEnabled)
    setSecurityTimeRestrictionEnabled(savedPreferences.securityTimeRestrictionEnabled)
    toast.info("Modifications de sécurité annulées")
  }

  const resetGeneralSettings = () => {
    setCompanyName(savedPreferences.companyName)
    setTimezone(savedPreferences.timezone)
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
    } catch {
      // Ignore invalid local cache.
    }
  }, [])

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
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Parametres</h1>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Configuration globale : organisation, groupes d&apos;acces, horaires, notifications et securite.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: tenants.length, label: "Tenants", icon: Building },
                    { value: groups.length, label: "Groupes", icon: DoorOpen },
                    { value: apiReaders.length, label: "Lecteurs", icon: Server },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-5 py-3 text-center">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <TabsList className="flex-wrap gap-1 bg-transparent">
                <TabsTrigger value="organization" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl px-4 py-2.5 text-muted-foreground wow-transition press-effect">
                  <Users className="mr-2 h-4 w-4" />
                  Organisation
                </TabsTrigger>
                <TabsTrigger value="planning" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl px-4 py-2.5 text-muted-foreground wow-transition press-effect">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Horaires & Plannings
                </TabsTrigger>
                <TabsTrigger value="hikcentral" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl px-4 py-2.5 text-muted-foreground wow-transition press-effect">
                  <Server className="mr-2 h-4 w-4" />
                  HikCentral
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl px-4 py-2.5 text-muted-foreground wow-transition press-effect">
                  <Shield className="mr-2 h-4 w-4" />
                  Securite
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl px-4 py-2.5 text-muted-foreground wow-transition press-effect">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="general" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl px-4 py-2.5 text-muted-foreground wow-transition press-effect">
                  <Globe className="mr-2 h-4 w-4" />
                  General
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="organization" className="space-y-8">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-sky-500 to-blue-600 opacity-70" />
                <div className="flex items-center justify-between gap-4 p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500/20 to-blue-500/10 ring-1 ring-sky-400/20">
                      <Building className="h-5 w-5 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Departements</h3>
                      <p className="text-sm text-muted-foreground">Ajout, modification et suppression des departements</p>
                    </div>
                  </div>
                    <Dialog open={depDialogOpen} onOpenChange={setDepDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingDepartment(null)
                            resetDepartmentForm()
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Nouveau departement
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl border-border/60 bg-card">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">{editingDepartment ? "Modifier" : "Creer"} un departement</DialogTitle>
                          <DialogDescription>Renseignez les informations du departement.</DialogDescription>
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
                            <Select
                              value={depForm.organizationId}
                              onValueChange={(value) => setDepForm((p) => ({ ...p, organizationId: value }))}
                            >
                              <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                <SelectValue placeholder="Selectionner une organisation" />
                              </SelectTrigger>
                              <SelectContent>
                                {apiOrganizations.map((organization) => (
                                  <SelectItem key={organization.id} value={String(organization.id)}>
                                    {organization.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Parent (optionnel)</Label>
                            <Select
                              value={depForm.parentId}
                              onValueChange={(value) => setDepForm((p) => ({ ...p, parentId: value === "__none__" ? "" : value }))}
                            >
                              <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                <SelectValue placeholder="Aucun parent" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Aucun parent</SelectItem>
                                {apiDepartments
                                  .filter((department) => department.id !== editingDepartment?.id)
                                  .map((department) => (
                                    <SelectItem key={department.id} value={String(department.id)}>
                                      {department.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" className="h-10 rounded-xl" onClick={() => setDepDialogOpen(false)}>Annuler</Button>
                          <Button className="h-10 rounded-xl" onClick={submitDepartment} disabled={isSavingDepartment}>
                            {isSavingDepartment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enregistrer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                <div className="space-y-3 px-6 pb-6">
                  {departmentError && (
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">
                      {departmentError}
                    </div>
                  )}
                  {apiDepartments.map((dep) => {
                    const organization = organizationById.get(dep.organization)
                    const parent = dep.parent ? departmentById.get(dep.parent) : null
                    return (
                    <div key={dep.id} className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 wow-transition hover:border-border hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/15 wow-transition group-hover:scale-105">
                          <Building className="h-4 w-4 text-sky-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{dep.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Code: {dep.code || "-"} • {organization?.name || `Organisation #${dep.organization}`}
                            {parent ? ` • Parent: ${parent.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingDepartment(dep)
                          setDepForm({
                            name: dep.name,
                            code: dep.code || "",
                            organizationId: String(dep.organization),
                            parentId: dep.parent ? String(dep.parent) : "",
                          })
                          setDepDialogOpen(true)
                        }}><Edit className="h-4 w-4" /></Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() =>
                            setPendingSensitiveAction({ kind: "department", id: dep.id, label: `Supprimer le département ${dep.name}` })
                          }
                        ><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    )
                  })}
                  {apiDepartments.length === 0 && (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                      <Building className="mb-3 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Aucun departement configure pour ce tenant.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-500 to-purple-600 opacity-70" />
                <div className="flex items-center justify-between gap-4 p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-purple-500/10 ring-1 ring-violet-400/20">
                      <DoorOpen className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Groupes d'acces</h3>
                      <p className="text-sm text-muted-foreground">Ajout, modification et suppression des groupes</p>
                    </div>
                  </div>
                    <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingGroup(null)
                            resetGroupForm()
                          }}
                        >
                          <DoorOpen className="mr-2 h-4 w-4" />
                          Nouveau groupe
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl border-border/60 bg-card">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">{editingGroup ? "Modifier" : "Creer"} un groupe</DialogTitle>
                          <DialogDescription>Definissez le groupe d'acces: emploi de temps + lecteurs.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2"><Label className="text-xs font-medium text-muted-foreground">Nom</Label><Input className="h-10 rounded-xl border-border/60 bg-background/60" value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} /></div>
                          <div className="space-y-2"><Label className="text-xs font-medium text-muted-foreground">Description</Label><Input className="h-10 rounded-xl border-border/60 bg-background/60" value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))} /></div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Emploi de temps</Label>
                            <Select value={groupForm.planningId} onValueChange={(value) => setGroupForm((p) => ({ ...p, planningId: value === "__none__" ? "" : value }))}>
                              <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60"><SelectValue placeholder="Selectionner un planning" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Aucun planning</SelectItem>
                                {apiPlannings.map((planning) => (
                                  <SelectItem key={planning.id} value={String(planning.id)}>
                                    {planning.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Lecteurs autorises</Label>
                            <div className="max-h-44 space-y-2 overflow-auto rounded-xl border border-border/60 bg-background/40 p-3">
                              {apiReaders.length === 0 && (
                                <p className="text-xs text-muted-foreground">Aucun lecteur disponible.</p>
                              )}
                              {apiReaders.map((reader) => {
                                const readerId = String(reader.id)
                                const checked = groupForm.readerIds.includes(readerId)
                                return (
                                  <label key={reader.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={checked} onCheckedChange={(value) => toggleReader(readerId, value === true)} />
                                    <span>{reader.name || reader.dev_index} ({reader.serial_number})</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" className="h-10 rounded-xl" onClick={() => setGroupDialogOpen(false)}>Annuler</Button>
                          <Button className="h-10 rounded-xl" onClick={submitGroup} disabled={isSavingGroup}>
                            {isSavingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enregistrer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                <div className="space-y-3 px-6 pb-6">
                  {activeTenantName && (
                    <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">Tenant actif:</span> {activeTenantName}
                    </p>
                  )}
                  {groupError && (
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">
                      {groupError}
                    </div>
                  )}
                  {groups.map((group) => (
                    <div key={group.id} className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 wow-transition hover:border-border hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-400/15 wow-transition group-hover:scale-105">
                          <DoorOpen className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.description || "Sans description"} • {group.deviceCount} lecteurs
                            {group.planningName ? ` • Planning: ${group.planningName}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingGroup(group)
                          setGroupForm({
                            name: group.name,
                            description: group.description,
                            planningId: group.planningId || "",
                            readerIds: group.readerIds,
                          })
                          setGroupDialogOpen(true)
                        }}><Edit className="h-4 w-4" /></Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() =>
                            setPendingSensitiveAction({ kind: "group", id: group.id, label: `Supprimer le groupe ${group.name}` })
                          }
                        ><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="planning" className="space-y-8">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-500 to-indigo-600 opacity-70" />
                <div className="flex items-center justify-between gap-4 p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-indigo-500/10 ring-1 ring-violet-400/20">
                      <CalendarDays className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Plannings (backend)</h3>
                      <p className="text-sm text-muted-foreground">Creation, edition et suppression des plannings</p>
                    </div>
                  </div>
                    <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setEditingSchedule(null); resetScheduleForm() }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Nouveau planning
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl border-border/60 bg-card">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">{editingSchedule ? "Modifier" : "Creer"} un planning</DialogTitle>
                          <DialogDescription>Configurez les metadonnees du planning backend.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2"><Label className="text-xs font-medium text-muted-foreground">Nom</Label><Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.name} onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))} /></div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Code (optionnel)</Label>
                            <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.code} onChange={(e) => setScheduleForm((p) => ({ ...p, code: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                            <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.description} onChange={(e) => setScheduleForm((p) => ({ ...p, description: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Timezone</Label>
                            <Input className="h-10 rounded-xl border-border/60 bg-background/60" value={scheduleForm.timezone} onChange={(e) => setScheduleForm((p) => ({ ...p, timezone: e.target.value }))} placeholder="Ex: Africa/Abidjan" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" className="h-10 rounded-xl" onClick={() => setScheduleDialogOpen(false)}>Annuler</Button>
                          <Button className="h-10 rounded-xl" onClick={submitSchedule} disabled={isSavingSchedule}>
                            {isSavingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enregistrer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                <div className="space-y-3 px-6 pb-6">
                  {planningError && (
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">
                      {planningError}
                    </div>
                  )}
                  {apiPlannings.map((schedule) => (
                    <div key={schedule.id} className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 wow-transition hover:border-border hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-400/15 wow-transition group-hover:scale-105">
                          <CalendarDays className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{schedule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Code: {schedule.code || "-"} • TZ: {schedule.timezone || "UTC"}
                            {schedule.description ? ` • ${schedule.description}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingSchedule(schedule)
                          setScheduleForm({
                            name: schedule.name,
                            code: schedule.code || "",
                            description: schedule.description || "",
                            timezone: schedule.timezone || "UTC",
                          })
                          setScheduleDialogOpen(true)
                        }}><Edit className="h-4 w-4" /></Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() =>
                            setPendingSensitiveAction({ kind: "planning", id: schedule.id, label: `Supprimer le planning ${schedule.name}` })
                          }
                        ><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {apiPlannings.length === 0 && (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                      <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Aucun planning configure pour ce tenant.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-orange-500 opacity-70" />
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400/20 to-orange-400/10 ring-1 ring-amber-400/20">
                      <CheckCircle2 className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Attribution des plannings</h3>
                      <p className="text-sm text-muted-foreground">Affectez un planning a un departement ou un groupe</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 px-6 pb-6">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Select value={assignmentForm.planningId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, planningId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Planning" /></SelectTrigger>
                      <SelectContent>{apiPlannings.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={assignmentForm.targetType} onValueChange={(v: Assignment["targetType"]) => setAssignmentForm((p) => ({ ...p, targetType: v, targetId: "" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Departement">Departement</SelectItem>
                        <SelectItem value="Groupe">Groupe</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={assignmentForm.targetId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, targetId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
                      <SelectContent>
                        {availableTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id}>{target.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => void addAssignment()} disabled={isAssigningPlanning}>
                      {isAssigningPlanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Attribuer
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {assignments.map((asgn) => {
                      const schedule = apiPlannings.find((s) => String(s.id) === asgn.planningId)
                      const target = asgn.targetType === "Departement"
                        ? departmentById.get(Number(asgn.targetId))
                        : groups.find((g) => g.id === asgn.targetId)
                      return (
                        <div key={asgn.id} className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-3 text-sm wow-transition hover:border-border">
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">{schedule?.name ?? "Planning supprime"}</span>
                            {" -> "}
                            {asgn.targetType}: {target?.name ?? "Cible supprimee"}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              setPendingSensitiveAction({ kind: "assignment", assignment: asgn, label: `Retirer l'attribution ${schedule?.name ?? "planning"}` })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                    {assignments.length === 0 && (
                      <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                        <CheckCircle2 className="mb-3 h-7 w-7 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Aucune attribution de planning pour ce tenant.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-teal-600 opacity-70" />
                <div className="flex items-center justify-between gap-4 p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/10 ring-1 ring-emerald-400/20">
                      <Clock className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Quarts de travail (backend)</h3>
                      <p className="text-sm text-muted-foreground">Creation et affectation des quarts aux departements</p>
                    </div>
                  </div>
                    <Dialog open={workShiftDialogOpen} onOpenChange={setWorkShiftDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingWorkShift(null)
                            resetWorkShiftForm()
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Nouveau quart
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl border-border/60 bg-card">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">{editingWorkShift ? "Modifier" : "Creer"} un quart de travail</DialogTitle>
                          <DialogDescription>Ce quart sera disponible pour les employes et departements.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
                            <Input
                              className="h-10 rounded-xl border-border/60 bg-background/60"
                              value={workShiftForm.name}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Code (optionnel)</Label>
                            <Input
                              className="h-10 rounded-xl border-border/60 bg-background/60"
                              value={workShiftForm.code}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, code: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prise de service</p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Heure de debut</Label>
                                <Input
                                  className="h-10 rounded-xl border-border/60 bg-background/60"
                                  type="time"
                                  value={workShiftForm.start_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, start_time: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Heure de fin</Label>
                                <Input
                                  className="h-10 rounded-xl border-border/60 bg-background/60"
                                  type="time"
                                  value={workShiftForm.end_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, end_time: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                            <Input
                              className="h-10 rounded-xl border-border/60 bg-background/60"
                              value={workShiftForm.description}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, description: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pause</p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Heure de debut</Label>
                                <Input
                                  className="h-10 rounded-xl border-border/60 bg-background/60"
                                  type="time"
                                  value={workShiftForm.break_start_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_start_time: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Heure de fin</Label>
                                <Input
                                  className="h-10 rounded-xl border-border/60 bg-background/60"
                                  type="time"
                                  value={workShiftForm.break_end_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_end_time: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Heures supplementaires (minutes)</Label>
                            <Input
                              className="h-10 rounded-xl border-border/60 bg-background/60"
                              type="number"
                              min="0"
                              value={workShiftForm.overtime_minutes}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, overtime_minutes: e.target.value }))}
                              placeholder="Optionnel"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Tolerance
                            </p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Retard tolere (min)</Label>
                                <Input
                                  className="h-10 rounded-xl border-border/60 bg-background/60"
                                  type="number"
                                  min="0"
                                  value={workShiftForm.late_allowable_minutes}
                                  onChange={(e) =>
                                    setWorkShiftForm((p) => ({ ...p, late_allowable_minutes: e.target.value }))
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Marge depart anticipe (min)</Label>
                                <Input
                                  className="h-10 rounded-xl border-border/60 bg-background/60"
                                  type="number"
                                  min="0"
                                  value={workShiftForm.early_leave_allowable_minutes}
                                  onChange={(e) =>
                                    setWorkShiftForm((p) => ({ ...p, early_leave_allowable_minutes: e.target.value }))
                                  }
                                  placeholder="10"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" className="h-10 rounded-xl" onClick={() => setWorkShiftDialogOpen(false)}>Annuler</Button>
                          <Button className="h-10 rounded-xl" onClick={() => void submitWorkShift()} disabled={isSavingWorkShift}>
                            {isSavingWorkShift ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enregistrer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                <div className="space-y-4 px-6 pb-6">
                  {workShiftError && (
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/10">
                      {workShiftError}
                    </div>
                  )}

                  <div className="space-y-3">
                    {apiWorkShifts.map((shift) => (
                      <div key={shift.id} className="group flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 wow-transition hover:border-border hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/15 wow-transition group-hover:scale-105">
                            <Clock className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{shift.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                            {(shift.start_time ?? "--:--")} - {(shift.end_time ?? "--:--")} • {shift.code || "auto"}
                            {shift.description ? ` • ${shift.description}` : ""}
                            {shift.break_start_time && shift.break_end_time
                              ? ` • Pause: ${shift.break_start_time}-${shift.break_end_time}`
                              : ""}
                            {shift.overtime_minutes ? ` • HS: ${shift.overtime_minutes} min` : ""}
                            {shift.late_allowable_minutes ? ` • Retard tolere: ${shift.late_allowable_minutes} min` : ""}
                            {shift.early_leave_allowable_minutes
                              ? ` • Depart anticipe tolere: ${shift.early_leave_allowable_minutes} min`
                              : ""}
                          </p>
                        </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingWorkShift(shift)
                              setWorkShiftForm({
                                name: shift.name,
                                code: shift.code,
                                description: shift.description || "",
                                start_time: shift.start_time ?? "08:00",
                                end_time: shift.end_time ?? "17:00",
                                break_start_time: shift.break_start_time ?? "12:00",
                                break_end_time: shift.break_end_time ?? "13:00",
                                overtime_minutes: shift.overtime_minutes ? String(shift.overtime_minutes) : "",
                                late_allowable_minutes: shift.late_allowable_minutes
                                  ? String(shift.late_allowable_minutes)
                                  : "10",
                                early_leave_allowable_minutes: shift.early_leave_allowable_minutes
                                  ? String(shift.early_leave_allowable_minutes)
                                  : "10",
                              })
                              setWorkShiftDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              setPendingSensitiveAction({ kind: "work-shift", id: shift.id, label: `Supprimer le quart ${shift.name}` })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {apiWorkShifts.length === 0 && (
                      <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                        <Clock className="mb-3 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Aucun quart configure pour ce tenant.</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                    <p className="mb-3 text-sm font-semibold text-foreground">Attribuer un quart a un departement</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Select
                        value={departmentShiftForm.departmentId}
                        onValueChange={(value) => setDepartmentShiftForm((prev) => ({ ...prev, departmentId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Departement" />
                        </SelectTrigger>
                        <SelectContent>
                          {apiDepartments.map((department) => (
                            <SelectItem key={department.id} value={String(department.id)}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={departmentShiftForm.workShiftId}
                        onValueChange={(value) => setDepartmentShiftForm((prev) => ({ ...prev, workShiftId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Quart de travail" />
                        </SelectTrigger>
                        <SelectContent>
                          {apiWorkShifts.map((shift) => (
                            <SelectItem key={shift.id} value={String(shift.id)}>
                              {shift.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => void submitDepartmentShiftAssignment()} disabled={isAssigningWorkShift}>
                        {isAssigningWorkShift ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Attribuer
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {apiDepartments.map((department) => (
                      <div key={department.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-3 text-sm wow-transition hover:border-border">
                        <span className="text-muted-foreground">{department.name}</span>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300 border border-emerald-400/20">
                          {department.effective_work_shift?.name ?? "Aucun quart"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hikcentral" className="space-y-8">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 to-green-600 opacity-70" />
                <div className="flex items-center justify-between gap-4 p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-green-500/10 ring-1 ring-emerald-400/20">
                      <Server className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Etat de la connexion</h3>
                      <p className="text-sm text-muted-foreground">Connexion au serveur HikCentral Professional</p>
                    </div>
                  </div>
                  <Badge className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-500 dark:text-emerald-300">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                    Connecte
                  </Badge>
                </div>
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <p className="text-sm text-muted-foreground">Synchronisation active toutes les 5 minutes.</p>
                    </div>
                    <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => void saveSecuritySettings()} disabled={!hasSecurityChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Sauvegarder
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetSecuritySettings} disabled={!hasSecurityChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Annuler les changements
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-8">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 to-yellow-500 opacity-70" />
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400/20 to-yellow-400/10 ring-1 ring-amber-400/20">
                      <Shield className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Politique d'acces</h3>
                      <p className="text-sm text-muted-foreground">Regles de securite globales</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                        <Clock className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Restriction horaire</p>
                        <p className="text-xs text-muted-foreground">Acces bloque en dehors de 06:00 - 22:00</p>
                      </div>
                    </div>
                    <Switch checked={securityTimeRestrictionEnabled} onCheckedChange={setSecurityTimeRestrictionEnabled} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => void saveSecuritySettings()} disabled={!hasSecurityChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Sauvegarder
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetSecuritySettings} disabled={!hasSecurityChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reinitialiser
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-8">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-rose-500 to-pink-600 opacity-70" />
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-rose-500/20 to-pink-500/10 ring-1 ring-rose-400/20">
                      <Bell className="h-5 w-5 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Canaux de notification</h3>
                      <p className="text-sm text-muted-foreground">Configurez vos canaux de notification preferes</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 px-6 pb-6">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 wow-transition hover:border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                        <Bell className="h-4 w-4 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Email</p>
                        <p className="text-xs text-muted-foreground">Recevez les alertes par email</p>
                      </div>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 wow-transition hover:border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                        <Bell className="h-4 w-4 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Push mobile</p>
                        <p className="text-xs text-muted-foreground">Notifications push sur mobile</p>
                      </div>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => void saveNotificationSettings()} disabled={!hasNotificationChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Sauvegarder
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetNotificationSettings} disabled={!hasNotificationChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reinitialiser
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-8">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-cyan-500 to-blue-600 opacity-70" />
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/20 to-blue-500/10 ring-1 ring-cyan-400/20">
                      <Globe className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Informations entreprise</h3>
                      <p className="text-sm text-muted-foreground">Parametres generaux de votre organisation</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 px-6 pb-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Nom de l'entreprise</Label>
                    <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="h-10 rounded-xl border-border/60 bg-background/60" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Fuseau horaire</Label>
                    <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="h-10 rounded-xl border-border/60 bg-background/60" />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-1">
                    <Button onClick={() => void saveGeneralSettings()} disabled={!hasGeneralChanges || isSavingPreferences}>
                      {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Sauvegarder
                    </Button>
                    <Button variant="outline" onClick={resetGeneralSettings} disabled={!hasGeneralChanges || isSavingPreferences}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reinitialiser
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
                  {isRunningSensitiveAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
