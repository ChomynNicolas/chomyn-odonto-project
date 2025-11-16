// API client for patient attachments

import type { Attachment, AttachmentType, AttachmentContext } from "@/lib/types/patient"

export interface AttachmentsResponse {
  adjuntos: Attachment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  porTipo: {
    xrays: number
    photos: number
    documents: number
    other: number
    consentimientos: number
  }
}

export interface FetchAttachmentsParams {
  pacienteId: string
  tipo?: AttachmentType
  search?: string
  page?: number
  limit?: number
}

export interface CreateAttachmentParams {
  pacienteId: string
  publicId: string
  secureUrl: string
  bytes: number
  format?: string
  width?: number
  height?: number
  duration?: number
  resourceType?: string
  folder?: string
  originalFilename?: string
  accessMode?: "PUBLIC" | "AUTHENTICATED"
  tipo: AttachmentType
  descripcion?: string
}

/**
 * Fetch patient attachments with filters and pagination
 */
export async function fetchAttachments(
  params: FetchAttachmentsParams,
): Promise<AttachmentsResponse> {
  const { pacienteId, tipo, search, page = 1, limit = 20 } = params

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (tipo) {
    searchParams.append("tipo", tipo)
  }

  if (search) {
    searchParams.append("search", search)
  }

  const response = await fetch(`/api/pacientes/${pacienteId}/adjuntos?${searchParams.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al obtener adjuntos" }))
    throw new Error(error.error || "Error al obtener adjuntos")
  }

  const result = await response.json()

  if (!result.ok) {
    throw new Error(result.error || "Error al obtener adjuntos")
  }

  // Type for API response adjunto item
  type AdjuntoApiResponse = {
    id: string | number
    tipo: string
    descripcion?: string | null
    secureUrl: string
    thumbnailUrl?: string | null
    createdAt: string
    uploadedBy: string
    bytes?: number
    originalFilename?: string | null
    format?: string | null
    width?: number | null
    height?: number | null
    publicId?: string | null
    resourceType?: string | null
    uploadedById?: number | null
    context?: "patient" | "consultation" | "procedure"
    contextId?: number | null
    contextInfo?: {
      consultaId?: number
      consultaFecha?: string
      consultaTipo?: string
    }
    source?: "adjunto" | "consentimiento"
    consentimientoMetadata?: {
      idConsentimiento: number
      tipo: string
      firmadoEn: string
      vigenteHasta?: string | null
      vigente: boolean
    }
  }

  // Map response to Attachment format
  const adjuntos: Attachment[] = result.data.adjuntos.map((a: AdjuntoApiResponse) => {
    const splitNombre = (nombre?: string) => {
      if (!nombre) return { firstName: "", lastName: "" }
      const parts = nombre.trim().split(/\s+/)
      return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        fullName: nombre,
      }
    }

    const { firstName, lastName, fullName } = splitNombre(a.uploadedBy)

    // Determine MIME type
    const getMimeType = (format?: string | null, resourceType?: string | null) => {
      const normalizedFormat = format ?? undefined
      const normalizedResourceType = resourceType ?? undefined
      if (normalizedFormat === "pdf") return "application/pdf"
      if (normalizedResourceType === "image") {
        if (normalizedFormat === "jpg" || normalizedFormat === "jpeg") return "image/jpeg"
        if (normalizedFormat === "png") return "image/png"
        if (normalizedFormat === "gif") return "image/gif"
        return "image/*"
      }
      if (normalizedResourceType === "video") return "video/*"
      return "application/octet-stream"
    }

    // Map context information if available
    const context: AttachmentContext | undefined =
      a.context || a.contextId
        ? {
            type: (a.context as "patient" | "consultation" | "procedure") || "patient",
            id: a.contextId ?? null,
            info: a.contextInfo
              ? {
                  consultaId: a.contextInfo.consultaId,
                  consultaFecha: a.contextInfo.consultaFecha,
                  consultaTipo: a.contextInfo.consultaTipo,
                }
              : undefined,
          }
        : undefined

    return {
      id: String(a.id),
      type: a.tipo as AttachmentType,
      fileName: a.originalFilename || a.descripcion || `adjunto-${a.id}`,
      fileSize: a.bytes || 0,
      mimeType: getMimeType(a.format, a.resourceType),
      uploadedAt: a.createdAt,
      description: a.descripcion ?? undefined,
      secureUrl: a.secureUrl,
      thumbnailUrl: a.thumbnailUrl ?? undefined,
      uploadedBy: {
        id: a.uploadedById ? String(a.uploadedById) : undefined,
        firstName,
        lastName,
        fullName,
      },
      width: a.width ?? undefined,
      height: a.height ?? undefined,
      format: a.format ?? undefined,
      publicId: a.publicId ?? undefined,
      resourceType: a.resourceType ?? undefined,
      context,
      source: a.source as "adjunto" | "consentimiento" | undefined,
      consentimientoMetadata: a.consentimientoMetadata
        ? {
            idConsentimiento: a.consentimientoMetadata.idConsentimiento,
            tipo: a.consentimientoMetadata.tipo,
            firmadoEn: a.consentimientoMetadata.firmadoEn,
            vigenteHasta: a.consentimientoMetadata.vigenteHasta,
            vigente: a.consentimientoMetadata.vigente,
          }
        : undefined,
    }
  })

  return {
    adjuntos,
    pagination: result.data.pagination,
    porTipo: result.data.porTipo,
  }
}

/**
 * Create a new attachment
 */
export async function createAttachment(params: CreateAttachmentParams): Promise<Attachment> {
  const response = await fetch(`/api/pacientes/${params.pacienteId}/adjuntos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicId: params.publicId,
      secureUrl: params.secureUrl,
      bytes: params.bytes,
      format: params.format,
      width: params.width,
      height: params.height,
      duration: params.duration,
      resourceType: params.resourceType,
      folder: params.folder,
      originalFilename: params.originalFilename,
      accessMode: params.accessMode || "AUTHENTICATED",
      tipo: params.tipo,
      descripcion: params.descripcion,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al crear adjunto" }))
    throw new Error(error.error || "Error al crear adjunto")
  }

  const result = await response.json()

  if (!result.ok) {
    throw new Error(result.error || "Error al crear adjunto")
  }

  // Map response to Attachment format
  const a = result.data
  const splitNombre = (nombre?: string) => {
    if (!nombre) return { firstName: "", lastName: "" }
    const parts = nombre.trim().split(/\s+/)
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      fullName: nombre,
    }
  }

  const { firstName, lastName, fullName } = splitNombre(a.uploadedBy)

  const getMimeType = (format?: string | null, resourceType?: string | null) => {
    const normalizedFormat = format ?? undefined
    const normalizedResourceType = resourceType ?? undefined
    if (normalizedFormat === "pdf") return "application/pdf"
    if (normalizedResourceType === "image") {
      if (normalizedFormat === "jpg" || normalizedFormat === "jpeg") return "image/jpeg"
      if (normalizedFormat === "png") return "image/png"
      if (normalizedFormat === "gif") return "image/gif"
      return "image/*"
    }
    if (normalizedResourceType === "video") return "video/*"
    return "application/octet-stream"
  }

  return {
    id: String(a.id),
    type: a.tipo as AttachmentType,
    fileName: a.originalFilename || a.descripcion || `adjunto-${a.id}`,
    fileSize: a.bytes || 0,
    mimeType: getMimeType(a.format, a.resourceType),
    uploadedAt: a.createdAt,
    description: a.descripcion ?? undefined,
    secureUrl: a.secureUrl,
    thumbnailUrl: a.thumbnailUrl ?? undefined,
    uploadedBy: {
      id: a.uploadedById ? String(a.uploadedById) : undefined,
      firstName,
      lastName,
      fullName,
    },
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    format: a.format ?? undefined,
    publicId: a.publicId ?? undefined,
    resourceType: a.resourceType ?? undefined,
  }
}

/**
 * Delete an attachment (soft delete)
 */
export async function deleteAttachment(pacienteId: string, attachmentId: string): Promise<void> {
  const response = await fetch(`/api/pacientes/${pacienteId}/adjuntos?attachmentId=${attachmentId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al eliminar adjunto" }))
    throw new Error(error.error || "Error al eliminar adjunto")
  }

  const result = await response.json()

  if (!result.ok) {
    throw new Error(result.error || "Error al eliminar adjunto")
  }
}

/**
 * Get attachment type label in Spanish
 */
export function getAttachmentTypeLabel(type: AttachmentType): string {
  const labels: Record<AttachmentType, string> = {
    XRAY: "Radiografía",
    INTRAORAL_PHOTO: "Foto Intraoral",
    EXTRAORAL_PHOTO: "Foto Extraoral",
    IMAGE: "Imagen",
    DOCUMENT: "Documento",
    PDF: "PDF",
    LAB_REPORT: "Resultado de Laboratorio",
    OTHER: "Otro",
  }
  return labels[type] || type
}

/**
 * Group attachment types for filtering
 */
export function getAttachmentTypeGroup(type: AttachmentType): "xrays" | "photos" | "documents" | "other" {
  if (type === "XRAY") return "xrays"
  if (type === "INTRAORAL_PHOTO" || type === "EXTRAORAL_PHOTO" || type === "IMAGE") return "photos"
  if (type === "DOCUMENT" || type === "PDF" || type === "LAB_REPORT") return "documents"
  return "other"
}

