"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Building2,
  IdCard,
  Loader2,
  Monitor,
  ScanFace,
  Fingerprint,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Header } from "@/components/dashboard/header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  deleteEmployee,
  fetchAccessGroups,
  fetchDepartments,
  fetchDevices,
  fetchEmployeeById,
  fetchWorkShifts,
  setEmployeeActive,
  type AccessGroupApiItem,
  type DepartmentApiItem,
  type DeviceApiItem,
  type EmployeeApiItem,
  type WorkShiftApiItem,
} from "@/lib/api/employees"
import { fetchHikEvents, type HikEvent } from "@/lib/api/access-logs"
import { getActiveTenantCode } from "@/lib/api/auth"

function getTenantCode(): string {
  return getActiveTenantCode()
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type EventState = "loading" | "ready" | "error" | "disabled"

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const employeeId = params?.id

  const [employee, setEmployee] = useState<EmployeeApiItem | null>(null)
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([])
  const [workShifts, setWorkShifts] = useState<WorkShiftApiItem[]>([])
  const [devices, setDevices] = useState<DeviceApiItem[]>([])
  const [accessGroups, setAccessGroups] = useState<AccessGroupApiItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<HikEvent[]>([])
  const [eventsState, setEventsState] = useState<EventState>("loading")
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return
    setIsLoading(true)
    setError(null)
    try {
      const [employeeData, departmentsData, workShiftsData, devicesData, accessGroupsData] =
        await Promise.all([
          fetchEmployeeById(employeeId),
          fetchDepartments(getTenantCode()),
          fetchWorkShifts(getTenantCode()),
          fetchDevices(getTenantCode()),
          fetchAccessGroups(getTenantCode()),
        ])
      setEmployee(employeeData)
      setDepartments(departmentsData)
      setWorkShifts(workShiftsData)
      setDevices(devicesData)
      setAccessGroups(accessGroupsData)
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Erreur de chargement de la fiche employé"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void loadEmployee()
  }, [loadEmployee])

  const loadRecentEvents = useCallback(async () => {
    if (!employee) return
    setEventsState("loading")
    try {
      const response = await fetchHikEvents({
        personId: employee.employee_no,
        limit: 25,
        tenant: getTenantCode(),
      })
      setEvents(response.results ?? [])
      setEventsState("ready")
    } catch {
      setEventsState("error")
    }
  }, [employee])

  useEffect(() => {
    void loadRecentEvents()
  }, [loadRecentEvents])

  const departmentName = useMemo(() => {
    if (!employee?.department) return "Non assigné"
    return departments.find((department) => department.id === employee.department)?.name ?? "Département inconnu"
  }, [employee, departments])

  const workShiftName = useMemo(() => {
    if (employee?.effective_work_shift?.name) return employee.effective_work_shift.name
    if (!employee?.work_shift) return "Non assigné"
    return workShifts.find((shift) => shift.id === employee.work_shift)?.name ?? "Quart inconnu"
  }, [employee, workShifts])

  const planningName = employee?.effective_planning?.name ?? "Non assigné"

  const employeeDevices = useMemo(() => {
    if (!employee) return []
    const employeeDeviceIds = new Set(employee.devices ?? [])
    return devices.filter((device) => employeeDeviceIds.has(device.id))
  }, [employee, devices])

  const employeeAccessGroups = useMemo(() => {
    if (!employee) return []
    const ids = new Set(employee.access_groups ?? [])
    return accessGroups.filter((group) => ids.has(group.id))
  }, [employee, accessGroups])

  const lastEvent = events[0] ?? null

  const isActive = employee?.is_active !== false

  const handleToggleActive = async () => {
    if (!employee) return
    const target = !isActive
    setIsToggling(true)
    try {
      const updated = await setEmployeeActive(employee.id, target)
      setEmployee(updated)
      toast.success(
        target ? `${employee.name} a été réactivé` : `${employee.name} a été désactivé`
      )
    } catch (toggleError) {
      const message =
        toggleError instanceof Error ? toggleError.message : "Erreur lors du changement d'état"
      toast.error(message)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!employee) return
    setIsDeleting(true)
    try {
      await deleteEmployee(employee.id)
      toast.success(`${employee.name} a été supprimé`)
      router.push("/employees")
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Erreur lors de la suppression"
      toast.error(message)
      setIsDeleting(false)
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-shell-content">
        <Header systemStatus="connected" hideRouteInfo />

        <main className="app-page space-y-4">
          <section className="app-surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <Button asChild variant="ghost" size="sm" className="mt-1">
                  <Link href="/employees">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Liste
                  </Link>
                </Button>
                {isLoading || !employee ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                      <AvatarFallback className="bg-secondary/80 text-base font-semibold text-foreground">
                        {getInitials(employee.name || employee.employee_no)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                        {employee.name || employee.employee_no}
                      </h1>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {employee.employee_no}
                        </Badge>
                        <span>·</span>
                        <span>{employee.position || "Poste non défini"}</span>
                        <span>·</span>
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                              : "border-destructive/30 bg-destructive/8 text-destructive"
                          }
                        >
                          {isActive ? "Actif" : "Désactivé"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {employee && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/employees?edit_id=${employee.id}`)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleToggleActive()}
                    disabled={isToggling}
                  >
                    {isToggling ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isActive ? (
                      <UserX className="mr-2 h-4 w-4" />
                    ) : (
                      <UserCheck className="mr-2 h-4 w-4" />
                    )}
                    {isActive ? "Désactiver" : "Réactiver"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          </section>

          {error && (
            <section className="app-surface p-5">
              <div className="flex items-start gap-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            </section>
          )}

          {!error && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <Card className="border-border/70 bg-card/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Informations personnelles
                  </h2>
                  {isLoading || !employee ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoRow icon={<IdCard className="h-4 w-4" />} label="Matricule" value={employee.employee_no} mono />
                      <InfoRow icon={<Building2 className="h-4 w-4" />} label="Département" value={departmentName} />
                      <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={employee.email || "—"} />
                      <InfoRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={employee.phone || "—"} />
                      <InfoRow icon={<Clock className="h-4 w-4" />} label="Quart" value={workShiftName} />
                      <InfoRow icon={<Calendar className="h-4 w-4" />} label="Planning" value={planningName} />
                    </div>
                  )}
                </Card>

                <Card className="border-border/70 bg-card/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Historique récent
                    </h2>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md text-[11px]"
                    >
                      <Link href={`/access-logs?person=${encodeURIComponent(employee?.employee_no ?? "")}`}>
                        Voir tout
                      </Link>
                    </Button>
                  </div>

                  {eventsState === "loading" && (
                    <div className="mt-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                      ))}
                    </div>
                  )}

                  {eventsState === "error" && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Impossible de récupérer l&apos;historique.
                    </p>
                  )}

                  {eventsState === "disabled" && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Mode démonstration : connectez l&apos;API pour afficher les pointages.
                    </p>
                  )}

                  {eventsState === "ready" && events.length === 0 && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Aucun pointage enregistré pour cet employé.
                    </p>
                  )}

                  {eventsState === "ready" && events.length > 0 && (
                    <ul className="mt-4 divide-y divide-border/60">
                      {events.slice(0, 10).map((event) => {
                        const isGranted = event.access_status === "granted"
                        return (
                          <li key={event.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {event.device.device_name || event.device.dev_index}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(event.timestamp)}
                                {event.direction ? ` · ${event.direction}` : ""}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                isGranted
                                  ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                  : event.access_status === "denied"
                                    ? "border-destructive/30 bg-destructive/8 text-destructive"
                                    : "border-border/60 bg-secondary/40 text-muted-foreground"
                              }
                            >
                              {event.access_status ?? event.attendance_status ?? "—"}
                            </Badge>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-border/70 bg-card/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Dernier pointage
                  </h2>
                  {eventsState === "loading" && <Skeleton className="mt-3 h-12 w-full" />}
                  {eventsState === "ready" && lastEvent && (
                    <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={
                            lastEvent.access_status === "granted"
                              ? "h-4 w-4 text-emerald-500"
                              : "h-4 w-4 text-muted-foreground"
                          }
                        />
                        <span className="text-sm font-medium text-foreground">
                          {formatDateTime(lastEvent.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {lastEvent.device.device_name || lastEvent.device.dev_index}
                      </p>
                    </div>
                  )}
                  {eventsState === "ready" && !lastEvent && (
                    <p className="mt-3 text-sm text-muted-foreground">Aucun pointage récent.</p>
                  )}
                  {eventsState === "error" && (
                    <p className="mt-3 text-sm text-muted-foreground">Indisponible.</p>
                  )}
                  {eventsState === "disabled" && (
                    <p className="mt-3 text-sm text-muted-foreground">Mode démonstration.</p>
                  )}
                </Card>

                <Card className="border-border/70 bg-card/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Identifiants
                  </h2>
                  {isLoading || !employee ? (
                    <Skeleton className="mt-3 h-16 w-full" />
                  ) : (
                    <div className="mt-3 space-y-3">
                      <CredentialRow
                        icon={<CreditCard className="h-4 w-4" />}
                        label="Cartes"
                        value={
                          employee.cards.length === 0
                            ? "Aucune"
                            : employee.cards.map((card) => card.card_no).join(", ")
                        }
                        present={employee.cards.length > 0}
                      />
                      <CredentialRow
                        icon={<Fingerprint className="h-4 w-4" />}
                        label="Empreintes"
                        value={
                          (employee.fingerprints ?? []).length === 0
                            ? "Aucune"
                            : `${employee.fingerprints?.length ?? 0} enregistrée${
                                (employee.fingerprints?.length ?? 0) > 1 ? "s" : ""
                              }`
                        }
                        present={(employee.fingerprints ?? []).length > 0}
                      />
                      <CredentialRow
                        icon={<ScanFace className="h-4 w-4" />}
                        label="Visage"
                        value={employee.face?.face_data ? "Enregistré" : "Non enregistré"}
                        present={Boolean(employee.face?.face_data)}
                      />
                    </div>
                  )}
                </Card>

                <Card className="border-border/70 bg-card/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Lecteurs associés
                  </h2>
                  {isLoading || !employee ? (
                    <Skeleton className="mt-3 h-16 w-full" />
                  ) : employeeDevices.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Aucun lecteur attribué directement.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {employeeDevices.map((device) => (
                        <li
                          key={device.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                        >
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {device.name || device.dev_index}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {device.dev_index}
                              {device.status ? ` · ${device.status}` : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card className="border-border/70 bg-card/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Groupes d&apos;accès
                  </h2>
                  {isLoading || !employee ? (
                    <Skeleton className="mt-3 h-10 w-full" />
                  ) : employeeAccessGroups.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">Aucun groupe d&apos;accès.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {employeeAccessGroups.map((group) => (
                        <Badge key={group.id} variant="secondary" className="text-[11px]">
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setShowDeleteConfirm(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet employé ?</AlertDialogTitle>
            <AlertDialogDescription>
              {employee
                ? `${employee.name || employee.employee_no} sera retiré du tenant et de tous les lecteurs liés. Cette action est irréversible.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <span className="mt-0.5 text-muted-foreground/80">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-0.5 truncate text-sm text-foreground ${mono ? "font-mono tabular-nums" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  )
}

function CredentialRow({
  icon,
  label,
  value,
  present,
}: {
  icon: React.ReactNode
  label: string
  value: string
  present: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-muted-foreground/80">{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm text-foreground">{value}</p>
        </div>
      </div>
      <Badge
        variant="outline"
        className={
          present
            ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
            : "border-border/60 bg-secondary/60 text-muted-foreground"
        }
      >
        {present ? "OK" : "Manquant"}
      </Badge>
    </div>
  )
}
