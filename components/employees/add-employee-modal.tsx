"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
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
  Radio,
} from "lucide-react"
import type { Employee } from "@/app/employees/page"
import {
  createEmployee,
  enrollFaceFromReader,
  enrollFingerprintFromReader,
  fetchOnlineReaders,
  fetchEmployeeApiToken,
  type GatewayReaderItem,
  isEmployeeApiEnabled,
  pushEmployeeToGateway,
  readCardFromReader,
  updateEmployee,
} from "@/lib/api/employees"

function normalizeFaceData(faceData: string): string {
  const trimmed = String(faceData || "").trim()
  if (!trimmed) return ""
  if (trimmed.toLowerCase().startsWith("data:")) {
    const separatorIndex = trimmed.indexOf(",")
    if (separatorIndex >= 0 && separatorIndex < trimmed.length - 1) {
      return trimmed.slice(separatorIndex + 1).trim()
    }
  }
  return trimmed
}

function toFacePreviewUrl(faceData: string): string {
  const trimmed = String(faceData || "").trim()
  if (!trimmed) return ""
  if (trimmed.toLowerCase().startsWith("data:")) return trimmed
  return `data:image/jpeg;base64,${trimmed}`
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."))
    reader.readAsDataURL(file)
  })
}

type AddEmployeeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddEmployee: (employee: Employee) => void
  employeeToEdit?: Employee | null
  employees: Employee[]
  departments: Array<{ id: number; tenant: number; name: string }>
  accessGroups: Array<{ id: number; name: string }>
  devices: Array<{ id: number; dev_index: string; name?: string; status?: string }>
  tenantCode: string
}

type FingerprintDraft = {
  fingerIndex: string
  template: string
}

export function AddEmployeeModal({
  open,
  onOpenChange,
  onAddEmployee,
  employeeToEdit,
  employees,
  departments,
  accessGroups,
  devices,
  tenantCode,
}: AddEmployeeModalProps) {
  const isEditing = !!employeeToEdit
  const [activeTab, setActiveTab] = useState("info")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [onlineReaders, setOnlineReaders] = useState<GatewayReaderItem[]>([])
  const [selectedReaderDevIndex, setSelectedReaderDevIndex] = useState("")
  const [isLoadingReaders, setIsLoadingReaders] = useState(false)
  const [isReadingCard, setIsReadingCard] = useState(false)
  const [cardReadMessage, setCardReadMessage] = useState("")
  const [cardReadError, setCardReadError] = useState("")
  const [isCapturingFingerprint, setIsCapturingFingerprint] = useState(false)
  const [fingerprintCaptureMessage, setFingerprintCaptureMessage] = useState("")
  const [fingerprintCaptureError, setFingerprintCaptureError] = useState("")
  const [isEnrollingFace, setIsEnrollingFace] = useState(false)
  const [faceEnrollMessage, setFaceEnrollMessage] = useState("")
  const [faceEnrollError, setFaceEnrollError] = useState("")
  const [fingerprintDraft, setFingerprintDraft] = useState<FingerprintDraft>({
    fingerIndex: "",
    template: "",
  })
  
  // Form state
  const [formData, setFormData] = useState({
    employeeNo: "",
    name: "",
    email: "",
    phone: "",
    departmentId: "",
    position: "",
    cardNumber: "",
    selectedAccessGroupIds: [] as number[],
    selectedDeviceIds: [] as number[],
    fingerprints: [] as Array<{ fingerIndex: number; template: string }>,
    photoFile: null as File | null,
    photoPreview: "",
    faceData: "",
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

  const handleAccessGroupToggle = (groupId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedAccessGroupIds: prev.selectedAccessGroupIds.includes(groupId)
        ? prev.selectedAccessGroupIds.filter((id) => id !== groupId)
        : [...prev.selectedAccessGroupIds, groupId],
    }))
  }

  const handleDeviceToggle = (deviceId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedDeviceIds: prev.selectedDeviceIds.includes(deviceId)
        ? prev.selectedDeviceIds.filter((id) => id !== deviceId)
        : [...prev.selectedDeviceIds, deviceId],
    }))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const dataUrl = await readFileAsDataUrl(file)
        const normalizedFaceData = normalizeFaceData(dataUrl)
        setFormData((prev) => ({
          ...prev,
          photoFile: file,
          photoPreview: dataUrl,
          faceData: normalizedFaceData,
        }))
        setFaceEnrollError("")
        setFaceEnrollMessage("")
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Impossible de charger la photo.")
      }
    }
  }

  const upsertFingerprint = (fingerIndex: number, template: string) => {
    setFormData((prev) => {
      const existing = prev.fingerprints.filter((row) => row.fingerIndex !== fingerIndex)
      const nextRows = [...existing, { fingerIndex, template }].sort((a, b) => a.fingerIndex - b.fingerIndex)
      return {
        ...prev,
        fingerprints: nextRows,
      }
    })
  }

  const handleAddFingerprint = () => {
    const fingerIndex = Number(fingerprintDraft.fingerIndex)
    const template = fingerprintDraft.template.trim()

    if (!Number.isInteger(fingerIndex) || fingerIndex < 1 || fingerIndex > 10) {
      setErrors((prev) => ({
        ...prev,
        fingerprints: "Le doigt doit etre compris entre 1 et 10.",
      }))
      return
    }

    if (!template) {
      setErrors((prev) => ({
        ...prev,
        fingerprints: "Le template d'empreinte est requis.",
      }))
      return
    }

    if (formData.fingerprints.length >= 10) {
      setErrors((prev) => ({
        ...prev,
        fingerprints: "Maximum 10 empreintes par employe.",
      }))
      return
    }

    upsertFingerprint(fingerIndex, template)
    setFingerprintDraft({ fingerIndex: "", template: "" })
    setErrors((prev) => {
      if (!prev.fingerprints) return prev
      const next = { ...prev }
      delete next.fingerprints
      return next
    })
  }

  const handleRemoveFingerprint = (fingerIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      fingerprints: prev.fingerprints.filter((row) => row.fingerIndex !== fingerIndex),
    }))
  }

  const loadOnlineReaders = useCallback(async () => {
    if (!isEmployeeApiEnabled()) return

    setIsLoadingReaders(true)
    setCardReadError("")
    try {
      const readers = await fetchOnlineReaders(tenantCode)
      setOnlineReaders(readers)
      setSelectedReaderDevIndex((previous) => {
        if (previous && readers.some((reader) => reader.dev_index === previous)) {
          return previous
        }
        return readers[0]?.dev_index ?? ""
      })
    } catch (error) {
      setOnlineReaders([])
      setSelectedReaderDevIndex("")
      setCardReadError(error instanceof Error ? error.message : "Impossible de charger les lecteurs en ligne")
    } finally {
      setIsLoadingReaders(false)
    }
  }, [tenantCode])

  const handleReadCard = async () => {
    if (!selectedReaderDevIndex) {
      setCardReadError("Selectionnez un lecteur en ligne.")
      return
    }

    setIsReadingCard(true)
    setCardReadError("")
    setCardReadMessage("Presentez la carte sur le lecteur...")
    try {
      const result = await readCardFromReader(selectedReaderDevIndex, {
        tenantCode,
        timeoutSeconds: 15,
      })
      handleInputChange("cardNumber", result.card_no)
      setCardReadMessage(`Carte lue: ${result.card_no}`)
    } catch (error) {
      setCardReadMessage("")
      setCardReadError(error instanceof Error ? error.message : "Lecture de carte impossible")
    } finally {
      setIsReadingCard(false)
    }
  }

  const handleCaptureFingerprint = async () => {
    if (!isEmployeeApiEnabled()) {
      setFingerprintCaptureError("API employee desactivee.")
      return
    }
    if (!isEditing || !employeeToEdit?.apiId) {
      setFingerprintCaptureError("Enrolement disponible uniquement apres creation de l'employe.")
      return
    }
    if (!selectedReaderDevIndex) {
      setFingerprintCaptureError("Selectionnez un lecteur en ligne.")
      return
    }

    const fingerIndex = Number(fingerprintDraft.fingerIndex)
    if (!Number.isInteger(fingerIndex) || fingerIndex < 1 || fingerIndex > 10) {
      setFingerprintCaptureError("Choisissez un doigt valide (1 a 10).")
      return
    }

    const selectedReader = devices.find(
      (device) => String(device.dev_index || "").trim() === selectedReaderDevIndex
    )
    if (!selectedReader) {
      setFingerprintCaptureError("Lecteur non resolu dans les devices du tenant.")
      return
    }

    if (
      formData.fingerprints.length >= 10 &&
      !formData.fingerprints.some((row) => row.fingerIndex === fingerIndex)
    ) {
      setFingerprintCaptureError("Maximum 10 empreintes par employe.")
      return
    }

    setIsCapturingFingerprint(true)
    setFingerprintCaptureError("")
    setFingerprintCaptureMessage("Placez le doigt sur le lecteur...")
    try {
      const employeeApiId = Number(employeeToEdit.apiId)
      if (!Number.isFinite(employeeApiId)) {
        throw new Error("Identifiant API employe invalide.")
      }

      const response = await enrollFingerprintFromReader(selectedReader.id, {
        employee_id: employeeApiId,
        finger_index: fingerIndex,
        push_to_all_readers: true,
        include_cards: false,
      })

      const capturedTemplate = String(response.finger_template ?? "").trim()
      if (!capturedTemplate) {
        throw new Error("Template d'empreinte non retourne par le lecteur.")
      }

      upsertFingerprint(fingerIndex, capturedTemplate)
      setFingerprintDraft((prev) => ({ ...prev, fingerIndex: "", template: "" }))
      setErrors((prev) => {
        if (!prev.fingerprints) return prev
        const next = { ...prev }
        delete next.fingerprints
        return next
      })
      setFingerprintCaptureMessage(
        `Empreinte doigt ${fingerIndex} capturee (qualite: ${response.finger_quality ?? "N/A"}).`
      )
    } catch (error) {
      setFingerprintCaptureMessage("")
      setFingerprintCaptureError(error instanceof Error ? error.message : "Capture empreinte impossible")
    } finally {
      setIsCapturingFingerprint(false)
    }
  }

  const handleEnrollFace = async () => {
    if (!isEmployeeApiEnabled()) {
      setFaceEnrollError("API employee desactivee.")
      return
    }
    if (!isEditing || !employeeToEdit?.apiId) {
      setFaceEnrollError("Enrolement disponible uniquement apres creation de l'employe.")
      return
    }
    if (!selectedReaderDevIndex) {
      setFaceEnrollError("Selectionnez un lecteur en ligne.")
      return
    }

    const selectedReader = devices.find(
      (device) => String(device.dev_index || "").trim() === selectedReaderDevIndex
    )
    if (!selectedReader) {
      setFaceEnrollError("Lecteur non resolu dans les devices du tenant.")
      return
    }

    const faceData = normalizeFaceData(formData.faceData || formData.photoPreview)
    if (!faceData) {
      setFaceEnrollError("Importez une photo faciale avant l'enrolement sur lecteur.")
      return
    }

    setIsEnrollingFace(true)
    setFaceEnrollError("")
    setFaceEnrollMessage("Enrolement visage en cours sur le lecteur...")
    try {
      const employeeApiId = Number(employeeToEdit.apiId)
      if (!Number.isFinite(employeeApiId)) {
        throw new Error("Identifiant API employe invalide.")
      }

      const response = await enrollFaceFromReader(selectedReader.id, {
        employee_id: employeeApiId,
        face_data: faceData,
        push_to_all_readers: true,
        include_cards: false,
        include_fingerprints: false,
      })

      setFormData((prev) => ({
        ...prev,
        faceData,
        photoPreview: prev.photoPreview || toFacePreviewUrl(faceData),
      }))
      setFaceEnrollMessage(
        `Visage enrôle (${response.success_count}/${response.target_readers_count} lecteur(s)).`
      )
    } catch (error) {
      setFaceEnrollMessage("")
      setFaceEnrollError(error instanceof Error ? error.message : "Enrolement visage impossible")
    } finally {
      setIsEnrollingFace(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const normalizedCardNumber = formData.cardNumber.trim().toLowerCase()

    if (!formData.employeeNo.trim()) {
      newErrors.employeeNo = "L'ID employe est requis"
    }
    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis"
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide"
    }
    if (!formData.departmentId) {
      newErrors.department = "Le departement est requis"
    }
    if (normalizedCardNumber) {
      const hasDuplicateCardNumber = employees.some((employee) => {
        if (employeeToEdit && employee.id === employeeToEdit.id) return false
        const existingCardNumber = (employee.cardNumber ?? "").trim().toLowerCase()
        if (!existingCardNumber || existingCardNumber === "non attribue") return false
        return existingCardNumber === normalizedCardNumber
      })
      if (hasDuplicateCardNumber) {
        newErrors.cardNumber = "Ce numero de carte est deja attribue a un autre employe"
      }
    }
    if (formData.fingerprints.length > 10) {
      newErrors.fingerprints = "Maximum 10 empreintes par employe."
    } else {
      const slots = formData.fingerprints.map((row) => row.fingerIndex)
      if (slots.length !== new Set(slots).size) {
        newErrors.fingerprints = "Chaque doigt (finger index) doit etre unique."
      } else if (formData.fingerprints.some((row) => !row.template.trim())) {
        newErrors.fingerprints = "Chaque empreinte doit contenir un template."
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    const isValid = validateForm()
    if (!isValid) {
      const hasFingerprintValidationError =
        formData.fingerprints.length > 10 ||
        new Set(formData.fingerprints.map((row) => row.fingerIndex)).size !== formData.fingerprints.length ||
        formData.fingerprints.some((row) => !row.template.trim())
      if (hasFingerprintValidationError) {
        setActiveTab("biometric")
      } else {
        setActiveTab("info")
      }
      return
    }

    setIsSubmitting(true)
    setApiError("")

    const selectedDepartment = departments.find(
      (department) => String(department.id) === formData.departmentId
    )
    const fingerprintPayload = formData.fingerprints.map((row) => ({
      finger_index: row.fingerIndex,
      template: row.template.trim(),
    }))
    const normalizedFaceData = normalizeFaceData(formData.faceData || formData.photoPreview)
    const hadFaceBefore = Boolean(
      normalizeFaceData(employeeToEdit?.faceData || employeeToEdit?.photoUrl || "")
    )
    let savedEmployeeApiId: number | null = employeeToEdit?.apiId ?? null

    if (isEmployeeApiEnabled()) {
      try {
        if (!selectedDepartment) {
          throw new Error("Departement invalide")
        }

        if (isEditing) {
          if (!employeeToEdit?.apiId) {
            throw new Error("Impossible de modifier cet employe: identifiant API manquant")
          }

          const updatedEmployee = await updateEmployee(employeeToEdit.apiId, {
            name: formData.name.trim(),
            email: formData.email || "",
            phone: formData.phone || "",
            position: formData.position || "",
            department: selectedDepartment.id,
            devices: formData.selectedDeviceIds,
            access_groups: formData.selectedAccessGroupIds,
            cards: formData.cardNumber
              ? [{ card_no: formData.cardNumber, card_type: "normalCard" }]
              : [],
            fingerprints: fingerprintPayload,
            ...(normalizedFaceData
              ? { face: { face_data: normalizedFaceData } }
              : hadFaceBefore
                ? { face: null }
                : {}),
          })
          savedEmployeeApiId = updatedEmployee.id
        } else {
          const tokens = await fetchEmployeeApiToken()
          const createdEmployee = await createEmployee(
            {
              tenant: selectedDepartment.tenant,
              department: selectedDepartment.id,
              employee_no: formData.employeeNo.trim(),
              name: formData.name,
              devices: formData.selectedDeviceIds,
              access_groups: formData.selectedAccessGroupIds,
              email: formData.email || undefined,
              phone: formData.phone || undefined,
              position: formData.position || undefined,
              cards: formData.cardNumber
                ? [{ card_no: formData.cardNumber, card_type: "normalCard" }]
                : undefined,
              fingerprints: fingerprintPayload.length > 0 ? fingerprintPayload : undefined,
              face: normalizedFaceData ? { face_data: normalizedFaceData } : undefined,
              access_group: undefined,
            },
            tokens.access
          )
          const parsedId = Number(createdEmployee.id)
          if (!Number.isFinite(parsedId)) {
            throw new Error("Identifiant employe invalide apres creation.")
          }
          savedEmployeeApiId = parsedId
        }

        if (savedEmployeeApiId !== null) {
          const selectedDevIndexes = devices
            .filter((device) => formData.selectedDeviceIds.includes(device.id))
            .map((device) => String(device.dev_index || "").trim())
            .filter((devIndex) => devIndex.length > 0)
          await pushEmployeeToGateway(
            savedEmployeeApiId,
            selectedDevIndexes.length > 0 ? selectedDevIndexes : undefined
          )
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur API employee"
        setApiError(message)
        setIsSubmitting(false)
        return
      }
    }
    const selectedAccessGroups = formData.selectedAccessGroupIds
      .map((groupId) => accessGroups.find((group) => group.id === groupId)?.name)
      .filter((name): name is string => Boolean(name))

    const payload: Employee = {
      id: employeeToEdit?.id ?? `new-${Date.now()}`,
      apiId: savedEmployeeApiId,
      tenantId: selectedDepartment?.tenant ?? employeeToEdit?.tenantId ?? null,
      employeeId: formData.employeeNo.trim(),
      name: formData.name,
      email: formData.email || "-",
      phone: formData.phone || "-",
      departmentId: selectedDepartment?.id ?? employeeToEdit?.departmentId ?? null,
      department: selectedDepartment?.name ?? employeeToEdit?.department ?? "Non assigne",
      workShiftId: employeeToEdit?.workShiftId ?? null,
      workShift: employeeToEdit?.workShift ?? "Non assigne",
      workShiftIds: employeeToEdit?.workShiftIds ?? [],
      workShifts: employeeToEdit?.workShifts ?? [],
      position: formData.position || "N/A",
      photoUrl: formData.photoPreview || (normalizedFaceData ? toFacePreviewUrl(normalizedFaceData) : ""),
      faceData: normalizedFaceData,
      cardNumber: formData.cardNumber || "Non attribue",
      deviceIds: formData.selectedDeviceIds,
      accessGroupIds: formData.selectedAccessGroupIds,
      accessGroups: selectedAccessGroups,
      syncStatus: employeeToEdit?.syncStatus ?? "pending",
      biometricStatus: {
        hasFacePhoto: !!normalizedFaceData,
        hasFingerprint: formData.fingerprints.length > 0,
      },
      fingerprints: formData.fingerprints,
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
      employeeNo: "",
      name: "",
      email: "",
      phone: "",
      departmentId: "",
      position: "",
      cardNumber: "",
      selectedAccessGroupIds: [],
      selectedDeviceIds: [],
      fingerprints: [],
      photoFile: null,
      photoPreview: "",
      faceData: "",
    })
    setFingerprintDraft({ fingerIndex: "", template: "" })
    setErrors({})
    setApiError("")
    setCardReadMessage("")
    setCardReadError("")
    setFingerprintCaptureMessage("")
    setFingerprintCaptureError("")
    setIsCapturingFingerprint(false)
    setFaceEnrollMessage("")
    setFaceEnrollError("")
    setIsEnrollingFace(false)
    setActiveTab("info")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  useEffect(() => {
    if (!open) return

    if (employeeToEdit) {
      const existingFaceData = normalizeFaceData(employeeToEdit.faceData || employeeToEdit.photoUrl)
      setFormData({
        employeeNo: employeeToEdit.employeeId,
        name: employeeToEdit.name,
        email: employeeToEdit.email === "-" ? "" : employeeToEdit.email,
        phone: employeeToEdit.phone === "-" ? "" : employeeToEdit.phone,
        departmentId: employeeToEdit.departmentId ? String(employeeToEdit.departmentId) : "",
        position: employeeToEdit.position === "N/A" ? "" : employeeToEdit.position,
        cardNumber: employeeToEdit.cardNumber === "Non attribue" ? "" : employeeToEdit.cardNumber,
        selectedAccessGroupIds: employeeToEdit.accessGroupIds,
        selectedDeviceIds: employeeToEdit.deviceIds ?? [],
        fingerprints: employeeToEdit.fingerprints ?? [],
        photoFile: null,
        photoPreview: existingFaceData ? toFacePreviewUrl(existingFaceData) : "",
        faceData: existingFaceData,
      })
      setFingerprintDraft({ fingerIndex: "", template: "" })
      setFaceEnrollMessage("")
      setFaceEnrollError("")
      setErrors({})
      setActiveTab("info")
      return
    }

    resetForm()
  }, [employeeToEdit, open])

  useEffect(() => {
    if (!open) return
    void loadOnlineReaders()
  }, [open, loadOnlineReaders])

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
              {(errors.employeeNo || errors.name || errors.email || errors.department) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="access">Acces</TabsTrigger>
            <TabsTrigger value="biometric" className="relative">
              Biometrie
              {errors.fingerprints && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
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
                      onChange={(event) => void handlePhotoUpload(event)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="employeeNo" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  ID Employe
                </Label>
                <Input
                  id="employeeNo"
                  placeholder="Ex: EMP-001"
                  value={formData.employeeNo}
                  onChange={(e) => handleInputChange("employeeNo", e.target.value)}
                  className={errors.employeeNo ? "border-destructive" : ""}
                />
                {errors.employeeNo && (
                  <p className="text-xs text-destructive">{errors.employeeNo}</p>
                )}
              </div>

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
                    value={formData.departmentId}
                    onValueChange={(value) => handleInputChange("departmentId", value)}
                  >
                    <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
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
                    placeholder="Ex: Developpeur (optionnel)"
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
                  className={`font-mono ${errors.cardNumber ? "border-destructive" : ""}`}
                />
                {errors.cardNumber && (
                  <p className="text-xs text-destructive">{errors.cardNumber}</p>
                )}
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Select
                    value={selectedReaderDevIndex}
                    onValueChange={setSelectedReaderDevIndex}
                    disabled={isLoadingReaders || isReadingCard || onlineReaders.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingReaders ? "Chargement des lecteurs..." : "Choisir un lecteur en ligne"} />
                    </SelectTrigger>
                    <SelectContent>
                      {onlineReaders.map((reader) => (
                        <SelectItem key={reader.dev_index} value={reader.dev_index}>
                          {reader.name} ({reader.dev_index})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleReadCard()}
                    disabled={isLoadingReaders || isReadingCard || !selectedReaderDevIndex}
                  >
                    {isReadingCard ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Lecture...
                      </>
                    ) : (
                      <>
                        <Radio className="mr-2 h-4 w-4" />
                        Lire la carte
                      </>
                    )}
                  </Button>
                </div>
                {cardReadMessage && (
                  <p className="text-xs text-green-600">{cardReadMessage}</p>
                )}
                {cardReadError && (
                  <p className="text-xs text-destructive">{cardReadError}</p>
                )}
                {!isLoadingReaders && onlineReaders.length === 0 && !cardReadError && (
                  <p className="text-xs text-muted-foreground">
                    Aucun lecteur en ligne detecte pour ce tenant.
                  </p>
                )}
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
                  {formData.selectedAccessGroupIds.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {formData.selectedAccessGroupIds.length} selectionne(s)
                    </Badge>
                  )}
                </div>

                {/* Selected Groups */}
                {formData.selectedAccessGroupIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
                    {formData.selectedAccessGroupIds.map((groupId) => {
                      const groupName = accessGroups.find((group) => group.id === groupId)?.name ?? String(groupId)
                      return (
                      <Badge
                        key={groupId}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {groupName}
                        <button
                          type="button"
                          onClick={() => handleAccessGroupToggle(groupId)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )})}
                  </div>
                )}

                {/* Available Groups */}
                <div className="grid grid-cols-2 gap-2">
                  {accessGroups.map((group) => {
                    const isSelected = formData.selectedAccessGroupIds.includes(group.id)
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => handleAccessGroupToggle(group.id)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{group.name}</span>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Readers / Devices */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-muted-foreground" />
                    Lecteurs autorises
                  </Label>
                  {formData.selectedDeviceIds.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {formData.selectedDeviceIds.length} selectionne(s)
                    </Badge>
                  )}
                </div>
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-border bg-card p-3">
                  {devices.map((device) => (
                    <label key={device.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-2">
                      <Checkbox
                        checked={formData.selectedDeviceIds.includes(device.id)}
                        onCheckedChange={() => handleDeviceToggle(device.id)}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm text-foreground">
                          {device.name?.trim() || device.dev_index}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {device.dev_index}
                          {device.status ? ` • ${device.status}` : ""}
                        </span>
                      </div>
                    </label>
                  ))}
                  {devices.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Aucun lecteur disponible pour ce tenant.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Liez la personne a au moins un lecteur pour autoriser le passage de la carte.
                </p>
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
                        La photo est sauvegardee pour l&apos;enrolement visage sur les lecteurs.
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
                          faceData: "",
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
                      onChange={(event) => void handlePhotoUpload(event)}
                      className="hidden"
                    />
                  </label>
                )}

                <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={selectedReaderDevIndex}
                        onValueChange={setSelectedReaderDevIndex}
                        disabled={isLoadingReaders || isEnrollingFace || onlineReaders.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isLoadingReaders
                                ? "Chargement des lecteurs..."
                                : "Choisir un lecteur pour l'enrolement visage"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {onlineReaders.map((reader) => (
                            <SelectItem key={reader.dev_index} value={reader.dev_index}>
                              {reader.name} ({reader.dev_index})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 lg:flex-none">
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 lg:flex-none"
                        onClick={() => void loadOnlineReaders()}
                        disabled={isLoadingReaders || isEnrollingFace}
                      >
                        Actualiser
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 lg:flex-none"
                        onClick={() => void handleEnrollFace()}
                        disabled={
                          !isEditing ||
                          !employeeToEdit?.apiId ||
                          !selectedReaderDevIndex ||
                          isLoadingReaders ||
                          isEnrollingFace
                        }
                      >
                        {isEnrollingFace ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enrolement...
                          </>
                        ) : (
                          "Enroler lecteur"
                        )}
                      </Button>
                    </div>
                  </div>
                  {faceEnrollMessage && (
                    <p className="text-xs text-green-600">{faceEnrollMessage}</p>
                  )}
                  {faceEnrollError && (
                    <p className="text-xs text-destructive">{faceEnrollError}</p>
                  )}
                  {!isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Enrolement lecteur disponible apres creation initiale de l&apos;employe.
                    </p>
                  )}
                  {!normalizeFaceData(formData.faceData || formData.photoPreview) && (
                    <p className="text-xs text-muted-foreground">
                      Importez une photo visage avant l&apos;enrolement sur terminal.
                    </p>
                  )}
                </div>
              </div>

              {/* Fingerprint */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    Empreintes Digitales
                  </Label>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {formData.fingerprints.length}/10
                  </Badge>
                </div>

                <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="w-full lg:w-36">
                      <Select
                        value={fingerprintDraft.fingerIndex}
                        onValueChange={(value) =>
                          setFingerprintDraft((prev) => ({
                            ...prev,
                            fingerIndex: value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Doigt" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, index) => {
                            const slot = index + 1
                            return (
                              <SelectItem key={slot} value={String(slot)}>
                                Doigt {slot}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Input
                        placeholder="Template d'empreinte (capture appareil)"
                        value={fingerprintDraft.template}
                        onChange={(event) =>
                          setFingerprintDraft((prev) => ({
                            ...prev,
                            template: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex gap-2 lg:flex-none">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 lg:flex-none"
                        onClick={handleAddFingerprint}
                        disabled={formData.fingerprints.length >= 10}
                      >
                        Ajouter
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 lg:flex-none"
                        onClick={() => void handleCaptureFingerprint()}
                        disabled={
                          !isEditing ||
                          !employeeToEdit?.apiId ||
                          isCapturingFingerprint ||
                          isEnrollingFace ||
                          isLoadingReaders ||
                          !selectedReaderDevIndex ||
                          !fingerprintDraft.fingerIndex
                        }
                      >
                        {isCapturingFingerprint ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Capture...
                          </>
                        ) : (
                          "Capturer lecteur"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={selectedReaderDevIndex}
                        onValueChange={setSelectedReaderDevIndex}
                        disabled={isLoadingReaders || isCapturingFingerprint || isEnrollingFace || onlineReaders.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isLoadingReaders
                                ? "Chargement des lecteurs..."
                                : "Choisir un lecteur pour l'enrolement"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {onlineReaders.map((reader) => (
                            <SelectItem key={reader.dev_index} value={reader.dev_index}>
                              {reader.name} ({reader.dev_index})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="lg:flex-none"
                      onClick={() => void loadOnlineReaders()}
                      disabled={isLoadingReaders || isCapturingFingerprint || isEnrollingFace}
                    >
                      Actualiser lecteurs
                    </Button>
                  </div>

                  {fingerprintCaptureMessage && (
                    <p className="text-xs text-green-600">{fingerprintCaptureMessage}</p>
                  )}
                  {fingerprintCaptureError && (
                    <p className="text-xs text-destructive">{fingerprintCaptureError}</p>
                  )}
                  {!isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Capture lecteur disponible apres creation initiale de l&apos;employe.
                    </p>
                  )}

                  {formData.fingerprints.length > 0 ? (
                    <div className="space-y-2">
                      {formData.fingerprints.map((fingerprint) => (
                        <div
                          key={fingerprint.fingerIndex}
                          className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              Doigt {fingerprint.fingerIndex}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {fingerprint.template}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFingerprint(fingerprint.fingerIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Aucune empreinte enregistree. Ajoutez jusqu&apos;a 10 templates (doigts 1 a 10).
                    </p>
                  )}

                  {errors.fingerprints && (
                    <p className="text-xs text-destructive">{errors.fingerprints}</p>
                  )}
                </div>
              </div>

              {/* Info Note */}
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Note:</strong> Les templates d&apos;empreintes sont synchronises
                  avec HikCentral lors de l&apos;enregistrement de l&apos;employe et lors des modifications.
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
