"use client"

import { useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { PageContextBar } from "@/components/dashboard/page-context-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Bell,
  Building,
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  Edit,
  Globe,
  Plus,
  Server,
  Shield,
  Trash2,
  Users,
} from "lucide-react"

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

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(true)

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
    if (!tenantId || !depForm.name.trim() || !depForm.organizationId) return
    setDepartmentError(null)
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
    } catch (error) {
      setDepartmentError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du departement.")
    }
  }

  const submitGroup = async () => {
    if (!tenantId || !groupForm.name.trim()) return
    setGroupError(null)
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
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du groupe.")
    }
  }

  const submitSchedule = async () => {
    if (!tenantId || !scheduleForm.name.trim()) return
    setPlanningError(null)
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
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du planning.")
    }
  }

  const submitWorkShift = async () => {
    if (!tenantId || !workShiftForm.name.trim()) return
    setWorkShiftError(null)
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
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du quart.")
    }
  }

  const removeDepartment = async (id: number) => {
    setDepartmentError(null)
    try {
      await deleteDepartmentApi(id)
      setApiDepartments((prev) => prev.filter((department) => department.id !== id))
    } catch (error) {
      setDepartmentError(error instanceof Error ? error.message : "Erreur lors de la suppression du departement.")
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
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : "Erreur lors de la suppression du groupe.")
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
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de la suppression du planning.")
    }
  }

  const addAssignment = async () => {
    if (!assignmentForm.planningId || !assignmentForm.targetId) return
    setPlanningError(null)
    try {
      if (assignmentForm.targetType === "Departement") {
        const updated = await assignDepartmentPlanning(
          Number(assignmentForm.targetId),
          Number(assignmentForm.planningId),
        )
        setApiDepartments((prev) => prev.map((department) => (department.id === updated.id ? updated : department)))
        return
      }
      const targetGroup = groups.find((group) => group.id === assignmentForm.targetId)
      if (!targetGroup?.backendId) return
      const saved = await updateAccessGroup(targetGroup.backendId, { planning: Number(assignmentForm.planningId) })
      const mapped = mapAccessGroupToUi(saved)
      setGroups((prev) => prev.map((group) => (group.id === mapped.id ? mapped : group)))
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de l'attribution du planning.")
    }
  }

  const removeAssignment = async (assignment: Assignment) => {
    setPlanningError(null)
    try {
      if (assignment.targetType === "Departement") {
        const updated = await updateDepartment(Number(assignment.targetId), { planning: null })
        setApiDepartments((prev) => prev.map((department) => (department.id === updated.id ? updated : department)))
        return
      }
      const targetGroup = groups.find((group) => group.id === assignment.targetId)
      if (!targetGroup?.backendId) return
      const saved = await updateAccessGroup(targetGroup.backendId, { planning: null })
      const mapped = mapAccessGroupToUi(saved)
      setGroups((prev) => prev.map((group) => (group.id === mapped.id ? mapped : group)))
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Erreur lors de la suppression de l'attribution.")
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
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : "Erreur lors de la suppression du quart.")
    }
  }

  const submitDepartmentShiftAssignment = async () => {
    if (!departmentShiftForm.departmentId || !departmentShiftForm.workShiftId) return
    setWorkShiftError(null)
    try {
      const updatedDepartment = await assignDepartmentWorkShift(
        Number(departmentShiftForm.departmentId),
        Number(departmentShiftForm.workShiftId),
      )
      setApiDepartments((prev) =>
        prev.map((item) => (item.id === updatedDepartment.id ? updatedDepartment : item))
      )
      setDepartmentShiftForm((prev) => ({ ...prev, workShiftId: "" }))
    } catch (error) {
      setWorkShiftError(error instanceof Error ? error.message : "Erreur d'attribution du quart au departement.")
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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="pl-16 lg:pl-64">
        <Header systemStatus="connected" />

        <main className="p-6">
          <PageContextBar
            title="Parametres"
            description="Configuration globale: organisation, groupes d'acces, horaires, notifications et securite."
            stats={[
              { value: tenants.length, label: "Tenants disponibles" },
              { value: groups.length, label: "Groupes d'acces" },
              { value: apiReaders.length, label: "Lecteurs references" },
            ]}
          />

          <Tabs defaultValue="organization" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="organization">
                <Users className="mr-2 h-4 w-4" />
                Organisation
              </TabsTrigger>
              <TabsTrigger value="planning">
                <CalendarDays className="mr-2 h-4 w-4" />
                Horaires & Plannings
              </TabsTrigger>
              <TabsTrigger value="hikcentral">
                <Server className="mr-2 h-4 w-4" />
                HikCentral
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="mr-2 h-4 w-4" />
                Securite
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="general">
                <Globe className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organization" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Departements</CardTitle>
                      <CardDescription>Ajout, modification et suppression des departements</CardDescription>
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
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingDepartment ? "Modifier" : "Creer"} un departement</DialogTitle>
                          <DialogDescription>Renseignez les informations du departement.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input value={depForm.name} onChange={(e) => setDepForm((p) => ({ ...p, name: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Code</Label>
                            <Input value={depForm.code} onChange={(e) => setDepForm((p) => ({ ...p, code: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Organisation</Label>
                            <Select
                              value={depForm.organizationId}
                              onValueChange={(value) => setDepForm((p) => ({ ...p, organizationId: value }))}
                            >
                              <SelectTrigger>
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
                            <Label>Parent (optionnel)</Label>
                            <Select
                              value={depForm.parentId}
                              onValueChange={(value) => setDepForm((p) => ({ ...p, parentId: value === "__none__" ? "" : value }))}
                            >
                              <SelectTrigger>
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
                          <Button variant="outline" onClick={() => setDepDialogOpen(false)}>Annuler</Button>
                          <Button onClick={submitDepartment}>Enregistrer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {departmentError && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                      {departmentError}
                    </div>
                  )}
                  {apiDepartments.map((dep) => {
                    const organization = organizationById.get(dep.organization)
                    const parent = dep.parent ? departmentById.get(dep.parent) : null
                    return (
                    <div key={dep.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{dep.name}</p>
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
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void removeDepartment(dep.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    )
                  })}
                  {apiDepartments.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun departement configure pour ce tenant.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Groupes d'acces</CardTitle>
                      <CardDescription>Ajout, modification et suppression des groupes</CardDescription>
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
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingGroup ? "Modifier" : "Creer"} un groupe</DialogTitle>
                          <DialogDescription>Definissez le groupe d'acces: emploi de temps + lecteurs.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2"><Label>Nom</Label><Input value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} /></div>
                          <div className="space-y-2"><Label>Description</Label><Input value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))} /></div>
                          <div className="space-y-2">
                            <Label>Emploi de temps</Label>
                            <Select value={groupForm.planningId} onValueChange={(value) => setGroupForm((p) => ({ ...p, planningId: value === "__none__" ? "" : value }))}>
                              <SelectTrigger><SelectValue placeholder="Selectionner un planning" /></SelectTrigger>
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
                            <Label>Lecteurs autorises</Label>
                            <div className="max-h-44 space-y-2 overflow-auto rounded-md border p-3">
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
                          <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Annuler</Button>
                          <Button onClick={submitGroup}>Enregistrer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeTenantName && (
                    <p className="text-xs text-muted-foreground">Tenant actif: {activeTenantName}</p>
                  )}
                  {groupError && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                      {groupError}
                    </div>
                  )}
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.description || "Sans description"} • {group.deviceCount} lecteurs
                          {group.planningName ? ` • Planning: ${group.planningName}` : ""}
                        </p>
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
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void deleteGroup(group.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="planning" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Plannings (backend)</CardTitle>
                      <CardDescription>Creation, edition et suppression des plannings</CardDescription>
                    </div>
                    <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setEditingSchedule(null); resetScheduleForm() }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Nouveau planning
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingSchedule ? "Modifier" : "Creer"} un planning</DialogTitle>
                          <DialogDescription>Configurez les metadonnees du planning backend.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2"><Label>Nom</Label><Input value={scheduleForm.name} onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))} /></div>
                          <div className="space-y-2">
                            <Label>Code (optionnel)</Label>
                            <Input value={scheduleForm.code} onChange={(e) => setScheduleForm((p) => ({ ...p, code: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={scheduleForm.description} onChange={(e) => setScheduleForm((p) => ({ ...p, description: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Timezone</Label>
                            <Input value={scheduleForm.timezone} onChange={(e) => setScheduleForm((p) => ({ ...p, timezone: e.target.value }))} placeholder="Ex: Africa/Abidjan" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Annuler</Button>
                          <Button onClick={submitSchedule}>Enregistrer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {planningError && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                      {planningError}
                    </div>
                  )}
                  {apiPlannings.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Code: {schedule.code || "-"} • TZ: {schedule.timezone || "UTC"}
                          {schedule.description ? ` • ${schedule.description}` : ""}
                        </p>
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
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void deleteSchedule(schedule.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {apiPlannings.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun planning configure pour ce tenant.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attribution des plannings</CardTitle>
                  <CardDescription>Affectez un planning a un departement ou un groupe</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <Button onClick={() => void addAssignment()}>Attribuer</Button>
                  </div>

                  <div className="space-y-2">
                    {assignments.map((asgn) => {
                      const schedule = apiPlannings.find((s) => String(s.id) === asgn.planningId)
                      const target = asgn.targetType === "Departement"
                        ? departmentById.get(Number(asgn.targetId))
                        : groups.find((g) => g.id === asgn.targetId)
                      return (
                        <div key={asgn.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                          <p>
                            <span className="font-medium">{schedule?.name ?? "Planning supprime"}</span>
                            {" -> "}
                            {asgn.targetType}: {target?.name ?? "Cible supprimee"}
                          </p>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void removeAssignment(asgn)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                    {assignments.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune attribution de planning pour ce tenant.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Quarts de travail (backend)</CardTitle>
                      <CardDescription>Creation et affectation des quarts aux departements</CardDescription>
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
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingWorkShift ? "Modifier" : "Creer"} un quart de travail</DialogTitle>
                          <DialogDescription>Ce quart sera disponible pour les employes et departements.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input
                              value={workShiftForm.name}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Code (optionnel)</Label>
                            <Input
                              value={workShiftForm.code}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, code: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prise de service</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Heure de debut</Label>
                                <Input
                                  type="time"
                                  value={workShiftForm.start_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, start_time: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Heure de fin</Label>
                                <Input
                                  type="time"
                                  value={workShiftForm.end_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, end_time: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={workShiftForm.description}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, description: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pause</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Heure de debut</Label>
                                <Input
                                  type="time"
                                  value={workShiftForm.break_start_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_start_time: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Heure de fin</Label>
                                <Input
                                  type="time"
                                  value={workShiftForm.break_end_time}
                                  onChange={(e) => setWorkShiftForm((p) => ({ ...p, break_end_time: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Heures supplementaires (minutes)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={workShiftForm.overtime_minutes}
                              onChange={(e) => setWorkShiftForm((p) => ({ ...p, overtime_minutes: e.target.value }))}
                              placeholder="Optionnel"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Tolerance
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Retard tolere (min)</Label>
                                <Input
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
                                <Label>Marge depart anticipe (min)</Label>
                                <Input
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
                          <Button variant="outline" onClick={() => setWorkShiftDialogOpen(false)}>Annuler</Button>
                          <Button onClick={() => void submitWorkShift()}>Enregistrer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workShiftError && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                      {workShiftError}
                    </div>
                  )}

                  <div className="space-y-3">
                    {apiWorkShifts.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="font-medium">{shift.name}</p>
                          <p className="text-xs text-muted-foreground">
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
                            onClick={() => void removeWorkShift(shift.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {apiWorkShifts.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun quart configure pour ce tenant.</p>
                    )}
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="mb-3 text-sm font-medium">Attribuer un quart a un departement</p>
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
                      <Button onClick={() => void submitDepartmentShiftAssignment()}>Attribuer</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {apiDepartments.map((department) => (
                      <div key={department.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <span>{department.name}</span>
                        <Badge variant="secondary">
                          {department.effective_work_shift?.name ?? "Aucun quart"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hikcentral" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Etat de la connexion</CardTitle>
                      <CardDescription>Connexion au serveur HikCentral Professional</CardDescription>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />Connecte</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <p className="text-sm">Synchronisation active toutes les 5 minutes.</p>
                    <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Politique d'acces</CardTitle>
                  <CardDescription>Regles de securite globales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">Restriction horaire en dehors de 06:00 - 22:00</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Canaux de notification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-4"><p>Email</p><Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} /></div>
                  <div className="flex items-center justify-between rounded-lg border p-4"><p>Push mobile</p><Switch checked={pushNotifications} onCheckedChange={setPushNotifications} /></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations entreprise</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Nom de l'entreprise</Label><Input defaultValue="TechCorp Industries" /></div>
                  <div className="space-y-2"><Label>Fuseau horaire</Label><Input defaultValue="Europe/Paris" /></div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

