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
  syncFilter: string
  setSyncFilter: (value: string) => void
  accessGroupFilter: string
  setAccessGroupFilter: (value: string) => void
}

const departments = [
  { value: "all", label: "Tous les departements" },
  { value: "Engineering", label: "Engineering" },
  { value: "Marketing", label: "Marketing" },
  { value: "Finance", label: "Finance" },
  { value: "HR", label: "Ressources Humaines" },
  { value: "Sales", label: "Ventes" },
  { value: "Design", label: "Design" },
  { value: "IT", label: "IT" },
]

const syncStatuses = [
  { value: "all", label: "Tous les statuts" },
  { value: "synced", label: "Synchronise" },
  { value: "pending", label: "En attente" },
  { value: "error", label: "Erreur" },
]

const accessGroups = [
  { value: "all", label: "Tous les groupes" },
  { value: "Building A", label: "Batiment A" },
  { value: "Building C", label: "Batiment C" },
  { value: "Server Room", label: "Salle Serveur" },
  { value: "Data Center", label: "Data Center" },
  { value: "Parking", label: "Parking" },
  { value: "All Buildings", label: "Tous les Batiments" },
]

export function EmployeeFilters({
  departmentFilter,
  setDepartmentFilter,
  syncFilter,
  setSyncFilter,
  accessGroupFilter,
  setAccessGroupFilter,
}: EmployeeFiltersProps) {
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

      <Select value={syncFilter} onValueChange={setSyncFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Statut de synchro" />
        </SelectTrigger>
        <SelectContent>
          {syncStatuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
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
