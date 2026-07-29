"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  UserCheck,
  ShieldCheck,
  Loader2,
  Clock,
  Monitor,
  ScanFace,
  CreditCard,
  Fingerprint,
  CalendarCheck,
  Users,
  GripVertical,
  Eye,
  Trash2,
} from "lucide-react"
import type { Employee } from "@/app/employees/page"
import { useRouter } from "next/navigation"
import {
  EmployeeStatusChip,
  deriveOperationalStatus,
} from "@/components/employees/employee-status-chip"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n/context"
import { employeesDict } from "@/lib/i18n/pages/employees-page"

type EmployeeTableProps = {
  employees: Employee[]
  onEmployeeClick: (employee: Employee) => void
  onPreviewEmployee?: (employee: Employee) => void
  onEditEmployee: (employee: Employee) => void
  accessGroupOptions: Array<{ id: number; name: string }>
  workShiftOptions: Array<{ id: number; name: string }>
  onAssignAccessGroups: (employee: Employee, accessGroupIds: number[]) => Promise<void>
  onAssignWorkShift: (employee: Employee, workShiftIds: number[]) => Promise<void>
  onDragEmployee?: (employee: Employee | null) => void
  togglingEmployeeIds: Set<string>
  onToggleSuspension: (employee: Employee) => void | Promise<void>
  onDeleteEmployee: (employee: Employee) => Promise<void>
}

const departmentColors: Record<string, string> = {
  Engineering: "border-blue-400/20 bg-blue-500/12 text-blue-700 dark:text-blue-300",
  Marketing: "border-fuchsia-400/20 bg-fuchsia-500/12 text-fuchsia-300",
  Finance: "border-emerald-400/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  HR: "border-pink-400/20 bg-pink-500/12 text-pink-300",
  Sales: "border-orange-400/20 bg-orange-500/12 text-orange-300",
  Design: "border-cyan-400/20 bg-cyan-500/12 text-cyan-300",
  IT: "border-indigo-400/20 bg-indigo-500/12 text-indigo-300",
}

export function EmployeeTable({
  employees,
  onEmployeeClick,
  onPreviewEmployee,
  onEditEmployee,
  accessGroupOptions,
  workShiftOptions,
  onAssignAccessGroups,
  onAssignWorkShift,
  onDragEmployee,
  togglingEmployeeIds,
  onToggleSuspension,
  onDeleteEmployee,
}: EmployeeTableProps) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const tr = employeesDict[locale]
  // "Non assigne" est la valeur sentinelle stockée dans les données — traduite à l'affichage.
  const displayAssigned = (value: string) => (value === "Non assigne" ? tr.notAssigned : value)
  const [groupDialogEmployee, setGroupDialogEmployee] = useState<Employee | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [isSavingGroups, setIsSavingGroups] = useState(false)
  const [workShiftDialogEmployee, setWorkShiftDialogEmployee] = useState<Employee | null>(null)
  const [selectedWorkShiftIds, setSelectedWorkShiftIds] = useState<number[]>([])
  const [isSavingWorkShift, setIsSavingWorkShift] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteCandidate, setDeleteCandidate] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const selectedGroupSet = useMemo(() => new Set(selectedGroupIds), [selectedGroupIds])
  const selectedWorkShiftSet = useMemo(() => new Set(selectedWorkShiftIds), [selectedWorkShiftIds])
  const totalEmployees = employees.length
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalEmployees)
  const paginatedEmployees = useMemo(
    () => employees.slice(startIndex, startIndex + pageSize),
    [employees, pageSize, startIndex]
  )
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const iconStateClass = (isOk: boolean) =>
    isOk ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"

  const isEmployeeValidityActive = (employee: Employee): boolean => {
    const todayIso = new Date().toISOString().split("T")[0]
    if (!employee.validityStart || !employee.validityEnd) return false
    return employee.validityStart <= todayIso && todayIso <= employee.validityEnd
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

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return
    setIsDeleting(true)
    try {
      await onDeleteEmployee(deleteCandidate)
      setDeleteCandidate(null)
    } catch {
      // L'erreur est déjà signalée via toast par le parent.
    } finally {
      setIsDeleting(false)
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
      <Card className="overflow-hidden rounded-none border-[#1c2133] bg-[#111318] p-0 shadow-none">
        <div className="dense-scrollbar overflow-x-auto">
        <Table className="min-w-[760px] table-fixed xl:min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-[#0b0d13]">
            <TableRow className="border-[#1c2133] hover:bg-transparent">
              <TableHead className="h-9 w-68 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#4a5568] 2xl:w-96">{tr.table.headerProfile}</TableHead>
              <TableHead className="h-9 w-28 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#4a5568]">{tr.table.headerEmployeeNo}</TableHead>
              <TableHead className="h-9 w-28 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#4a5568]">{tr.table.headerDepartment}</TableHead>
              <TableHead className="h-9 w-30 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#4a5568]">{tr.table.headerShift}</TableHead>
              <TableHead className="h-9 w-28 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#4a5568]">{tr.table.headerStatus}</TableHead>
              <TableHead className="h-9 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#4a5568]">{tr.table.headerAccessGroups}</TableHead>
              <TableHead className="h-9 w-11 px-1"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalEmployees === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="px-4 py-10">
                  <EmptyState
                    icon={Users}
                    title={tr.table.emptyTitle}
                    description={tr.table.emptyDesc}
                    variant="bare"
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map((employee, index) => (
                <TableRow
                  key={employee.id}
                  draggable
                  className="group cursor-grab border-[#1c2133] transition-colors hover:bg-[#1a1f2e]/70 active:cursor-grabbing"
                  role="button"
                  tabIndex={0}
                  aria-label={tr.table.openProfile(employee.name)}
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
                  <TableCell className="max-w-0 px-2 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#4a5568] opacity-0 transition-opacity group-hover:opacity-100" />
                      <Avatar className="h-7 w-7 rounded-none border border-[#1c2133] shadow-none">
                        <AvatarFallback className="rounded-none bg-[#1e2a3a] text-[10px] font-semibold text-[#60a5fa]">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#e2e8f0]">{employee.name}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            <span title={tr.table.inReader}>
                              <Monitor className={cn("h-3 w-3", iconStateClass(employee.deviceIds.length > 0))} />
                            </span>
                            <span title={tr.table.facePresent}>
                              <ScanFace className={cn("h-3 w-3", iconStateClass(employee.biometricStatus.hasFacePhoto))} />
                            </span>
                            <span title={tr.table.hasCard}>
                              <CreditCard
                                className={cn(
                                  "h-3 w-3",
                                  iconStateClass(employee.cardNumber.trim() !== "" && employee.cardNumber !== "Non attribue")
                                )}
                              />
                            </span>
                            <span title={tr.table.hasFingerprint}>
                              <Fingerprint
                                className={cn(
                                  "h-3 w-3",
                                  iconStateClass(employee.biometricStatus.hasFingerprint || employee.fingerprints.length > 0)
                                )}
                              />
                            </span>
                            <span title={tr.table.validityPeriod}>
                              <CalendarCheck className={cn("h-3 w-3", iconStateClass(isEmployeeValidityActive(employee)))} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <span className="inline-block max-w-24 truncate border border-[#1c2133] bg-[#0b0d13] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[#7a8599]">
                      {employee.employeeId}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "max-w-24 truncate rounded-none px-1.5 py-0 text-[10px] font-medium",
                        departmentColors[employee.department] || "border-[#1c2133] bg-[#1a1f2e] text-[#7a8599]"
                      )}
                    >
                      {displayAssigned(employee.department)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex min-w-0 items-center gap-1">
                        <Badge variant="outline" className="max-w-24 truncate rounded-none border-[#1c2133] bg-[#0b0d13] px-1.5 py-0 font-mono text-[10px] font-medium text-[#7a8599]">
                          {displayAssigned(employee.workShift)}
                        </Badge>
                        {employee.workShiftIds.length > 1 && (
                          <Badge variant="secondary" className="rounded-none bg-[#2a1e06] px-1.5 py-0 font-mono text-[10px] font-medium text-[#f59e0b]">
                            +{employee.workShiftIds.length - 1}
                          </Badge>
                        )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 shrink-0 rounded-none px-1.5 font-mono text-[10px] text-[#f97316] opacity-0 transition-opacity hover:bg-[#2a1e06] group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          openWorkShiftDialog(employee)
                        }}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {tr.table.assignAction}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <EmployeeStatusChip
                      status={deriveOperationalStatus(employee, {
                        suspended: employee.isActive === false,
                      })}
                      className="px-2 py-0 text-[10px]"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {employee.accessGroups.slice(0, 2).map((group) => (
                        <Badge
                          key={group}
                          variant="outline"
                          className="max-w-28 truncate rounded-none border-[#1c2133] bg-[#0b0d13] px-1.5 py-0 font-mono text-[10px] font-medium text-[#7a8599]"
                        >
                          {group}
                        </Badge>
                      ))}
                      {employee.accessGroups.length > 2 && (
                        <Badge variant="outline" className="rounded-none border-[#1c2133] bg-[#0b0d13] px-1.5 py-0 font-mono text-[10px] font-medium text-[#7a8599]">
                          +{employee.accessGroups.length - 2}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 rounded-none px-1.5 font-mono text-[10px] text-[#60a5fa] opacity-0 transition-opacity hover:bg-[#0d1e2e] group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          openGroupDialog(employee)
                        }}
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {tr.table.assignAction}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-none p-0 text-[#7a8599] opacity-0 transition-opacity hover:bg-[#1a1f2e] hover:text-[#f97316] group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                          <span className="sr-only">{tr.table.actions}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEmployeeClick(employee)
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {tr.table.viewProfile}
                        </DropdownMenuItem>
                        {onPreviewEmployee && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onPreviewEmployee(employee)
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {tr.table.quickPreview}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditEmployee(employee)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            openWorkShiftDialog(employee)
                          }}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {tr.table.workShiftItem}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            openGroupDialog(employee)
                          }}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {tr.table.accessGroupsItem}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/access-logs?person=${encodeURIComponent(employee.employeeId)}`)
                        }}>
                          <FileText className="mr-2 h-4 w-4" />
                          {tr.table.viewLogs}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            void onToggleSuspension(employee)
                          }}
                          disabled={togglingEmployeeIds.has(employee.id)}
                        >
                          {togglingEmployeeIds.has(employee.id) ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : employee.isActive === false ? (
                            <UserCheck className="mr-2 h-4 w-4" />
                          ) : (
                            <UserX className="mr-2 h-4 w-4" />
                          )}
                          {employee.isActive === false ? tr.table.reactivate : tr.table.deactivate}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteCandidate(employee)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t.common.delete}
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
        {totalEmployees > 0 && (
          <div className="flex flex-col gap-2 border-t border-[#1c2133] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]">
              {tr.table.showing(startIndex + 1, endIndex, totalEmployees)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4a5568]" htmlFor="employee-page-size">
                {tr.table.rows}
              </label>
              <select
                id="employee-page-size"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-7 rounded-none border border-[#1c2133] bg-[#0b0d13] px-2 font-mono text-[10px] text-[#e2e8f0]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-none border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599] hover:border-[#f97316]/60 hover:bg-[#1a1f2e] hover:text-[#f97316]"
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                disabled={!canGoPrev}
              >
                {tr.table.prev}
              </Button>
              <span className="min-w-20 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[#4a5568]">
                {tr.table.pageOf(currentPage, totalPages)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-none border-[#1c2133] bg-[#1a1f2e] px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a8599] hover:border-[#f97316]/60 hover:bg-[#1a1f2e] hover:text-[#f97316]"
                onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                disabled={!canGoNext}
              >
                {tr.table.next}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!groupDialogEmployee} onOpenChange={(open) => !open && closeGroupDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tr.table.groupDialogTitle(groupDialogEmployee?.name ?? "")}
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
                {tr.table.noGroupsForTenant}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeGroupDialog} disabled={isSavingGroups}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => void handleSaveGroups()} disabled={isSavingGroups || !groupDialogEmployee}>
              {isSavingGroups && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteCandidate(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr.table.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? tr.table.deleteConfirmDesc(deleteCandidate.name, deleteCandidate.employeeId)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!workShiftDialogEmployee} onOpenChange={(open) => !open && closeWorkShiftDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tr.table.shiftDialogTitle(workShiftDialogEmployee?.name ?? "")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {tr.table.shiftDialogDesc}
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
              <p className="text-sm text-muted-foreground">{tr.table.noShiftsForTenant}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeWorkShiftDialog} disabled={isSavingWorkShift}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => void handleSaveWorkShift()}
              disabled={isSavingWorkShift || selectedWorkShiftIds.length === 0 || !workShiftDialogEmployee}
            >
              {isSavingWorkShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
