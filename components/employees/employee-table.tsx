"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  Pencil,
  FileText,
  UserX,
  ShieldCheck,
  Loader2,
  Clock,
  CheckCircle2,
  Fingerprint,
  Users,
} from "lucide-react"
import type { Employee } from "@/app/employees/page"
import { useRouter } from "next/navigation"

type EmployeeTableProps = {
  employees: Employee[]
  onEmployeeClick: (employee: Employee) => void
  onEditEmployee: (employee: Employee) => void
  accessGroupOptions: Array<{ id: number; name: string }>
  workShiftOptions: Array<{ id: number; name: string }>
  onAssignAccessGroups: (employee: Employee, accessGroupIds: number[]) => Promise<void>
  onAssignWorkShift: (employee: Employee, workShiftIds: number[]) => Promise<void>
  onDragEmployee?: (employee: Employee | null) => void
  suspendedEmployeeIds: Set<string>
  onToggleSuspension: (employee: Employee) => void
}

const departmentColors: Record<string, string> = {
  Engineering: "border-blue-400/20 bg-blue-500/12 text-blue-300",
  Marketing: "border-fuchsia-400/20 bg-fuchsia-500/12 text-fuchsia-300",
  Finance: "border-emerald-400/20 bg-emerald-500/12 text-emerald-300",
  HR: "border-pink-400/20 bg-pink-500/12 text-pink-300",
  Sales: "border-orange-400/20 bg-orange-500/12 text-orange-300",
  Design: "border-cyan-400/20 bg-cyan-500/12 text-cyan-300",
  IT: "border-indigo-400/20 bg-indigo-500/12 text-indigo-300",
}

export function EmployeeTable({
  employees,
  onEmployeeClick,
  onEditEmployee,
  accessGroupOptions,
  workShiftOptions,
  onAssignAccessGroups,
  onAssignWorkShift,
  onDragEmployee,
  suspendedEmployeeIds,
  onToggleSuspension,
}: EmployeeTableProps) {
  const router = useRouter()
  const [groupDialogEmployee, setGroupDialogEmployee] = useState<Employee | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [isSavingGroups, setIsSavingGroups] = useState(false)
  const [workShiftDialogEmployee, setWorkShiftDialogEmployee] = useState<Employee | null>(null)
  const [selectedWorkShiftIds, setSelectedWorkShiftIds] = useState<number[]>([])
  const [isSavingWorkShift, setIsSavingWorkShift] = useState(false)

  const selectedGroupSet = useMemo(() => new Set(selectedGroupIds), [selectedGroupIds])
  const selectedWorkShiftSet = useMemo(() => new Set(selectedWorkShiftIds), [selectedWorkShiftIds])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const openGroupDialog = (employee: Employee) => {
    setGroupDialogEmployee(employee)
    setSelectedGroupIds(employee.accessGroupIds)
  }

  const closeGroupDialog = () => {
    setGroupDialogEmployee(null)
    setSelectedGroupIds([])
    setIsSavingGroups(false)
  }

  const openWorkShiftDialog = (employee: Employee) => {
    setWorkShiftDialogEmployee(employee)
    setSelectedWorkShiftIds(employee.workShiftIds)
  }

  const closeWorkShiftDialog = () => {
    setWorkShiftDialogEmployee(null)
    setSelectedWorkShiftIds([])
    setIsSavingWorkShift(false)
  }

  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  const toggleWorkShift = (workShiftId: number) => {
    setSelectedWorkShiftIds((prev) =>
      prev.includes(workShiftId) ? prev.filter((id) => id !== workShiftId) : [...prev, workShiftId]
    )
  }

  const handleSaveGroups = async () => {
    if (!groupDialogEmployee) return
    setIsSavingGroups(true)
    try {
      await onAssignAccessGroups(groupDialogEmployee, selectedGroupIds)
      closeGroupDialog()
    } finally {
      setIsSavingGroups(false)
    }
  }

  const handleSaveWorkShift = async () => {
    if (!workShiftDialogEmployee || selectedWorkShiftIds.length === 0) return
    setIsSavingWorkShift(true)
    try {
      await onAssignWorkShift(workShiftDialogEmployee, selectedWorkShiftIds)
      closeWorkShiftDialog()
    } finally {
      setIsSavingWorkShift(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden border-border/70 bg-card/90 p-0 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <div className="overflow-x-auto p-3 sm:p-4">
        <Table className="min-w-235">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-72">Profil</TableHead>
              <TableHead className="w-28">Matricule</TableHead>
              <TableHead className="w-36">Departement</TableHead>
              <TableHead className="w-40">Quart</TableHead>
              <TableHead>Groupes d&apos;acces</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="px-4 py-20">
                  <div className="flex flex-col items-center justify-center gap-4 text-center animate-fade-up">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-background/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                      <Users className="h-7 w-7 text-muted-foreground/70" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-base font-semibold text-foreground">Aucun employe dans cette vue</p>
                      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                        Ajustez la recherche, les filtres ou le perimetre pour afficher des fiches.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee, index) => (
                <TableRow
                  key={employee.id}
                  draggable
                  className="group wow-transition cursor-grab hover:bg-accent/20 active:cursor-grabbing"
                  role="button"
                  tabIndex={0}
                  aria-label={`Ouvrir la fiche de ${employee.name}`}
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                  onClick={() => onEmployeeClick(employee)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onEmployeeClick(employee)
                    }
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/plain", employee.id)
                    onDragEmployee?.(employee)
                  }}
                  onDragEnd={() => onDragEmployee?.(null)}
                >
                  <TableCell className="py-3.5">
                    <div className="flex items-start gap-3">
                      <Avatar className="mt-0.5 h-10 w-10 border border-primary/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                        <AvatarFallback className="bg-secondary/80 text-xs font-semibold text-foreground">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-foreground">{employee.name}</p>
                          <p className="truncate text-xs text-muted-foreground/80">{employee.position}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            variant={employee.syncStatus === "pending" ? "outline" : "secondary"}
                            className={cn(
                              "text-[10px] font-medium",
                              suspendedEmployeeIds.has(employee.id)
                                ? "border-red-400/25 bg-red-500/8 text-red-200"
                                : employee.syncStatus === "pending"
                                ? "border-amber-400/25 bg-amber-500/8 text-amber-300"
                                : "border-emerald-400/20 bg-emerald-500/8 text-emerald-300"
                            )}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {suspendedEmployeeIds.has(employee.id) ? "Suspendu" : employee.syncStatus === "pending" ? "Sync en attente" : "Synchronise"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium",
                              employee.biometricStatus.hasFacePhoto && employee.biometricStatus.hasFingerprint
                                ? "border-emerald-400/20 bg-emerald-500/8 text-emerald-300"
                                : "border-border/50 bg-background/25 text-muted-foreground/80"
                            )}
                          >
                            <Fingerprint className="h-3 w-3" />
                            {employee.biometricStatus.hasFacePhoto && employee.biometricStatus.hasFingerprint
                              ? "Biometrie OK"
                              : "Incomplete"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="rounded-md border border-border/50 bg-background/30 px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {employee.employeeId}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[11px] font-medium",
                        departmentColors[employee.department] || "border-border/50 bg-secondary/60 text-secondary-foreground"
                      )}
                    >
                      {employee.department}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {employee.workShift}
                        </Badge>
                        {employee.workShiftIds.length > 1 && (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            +{employee.workShiftIds.length - 1}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-md px-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          openWorkShiftDialog(employee)
                        }}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Affecter
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {employee.accessGroups.slice(0, 2).map((group) => (
                        <Badge
                          key={group}
                          variant="outline"
                          className="text-[10px] font-medium"
                        >
                          {group}
                        </Badge>
                      ))}
                      {employee.accessGroups.length > 2 && (
                        <Badge variant="outline" className="text-[10px] font-medium">
                          +{employee.accessGroups.length - 2}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-md px-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          openGroupDialog(employee)
                        }}
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Affecter
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditEmployee(employee)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            openWorkShiftDialog(employee)
                          }}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          Quart de travail
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            openGroupDialog(employee)
                          }}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Groupes d&apos;acces
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/access-logs?person=${encodeURIComponent(employee.employeeId)}`)
                        }}>
                          <FileText className="mr-2 h-4 w-4" />
                          Voir les logs
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleSuspension(employee)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          {suspendedEmployeeIds.has(employee.id) ? "Reactiver" : "Suspendre"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      <Dialog open={!!groupDialogEmployee} onOpenChange={(open) => !open && closeGroupDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Groupes d&apos;acces - {groupDialogEmployee?.name ?? ""}
            </DialogTitle>
          </DialogHeader>

          <div className="grid max-h-80 gap-3 overflow-y-auto pr-1">
            {accessGroupOptions.map((group) => (
              <label key={group.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 bg-background/40 p-3">
                <Checkbox
                  checked={selectedGroupSet.has(group.id)}
                  onCheckedChange={() => toggleGroup(group.id)}
                />
                <span className="text-sm">{group.name}</span>
              </label>
            ))}
            {accessGroupOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun groupe disponible pour ce tenant.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeGroupDialog} disabled={isSavingGroups}>
              Annuler
            </Button>
            <Button onClick={() => void handleSaveGroups()} disabled={isSavingGroups || !groupDialogEmployee}>
              {isSavingGroups && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!workShiftDialogEmployee} onOpenChange={(open) => !open && closeWorkShiftDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Quart de travail - {workShiftDialogEmployee?.name ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selectionnez un ou plusieurs quarts autorises pour cet employe. Le quart le plus proche des pointages
              pourra ensuite etre retenu comme quart travaille.
            </p>
            <div className="grid max-h-80 gap-3 overflow-y-auto pr-1">
              {workShiftOptions.map((shift) => (
                <label key={shift.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 bg-background/40 p-3">
                  <Checkbox
                    checked={selectedWorkShiftSet.has(shift.id)}
                    onCheckedChange={() => toggleWorkShift(shift.id)}
                  />
                  <span className="text-sm">{shift.name}</span>
                </label>
              ))}
            </div>
            {workShiftOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun quart disponible pour ce tenant.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeWorkShiftDialog} disabled={isSavingWorkShift}>
              Annuler
            </Button>
            <Button
              onClick={() => void handleSaveWorkShift()}
              disabled={isSavingWorkShift || selectedWorkShiftIds.length === 0 || !workShiftDialogEmployee}
            >
              {isSavingWorkShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
