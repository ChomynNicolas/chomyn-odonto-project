"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileText, ImageIcon, Loader2 } from "lucide-react"
import type { AttachmentType } from "@/lib/types/patient"
import { useCreateAttachment } from "@/hooks/useAttachments"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
  validateFile,
  formatFileSize,
} from "@/lib/validation/file-validation"

interface AttachmentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteId: string
  onSuccess?: () => void
}

export function AttachmentUploadDialog({
  open,
  onOpenChange,
  pacienteId,
  onSuccess,
}: AttachmentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [tipo, setTipo] = useState<AttachmentType>("OTHER")
  const [descripcion, setDescripcion] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createAttachment = useCreateAttachment(pacienteId)

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      return
    }

    // Validate file using shared validation utility
    const validation = validateFile(selectedFile)
    if (!validation.valid) {
      toast.error("Archivo inválido", {
        description: validation.error || "El archivo no cumple con los requisitos",
      })
      return
    }

    // Auto-detect type from file
    if (selectedFile.type === "application/pdf") {
      setTipo("PDF")
    } else if (selectedFile.type.startsWith("image/")) {
      // Default to IMAGE, user can change
      if (tipo === "OTHER") {
        setTipo("IMAGE")
      }
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecciona un archivo")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Get upload signature (with file metadata for pre-validation)
      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId: Number.parseInt(pacienteId),
          tipo,
          accessMode: "AUTHENTICATED",
          fileSize: file.size,
          fileType: file.type,
          fileName: file.name,
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

      const { signature, cloudName, apiKey, folder, timestamp, accessMode } = signData.data

      // Step 2: Upload to Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      formData.append("api_key", apiKey)
      formData.append("timestamp", String(timestamp))
      formData.append("signature", signature)
      formData.append("folder", folder)
      formData.append("access_mode", accessMode.toLowerCase())

      // Simulate progress (Cloudinary doesn't provide real progress via fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Error al subir el archivo a Cloudinary")
      }

      const uploadResult = await uploadResponse.json()

      // Step 3: Create attachment record
      await createAttachment.mutateAsync({
        pacienteId,
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        bytes: uploadResult.bytes,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
        resourceType: uploadResult.resource_type,
        folder: uploadResult.folder,
        originalFilename: uploadResult.original_filename || file.name,
        accessMode: accessMode,
        tipo,
        descripcion: descripcion || undefined,
      })

      // Reset form
      setFile(null)
      setTipo("OTHER")
      setDescripcion("")
      setUploadProgress(0)
      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error("Error uploading attachment:", error)
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error al subir el archivo"
      toast.error("Error al subir archivo", {
        description: errorMessage,
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      setTipo("OTHER")
      setDescripcion("")
      setUploadProgress(0)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Subir Archivo Adjunto
          </DialogTitle>
          <DialogDescription>
            Sube imágenes, PDFs o documentos para asociarlos al paciente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* File selection - improved */}
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium">
              Seleccionar Archivo
            </Label>
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              disabled={isUploading}
              className="hidden"
            />
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-8 transition-colors hover:border-primary hover:bg-muted/50",
                isUploading && "cursor-not-allowed opacity-50",
              )}
            >
              {file ? (
                <div className="flex w-full flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-6 w-6 text-primary" />
                    ) : (
                      <FileText className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFileSelect(null)
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cambiar archivo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Haz clic para seleccionar un archivo</p>
                    <p className="text-sm text-muted-foreground">
                      o arrastra y suelta el archivo aquí
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formatos soportados: JPG, PNG, GIF, WebP, DICOM, PDF (máx. {MAX_FILE_SIZE_MB}MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Type selection - improved */}
          <div className="space-y-2">
            <Label htmlFor="tipo" className="text-sm font-medium">
              Tipo de Archivo
            </Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as AttachmentType)} disabled={isUploading}>
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue placeholder="Selecciona el tipo de archivo" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Imágenes</div>
                <SelectItem value="XRAY">Radiografía</SelectItem>
                <SelectItem value="INTRAORAL_PHOTO">Foto Intraoral</SelectItem>
                <SelectItem value="EXTRAORAL_PHOTO">Foto Extraoral</SelectItem>
                <SelectItem value="IMAGE">Imagen General</SelectItem>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Documentos</div>
                <SelectItem value="DOCUMENT">Documento</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="LAB_REPORT">Resultado de Laboratorio</SelectItem>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Otros</div>
                <SelectItem value="OTHER">Otro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecciona la categoría que mejor describe este archivo
            </p>
          </div>

          {/* Description - improved */}
          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-sm font-medium">
              Descripción <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Agrega una descripción o notas sobre este archivo..."
              disabled={isUploading}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Máximo 500 caracteres</span>
              <span>{descripcion.length}/500</span>
            </div>
          </div>

          {/* Upload progress - improved */}
          {isUploading && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Subiendo archivo...
                </span>
                <span className="font-semibold text-primary">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Por favor, no cierres esta ventana mientras se sube el archivo
              </p>
            </div>
          )}

          {/* Actions - improved */}
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading} className="sm:w-auto">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="sm:w-auto"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Archivo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

