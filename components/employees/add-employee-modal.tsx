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
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
  const hasInfoErrors = Boolean(errors.employeeNo || errors.name || errors.email || errors.department)
  const hasBiometricErrors = Boolean(errors.fingerprints)
  const selectedAccessGroupsCount = formData.selectedAccessGroupIds.length
  const selectedDevicesCount = formData.selectedDeviceIds.length
  const fingerprintCount = formData.fingerprints.length
  const hasFaceAsset = Boolean(normalizeFaceData(formData.faceData || formData.photoPreview))
  const identityReady = Boolean(formData.employeeNo.trim() && formData.name.trim() && formData.departmentId)

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
        toast.error("Echec de l'enregistrement", { description: message })
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
    toast.success(isEditing ? "Employe modifie" : "Employe cree", {
      description: isEditing
        ? "Les changements ont ete appliques avec succes."
        : "Le nouvel employe est pret et synchronise.",
    })
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
      <DialogContent className="flex! max-h-[92vh] max-w-[calc(100%-0.75rem)] flex-col! gap-0 overflow-hidden p-0 sm:max-w-4xl xl:max-w-5xl">
        <div className="relative overflow-hidden border-b border-border/60 bg-[linear-gradient(135deg,rgba(78,155,255,0.12),rgba(9,16,26,0.98)_44%,rgba(8,13,21,0.99))]">
          <div className="soft-grid absolute inset-0 opacity-15" />
          <div className="absolute -right-16 -top-8 h-48 w-48 rounded-full bg-primary/12 blur-[80px]" />
          <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-cyan-400/6 blur-[60px]" />

          <DialogHeader className="relative gap-5 px-5 pb-5 pt-5 sm:px-6 lg:px-8 lg:pb-6 lg:pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/8 bg-white/6 text-white/80 shadow-none backdrop-blur-sm">
                {isEditing ? "Edition" : "Creation"}
              </Badge>
              <Badge variant="outline" className="border-primary/20 bg-primary/8 text-primary backdrop-blur-sm">
                {activeTab === "info" ? "Profil" : activeTab === "access" ? "Acces" : "Biometrie"}
              </Badge>
              {apiError && (
                <Badge variant="outline" className="border-destructive/25 bg-destructive/8 text-destructive">
                  Erreur
                </Badge>
              )}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)] xl:items-end">
              <div className="space-y-3">
                <DialogTitle className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {isEditing ? "Modifier l'employe" : "Ajouter un employe"}
                </DialogTitle>
                <DialogDescription className="max-w-xl text-sm leading-relaxed text-slate-300/80">
                  {isEditing
                    ? "Mettez a jour les informations, acces et biometrie de cet employe."
                    : "Renseignez identite, habilitations et biometrie en quelques etapes."}
                </DialogDescription>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {identityReady ? "Identite OK" : "Identite incomplete"}
                  </Badge>
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {selectedAccessGroupsCount} groupe{selectedAccessGroupsCount > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {selectedDevicesCount} lecteur{selectedDevicesCount > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {fingerprintCount} empreinte{fingerprintCount > 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              <div className="hidden gap-2.5 xl:grid">
                <div className="rounded-2xl border border-white/6 bg-white/3 p-3.5 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Profil</p>
                  <p className="mt-1.5 truncate text-base font-semibold text-white">{formData.name.trim() || "Nouveau"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formData.employeeNo.trim() || "ID a renseigner"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-white/6 bg-white/3 p-3.5 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Photo</p>
                    <p className="mt-1.5 text-sm font-semibold text-white">{hasFaceAsset ? "Prete" : "Aucune"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-white/3 p-3.5 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Lecteurs</p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-white">{selectedDevicesCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border/60 bg-background/50 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl p-1.5">
              <TabsTrigger value="info" className="relative min-h-12 gap-2">
                <User className="h-4 w-4" />
                Informations
                {hasInfoErrors && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="access" className="min-h-12 gap-2">
                <CreditCard className="h-4 w-4" />
                Acces
              </TabsTrigger>
              <TabsTrigger value="biometric" className="relative min-h-12 gap-2">
                <Fingerprint className="h-4 w-4" />
                Biometrie
                {hasBiometricErrors && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <TabsContent value="info" className="mt-0 space-y-5">
              <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                <section className="rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Portrait</p>
                  <div className="mt-5 flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-2 border-dashed border-border/60 shadow-[0_12px_28px_rgba(0,0,0,0.15)]">
                        {formData.photoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={formData.photoPreview}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="bg-secondary text-2xl font-bold text-foreground">
                            {getInitials(formData.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <label
                        htmlFor="photo-upload"
                        className="wow-transition absolute -bottom-1.5 -right-1.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(78,155,255,0.2)] hover:scale-105 hover:bg-primary/90"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          onChange={(event) => void handlePhotoUpload(event)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{formData.name.trim() || "Nouveau"}</p>
                      <p className="text-xs text-muted-foreground/80">
                        Photo recommandee pour la biometrie.
                      </p>
                    </div>

                    <div className="grid w-full gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-xl border border-border/60 bg-background/30 p-3 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Profil</p>
                        <p className="mt-1 text-xs text-foreground">
                          {identityReady ? "Complet" : "A completer"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/30 p-3 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Photo</p>
                        <p className="mt-1 text-xs text-foreground">
                          {hasFaceAsset ? "Prete" : "Aucune"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="space-y-5">
                  <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-5">
                    <div className="mb-4 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Identite</p>
                      <h3 className="text-base font-bold text-foreground">Informations principales</h3>
                      <p className="text-sm text-muted-foreground/80">Donnees de base pour la fiche employe.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="employeeNo" className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          ID Employe
                        </Label>
                        <Input
                          id="employeeNo"
                          aria-invalid={Boolean(errors.employeeNo)}
                          placeholder="Ex: EMP-001"
                          value={formData.employeeNo}
                          onChange={(e) => handleInputChange("employeeNo", e.target.value)}
                          className={cn("h-11 rounded-2xl", errors.employeeNo && "border-destructive")}
                        />
                        <p className={cn("text-xs", errors.employeeNo ? "text-destructive" : "text-muted-foreground")}>
                          {errors.employeeNo || "Reference interne unique."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Nom complet
                        </Label>
                        <Input
                          id="name"
                          aria-invalid={Boolean(errors.name)}
                          placeholder="Ex: Jean Dupont"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className={cn("h-11 rounded-2xl", errors.name && "border-destructive")}
                        />
                        <p className={cn("text-xs", errors.name ? "text-destructive" : "text-muted-foreground")}>
                          {errors.name || "Affiche dans les listes et journaux."}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-5">
                    <div className="mb-4 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Organisation</p>
                      <h3 className="text-base font-bold text-foreground">Contexte professionnel</h3>
                      <p className="text-sm text-muted-foreground/80">Coordonnees et rattachement.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          aria-invalid={Boolean(errors.email)}
                          placeholder="Ex: jean.dupont@company.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className={cn("h-11 rounded-2xl", errors.email && "border-destructive")}
                        />
                        <p className={cn("text-xs", errors.email ? "text-destructive" : "text-muted-foreground")}>
                          {errors.email || "Identifiant de contact."}
                        </p>
                      </div>

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
                          className={cn("h-11 rounded-2xl", errors.phone && "border-destructive")}
                        />
                        <p className={cn("text-xs", errors.phone ? "text-destructive" : "text-muted-foreground")}>
                          {errors.phone || "Contact securite ou operations."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          Departement
                        </Label>
                        <Select
                          value={formData.departmentId}
                          onValueChange={(value) => handleInputChange("departmentId", value)}
                        >
                          <SelectTrigger className={cn("h-11 rounded-2xl", errors.department && "border-destructive")}>
                            <SelectValue placeholder="Selectionner un departement" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={String(dept.id)}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className={cn("text-xs", errors.department ? "text-destructive" : "text-muted-foreground")}>
                          {errors.department || "Rattachement principal."}
                        </p>
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
                          className={cn("h-11 rounded-2xl", errors.position && "border-destructive")}
                        />
                        <p className={cn("text-xs", errors.position ? "text-destructive" : "text-muted-foreground")}>
                          {errors.position || "Fonction dans le tableau et la fiche."}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </TabsContent>

            {/* Access Tab */}
            <TabsContent value="access" className="mt-0 space-y-5">
              <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Carte physique</p>
                    <h3 className="text-base font-bold text-foreground">Numero de carte</h3>
                    <p className="text-sm text-muted-foreground/80">Saisie manuelle ou lecture depuis un lecteur.</p>
                  </div>
                  <Badge variant="secondary" className="w-fit bg-primary/8 text-primary">
                    {formData.cardNumber.trim() ? "Carte OK" : "Optionnelle"}
                  </Badge>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Numero de carte
                    </Label>
                    <Input
                      id="cardNumber"
                      aria-invalid={Boolean(errors.cardNumber)}
                      placeholder="Ex: 4A:3B:2C:1D (optionnel)"
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                      className={cn("h-11 rounded-2xl font-mono tabular-nums", errors.cardNumber && "border-destructive")}
                    />
                    <p className={cn("text-xs", errors.cardNumber ? "text-destructive" : "text-muted-foreground")}>
                      {errors.cardNumber || "Attribuable ulteurement."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lecture assistee</p>
                    <p className="mt-1.5 text-xs text-muted-foreground/80">
                      Selectionnez un lecteur pour capturer le badge.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <Select
                    value={selectedReaderDevIndex}
                    onValueChange={setSelectedReaderDevIndex}
                    disabled={isLoadingReaders || isReadingCard || onlineReaders.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-2xl">
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
                    variant="ghost"
                    className="h-11 rounded-2xl"
                    onClick={() => void loadOnlineReaders()}
                    disabled={isLoadingReaders || isReadingCard}
                  >
                    Actualiser
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-2xl"
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

                {(cardReadMessage || cardReadError || (!isLoadingReaders && onlineReaders.length === 0 && !cardReadError)) && (
                  <div className="mt-4 space-y-2">
                    {cardReadMessage && (
                      <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        {cardReadMessage}
                      </p>
                    )}
                    {cardReadError && (
                      <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {cardReadError}
                      </p>
                    )}
                    {!isLoadingReaders && onlineReaders.length === 0 && !cardReadError && (
                      <p className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
                        Aucun lecteur en ligne detecte.
                      </p>
                    )}
                  </div>
                )}
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Habilitations</p>
                      <h3 className="text-base font-bold text-foreground">Groupes d&apos;acces</h3>
                    </div>
                    <Badge variant="secondary" className="bg-primary/8 text-primary tabular-nums">
                      {selectedAccessGroupsCount} selectionne(s)
                    </Badge>
                  </div>

                  {selectedAccessGroupsCount > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border/60 bg-background/30 p-3">
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
                              className="ml-1 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
                              aria-label={`Retirer le groupe ${groupName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {accessGroups.map((group) => {
                      const isSelected = formData.selectedAccessGroupIds.includes(group.id)
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleAccessGroupToggle(group.id)}
                          className={cn(
                            "wow-transition flex items-center justify-between rounded-xl border p-3 text-left text-sm",
                            isSelected
                              ? "border-primary/30 bg-primary/10 text-foreground shadow-[0_6px_18px_rgba(78,155,255,0.1)]"
                              : "border-border/60 bg-background/25 text-muted-foreground hover:border-primary/20 hover:bg-secondary/30 hover:text-foreground"
                          )}
                        >
                          <span className="pr-3">{group.name}</span>
                          <span className={cn("h-2.5 w-2.5 rounded-full", isSelected ? "bg-primary" : "bg-border")} />
                        </button>
                      )
                    })}
                    {accessGroups.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun groupe disponible pour ce tenant.</p>
                    )}
                  </div>
                </section>

              {/* Readers / Devices */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-muted-foreground" />
                    Lecteurs autorises
                  </Label>
                  {formData.selectedDeviceIds.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/8 text-primary tabular-nums">
                      {formData.selectedDeviceIds.length} selectionne(s)
                    </Badge>
                  )}
                </div>
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-border/60 bg-card/80 p-3">
                  {devices.map((device) => (
                    <label key={device.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-2">
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
                  Liez au moins un lecteur pour activer le badge.
                </p>
              </div>
            </div>
            </TabsContent>

            {/* Biometric Tab */}
            <TabsContent value="biometric" className="mt-0 space-y-5">
              {/* Face Photo */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  Photo faciale
                </Label>

                {formData.photoPreview ? (
                  <div className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.photoPreview}
                        alt="Face preview"
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
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
                      <p className="text-sm font-bold text-foreground">
                        Photo prete
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        Disponible pour l&apos;enrolement visage.
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
                    className="wow-transition flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-card/80 p-8 hover:border-primary/30 hover:bg-card/90"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Uploader une photo
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        JPG, PNG — max 5 MB
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

                <div className="grid gap-3 rounded-xl border border-border/60 bg-card/80 p-4">
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
                    <p className="text-xs text-emerald-400">{faceEnrollMessage}</p>
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
                    Empreintes digitales
                  </Label>
                  <Badge variant="secondary" className="bg-primary/8 text-primary tabular-nums">
                    {formData.fingerprints.length}/10
                  </Badge>
                </div>

                <div className="grid gap-3 rounded-xl border border-border/60 bg-card/80 p-4">
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
                    <p className="text-xs text-emerald-400">{fingerprintCaptureMessage}</p>
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
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2"
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
              <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground/80">
                  <strong className="font-semibold text-foreground">Note :</strong> Les templates sont synchronises
                  avec HikCentral a l&apos;enregistrement.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {apiError && (
          <p className="mx-4 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-2.5 text-sm text-destructive sm:mx-6 lg:mx-8">
            {apiError}
          </p>
        )}

        <DialogFooter className="gap-2 border-t border-border/60 px-5 py-4 sm:px-6 lg:px-8">
          <Button variant="outline" className="rounded-xl" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button className="rounded-xl" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Enregistrement..." : "Creation en cours..."}
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
