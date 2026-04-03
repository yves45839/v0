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
} from "lucide-react"
import type { Employee } from "@/app/employees/page"

type EmployeeTableProps = {
  employees: Employee[]
  onEmployeeClick: (employee: Employee) => void
  onEditEmployee: (employee: Employee) => void
  accessGroupOptions: Array<{ id: number; name: string }>
  workShiftOptions: Array<{ id: number; name: string }>
  onAssignAccessGroups: (employee: Employee, accessGroupIds: number[]) => Promise<void>
  onAssignWorkShift: (employee: Employee, workShiftIds: number[]) => Promise<void>
  onDragEmployee?: (employee: Employee | null) => void
}

const departmentColors: Record<string, string> = {
  Engineering: "bg-blue-500/20 text-blue-400",
  Marketing: "bg-purple-500/20 text-purple-400",
  Finance: "bg-green-500/20 text-green-400",
  HR: "bg-pink-500/20 text-pink-400",
  Sales: "bg-orange-500/20 text-orange-400",
  Design: "bg-cyan-500/20 text-cyan-400",
  IT: "bg-indigo-500/20 text-indigo-400",
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
}: EmployeeTableProps) {
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
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">Profil</TableHead>
              <TableHead className="w-[120px]">Matricule</TableHead>
              <TableHead className="w-[140px]">Departement</TableHead>
              <TableHead className="w-[160px]">Quart</TableHead>
              <TableHead>Groupes d&apos;acces</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow
                key={employee.id}
                draggable
                className="cursor-grab transition-colors hover:bg-accent/50 active:cursor-grabbing"
                onClick={() => onEmployeeClick(employee)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", employee.id)
                  onDragEmployee?.(employee)
                }}
                onDragEnd={() => onDragEmployee?.(null)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-secondary text-sm font-medium text-foreground">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{employee.employeeId}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-medium",
                      departmentColors[employee.department] || "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {employee.department}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      {employee.workShift}
                    </Badge>
                    {employee.workShiftIds.length > 1 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{employee.workShiftIds.length - 1}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        openWorkShiftDialog(employee)
                      }}
                    >
                      <Clock className="mr-1 h-3.5 w-3.5" />
                      Affecter
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    {employee.accessGroups.slice(0, 2).map((group) => (
                      <Badge
                        key={group}
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {group}
                      </Badge>
                    ))}
                    {employee.accessGroups.length > 2 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{employee.accessGroups.length - 2}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        openGroupDialog(employee)
                      }}
                    >
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      Affecter
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <FileText className="mr-2 h-4 w-4" />
                        Voir les logs
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => e.stopPropagation()}
                        className="text-destructive focus:text-destructive"
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Suspendre
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
              <label key={group.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3">
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
                <label key={shift.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3">
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
