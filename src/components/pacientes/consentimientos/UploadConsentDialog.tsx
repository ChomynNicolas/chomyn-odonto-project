"use client"

import type React from "react"

import { useState } from "react"
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
import { Upload, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { ResponsableSelector } from "./ResponsableSelector"

const uploadSchema = z.object({
  responsablePersonaId: z.number().min(1, "Selecciona un responsable"),
  firmadoEn: z.string().min(1, "La fecha de firma es requerida"),
  observaciones: z.string().optional(),
  file: z.instanceof(File, { message: "Selecciona un archivo" }),
})

type UploadFormData = z.infer<typeof uploadSchema>

/**
 * Props del componente UploadConsentDialog.
 * 
 * @remarks
 * Este diálogo permite subir un consentimiento informado firmado para un paciente menor de edad.
 * 
 * Permisos:
 * - ADMIN: Puede subir consentimientos
 * - ODONT: Puede subir consentimientos
 * - RECEP: Puede subir consentimientos (permite que recepcionista complete el flujo)
 * 
 * Flujo de uso:
 * 1. Usuario selecciona responsable que firma
 * 2. Usuario ingresa fecha de firma
 * 3. Usuario sube archivo (PDF o imagen)
 * 4. Sistema valida y sube a Cloudinary
 * 5. Sistema registra consentimiento en BD asociado al paciente (y opcionalmente a la cita)
 * 6. Se ejecuta onSuccess callback para actualizar UI
 */
interface UploadConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteId: number
  citaId?: number // Opcional: para asociar el consentimiento a una cita específica
  onSuccess: () => void
}

export function UploadConsentDialog({ open, onOpenChange, pacienteId, citaId, onSuccess }: UploadConsentDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  })

  const responsableId = watch("responsablePersonaId")

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
      const consentResponse = await fetch(`/api/pacientes/${pacienteId}/consentimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsablePersonaId: data.responsablePersonaId,
          tipo: "CONSENTIMIENTO_MENOR_ATENCION",
          firmadoEn: new Date(data.firmadoEn).toISOString(),
          vigenciaEnMeses: 12, // Default 12 meses
          citaId: citaId ?? null, // Asociar a la cita si se proporciona
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
        }),
      })

      const consentData = await consentResponse.json()
      
      if (!consentResponse.ok || !consentData.ok) {
        throw new Error(consentData.error || consentData.message || "Error al registrar el consentimiento")
      }

      toast.success("Consentimiento registrado", {
        description: citaId
          ? "El consentimiento ha sido subido y asociado a esta cita exitosamente"
          : "El consentimiento ha sido subido y registrado exitosamente",
      })

      reset()
      setSelectedFile(null)
      setPreviewUrl(null)
      onSuccess()
    } catch (error: unknown) {
      console.error("[v0] Error uploading consent:", error)
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error al procesar el archivo"
      toast.error("Error al subir consentimiento", {
        description: errorMessage,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subir consentimiento informado</DialogTitle>
          <DialogDescription>
            {citaId
              ? "Sube el consentimiento firmado por el responsable del paciente menor de edad. Este consentimiento será asociado a esta cita y permitirá iniciar la consulta."
              : "Sube el consentimiento firmado por el responsable del paciente menor de edad. El documento debe estar digitalizado en formato PDF o imagen."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Paso 1: Seleccionar responsable */}
          <div className="space-y-2">
            <Label>Responsable que firma</Label>
            <ResponsableSelector
              pacienteId={pacienteId}
              value={responsableId}
              onChange={(id) => setValue("responsablePersonaId", id)}
            />
            {errors.responsablePersonaId && (
              <p className="text-sm text-destructive">{errors.responsablePersonaId.message}</p>
            )}
          </div>

          {/* Paso 2: Fecha de firma */}
          <div className="space-y-2">
            <Label htmlFor="firmadoEn">Fecha de firma</Label>
            <Input id="firmadoEn" type="date" {...register("firmadoEn")} />
            {errors.firmadoEn && <p className="text-sm text-destructive">{errors.firmadoEn.message}</p>}
          </div>

          {/* Paso 3: Subir archivo */}
          <div className="space-y-2">
            <Label htmlFor="file">Archivo (PDF, PNG o JPEG - máx. 10MB)</Label>
            <div className="flex flex-col gap-4">
              <Input
                id="file"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
              />
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
                    alt="Preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
            {errors.file && <p className="text-sm text-destructive">{errors.file.message}</p>}
          </div>

          {/* Paso 4: Observaciones opcionales */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea id="observaciones" {...register("observaciones")} rows={3} />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este consentimiento será válido por 12 meses desde la fecha de firma y permitirá el inicio de atención
              para el paciente menor de edad.
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
