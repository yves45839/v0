"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  Cloud,
  CloudOff,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  FileText,
  UserX,
} from "lucide-react"
import type { Employee } from "@/app/employees/page"

type EmployeeTableProps = {
  employees: Employee[]
  onEmployeeClick: (employee: Employee) => void
  onEditEmployee: (employee: Employee) => void
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

function SyncStatusIcon({ status }: { status: Employee["syncStatus"] }) {
  switch (status) {
    case "synced":
      return <Cloud className="h-4 w-4 text-primary" />
    case "pending":
      return <Cloud className="h-4 w-4 text-warning animate-pulse" />
    case "error":
      return <CloudOff className="h-4 w-4 text-destructive" />
    default:
      return null
  }
}

export function EmployeeTable({ employees, onEmployeeClick, onEditEmployee }: EmployeeTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[280px]">Profil</TableHead>
            <TableHead className="w-[120px]">Matricule</TableHead>
            <TableHead className="w-[140px]">Departement</TableHead>
            <TableHead>Groupes d&apos;acces</TableHead>
            <TableHead className="w-[100px] text-center">Synchro</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow
              key={employee.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => onEmployeeClick(employee)}
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
                <div className="flex flex-wrap gap-1">
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
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-2">
                  <SyncStatusIcon status={employee.syncStatus} />
                  {(!employee.biometricStatus.hasFacePhoto ||
                    !employee.biometricStatus.hasFingerprint) && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
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
  )
}
