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
  const departments = [
    { value: "all", label: "Tous les departements" },
    ...departmentOptions.map((department) => ({ value: department, label: department })),
  ]

  const accessGroups = [
    { value: "all", label: "Tous les groupes" },
    ...accessGroupOptions.map((group) => ({ value: group, label: group })),
  ]

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Departement</p>
          <p className="text-xs text-muted-foreground/80">Isoler une branche ou une equipe.</p>
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full rounded-xl bg-background/50">
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
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Groupes d'acces</p>
          <p className="text-xs text-muted-foreground/80">Filtrer par habilitation.</p>
        </div>
        <Select value={accessGroupFilter} onValueChange={setAccessGroupFilter}>
          <SelectTrigger className="w-full rounded-xl bg-background/50">
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

      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Statut</p>
          <p className="text-xs text-muted-foreground/80">Suivi de synchronisation et suspension.</p>
        </div>
        <Select value={syncStatusFilter} onValueChange={setSyncStatusFilter}>
          <SelectTrigger className="w-full rounded-xl bg-background/50">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="synced">Synchronises</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="suspended">Suspendus</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
