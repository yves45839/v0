"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type EmployeeFiltersProps = {
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  accessGroupFilter: string
  setAccessGroupFilter: (value: string) => void
  departmentOptions: string[]
  accessGroupOptions: string[]
}

export function EmployeeFilters({
  departmentFilter,
  setDepartmentFilter,
  accessGroupFilter,
  setAccessGroupFilter,
  departmentOptions,
  accessGroupOptions,
}: EmployeeFiltersProps) {
  const departments = [
    { value: "all", label: "Tous les departements" },
    ...departmentOptions.map((department) => ({ value: department, label: department })),
  ]

  const accessGroups = [
    { value: "all", label: "Tous les groupes" },
    ...accessGroupOptions.map((group) => ({ value: group, label: group })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Departement" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept) => (
            <SelectItem key={dept.value} value={dept.value}>
              {dept.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={accessGroupFilter} onValueChange={setAccessGroupFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Groupe d'acces" />
        </SelectTrigger>
        <SelectContent>
          {accessGroups.map((group) => (
            <SelectItem key={group.value} value={group.value}>
              {group.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
