"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  CreditCard,
  Upload,
  X,
  Camera,
  Fingerprint,
  Loader2,
} from "lucide-react"
import type { Employee } from "@/app/employees/page"
import { createEmployee, fetchEmployeeApiToken, isEmployeeApiEnabled } from "@/lib/api/employees"

type AddEmployeeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddEmployee: (employee: Employee) => void
  employeeToEdit?: Employee | null
}

const departments = [
  "Engineering",
  "Marketing",
  "Finance",
  "HR",
  "Sales",
  "Design",
  "IT",
  "Operations",
]

const accessGroups = [
  "Building A",
  "Building B",
  "Building C",
  "Server Room",
  "Data Center",
  "Parking",
  "All Floors",
  "Conference Rooms",
  "HR Office",
  "Finance Office",
  "Marketing Floor",
  "Sales Floor",
  "Creative Lab",
]

export function AddEmployeeModal({
  open,
  onOpenChange,
  onAddEmployee,
  employeeToEdit,
}: AddEmployeeModalProps) {
  const isEditing = !!employeeToEdit
  const [activeTab, setActiveTab] = useState("info")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    cardNumber: "",
    selectedAccessGroups: [] as string[],
    photoFile: null as File | null,
    photoPreview: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState("")

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleAccessGroupToggle = (group: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedAccessGroups: prev.selectedAccessGroups.includes(group)
        ? prev.selectedAccessGroups.filter((g) => g !== group)
        : [...prev.selectedAccessGroups, group],
    }))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: URL.createObjectURL(file),
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis"
    }
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide"
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Le telephone est requis"
    }
    if (!formData.department) {
      newErrors.department = "Le departement est requis"
    }
    if (!formData.position.trim()) {
      newErrors.position = "Le poste est requis"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      setActiveTab("info")
      return
    }

    setIsSubmitting(true)
    setApiError("")

    if (isEmployeeApiEnabled() && !isEditing) {
      try {
        const tokens = await fetchEmployeeApiToken()
        await createEmployee(
          {
            tenant: 1,
            employee_no: `PERS-${Date.now()}`,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            position: formData.position,
            cards: formData.cardNumber
              ? [{ card_no: formData.cardNumber, card_type: "normalCard" }]
              : undefined,
            access_group: formData.selectedAccessGroups[0],
          },
          tokens.access
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur API employee"
        setApiError(message)
        setIsSubmitting(false)
        return
      }
    }

    const payload: Employee = {
      id: employeeToEdit?.id ?? `new-${Date.now()}`,
      employeeId: employeeToEdit?.employeeId ?? `EMP-${String(Math.floor(Math.random() * 900) + 100)}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      position: formData.position,
      photoUrl: formData.photoPreview,
      cardNumber: formData.cardNumber || "Non attribue",
      accessGroups: formData.selectedAccessGroups,
      syncStatus: employeeToEdit?.syncStatus ?? "pending",
      biometricStatus: {
        hasFacePhoto: !!formData.photoPreview,
        hasFingerprint: employeeToEdit?.biometricStatus.hasFingerprint ?? false,
      },
      hireDate: employeeToEdit?.hireDate ?? new Date().toISOString().split("T")[0],
      lastAccess: employeeToEdit?.lastAccess ?? "-",
      accessLogs: employeeToEdit?.accessLogs ?? [],
    }

    onAddEmployee(payload)
    setIsSubmitting(false)
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      cardNumber: "",
      selectedAccessGroups: [],
      photoFile: null,
      photoPreview: "",
    })
    setErrors({})
    setApiError("")
    setActiveTab("info")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  useEffect(() => {
    if (!open) return

    if (employeeToEdit) {
      setFormData({
        name: employeeToEdit.name,
        email: employeeToEdit.email,
        phone: employeeToEdit.phone,
        department: employeeToEdit.department,
        position: employeeToEdit.position,
        cardNumber: employeeToEdit.cardNumber,
        selectedAccessGroups: employeeToEdit.accessGroups,
        photoFile: null,
        photoPreview: employeeToEdit.photoUrl,
      })
      setErrors({})
      setActiveTab("info")
      return
    }

    resetForm()
  }, [employeeToEdit, open])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditing ? "Modifier l'Employe" : "Ajouter un Employe"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Mettez a jour les informations de l'employe selectionne."
              : "Remplissez les informations pour creer un nouveau profil employe."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="info" className="relative">
              Informations
              {(errors.name || errors.email || errors.phone || errors.department || errors.position) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="access">Acces</TabsTrigger>
            <TabsTrigger value="biometric">Biometrie</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Info Tab */}
            <TabsContent value="info" className="mt-0 space-y-6">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-dashed border-border">
                    {formData.photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.photoPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-secondary text-2xl font-semibold text-foreground">
                        {getInitials(formData.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label
                    htmlFor="photo-upload"
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nom Complet
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Jean Dupont"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ex: jean.dupont@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Telephone
                </Label>
                <Input
                  id="phone"
                  placeholder="Ex: +33 6 12 34 56 78"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Departement
                  </Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => handleInputChange("department", value)}
                  >
                    <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <p className="text-xs text-destructive">{errors.department}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Poste
                  </Label>
                  <Input
                    id="position"
                    placeholder="Ex: Developpeur"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    className={errors.position ? "border-destructive" : ""}
                  />
                  {errors.position && (
                    <p className="text-xs text-destructive">{errors.position}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Access Tab */}
            <TabsContent value="access" className="mt-0 space-y-6">
              {/* Card Number */}
              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Numero de Carte
                </Label>
                <Input
                  id="cardNumber"
                  placeholder="Ex: 4A:3B:2C:1D (optionnel)"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour attribuer une carte plus tard
                </p>
              </div>

              {/* Access Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Groupes d&apos;Acces
                  </Label>
                  {formData.selectedAccessGroups.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {formData.selectedAccessGroups.length} selectionne(s)
                    </Badge>
                  )}
                </div>

                {/* Selected Groups */}
                {formData.selectedAccessGroups.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
                    {formData.selectedAccessGroups.map((group) => (
                      <Badge
                        key={group}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {group}
                        <button
                          type="button"
                          onClick={() => handleAccessGroupToggle(group)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Available Groups */}
                <div className="grid grid-cols-2 gap-2">
                  {accessGroups.map((group) => {
                    const isSelected = formData.selectedAccessGroups.includes(group)
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => handleAccessGroupToggle(group)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{group}</span>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Biometric Tab */}
            <TabsContent value="biometric" className="mt-0 space-y-6">
              {/* Face Photo */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  Photo Faciale pour Reconnaissance
                </Label>

                {formData.photoPreview ? (
                  <div className="flex items-center gap-4 rounded-lg border border-primary bg-primary/5 p-4">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.photoPreview}
                        alt="Face preview"
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Photo enregistree
                      </p>
                      <p className="text-xs text-muted-foreground">
                        La photo sera synchronisee avec HikCentral
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          photoFile: null,
                          photoPreview: "",
                        }))
                      }
                    >
                      Supprimer
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="face-upload"
                    className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-8 transition-colors hover:border-muted-foreground"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Cliquez pour uploader une photo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG jusqu&apos;a 5MB
                      </p>
                    </div>
                    <input
                      id="face-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Fingerprint */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  Empreinte Digitale
                </Label>

                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                    <Fingerprint className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Enregistrement sur appareil requis
                    </p>
                    <p className="text-xs text-muted-foreground">
                      L&apos;empreinte doit etre enregistree directement sur un terminal HikVision
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-warning/10 text-warning">
                    Non disponible a distance
                  </Badge>
                </div>
              </div>

              {/* Info Note */}
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Note:</strong> Les donnees biometriques seront 
                  synchronisees avec HikCentral lors de l&apos;enregistrement. L&apos;employe devra 
                  completer l&apos;enregistrement de son empreinte digitale sur site.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {apiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError}
          </p>
        )}

        <DialogFooter className="gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creation en cours...
              </>
            ) : (
              isEditing ? "Enregistrer les modifications" : "Creer l'Employe"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
