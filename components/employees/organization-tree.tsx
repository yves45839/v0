"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DepartmentApiItem, OrganizationApiItem } from "@/lib/api/employees"
import { Building2, ChevronRight, Plus, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { employeesDict } from "@/lib/i18n/pages/employees-page"

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
  onCreateDepartment?: (organizationId: number, parentId: number | null) => void
}

export function OrganizationTree({
  organizations,
  departments,
  selectedScope,
  onSelectScope,
  employeeCountByOrganization,
  employeeCountByDepartment,
  onEmployeeDrop,
  onCreateDepartment,
}: OrganizationTreeProps) {
  const { locale } = useI18n()
  const tr = employeesDict[locale]
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
      <div key={department.id} className="space-y-1.5">
        <div
          className={cn(
            "group/dept relative flex items-center gap-1 transition-colors",
            isDragTarget && "outline outline-2 outline-emerald-400/60"
          )}
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
          onDragLeave={(event) => {
            if (!onEmployeeDrop) return
            const container = event.currentTarget
            const relatedTarget = event.relatedTarget as Node | null
            if (relatedTarget && container.contains(relatedTarget)) return
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
              "h-auto min-w-0 flex-1 justify-between rounded-none border border-transparent bg-[#0b0d13]/40 px-2.5 py-2 text-left text-[#7a8599] hover:border-[#f97316]/35 hover:bg-[#1a1f2e] hover:text-[#e2e8f0]",
              isSelected && "border-[#f97316]/55 bg-[#2a1e06] text-[#f97316]",
              isDragTarget && "border-[#22c55e]/55 bg-[#0d2a1a] text-[#22c55e]"
            )}
            style={{ paddingLeft: `${depth * 12 + 10}px` }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#4a5568]" />
              <span className="truncate text-xs font-medium">{department.name}</span>
            </span>
            <Badge variant="secondary" className="min-w-7 justify-center rounded-none border border-[#1c2133] bg-[#111318] px-1.5 font-mono text-[9px] text-[#7a8599]">
              {employeeCountByDepartment.get(department.id) ?? 0}
            </Badge>
          </Button>

          {onCreateDepartment && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover/dept:opacity-100"
              title={tr.tree.createSubDepartment}
              onClick={(event) => {
                event.stopPropagation()
                onCreateDepartment(department.organization, department.id)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {children.length > 0 && (
          <div className="space-y-1.5">
            {children.map((child) => renderDepartment(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="overflow-hidden rounded-none border-[#1c2133] bg-[#111318] p-0 shadow-none">
      <div className="border-b border-[#1c2133] px-3 py-2.5">
        <p className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-[#e2e8f0]">
          {tr.tree.title}
        </p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#4a5568]">
          {tr.tree.hint}
        </p>
      </div>
      <div className="space-y-2.5 p-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelectScope({ type: "all", label: "Tous les employes" })}
          className={cn(
            "h-auto w-full justify-between rounded-none border border-[#1c2133] bg-[#0b0d13] px-3 py-2.5 text-left text-[#e2e8f0] hover:border-[#f97316]/45 hover:bg-[#1a1f2e]",
            selectedScope.type === "all" && "border-[#f97316]/55 bg-[#2a1e06] text-[#f97316]"
          )}
        >
          <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {tr.tree.allEmployees}
          </span>
          <Badge variant="secondary" className="rounded-none border border-[#1c2133] bg-[#111318] px-1.5 font-mono text-[9px] text-[#7a8599]">{tr.tree.global}</Badge>
        </Button>

        <div className="space-y-2.5">
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
                className="border border-[#1c2133] bg-[#0b0d13]/45 p-2"
              >
                <div className="group/org flex items-center gap-1">
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
                      "h-auto min-w-0 flex-1 justify-between rounded-none px-2.5 py-2.5 text-left text-[#e2e8f0] hover:bg-[#1a1f2e]",
                      isSelected && "bg-[#0d1e2e] text-[#60a5fa]"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-[#60a5fa]" />
                      <span className="truncate text-xs font-semibold">{organization.name}</span>
                    </span>
                    <Badge className="rounded-none bg-[#f97316] px-1.5 font-mono text-[9px] text-[#0b0d13]">
                      {employeeCountByOrganization.get(organization.id) ?? 0}
                    </Badge>
                  </Button>

                  {onCreateDepartment && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover/org:opacity-100"
                      title={tr.tree.createDepartment}
                      onClick={() => onCreateDepartment(organization.id, null)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {rootDepartments.length > 0 && (
                  <div className="mt-1.5 space-y-1.5">
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
