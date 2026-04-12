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
            "wow-transition h-auto w-full justify-between rounded-2xl border border-transparent bg-background/20 px-3 py-2.5 text-left hover:border-primary/25 hover:bg-secondary/45",
            isSelected && "border-primary/30 bg-primary/12 text-foreground shadow-[0_10px_24px_rgba(78,155,255,0.12)]",
            isDragTarget && "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
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
            <span className="truncate text-sm font-medium">{department.name}</span>
          </span>
          <Badge variant="secondary" className="min-w-8 justify-center">
            {employeeCountByDepartment.get(department.id) ?? 0}
          </Badge>
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
    <Card className="overflow-hidden border-border/70 bg-card/90 p-0">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Structure vivante</p>
            <p className="mt-2 text-base font-semibold text-foreground">Arborescence organisationnelle</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Cliquez pour filtrer, ou deposez un employe sur un departement pour le deplacer.
            </p>
          </div>
          <div className="rounded-full border border-primary/20 bg-primary/10 p-2 text-primary">
            <FolderTree className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelectScope({ type: "all", label: "Tous les employes" })}
          className={cn(
            "wow-transition h-auto w-full justify-between rounded-[1.15rem] border border-dashed border-border/70 bg-background/35 px-4 py-3 text-left hover:border-primary/25 hover:bg-secondary/35",
            selectedScope.type === "all" && "border-primary/30 bg-primary/10 text-foreground"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Tous les employes
          </span>
          <Badge variant="secondary">Global</Badge>
        </Button>

        <div className="space-y-3">
          {organizations.map((organization) => {
            const isSelected =
              selectedScope.type === "organization" &&
              selectedScope.organizationId === organization.id
            const rootDepartments = (childrenByDepartment.get(null) ?? []).filter(
              (department) => department.organization === organization.id
            )

            return (
              <div
                key={organization.id}
                className="rounded-[1.4rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
              >
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
                    "wow-transition h-auto w-full justify-between rounded-[1.05rem] px-3 py-3.5 text-left hover:bg-secondary/35",
                    isSelected && "bg-primary/12 text-foreground shadow-[0_12px_24px_rgba(78,155,255,0.12)]"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-semibold">{organization.name}</span>
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
      </div>
    </Card>
  )
}
