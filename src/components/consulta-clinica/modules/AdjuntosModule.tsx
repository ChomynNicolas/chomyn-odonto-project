// src/components/consulta-clinica/modules/AdjuntosModule.tsx
"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Image as ImageIcon, Trash2, Upload, Search, Clock, User, FileText, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate } from "@/lib/utils/patient-helpers"
import type { AdjuntoTipo } from "@prisma/client"
import Image from "next/image"

interface AdjuntosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "image/dicom",
] as const

/**
 * Módulo de Adjuntos (RX, Fotos)
 * 
 * Permite a los odontólogos subir, visualizar y eliminar adjuntos
 * clínicos como radiografías, fotos intraorales, etc.
 */
export function AdjuntosModule({ citaId, consulta, canEdit, onUpdate }: AdjuntosModuleProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [tipo, setTipo] = useState<AdjuntoTipo>("IMAGE")
  const [descripcion, setDescripcion] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Necesitamos obtener el pacienteId desde la cita
  const [pacienteId, setPacienteId] = useState<number | null>(null)

  // Obtener pacienteId al montar el componente
  useEffect(() => {
    const fetchPacienteId = async () => {
      try {
        const res = await fetch(`/api/agenda/citas/${citaId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.ok && data.data?.paciente?.id) {
            setPacienteId(data.data.paciente.id)
          }
        }
      } catch (error) {
        console.error("Error fetching pacienteId:", error)
      }
    }
    fetchPacienteId()
  }, [citaId])

  // Filtrar adjuntos por búsqueda
  const filteredAdjuntos = useMemo(() => {
    const adjuntosList = consulta.adjuntos || []
    if (adjuntosList.length === 0) return []
    if (!searchQuery.trim()) return adjuntosList

    const query = searchQuery.toLowerCase().trim()
    return adjuntosList.filter(
      (a) =>
        a.descripcion?.toLowerCase().includes(query) ||
        a.originalFilename?.toLowerCase().includes(query) ||
        a.tipo.toLowerCase().includes(query) ||
        a.uploadedBy.nombre.toLowerCase().includes(query)
    )
  }, [consulta.adjuntos, searchQuery])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) {
      setFile(null)
      return
    }

    // Validar tamaño
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("Archivo demasiado grande", {
        description: `El archivo no puede exceder ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      })
      return
    }

    // Validar tipo
    if (!ACCEPTED_TYPES.includes(selectedFile.type as (typeof ACCEPTED_TYPES)[number])) {
      toast.error("Tipo de archivo no soportado", {
        description: "Solo se permiten imágenes (JPEG, PNG, WebP, GIF) y PDFs",
      })
      return
    }

    // Auto-detectar tipo
    if (selectedFile.type === "application/pdf") {
      setTipo("PDF")
    } else if (selectedFile.type.startsWith("image/")) {
      if (tipo === "PDF") {
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

    if (!pacienteId) {
      toast.error("Error: No se pudo obtener el ID del paciente")
      return
    }

    try {
      // Paso 1: Obtener signature de Cloudinary
      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          tipo,
          accessMode: "AUTHENTICATED",
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

      // Paso 2: Subir a Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      formData.append("api_key", apiKey)
      formData.append("timestamp", String(timestamp))
      formData.append("signature", signature)
      formData.append("folder", folder)
      formData.append("access_mode", accessMode.toLowerCase())

      // Simular progreso
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

      // Paso 3: Guardar en la base de datos
      const saveResponse = await fetch(`/api/agenda/citas/${citaId}/consulta/adjuntos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: uploadResult.public_id,
          folder: uploadResult.folder || folder,
          resourceType: uploadResult.resource_type,
          format: uploadResult.format,
          bytes: uploadResult.bytes,
          width: uploadResult.width,
          height: uploadResult.height,
          duration: uploadResult.duration,
          originalFilename: uploadResult.original_filename || file.name,
          secureUrl: uploadResult.secure_url,
          tipo,
          descripcion: descripcion.trim() || null,
        }),
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al guardar el adjunto")
      }

      toast.success("Adjunto subido correctamente")
      setOpen(false)
      setFile(null)
      setDescripcion("")
      setUploadProgress(0)
      onUpdate()
    } catch (error) {
      console.error("Error uploading attachment:", error)
      toast.error(error instanceof Error ? error.message : "Error al subir adjunto")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este adjunto? Esta acción no se puede deshacer.")) return

    try {
      setIsDeleting(id)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/adjuntos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al eliminar adjunto")
      }

      toast.success("Adjunto eliminado correctamente")
      onUpdate()
    } catch (error) {
      console.error("Error deleting attachment:", error)
      toast.error(error instanceof Error ? error.message : "Error al eliminar adjunto")
    } finally {
      setIsDeleting(null)
    }
  }

  const getTipoLabel = (tipo: string): string => {
    const labels: Record<string, string> = {
      XRAY: "Radiografía",
      INTRAORAL_PHOTO: "Foto Intraoral",
      EXTRAORAL_PHOTO: "Foto Extraoral",
      IMAGE: "Imagen",
      DOCUMENT: "Documento",
      PDF: "PDF",
      LAB_REPORT: "Informe de Laboratorio",
      OTHER: "Otro",
    }
    return labels[tipo] || tipo
  }

  const adjuntosList = consulta.adjuntos || []
  const hasAdjuntos = adjuntosList.length > 0
  const hasFilteredResults = filteredAdjuntos.length > 0

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Adjuntos (RX, Fotos)</h3>
          {hasAdjuntos && (
            <p className="text-sm text-muted-foreground mt-1">
              {adjuntosList.length} {adjuntosList.length === 1 ? "archivo" : "archivos"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Subir Archivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Subir Adjunto Clínico</DialogTitle>
                <DialogDescription>
                  Suba radiografías, fotos intraorales, extraorales u otros documentos clínicos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">
                    Archivo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  {file && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formatos permitidos: JPEG, PNG, WebP, GIF, PDF. Máximo {MAX_FILE_SIZE / 1024 / 1024}MB
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Adjunto</Label>
                  <Select value={tipo} onValueChange={(v: AdjuntoTipo) => setTipo(v)} disabled={isUploading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XRAY">Radiografía</SelectItem>
                      <SelectItem value="INTRAORAL_PHOTO">Foto Intraoral</SelectItem>
                      <SelectItem value="EXTRAORAL_PHOTO">Foto Extraoral</SelectItem>
                      <SelectItem value="IMAGE">Imagen</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                      <SelectItem value="DOCUMENT">Documento</SelectItem>
                      <SelectItem value="LAB_REPORT">Informe de Laboratorio</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">
                    Descripción <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Radiografía panorámica, Foto pre-tratamiento, etc."
                    rows={3}
                    maxLength={500}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">{descripcion.length}/500 caracteres</p>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Subiendo archivo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading || !file}>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Búsqueda */}
      {hasAdjuntos && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por descripción, nombre de archivo, tipo o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Lista de adjuntos */}
      {!hasAdjuntos ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay adjuntos registrados</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience subiendo el primer archivo clínico"
                : "No hay información de adjuntos disponible"}
            </p>
          </CardContent>
        </Card>
      ) : !hasFilteredResults ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No se encontraron resultados</p>
            <p className="text-sm mt-1">Intente con otros términos de búsqueda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdjuntos.map((adj) => (
            <Card key={adj.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="relative group">
                  {adj.tipo === "XRAY" || adj.tipo === "IMAGE" || adj.tipo === "INTRAORAL_PHOTO" || adj.tipo === "EXTRAORAL_PHOTO" ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <Image
                        src={adj.secureUrl}
                        alt={adj.descripcion || "Adjunto clínico"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center rounded-lg">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {canEdit && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(adj.id)}
                      disabled={isDeleting === adj.id}
                    >
                      {isDeleting === adj.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{getTipoLabel(adj.tipo)}</span>
                    {adj.format && <span className="text-xs text-muted-foreground">{adj.format.toUpperCase()}</span>}
                  </div>
                  {adj.descripcion && (
                    <p className="text-sm font-medium line-clamp-2">{adj.descripcion}</p>
                  )}
                  {adj.originalFilename && (
                    <p className="text-xs text-muted-foreground truncate" title={adj.originalFilename}>
                      {adj.originalFilename}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(adj.createdAt, true)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{adj.uploadedBy.nombre}</span>
                  </div>
                  <a
                    href={adj.secureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-2 inline-block"
                  >
                    Ver archivo completo →
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

