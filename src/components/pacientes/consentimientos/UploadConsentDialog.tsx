"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, Loader2, AlertCircle, CheckCircle, User, Users } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { ResponsableSelector } from "./ResponsableSelector"
import { 
  type PatientInfo, 
  type ConsentType,
  type ConsentWorkflowState,
  getConsentWorkflow,
  validateSignatureDate,
  getTodayDateString,
  isMinor
} from "./types"

// Base schema for upload form
const baseUploadSchema = z.object({
  responsablePersonaId: z.number().min(1, "ID de responsable requerido"),
  firmadoEn: z.string().min(1, "La fecha de firma es requerida").refine((date) => {
    const error = validateSignatureDate(date)
    return error === null
  }, {
    message: "Fecha de firma inválida"
  }),
  observaciones: z.string().optional(),
  file: z.instanceof(File, { message: "Selecciona un archivo" }),
  tipo: z.enum(["CONSENTIMIENTO_MENOR_ATENCION", "CIRUGIA"]),
})

// Create conditional schema based on consent workflow
const createUploadSchema = (workflow: Pick<ConsentWorkflowState, 'requiresGuardian' | 'canSelfSign'>) => {
  return baseUploadSchema.refine((data) => {
    // For guardian-required workflows, ensure responsablePersonaId is set
    if (workflow.requiresGuardian && (!data.responsablePersonaId || data.responsablePersonaId <= 0)) {
      return false
    }
    return true
  }, {
    message: workflow.requiresGuardian ? "Selecciona un responsable" : "ID de responsable requerido",
    path: ["responsablePersonaId"]
  })
}

type UploadFormData = z.infer<typeof baseUploadSchema>

/**
 * Props del componente UploadConsentDialog.
 * 
 * @remarks
 * Este diálogo permite subir un consentimiento informado con lógica diferenciada para adultos y menores.
 * 
 * Permisos:
 * - ADMIN: Puede subir consentimientos
 * - ODONT: Puede subir consentimientos
 * - RECEP: Puede subir consentimientos (permite que recepcionista complete el flujo)
 * 
 * Flujo de uso:
 * 1. Sistema determina si paciente es menor o adulto
 * 2. Para adultos con cirugía: paciente firma su propio consentimiento
 * 3. Para menores: responsable legal debe firmar
 * 4. Usuario ingresa fecha de firma (default: hoy)
 * 5. Usuario sube archivo (PDF o imagen)
 * 6. Sistema valida y sube a Cloudinary
 * 7. Sistema registra consentimiento en BD asociado al paciente y cita
 * 8. Se ejecuta onSuccess callback para actualizar UI
 */
interface UploadConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteId: number
  patientInfo?: PatientInfo // Patient information including birth date
  citaId?: number // Required for surgery consents, optional for others
  onSuccess: () => void
  consentType?: ConsentType // Type of consent to upload
}

export function UploadConsentDialog({ 
  open, 
  onOpenChange, 
  pacienteId, 
  patientInfo,
  citaId, 
  onSuccess, 
  consentType = "CONSENTIMIENTO_MENOR_ATENCION"
}: UploadConsentDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPatientInfo, setLoadingPatientInfo] = useState(false)
  const [currentPatientInfo, setCurrentPatientInfo] = useState<PatientInfo | null>(patientInfo || null)

  // Determine consent workflow based on patient info and consent type
  const workflow = useMemo(() => {
    if (!currentPatientInfo) {
      return { isMinor: false, requiresGuardian: false, canSelfSign: true }
    }
    return getConsentWorkflow(currentPatientInfo, consentType)
  }, [currentPatientInfo, consentType])

  // Create schema based on workflow
  const uploadSchema = useMemo(() => createUploadSchema(workflow), [workflow])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      tipo: consentType as "CONSENTIMIENTO_MENOR_ATENCION" | "CIRUGIA",
      firmadoEn: getTodayDateString(), // Default to today
      // Set initial responsablePersonaId if we have patient info and it's adult surgery
      responsablePersonaId: (workflow.canSelfSign && currentPatientInfo && consentType === "CIRUGIA") 
        ? currentPatientInfo.personaId 
        : 1, // Use 1 as default (will be overridden)
    },
  })

  const responsableId = watch("responsablePersonaId")
  const firmadoEn = watch("firmadoEn")

  // Debug: Log form values
  useEffect(() => {
    console.log("Form values changed:", {
      responsableId,
      firmadoEn,
      workflow,
      currentPatientInfo,
      consentType
    })
  }, [responsableId, firmadoEn, workflow, currentPatientInfo, consentType])

  // Load patient info if not provided
  useEffect(() => {
    if (!patientInfo && open) {
      setLoadingPatientInfo(true)
      fetch(`/api/pacientes/${pacienteId}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.data?.persona) {
            const persona = data.data.persona
            const patientInfo = {
              id: pacienteId,
              personaId: persona.idPersona,
              nombres: persona.nombres,
              apellidos: persona.apellidos,
              fechaNacimiento: persona.fechaNacimiento,
              documento: persona.documento
            }
            setCurrentPatientInfo(patientInfo)
            
            // Auto-set responsible party immediately if it's adult surgery
            if (consentType === "CIRUGIA") {
              const isMinorPatient = isMinor(persona.fechaNacimiento)
              if (!isMinorPatient) {
                console.log("Auto-setting responsible party during patient load:", {
                  personaId: persona.idPersona,
                  patientName: `${persona.nombres} ${persona.apellidos}`,
                  isMinor: isMinorPatient
                })
                setValue("responsablePersonaId", persona.idPersona)
              }
            }
          }
        })
        .catch(error => {
          console.error('Error loading patient info:', error)
          toast.error('Error al cargar información del paciente')
        })
        .finally(() => {
          setLoadingPatientInfo(false)
        })
    }
  }, [pacienteId, patientInfo, open, consentType, setValue])


  // Auto-set responsible party for adult surgery consents
  useEffect(() => {
    if (workflow.canSelfSign && currentPatientInfo && consentType === "CIRUGIA" && open) {
      console.log("Auto-setting responsible party for adult surgery consent:", {
        patientPersonaId: currentPatientInfo.personaId,
        patientName: `${currentPatientInfo.nombres} ${currentPatientInfo.apellidos}`,
        consentType,
        workflow,
        currentFormValue: responsableId,
        dialogOpen: open
      })
      
      // Force set the value multiple times to ensure it sticks
      setValue("responsablePersonaId", currentPatientInfo.personaId, { 
        shouldValidate: true, 
        shouldDirty: true 
      })
      
      // Verify the value was set
      setTimeout(() => {
        const currentValue = watch("responsablePersonaId")
        console.log("Verification - responsablePersonaId after setValue:", currentValue)
        if (currentValue !== currentPatientInfo.personaId) {
          console.warn("ResponsablePersonaId was not set correctly, forcing again...")
          setValue("responsablePersonaId", currentPatientInfo.personaId, { 
            shouldValidate: true, 
            shouldDirty: true 
          })
        }
      }, 100)
    }
  }, [workflow, currentPatientInfo, consentType, setValue, responsableId, watch, open])

  // Reset form when dialog closes but preserve responsible party when it opens for adult surgery
  useEffect(() => {
    if (open) {
      // Reset form with appropriate default values
      const defaultValues = {
        tipo: consentType as "CONSENTIMIENTO_MENOR_ATENCION" | "CIRUGIA",
        firmadoEn: getTodayDateString(),
        responsablePersonaId: (workflow.canSelfSign && currentPatientInfo && consentType === "CIRUGIA") 
          ? currentPatientInfo.personaId 
          : 1, // Use 1 as default (will be overridden)
      }
      
      console.log("Resetting form with default values:", defaultValues)
      reset(defaultValues)
      
      // Clear file selection
      setSelectedFile(null)
      setPreviewUrl(null)
    }
  }, [open, consentType, workflow, currentPatientInfo, reset])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de archivo no válido. Solo se permiten PDF, PNG y JPEG")
      return
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("El archivo es muy grande. Máximo 10MB")
      return
    }

    setSelectedFile(file)
    setValue("file", file)

    // Generar preview para imágenes
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const onSubmit = async (data: UploadFormData) => {
    console.log("=== FORM SUBMISSION DEBUG ===")
    console.log("Form data:", data)
    console.log("Current patient info:", currentPatientInfo)
    console.log("Workflow:", workflow)
    console.log("Consent type:", consentType)
    console.log("Expected persona ID:", currentPatientInfo?.personaId)
    console.log("Actual responsablePersonaId being sent:", data.responsablePersonaId)
    console.log("Are they equal?", data.responsablePersonaId === currentPatientInfo?.personaId)
    console.log("=== END DEBUG ===")

    // Last-minute validation and correction for adult surgery consents
    if (workflow.canSelfSign && currentPatientInfo && consentType === "CIRUGIA") {
      if (data.responsablePersonaId !== currentPatientInfo.personaId) {
        console.warn("CRITICAL: ResponsablePersonaId mismatch detected, correcting before submission...")
        console.warn("Expected:", currentPatientInfo.personaId, "Got:", data.responsablePersonaId)
        
        // Force correct the data before submission
        data.responsablePersonaId = currentPatientInfo.personaId
        
        console.log("Corrected responsablePersonaId to:", data.responsablePersonaId)
      }
    }

    setUploading(true)

    try {
      // Paso 1: Obtener signature de Cloudinary
      // Determinar el tipo de archivo según la extensión
      const fileType = data.file.type
      let adjuntoTipo: "PDF" | "DOCUMENT" | "IMAGE" = "DOCUMENT"
      if (fileType === "application/pdf") {
        adjuntoTipo = "PDF"
      } else if (fileType.startsWith("image/")) {
        adjuntoTipo = "IMAGE"
      }

      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          tipo: adjuntoTipo,
          accessMode: "AUTHENTICATED", // Consentimientos deben ser privados
        }),
      })

      if (!signResponse.ok) {
        const errorData = await signResponse.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al firmar el upload")
      }

      const signData = await signResponse.json()
      if (!signData.ok) {
        throw new Error(signData.error || "Error al firmar el upload")
      }

      const { signature, cloudName, apiKey, folder, timestamp } = signData.data

      // Paso 2: Subir a Cloudinary
      const formData = new FormData()
      formData.append("file", data.file)
      formData.append("api_key", apiKey)
      formData.append("timestamp", String(timestamp))
      formData.append("signature", signature)
      formData.append("folder", folder)
      formData.append("access_mode", "authenticated") // Consentimientos privados

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Error al subir el archivo a Cloudinary")
      }

      const uploadResult = await uploadResponse.json()

      // Paso 3: Registrar consentimiento en la base de datos
      const consentPayload = {
        responsablePersonaId: data.responsablePersonaId,
        tipo: data.tipo,
        firmadoEn: new Date(data.firmadoEn).toISOString(),
        // Remove vigenciaEnMeses for appointment-specific consents (surgery)
        ...(data.tipo !== "CIRUGIA" && { vigenciaEnMeses: 12 }),
        citaId: citaId ?? null, // Required for surgery consents
        observaciones: data.observaciones || null,
        cloudinary: {
          publicId: uploadResult.public_id,
          secureUrl: uploadResult.secure_url,
          format: uploadResult.format || undefined,
          bytes: uploadResult.bytes,
          width: uploadResult.width || undefined,
          height: uploadResult.height || undefined,
          hash: uploadResult.etag || undefined,
        },
      }

      console.log("Sending consent payload:", {
        ...consentPayload,
        patientInfo: currentPatientInfo,
        workflow,
        consentType
      })

      const consentResponse = await fetch(`/api/pacientes/${pacienteId}/consentimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentPayload),
      })

      const consentData = await consentResponse.json()
      
      if (!consentResponse.ok || !consentData.ok) {
        // Handle specific backend errors with better messaging
        const errorMessage = consentData.error || consentData.message || "Error al registrar el consentimiento"
        
        if (errorMessage.includes("adultos") && errorMessage.includes("propio paciente")) {
          throw new Error("Para pacientes adultos, el consentimiento debe ser firmado por el propio paciente. Por favor, verifica la selección del responsable.")
        } else if (errorMessage.includes("autoridad legal")) {
          throw new Error("El responsable seleccionado no tiene autoridad legal para firmar consentimientos. Por favor, selecciona un responsable autorizado.")
        } else if (errorMessage.includes("cita específica")) {
          throw new Error("Los consentimientos de cirugía deben estar asociados a una cita específica.")
        }
        
        throw new Error(errorMessage)
      }

      const successMessage = workflow.canSelfSign && consentType === "CIRUGIA"
        ? "Consentimiento de cirugía registrado exitosamente"
        : workflow.requiresGuardian
        ? "Consentimiento del responsable registrado exitosamente"
        : "Consentimiento registrado exitosamente"

      toast.success("Consentimiento registrado", {
        description: citaId
          ? `${successMessage} y asociado a esta cita`
          : successMessage,
      })

      reset()
      setSelectedFile(null)
      setPreviewUrl(null)
      onSuccess()
    } catch (error: unknown) {
      console.error("Error uploading consent:", error)
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error al procesar el archivo"
      
      toast.error("Error al subir consentimiento", {
        description: errorMessage,
        duration: 6000, // Longer duration for error messages
      })
    } finally {
      setUploading(false)
    }
  }

  // Show loading state while patient info is being loaded
  if (loadingPatientInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Cargando información del paciente...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!currentPatientInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar la información del paciente. Por favor, intenta nuevamente.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    )
  }

  const getDialogTitle = () => {
    if (consentType === "CIRUGIA") {
      return workflow.canSelfSign 
        ? "Consentimiento de cirugía - Firma del paciente"
        : "Consentimiento de cirugía - Firma del responsable"
    }
    return workflow.requiresGuardian 
      ? "Consentimiento informado - Firma del responsable"
      : "Consentimiento informado"
  }

  const getDialogDescription = () => {
    const patientName = `${currentPatientInfo.nombres} ${currentPatientInfo.apellidos}`.trim()
    
    if (consentType === "CIRUGIA") {
      if (workflow.canSelfSign) {
        return `Sube el consentimiento de cirugía firmado por ${patientName}. Este consentimiento es específico para esta cita y permitirá realizar el procedimiento quirúrgico.`
      } else {
        return `Sube el consentimiento de cirugía firmado por el responsable legal de ${patientName}. Este consentimiento es específico para esta cita y permitirá realizar el procedimiento quirúrgico.`
      }
    } else {
      if (workflow.requiresGuardian) {
        return `Sube el consentimiento firmado por el responsable legal de ${patientName}. El documento debe estar digitalizado en formato PDF o imagen.`
      } else {
        return `Sube el consentimiento firmado por ${patientName}. El documento debe estar digitalizado en formato PDF o imagen.`
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {workflow.canSelfSign ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Patient Information Display */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Información del paciente</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Nombre:</strong> {currentPatientInfo.nombres} {currentPatientInfo.apellidos}</p>
              <p><strong>Edad:</strong> {workflow.isMinor ? "Menor de edad" : "Mayor de edad"}</p>
              {consentType === "CIRUGIA" && (
                <p><strong>Tipo:</strong> Consentimiento específico para esta cita quirúrgica</p>
              )}
            </div>
          </div>

          {/* Responsible Party Selection - Only show for minors or when guardian is required */}
          {workflow.requiresGuardian && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsable que firma el consentimiento
              </Label>
              <ResponsableSelector
                pacienteId={pacienteId}
                value={responsableId}
                onChange={(id) => setValue("responsablePersonaId", id)}
                allowSelfForSurgery={false} // Never allow self for minors
              />
              {errors.responsablePersonaId && (
                <p className="text-sm text-destructive">{errors.responsablePersonaId.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                El responsable debe tener autoridad legal para firmar consentimientos médicos.
              </p>
            </div>
          )}

          {/* Adult Self-Signing Info */}
          {workflow.canSelfSign && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Paciente que firma
              </Label>
              <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    {currentPatientInfo.nombres} {currentPatientInfo.apellidos}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Como paciente adulto, usted firmará su propio consentimiento de cirugía.
                </p>
              </div>
            </div>
          )}

          {/* Signature Date */}
          <div className="space-y-2">
            <Label htmlFor="firmadoEn" className="flex items-center gap-2">
              Fecha de firma
              <span className="text-xs text-muted-foreground">(editable)</span>
            </Label>
            <Input 
              id="firmadoEn" 
              type="date" 
              {...register("firmadoEn")}
              max={getTodayDateString()} // Prevent future dates beyond today
            />
            {errors.firmadoEn && <p className="text-sm text-destructive">{errors.firmadoEn.message}</p>}
            <p className="text-xs text-muted-foreground">
              Por defecto se establece la fecha de hoy. Puede modificarla si el consentimiento fue firmado en otra fecha.
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Archivo del consentimiento firmado</Label>
            <div className="flex flex-col gap-4">
              <Input
                id="file"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: PDF, PNG, JPEG. Tamaño máximo: 10MB
              </p>
              
              {selectedFile && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    {selectedFile.type === "application/pdf" && <FileText className="h-5 w-5 text-red-500" />}
                  </AlertDescription>
                </Alert>
              )}
              
              {previewUrl && (
                <div className="relative h-48 w-full overflow-hidden rounded-lg border bg-muted/30">
                  <Image
                    src={previewUrl}
                    alt="Vista previa del consentimiento"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
            {errors.file && <p className="text-sm text-destructive">{errors.file.message}</p>}
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones adicionales (opcional)</Label>
            <Textarea 
              id="observaciones" 
              {...register("observaciones")} 
              rows={3}
              placeholder="Cualquier información adicional sobre el consentimiento..."
            />
          </div>

          {/* Consent Validity Information */}
          <Alert className={consentType === "CIRUGIA" ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950" : ""}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {consentType === "CIRUGIA" ? (
                <>
                  <strong>Consentimiento específico para cirugía:</strong> Este consentimiento es válido únicamente para la cita quirúrgica asociada. 
                  {citaId ? " Se asociará automáticamente a esta cita." : " Debe estar asociado a una cita específica."}
                </>
              ) : (
                <>
                  <strong>Consentimiento general:</strong> Este consentimiento será válido por 12 meses desde la fecha de firma 
                  {workflow.requiresGuardian ? " y permitirá la atención del paciente menor de edad." : " y permitirá la atención del paciente."}
                </>
              )}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir consentimiento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
