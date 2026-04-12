"use client"

import { useEffect, useId, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from "lucide-react"

export type EmployeeImportRow = {
  name: string
  employeeId: string
  department: string
  email: string
  phone: string
  position: string
}

type ImportEmployeesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (rows: EmployeeImportRow[]) => void | Promise<void>
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      const nextChar = line[index + 1]
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells.map((cell) => cell.replace(/^"|"$/g, "").trim())
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header))
}

function parseEmployeeCsv(text: string): EmployeeImportRow[] {
  const sanitized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim()
  if (!sanitized) {
    throw new Error("Le fichier est vide.")
  }

  const lines = sanitized.split("\n").filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    throw new Error("Ajoutez au moins une ligne d'en-tete et une ligne de donnees.")
  }

  const firstLine = lines[0]
  const delimiter =
    (firstLine.match(/;/g) ?? []).length >= (firstLine.match(/,/g) ?? []).length ? ";" : ","
  const matrix = lines.map((line) => splitCsvLine(line, delimiter))
  const headers = matrix[0].map(normalizeHeader)

  const firstNameIndex = findHeaderIndex(headers, ["prenom", "first name", "firstname"])
  const lastNameIndex = findHeaderIndex(headers, ["nom", "last name", "lastname"])
  const fullNameIndex = findHeaderIndex(headers, [
    "nom complet",
    "employe",
    "employee",
    "employee name",
    "name",
  ])
  const employeeIdIndex = findHeaderIndex(headers, [
    "matricule",
    "employee id",
    "employeeid",
    "employee no",
    "person id",
    "personid",
    "id",
  ])
  const departmentIndex = findHeaderIndex(headers, ["departement", "department", "service"])
  const emailIndex = findHeaderIndex(headers, ["email", "e mail", "mail"])
  const phoneIndex = findHeaderIndex(headers, ["telephone", "phone", "tel", "mobile"])
  const positionIndex = findHeaderIndex(headers, ["poste", "position", "fonction", "role"])

  const hasRecognizedHeaders =
    firstNameIndex >= 0 ||
    lastNameIndex >= 0 ||
    fullNameIndex >= 0 ||
    employeeIdIndex >= 0 ||
    departmentIndex >= 0

  const dataRows = hasRecognizedHeaders ? matrix.slice(1) : matrix
  const parsedRows = dataRows
    .map((cells) => {
      const fullName = fullNameIndex >= 0 ? cells[fullNameIndex] ?? "" : ""
      const firstName = firstNameIndex >= 0 ? cells[firstNameIndex] ?? "" : cells[1] ?? ""
      const lastName = lastNameIndex >= 0 ? cells[lastNameIndex] ?? "" : cells[0] ?? ""
      const name =
        fullName.trim() || [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim()

      return {
        name,
        employeeId: (employeeIdIndex >= 0 ? cells[employeeIdIndex] : cells[2])?.trim() ?? "",
        department: (departmentIndex >= 0 ? cells[departmentIndex] : cells[3])?.trim() ?? "",
        email: (emailIndex >= 0 ? cells[emailIndex] : cells[4])?.trim() ?? "",
        phone: (phoneIndex >= 0 ? cells[phoneIndex] : cells[5])?.trim() ?? "",
        position: (positionIndex >= 0 ? cells[positionIndex] : cells[6])?.trim() ?? "",
      }
    })
    .filter((row) => row.name || row.employeeId)

  if (parsedRows.length === 0) {
    throw new Error("Aucune ligne exploitable n'a ete detectee dans ce CSV.")
  }

  return parsedRows
}

export function ImportEmployeesDialog({
  open,
  onOpenChange,
  onImport,
}: ImportEmployeesDialogProps) {
  const inputId = useId()
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<EmployeeImportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (open) return
    setFileName("")
    setRows([])
    setError(null)
    setIsImporting(false)
  }, [open])

  const previewRows = useMemo(() => rows.slice(0, 6), [rows])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setFileName(file.name)

    try {
      const content = await file.text()
      const parsedRows = parseEmployeeCsv(content)
      setRows(parsedRows)
    } catch (parseError) {
      setRows([])
      setError(parseError instanceof Error ? parseError.message : "Impossible de lire ce fichier.")
    } finally {
      event.target.value = ""
    }
  }

  const handleImport = async () => {
    if (rows.length === 0) return

    setIsImporting(true)
    try {
      await onImport(rows)
      onOpenChange(false)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des employes</DialogTitle>
          <DialogDescription>
            Import local front-end depuis un CSV. Compatible avec l&apos;export de cette page ou un fichier structure
            avec nom, prenom, matricule, departement, email et telephone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Selection du fichier</p>
                <p className="text-xs text-muted-foreground">CSV separe par `;` ou `,`.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {rows.length > 0 ? (
                  <Badge variant="secondary" className="gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {rows.length} ligne{rows.length > 1 ? "s" : ""}
                  </Badge>
                ) : null}
                <Button type="button" variant="outline" asChild>
                  <label htmlFor={inputId} className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Choisir un fichier
                  </label>
                </Button>
              </div>
            </div>

            <input
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void handleFileChange(event)}
            />

            {fileName ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Fichier charge: <span className="font-medium text-foreground">{fileName}</span>
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/70 bg-background/25">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Apercu avant import</p>
                <p className="text-xs text-muted-foreground">
                  Verification rapide des lignes detectees avant ajout dans la vue front.
                </p>
              </div>
              {rows.length > previewRows.length ? (
                <Badge variant="outline">+{rows.length - previewRows.length} autres</Badge>
              ) : null}
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Chargez un fichier CSV pour previsualiser les employes detectes.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {previewRows.map((row, index) => (
                  <div key={`${row.employeeId}-${index}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{row.name || "Sans nom"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.email || "Email non renseigne"}
                        {row.phone ? ` • ${row.phone}` : ""}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">
                        {row.department || "Departement libre"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground/80">
                        {row.position || "Poste non renseigne"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="w-fit justify-self-start sm:justify-self-end">
                      {row.employeeId || "ID a verifier"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Annuler
          </Button>
          <Button onClick={() => void handleImport()} disabled={rows.length === 0 || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isImporting ? "Import en cours..." : "Importer dans la vue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
