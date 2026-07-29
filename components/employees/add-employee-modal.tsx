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
import { useI18n } from "@/lib/i18n/context"
import { employeesDict } from "@/lib/i18n/pages/employees-page"

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

function getTodayIsoDate(): string {
  return new Date().toISOString().split("T")[0]
}

function addYearsToIsoDate(dateIso: string, years: number): string {
  const baseDate = new Date(dateIso)
  baseDate.setFullYear(baseDate.getFullYear() + years)
  return baseDate.toISOString().split("T")[0]
}

function readFileAsDataUrl(file: File, errorMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error(errorMessage))
    reader.readAsDataURL(file)
  })
}

type AddEmployeeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddEmployee: (employee: Employee) => void
  employeeToEdit?: Employee | null
  employees: Employee[]
  departments: Array<{ id: number; tenant: number; name: string; parent?: number | null; organization?: number }>
  accessGroups: Array<{ id: number; name: string }>
  devices: Array<{ id: number; dev_index: string; name?: string; status?: string }>
  tenantCode: string
}

/**
 * Calcule le prochain matricule selon le pattern EMP-XXX (auto-increment, padding 3 zeros).
 * - Parse tous les matricules existants au format EMP-<nombre>
 * - Renvoie EMP-<max+1> (zero-padded sur au moins 3 chiffres)
 * - Si aucun matricule pertinent, renvoie EMP-001
 */
function computeNextEmployeeNo(employees: Employee[]): string {
  const PREFIX = "EMP-"
  const matriculeRe = /^EMP-(\d+)$/i
  let maxN = 0
  for (const emp of employees) {
    const id = String(emp?.employeeId ?? "").trim()
    const match = id.match(matriculeRe)
    if (!match) continue
    const n = Number.parseInt(match[1], 10)
    if (Number.isFinite(n) && n > maxN) {
      maxN = n
    }
  }
  const next = maxN + 1
  const padded = String(next).padStart(3, "0")
  return `${PREFIX}${padded}`
}

/**
 * Identifie l'ID du département "racine" / "organisation elle-même".
 * - Préfère un département avec parent === null.
 * - À défaut, prend le premier de la liste.
 */
function findRootDepartmentId(
  departments: Array<{ id: number; parent?: number | null }>
): string {
  if (!departments || departments.length === 0) return ""
  const root = departments.find((d) => d.parent === null || d.parent === undefined)
  if (root) return String(root.id)
  return String(departments[0].id)
}

type FingerprintDraft = {
  fingerIndex: string
  template: string
}

function createLocalEmployeeId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
  const { locale, t } = useI18n()
  const tr = employeesDict[locale]
  const isEditing = !!employeeToEdit
  const [activeTab, setActiveTab] = useState("info")
  const [viewMode, setViewMode] = useState<"creation" | "profile">("creation")
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
    validityStart: getTodayIsoDate(),
    validityEnd: addYearsToIsoDate(getTodayIsoDate(), 10),
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
    if (!file) return

    // Validation type et taille
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
    const MAX_SIZE_MB = 5
    if (!ALLOWED_TYPES.includes(file.type)) {
      setApiError(tr.modal.unsupportedFormat)
      e.target.value = ""
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setApiError(tr.modal.photoTooLarge(MAX_SIZE_MB))
      e.target.value = ""
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file, tr.modal.fileReadError)
      const normalizedFaceData = normalizeFaceData(dataUrl)
      setFormData((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: dataUrl,
        faceData: normalizedFaceData,
      }))
      setFaceEnrollError("")
      setFaceEnrollMessage("")
      setApiError("")
    } catch (error) {
      setApiError(error instanceof Error ? error.message : tr.modal.photoLoadError)
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
        fingerprints: tr.modal.fingerRange,
      }))
      return
    }

    if (!template) {
      setErrors((prev) => ({
        ...prev,
        fingerprints: tr.modal.fingerTemplateRequired,
      }))
      return
    }

    if (formData.fingerprints.length >= 10) {
      setErrors((prev) => ({
        ...prev,
        fingerprints: tr.modal.maxFingerprints,
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
      setCardReadError(error instanceof Error ? error.message : tr.modal.readersLoadError)
    } finally {
      setIsLoadingReaders(false)
    }
  }, [tenantCode, tr])

  const handleReadCard = async () => {
    if (!selectedReaderDevIndex) {
      setCardReadError(tr.modal.selectOnlineReader)
      return
    }

    setIsReadingCard(true)
    setCardReadError("")
    setCardReadMessage(tr.modal.presentCard)
    try {
      const result = await readCardFromReader(selectedReaderDevIndex, {
        tenantCode,
        timeoutSeconds: 15,
      })
      handleInputChange("cardNumber", result.card_no)
      setCardReadMessage(tr.modal.cardRead(result.card_no))
    } catch (error) {
      setCardReadMessage("")
      setCardReadError(error instanceof Error ? error.message : tr.modal.cardReadError)
    } finally {
      setIsReadingCard(false)
    }
  }

  const handleCaptureFingerprint = async () => {
    if (!isEmployeeApiEnabled()) {
      setFingerprintCaptureError(tr.modal.apiDisabled)
      return
    }
    if (!isEditing || !employeeToEdit?.apiId) {
      setFingerprintCaptureError(tr.modal.enrollOnlyAfterCreation)
      return
    }
    if (!selectedReaderDevIndex) {
      setFingerprintCaptureError(tr.modal.selectOnlineReader)
      return
    }

    const fingerIndex = Number(fingerprintDraft.fingerIndex)
    if (!Number.isInteger(fingerIndex) || fingerIndex < 1 || fingerIndex > 10) {
      setFingerprintCaptureError(tr.modal.pickValidFinger)
      return
    }

    const selectedReader = devices.find(
      (device) => String(device.dev_index || "").trim() === selectedReaderDevIndex
    )
    if (!selectedReader) {
      setFingerprintCaptureError(tr.modal.readerNotResolved)
      return
    }

    if (
      formData.fingerprints.length >= 10 &&
      !formData.fingerprints.some((row) => row.fingerIndex === fingerIndex)
    ) {
      setFingerprintCaptureError(tr.modal.maxFingerprints)
      return
    }

    setIsCapturingFingerprint(true)
    setFingerprintCaptureError("")
    setFingerprintCaptureMessage(tr.modal.placeFinger)
    try {
      const employeeApiId = Number(employeeToEdit.apiId)
      if (!Number.isFinite(employeeApiId)) {
        throw new Error(tr.modal.invalidEmployeeApiId)
      }

      const response = await enrollFingerprintFromReader(selectedReader.id, {
        employee_id: employeeApiId,
        finger_index: fingerIndex,
        push_to_all_readers: true,
        include_cards: false,
      })

      const capturedTemplate = String(response.finger_template ?? "").trim()
      if (!capturedTemplate) {
        throw new Error(tr.modal.noTemplateReturned)
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
        tr.modal.fingerprintCaptured(fingerIndex, String(response.finger_quality ?? "N/A"))
      )
    } catch (error) {
      setFingerprintCaptureMessage("")
      setFingerprintCaptureError(error instanceof Error ? error.message : tr.modal.fingerprintCaptureError)
    } finally {
      setIsCapturingFingerprint(false)
    }
  }

  const handleEnrollFace = async () => {
    if (!isEmployeeApiEnabled()) {
      setFaceEnrollError(tr.modal.apiDisabled)
      return
    }
    if (!isEditing || !employeeToEdit?.apiId) {
      setFaceEnrollError(tr.modal.enrollOnlyAfterCreation)
      return
    }
    if (!selectedReaderDevIndex) {
      setFaceEnrollError(tr.modal.selectOnlineReader)
      return
    }

    const selectedReader = devices.find(
      (device) => String(device.dev_index || "").trim() === selectedReaderDevIndex
    )
    if (!selectedReader) {
      setFaceEnrollError(tr.modal.readerNotResolved)
      return
    }

    const faceData = normalizeFaceData(formData.faceData || formData.photoPreview)
    if (!faceData) {
      setFaceEnrollError(tr.modal.importFacePhotoFirst)
      return
    }

    setIsEnrollingFace(true)
    setFaceEnrollError("")
    setFaceEnrollMessage(tr.modal.faceEnrollInProgress)
    try {
      const employeeApiId = Number(employeeToEdit.apiId)
      if (!Number.isFinite(employeeApiId)) {
        throw new Error(tr.modal.invalidEmployeeApiId)
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
        tr.modal.faceEnrolled(response.success_count, response.target_readers_count)
      )
    } catch (error) {
      setFaceEnrollMessage("")
      setFaceEnrollError(error instanceof Error ? error.message : tr.modal.faceEnrollError)
    } finally {
      setIsEnrollingFace(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const normalizedCardNumber = formData.cardNumber.trim().toLowerCase()
    // Regex téléphone : formats internationaux ou locaux (CI, FR, etc.)
    const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/

    if (!formData.employeeNo.trim()) {
      newErrors.employeeNo = tr.modal.employeeIdRequired
    } else if (formData.employeeNo.trim().length > 20) {
      newErrors.employeeNo = tr.modal.employeeIdTooLong
    }
    if (!formData.name.trim()) {
      newErrors.name = tr.modal.nameRequired
    } else if (formData.name.trim().length > 100) {
      newErrors.name = tr.modal.nameTooLong
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = tr.modal.emailInvalid
    }
    if (formData.phone.trim() && !PHONE_RE.test(formData.phone.trim())) {
      newErrors.phone = tr.modal.phoneInvalid
    }
    if (!formData.departmentId) {
      newErrors.department = tr.modal.departmentRequired
    }
    if (normalizedCardNumber) {
      const hasDuplicateCardNumber = employees.some((employee) => {
        if (employeeToEdit && employee.id === employeeToEdit.id) return false
        const existingCardNumber = (employee.cardNumber ?? "").trim().toLowerCase()
        if (!existingCardNumber || existingCardNumber === "non attribue") return false
        return existingCardNumber === normalizedCardNumber
      })
      if (hasDuplicateCardNumber) {
        newErrors.cardNumber = tr.modal.cardDuplicate
      }
    }
    if (formData.fingerprints.length > 10) {
      newErrors.fingerprints = tr.modal.maxFingerprints
    } else {
      const slots = formData.fingerprints.map((row) => row.fingerIndex)
      if (slots.length !== new Set(slots).size) {
        newErrors.fingerprints = tr.modal.fingerIndexUnique
      } else if (formData.fingerprints.some((row) => !row.template.trim())) {
        newErrors.fingerprints = tr.modal.templateRequired
      }
    }
    if (!formData.validityStart) {
      newErrors.validityStart = tr.modal.validityStartRequired
    }
    if (!formData.validityEnd) {
      newErrors.validityEnd = tr.modal.validityEndRequired
    }
    if (formData.validityStart && formData.validityEnd && formData.validityEnd < formData.validityStart) {
      newErrors.validityEnd = tr.modal.validityOrder
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    const isValid = validateForm()
    if (!isValid) {
      // Rediriger automatiquement vers l'onglet qui contient les erreurs
      const hasFingerprintValidationError =
        formData.fingerprints.length > 10 ||
        new Set(formData.fingerprints.map((row) => row.fingerIndex)).size !== formData.fingerprints.length ||
        formData.fingerprints.some((row) => !row.template.trim())
      if (hasFingerprintValidationError) {
        setActiveTab("biometric")
      } else {
        // Erreurs dans l'onglet info (nom, ID, email, téléphone, département)
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
          throw new Error(tr.modal.invalidDepartment)
        }

        if (isEditing) {
          if (!employeeToEdit?.apiId) {
            throw new Error(tr.modal.missingApiId)
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
            throw new Error(tr.modal.invalidIdAfterCreation)
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
        const message = error instanceof Error ? error.message : tr.modal.apiError
        setApiError(message)
        toast.error(tr.modal.saveFailed, { description: message })
        setIsSubmitting(false)
        return
      }
    }
    const selectedAccessGroups = formData.selectedAccessGroupIds
      .map((groupId) => accessGroups.find((group) => group.id === groupId)?.name)
      .filter((name): name is string => Boolean(name))

    const payload: Employee = {
      id: employeeToEdit?.id ?? createLocalEmployeeId(),
      apiId: savedEmployeeApiId,
      mobileStatus: employeeToEdit?.mobileStatus ?? "none",
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
      validityStart: formData.validityStart || employeeToEdit?.validityStart || new Date().toISOString().split("T")[0],
      validityEnd:
        formData.validityEnd ||
        employeeToEdit?.validityEnd ||
        addYearsToIsoDate(formData.validityStart || employeeToEdit?.validityStart || new Date().toISOString().split("T")[0], 10),
      lastAccess: employeeToEdit?.lastAccess ?? "-",
      accessLogs: employeeToEdit?.accessLogs ?? [],
      isActive: employeeToEdit?.isActive ?? true,
    }

    onAddEmployee(payload)
    toast.success(isEditing ? tr.modal.employeeUpdatedToast : tr.modal.employeeCreatedToast, {
      description: isEditing ? tr.modal.employeeUpdatedDesc : tr.modal.employeeCreatedDesc,
    })
    setIsSubmitting(false)
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    // Pré-remplissage : matricule auto-incrémenté + département racine (organisation elle-même)
    const nextEmployeeNo = computeNextEmployeeNo(employees)
    const defaultDepartmentId = findRootDepartmentId(departments)
    setFormData({
      employeeNo: nextEmployeeNo,
      name: "",
      email: "",
      phone: "",
      departmentId: defaultDepartmentId,
      position: "",
      cardNumber: "",
      selectedAccessGroupIds: [],
      selectedDeviceIds: [],
      fingerprints: [],
      validityStart: getTodayIsoDate(),
      validityEnd: addYearsToIsoDate(getTodayIsoDate(), 10),
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

  // Détecte si le formulaire a été modifié (pour la confirmation de fermeture)
  const isFormDirty = Boolean(
    formData.employeeNo.trim() ||
    formData.name.trim() ||
    formData.email.trim() ||
    formData.phone.trim() ||
    formData.cardNumber.trim() ||
    formData.position.trim() ||
    formData.departmentId ||
    formData.photoPreview ||
    formData.fingerprints.length > 0
  )

  const handleClose = () => {
    // Si c'est une création (pas d'édition) et que le formulaire a été touché, confirmer
    if (!isEditing && isFormDirty) {
      const confirmed = window.confirm(tr.modal.closeConfirm)
      if (!confirmed) return
    }
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
        validityStart: employeeToEdit.validityStart || employeeToEdit.hireDate || getTodayIsoDate(),
        validityEnd:
          employeeToEdit.validityEnd ||
          addYearsToIsoDate(employeeToEdit.validityStart || employeeToEdit.hireDate || getTodayIsoDate(), 10),
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
      <DialogContent className="flex! max-h-[96vh] max-w-[calc(100%-0.5rem)] flex-col! gap-0 overflow-hidden p-0 sm:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <div className="relative shrink-0 overflow-hidden border-b border-border/60 bg-[linear-gradient(135deg,rgba(78,155,255,0.12),rgba(9,16,26,0.98)_44%,rgba(8,13,21,0.99))]">
          <div className="soft-grid absolute inset-0 opacity-15" />
          <div className="absolute -right-16 -top-8 h-48 w-48 rounded-full bg-primary/12 blur-[80px]" />
          <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-cyan-400/6 blur-[60px]" />

          <DialogHeader className="relative gap-3 px-5 pb-3 pt-3 sm:px-6 lg:px-8 lg:pb-4 lg:pt-4">
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={tr.modal.formViewAria}>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "creation"}
                onClick={() => setViewMode("creation")}
                className={cn(
                  "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  viewMode === "creation"
                    ? "border-primary/40 bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(78,155,255,0.4)]"
                    : "border-white/10 bg-white/6 text-white/70 hover:bg-white/10"
                )}
              >
                {isEditing ? tr.modal.editionTab : tr.modal.creationTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "profile"}
                onClick={() => setViewMode("profile")}
                className={cn(
                  "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  viewMode === "profile"
                    ? "border-primary/40 bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(78,155,255,0.4)]"
                    : "border-white/10 bg-white/6 text-white/70 hover:bg-white/10"
                )}
              >
                {tr.modal.profileTab}
              </button>
              {apiError && (
                <Badge variant="outline" className="border-destructive/25 bg-destructive/8 text-destructive">
                  {tr.modal.errorBadge}
                </Badge>
              )}
            </div>

            <div
              className={cn(
                "grid gap-3",
                viewMode === "creation"
                  ? "xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)] xl:items-end"
                  : "grid-cols-1"
              )}
            >
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  {isEditing ? tr.modal.editTitle : tr.modal.addTitle}
                </DialogTitle>
                <DialogDescription className="max-w-xl text-xs leading-relaxed text-slate-300/80">
                  {isEditing ? tr.modal.editDesc : tr.modal.addDesc}
                </DialogDescription>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {identityReady ? tr.modal.identityOk : tr.modal.identityIncomplete}
                  </Badge>
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {tr.modal.groupCount(selectedAccessGroupsCount)}
                  </Badge>
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {tr.modal.readerCount(selectedDevicesCount)}
                  </Badge>
                  <Badge variant="outline" className="border-white/6 bg-white/4 text-[10px] text-slate-300">
                    {tr.modal.fingerprintCount(fingerprintCount)}
                  </Badge>
                </div>
              </div>

              {viewMode === "creation" && (
                <div className="hidden gap-1.5 xl:grid">
                  <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{tr.modal.profileCard}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-white">{formData.name.trim() || tr.modal.newProfile}</p>
                    <p className="text-[10px] text-slate-500">{formData.employeeNo.trim() || tr.modal.idToFill}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{tr.modal.photoCard}</p>
                      <p className="mt-0.5 text-xs font-semibold text-white">{hasFaceAsset ? tr.modal.photoReady : tr.modal.photoNone}</p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{tr.modal.readersCard}</p>
                      <p className="mt-0.5 text-xs font-semibold tabular-nums text-white">{selectedDevicesCount}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>
        </div>

        {viewMode === "profile" && (
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <div className="space-y-5">
              <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-border/60">
                    {formData.photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.photoPreview}
                        alt={tr.modal.employeePhotoAlt}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-secondary text-2xl font-bold text-foreground">
                        {getInitials(formData.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.profileCard}</p>
                    <p className="mt-1 truncate text-lg font-bold text-foreground">
                      {formData.name.trim() || tr.modal.newEmployee}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formData.position.trim() || tr.modal.positionToFill}
                      {" · "}
                      {(departments.find((d) => String(d.id) === formData.departmentId)?.name) || tr.modal.departmentToPick}
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.identitySection}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tr.modal.employeeIdShort}</dt><dd className="font-mono text-foreground">{formData.employeeNo.trim() || "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.employees.email}</dt><dd className="truncate text-foreground">{formData.email.trim() || "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.employees.phone}</dt><dd className="text-foreground">{formData.phone.trim() || "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tr.modal.validityLabel}</dt><dd className="font-mono text-foreground">{formData.validityStart} → {formData.validityEnd}</dd></div>
                  </dl>
                </section>

                <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.accessSection}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tr.modal.badgeNumber}</dt><dd className="font-mono text-foreground">{formData.cardNumber.trim() || "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tr.modal.accessGroupsLabel}</dt><dd className="text-foreground">{selectedAccessGroupsCount}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tr.modal.allowedReaders}</dt><dd className="text-foreground">{selectedDevicesCount}</dd></div>
                  </dl>
                  {selectedAccessGroupsCount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {formData.selectedAccessGroupIds.map((id) => {
                        const group = accessGroups.find((g) => g.id === id)
                        if (!group) return null
                        return (
                          <Badge key={id} variant="outline" className="border-primary/30 bg-primary/10 text-xs text-primary">
                            {group.name}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-border/60 bg-card/60 p-5 md:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.biometricsSection}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tr.modal.photoLabel}</dt><dd className="text-foreground">{hasFaceAsset ? tr.modal.photoReady : tr.modal.photoNotProvided}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tr.modal.fingerprintsLabel}</dt><dd className="text-foreground">{fingerprintCount} / 10</dd></div>
                  </dl>
                </section>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setViewMode("creation")}
                >
                  {tr.modal.backToEdit}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("flex flex-1 flex-col overflow-hidden", viewMode === "profile" && "hidden")}>
          <div className="border-b border-border/60 bg-background/50 px-4 py-2 backdrop-blur-sm sm:px-6 lg:px-8">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl p-1">
              <TabsTrigger value="info" className="relative min-h-9 gap-2 text-xs">
                <User className="h-4 w-4" />
                {tr.modal.tabInfo}
                {hasInfoErrors && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="access" className="min-h-9 gap-2 text-xs">
                <CreditCard className="h-4 w-4" />
                {tr.modal.tabAccess}
              </TabsTrigger>
              <TabsTrigger value="biometric" className="relative min-h-9 gap-2 text-xs">
                <Fingerprint className="h-4 w-4" />
                {tr.modal.tabBiometric}
                {hasBiometricErrors && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
            <TabsContent value="info" className="mt-0 space-y-3">
              <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
                <section className="rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.portrait}</p>
                  <div className="mt-2 flex flex-col items-center gap-2 text-center">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-2 border-dashed border-border/60 shadow-[0_12px_28px_rgba(0,0,0,0.15)]">
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

                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">{formData.name.trim() || tr.modal.newProfile}</p>
                      <p className="text-[10px] text-muted-foreground/80">
                        {tr.modal.photoRecommended}
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-1.5 xl:grid-cols-2">
                      <div className="rounded-lg border border-border/60 bg-background/30 px-2 py-1.5 text-left">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.profileCard}</p>
                        <p className="text-[11px] text-foreground">
                          {identityReady ? tr.modal.profileComplete : tr.modal.profileToComplete}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/30 px-2 py-1.5 text-left">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.photoCard}</p>
                        <p className="text-[11px] text-foreground">
                          {hasFaceAsset ? tr.modal.photoReady : tr.modal.photoNone}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="space-y-3">
                  <section className="rounded-2xl border border-border/60 bg-card/80 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.identitySection}</p>
                        <h3 className="text-sm font-bold text-foreground">{tr.modal.mainInfo}</h3>
                      </div>
                    </div>

                    <div className="grid gap-2.5 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="employeeNo" className="flex items-center gap-2 text-xs">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {tr.modal.employeeIdLabel}
                        </Label>
                        <Input
                          id="employeeNo"
                          aria-invalid={Boolean(errors.employeeNo)}
                          placeholder={tr.modal.employeeIdPlaceholder}
                          value={formData.employeeNo}
                          maxLength={20}
                          onChange={(e) => handleInputChange("employeeNo", e.target.value)}
                          className={cn("h-9 rounded-xl", errors.employeeNo && "border-destructive")}
                        />
                        <p className={cn("text-[10px] leading-tight", errors.employeeNo ? "text-destructive" : "text-muted-foreground")}>
                          {errors.employeeNo || tr.modal.employeeIdHelp}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="name" className="flex items-center gap-2 text-xs">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {tr.modal.fullNameLabel}
                        </Label>
                        <Input
                          id="name"
                          aria-invalid={Boolean(errors.name)}
                          placeholder={tr.modal.fullNamePlaceholder}
                          value={formData.name}
                          maxLength={100}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className={cn("h-9 rounded-xl", errors.name && "border-destructive")}
                        />
                        <p className={cn("text-[10px] leading-tight", errors.name ? "text-destructive" : "text-muted-foreground")}>
                          {errors.name || tr.modal.fullNameHelp}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border/60 bg-card/80 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-4">
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.orgSection}</p>
                      <h3 className="text-sm font-bold text-foreground">{tr.modal.professionalContext}</h3>
                    </div>

                    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="email" className="flex items-center gap-2 text-xs">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.employees.email}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          aria-invalid={Boolean(errors.email)}
                          placeholder={tr.modal.emailPlaceholder}
                          value={formData.email}
                          maxLength={150}
                          autoComplete="email"
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className={cn("h-9 rounded-xl", errors.email && "border-destructive")}
                        />
                        <p className={cn("text-[10px] leading-tight", errors.email ? "text-destructive" : "text-muted-foreground")}>
                          {errors.email || tr.modal.emailHelp}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="phone" className="flex items-center gap-2 text-xs">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.employees.phone}
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={tr.modal.phonePlaceholder}
                          value={formData.phone}
                          maxLength={20}
                          inputMode="tel"
                          aria-invalid={Boolean(errors.phone)}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className={cn("h-9 rounded-xl", errors.phone && "border-destructive")}
                        />
                        <p className={cn("text-[10px] leading-tight", errors.phone ? "text-destructive" : "text-muted-foreground")}>
                          {errors.phone || tr.modal.phoneHelp}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label className="flex items-center gap-2 text-xs">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {tr.modal.departmentLabel}
                        </Label>
                        <Select
                          value={formData.departmentId}
                          onValueChange={(value) => handleInputChange("departmentId", value)}
                        >
                          <SelectTrigger className={cn("h-9 rounded-xl", errors.department && "border-destructive")}>
                            <SelectValue placeholder={tr.modal.departmentPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => {
                              const isRoot = dept.parent === null || dept.parent === undefined
                              return (
                                <SelectItem key={dept.id} value={String(dept.id)}>
                                  {dept.name}{isRoot ? tr.modal.rootSuffix : ""}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        <p className={cn("text-[10px] leading-tight", errors.department ? "text-destructive" : "text-muted-foreground")}>
                          {errors.department || tr.modal.departmentHelp}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="position" className="flex items-center gap-2 text-xs">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          {tr.modal.positionLabel}
                        </Label>
                        <Input
                          id="position"
                          placeholder={tr.modal.positionPlaceholder}
                          value={formData.position}
                          maxLength={80}
                          onChange={(e) => handleInputChange("position", e.target.value)}
                          className={cn("h-9 rounded-xl", errors.position && "border-destructive")}
                        />
                        <p className={cn("text-[10px] leading-tight", errors.position ? "text-destructive" : "text-muted-foreground")}>
                          {errors.position || tr.modal.positionHelp}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="validityStart" className="flex items-center gap-2 text-xs">
                          {tr.modal.validityStartLabel}
                        </Label>
                        <Input
                          id="validityStart"
                          type="date"
                          aria-invalid={Boolean(errors.validityStart)}
                          value={formData.validityStart}
                          onChange={(e) => handleInputChange("validityStart", e.target.value)}
                          className={cn("h-9 rounded-xl", errors.validityStart && "border-destructive")}
                        />
                        <p className={cn("text-[10px] leading-tight", errors.validityStart ? "text-destructive" : "text-muted-foreground")}>
                          {errors.validityStart || tr.modal.validityStartHelp}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="validityEnd" className="flex items-center gap-2 text-xs">
                          {tr.modal.validityEndLabel}
                        </Label>
                        <Input
                          id="validityEnd"
                          type="date"
                          aria-invalid={Boolean(errors.validityEnd)}
                          value={formData.validityEnd}
                          onChange={(e) => handleInputChange("validityEnd", e.target.value)}
                          className={cn("h-9 rounded-xl", errors.validityEnd && "border-destructive")}
                        />
                        <p className={cn("text-[10px] leading-tight", errors.validityEnd ? "text-destructive" : "text-muted-foreground")}>
                          {errors.validityEnd || tr.modal.validityEndHelp}
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
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.physicalCard}</p>
                    <h3 className="text-base font-bold text-foreground">{tr.modal.cardNumberTitle}</h3>
                    <p className="text-sm text-muted-foreground/80">{tr.modal.cardNumberSubtitle}</p>
                  </div>
                  <Badge variant="secondary" className="w-fit bg-primary/8 text-primary">
                    {formData.cardNumber.trim() ? tr.modal.cardOk : tr.modal.cardOptional}
                  </Badge>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {tr.modal.cardNumberLabel}
                    </Label>
                    <Input
                      id="cardNumber"
                      aria-invalid={Boolean(errors.cardNumber)}
                      placeholder={tr.modal.cardNumberPlaceholder}
                      value={formData.cardNumber}
                      maxLength={32}
                      onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                      className={cn("h-11 rounded-2xl font-mono tabular-nums", errors.cardNumber && "border-destructive")}
                    />
                    <p className={cn("text-xs", errors.cardNumber ? "text-destructive" : "text-muted-foreground")}>
                      {errors.cardNumber || tr.modal.cardNumberHelp}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.assistedRead}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground/80">
                      {tr.modal.assistedReadDesc}
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
                      <SelectValue placeholder={isLoadingReaders ? tr.modal.loadingReaders : tr.modal.pickOnlineReader} />
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
                    {tr.modal.refresh}
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
                        {tr.modal.reading}
                      </>
                    ) : (
                      <>
                        <Radio className="mr-2 h-4 w-4" />
                        {tr.modal.readCard}
                      </>
                    )}
                  </Button>
                </div>

                {(cardReadMessage || cardReadError || (!isLoadingReaders && onlineReaders.length === 0 && !cardReadError)) && (
                  <div className="mt-4 space-y-2">
                    {cardReadMessage && (
                      <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-200">
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
                        {tr.modal.noOnlineReader}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tr.modal.permissions}</p>
                      <h3 className="text-base font-bold text-foreground">{tr.modal.accessGroupsTitle}</h3>
                    </div>
                    <Badge variant="secondary" className="bg-primary/8 text-primary tabular-nums">
                      {tr.modal.selectedCount(selectedAccessGroupsCount)}
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
                              aria-label={tr.modal.removeGroup(groupName)}
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
                      <p className="text-sm text-muted-foreground">{tr.modal.noGroupsForTenant}</p>
                    )}
                  </div>
                </section>

              {/* Readers / Devices */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-muted-foreground" />
                    {tr.modal.allowedReadersLabel}
                  </Label>
                  {formData.selectedDeviceIds.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/8 text-primary tabular-nums">
                      {tr.modal.selectedCount(formData.selectedDeviceIds.length)}
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
                      {tr.modal.noDevicesForTenant}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tr.modal.linkReaderHint}
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
                  {tr.modal.facePhotoLabel}
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
                        {tr.modal.photoReadyTitle}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {tr.modal.photoReadyDesc}
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
                      {tr.modal.deletePhoto}
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
                        {tr.modal.uploadPhotoTitle}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {tr.modal.uploadPhotoHint}
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
                                ? tr.modal.loadingReaders
                                : tr.modal.pickFaceReader
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
                        {tr.modal.refresh}
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
                            {tr.modal.enrolling}
                          </>
                        ) : (
                          tr.modal.enrollOnReader
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
                      {tr.modal.enrollAfterCreation}
                    </p>
                  )}
                  {!normalizeFaceData(formData.faceData || formData.photoPreview) && (
                    <p className="text-xs text-muted-foreground">
                      {tr.modal.importPhotoFirst}
                    </p>
                  )}
                </div>
              </div>

              {/* Fingerprint */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    {tr.modal.fingerprintsTitle}
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
                          <SelectValue placeholder={tr.modal.fingerPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, index) => {
                            const slot = index + 1
                            return (
                              <SelectItem key={slot} value={String(slot)}>
                                {tr.modal.fingerOption(slot)}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Input
                        placeholder={tr.modal.fingerprintTemplatePlaceholder}
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
                        {tr.modal.addFingerprint}
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
                            {tr.modal.capturing}
                          </>
                        ) : (
                          tr.modal.captureOnReader
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
                                ? tr.modal.loadingReaders
                                : tr.modal.pickEnrollReader
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
                      {tr.modal.refreshReaders}
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
                      {tr.modal.captureAfterCreation}
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
                              {tr.modal.fingerLine(fingerprint.fingerIndex)}
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
                      {tr.modal.noFingerprints}
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
                  <strong className="font-semibold text-foreground">{tr.modal.templatesNote}</strong>{" "}
                  {tr.modal.templatesNoteBody}
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

        <DialogFooter className="gap-2 border-t border-border/60 px-5 py-2.5 sm:px-6 lg:px-8">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleClose} disabled={isSubmitting}>
            {t.common.cancel}
          </Button>
          <Button size="sm" className="rounded-xl" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? tr.modal.saving : tr.modal.creating}
              </>
            ) : (
              isEditing ? tr.modal.saveChanges : tr.modal.createEmployee
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
