"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DepartmentApiItem, OrganizationApiItem } from "@/lib/api/employees"
import { Building2, ChevronRight, FolderTree, Users } from "lucide-react"

export type EmployeeScope =
  | { type: "all"; label: string }
  | { type: "organization"; organizationId: number; label: string }
  | { type: "department"; departmentId: number; label: string }

type OrganizationTreeProps = {
  organizations: OrganizationApiItem[]
  departments: DepartmentApiItem[]
  selectedScope: EmployeeScope
  onSelectScope: (scope: EmployeeScope) => void
  employeeCountByOrganization: Map<number, number>
  employeeCountByDepartment: Map<number, number>
  onEmployeeDrop?: (department: DepartmentApiItem) => void
}

export function OrganizationTree({
  organizations,
  departments,
  selectedScope,
  onSelectScope,
  employeeCountByOrganization,
  employeeCountByDepartment,
  onEmployeeDrop,
}: OrganizationTreeProps) {
  const [dragOverDepartmentId, setDragOverDepartmentId] = useState<number | null>(null)
  const departmentsByOrganization = new Map<number, DepartmentApiItem[]>()
  const childrenByDepartment = new Map<number | null, DepartmentApiItem[]>()

  for (const department of departments) {
    const orgDepartments = departmentsByOrganization.get(department.organization) ?? []
    orgDepartments.push(department)
    departmentsByOrganization.set(department.organization, orgDepartments)

    const siblings = childrenByDepartment.get(department.parent) ?? []
    siblings.push(department)
    childrenByDepartment.set(department.parent, siblings)
  }

  for (const items of departmentsByOrganization.values()) {
    items.sort((left, right) => left.name.localeCompare(right.name))
  }
  for (const items of childrenByDepartment.values()) {
    items.sort((left, right) => left.name.localeCompare(right.name))
  }

  const renderDepartment = (department: DepartmentApiItem, depth = 0) => {
    const children = childrenByDepartment.get(department.id) ?? []
    const isSelected =
      selectedScope.type === "department" && selectedScope.departmentId === department.id
    const isDragTarget = dragOverDepartmentId === department.id

    return (
      <div key={department.id} className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            onSelectScope({
              type: "department",
              departmentId: department.id,
              label: department.name,
            })
          }
          className={cn(
            "h-auto w-full justify-between rounded-xl px-3 py-2 text-left",
            isSelected && "bg-accent text-accent-foreground",
            isDragTarget && "border border-emerald-400 bg-emerald-500/10 text-emerald-100"
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onDragOver={(event) => {
            if (!onEmployeeDrop) return
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
          }}
          onDragEnter={(event) => {
            if (!onEmployeeDrop) return
            event.preventDefault()
            setDragOverDepartmentId(department.id)
          }}
          onDragLeave={() => {
            if (dragOverDepartmentId === department.id) {
              setDragOverDepartmentId(null)
            }
          }}
          onDrop={(event) => {
            if (!onEmployeeDrop) return
            event.preventDefault()
            setDragOverDepartmentId(null)
            onEmployeeDrop(department)
          }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{department.name}</span>
          </span>
          <Badge variant="secondary">{employeeCountByDepartment.get(department.id) ?? 0}</Badge>
        </Button>

        {children.length > 0 && (
          <div className="space-y-2">
            {children.map((child) => renderDepartment(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="border-border/60 bg-card/80 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Structure</p>
          <p className="text-xs text-muted-foreground">
            Cliquez pour filtrer, ou deposez un employe sur un departement pour le deplacer.
          </p>
        </div>
        <FolderTree className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelectScope({ type: "all", label: "Tous les employes" })}
          className={cn(
            "h-auto w-full justify-between rounded-xl border border-dashed border-border px-3 py-2 text-left",
            selectedScope.type === "all" && "bg-accent text-accent-foreground"
          )}
        >
          <span className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Tous les employes
          </span>
        </Button>

        {organizations.map((organization) => {
          const isSelected =
            selectedScope.type === "organization" &&
            selectedScope.organizationId === organization.id
          const rootDepartments = (childrenByDepartment.get(null) ?? []).filter(
            (department) => department.organization === organization.id
          )

          return (
            <div key={organization.id} className="rounded-2xl border border-border/70 bg-background/70 p-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  onSelectScope({
                    type: "organization",
                    organizationId: organization.id,
                    label: organization.name,
                  })
                }
                className={cn(
                  "h-auto w-full justify-between rounded-xl px-3 py-3 text-left",
                  isSelected && "bg-accent text-accent-foreground"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate text-sm font-medium">{organization.name}</span>
                </span>
                <Badge>{employeeCountByOrganization.get(organization.id) ?? 0}</Badge>
              </Button>

              {rootDepartments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {rootDepartments.map((department) => renderDepartment(department))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
