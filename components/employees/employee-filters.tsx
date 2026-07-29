"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n/context"
import { employeesDict } from "@/lib/i18n/pages/employees-page"

type EmployeeFiltersProps = {
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  accessGroupFilter: string
  setAccessGroupFilter: (value: string) => void
  syncStatusFilter: string
  setSyncStatusFilter: (value: string) => void
  departmentOptions: string[]
  accessGroupOptions: string[]
}

export function EmployeeFilters({
  departmentFilter,
  setDepartmentFilter,
  accessGroupFilter,
  setAccessGroupFilter,
  syncStatusFilter,
  setSyncStatusFilter,
  departmentOptions,
  accessGroupOptions,
}: EmployeeFiltersProps) {
  const { locale } = useI18n()
  const tr = employeesDict[locale]

  const departments = [
    { value: "all", label: tr.filters.allDepartments },
    ...departmentOptions.map((department) => ({ value: department, label: department })),
  ]

  const accessGroups = [
    { value: "all", label: tr.filters.allGroups },
    ...accessGroupOptions.map((group) => ({ value: group, label: group })),
  ]

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.filters.departmentTitle}</p>
          <p className="text-xs text-muted-foreground/80">{tr.filters.departmentDesc}</p>
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full rounded-xl bg-background/50">
            <SelectValue placeholder={tr.filters.departmentPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.value} value={dept.value}>
                {dept.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.filters.accessGroupsTitle}</p>
          <p className="text-xs text-muted-foreground/80">{tr.filters.accessGroupsDesc}</p>
        </div>
        <Select value={accessGroupFilter} onValueChange={setAccessGroupFilter}>
          <SelectTrigger className="w-full rounded-xl bg-background/50">
            <SelectValue placeholder={tr.filters.accessGroupPlaceholder} />
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

      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.filters.statusTitle}</p>
          <p className="text-xs text-muted-foreground/80">{tr.filters.statusDesc}</p>
        </div>
        <Select value={syncStatusFilter} onValueChange={setSyncStatusFilter}>
          <SelectTrigger className="w-full rounded-xl bg-background/50">
            <SelectValue placeholder={tr.filters.statusPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tr.filters.allStatuses}</SelectItem>
            <SelectItem value="synced">{tr.filters.synced}</SelectItem>
            <SelectItem value="pending">{tr.filters.pending}</SelectItem>
            <SelectItem value="suspended">{tr.filters.suspended}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
