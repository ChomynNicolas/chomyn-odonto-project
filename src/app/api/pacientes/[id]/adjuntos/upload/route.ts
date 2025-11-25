// src/app/api/pacientes/[id]/adjuntos/upload/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { cloudinary } from "@/lib/cloudinary"
import { requireRole } from "@/app/api/pacientes/_rbac"
import type { AdjuntoTipo, AccessMode } from "@prisma/client"
import {
  MAX_FILE_SIZE_BYTES,
  validateFileSize,
  validateMimeType,
  validateFileExtension,
} from "@/lib/validation/file-validation"
import { validateFileSignature } from "@/lib/validation/file-validation-server"
import { auditAttachmentCreate } from "@/lib/audit/attachments"

function jsonError(status: number, code: string, error: string, details?: unknown) {
  return NextResponse.json({ ok: false, code, error, ...(details ? { details } : {}) }, { status })
}

function jsonOk<T>(data: T, status = 200) {
  const res = NextResponse.json({ ok: true, data }, { status })
  res.headers.set("Cache-Control", "no-store")
  return res
}

const AdjuntoTipoEnum = z.enum([
  "XRAY",
  "INTRAORAL_PHOTO",
  "EXTRAORAL_PHOTO",
  "IMAGE",
  "DOCUMENT",
  "PDF",
  "LAB_REPORT",
  "OTHER",
])

// POST - Upload file to Cloudinary and persist to DB
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  try {
    const { id } = await params
    const pacienteId = Number.parseInt(id)
    if (isNaN(pacienteId)) {
      return jsonError(400, "INVALID_ID", "ID de paciente inválido")
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return jsonError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado")
    }

    // Parse FormData
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const tipoRaw = formData.get("tipo") as string | null
    const descripcionRaw = formData.get("descripcion") as string | null

    if (!file) {
      return jsonError(400, "MISSING_FILE", "No se proporcionó archivo")
    }

    if (!tipoRaw) {
      return jsonError(400, "MISSING_TIPO", "No se proporcionó tipo de adjunto")
    }

    const tipoParsed = AdjuntoTipoEnum.safeParse(tipoRaw)
    if (!tipoParsed.success) {
      return jsonError(400, "INVALID_TIPO", "Tipo de adjunto inválido")
    }

    const tipo = tipoParsed.data
    const descripcion = descripcionRaw && descripcionRaw.trim() ? descripcionRaw.trim() : null

    // Validate file before upload
    // 1. Validate file size
    const sizeValidation = validateFileSize(file.size)
    if (!sizeValidation.valid) {
      return jsonError(400, "FILE_TOO_LARGE", sizeValidation.error || "El archivo excede el tamaño máximo permitido", {
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE_BYTES,
      })
    }

    // 2. Validate MIME type
    const mimeValidation = validateMimeType(file.type)
    if (!mimeValidation.valid) {
      return jsonError(400, "INVALID_FILE_TYPE", mimeValidation.error || "Tipo de archivo no permitido", {
        fileType: file.type,
      })
    }

    // 3. Validate file extension
    const extValidation = validateFileExtension(file.name)
    if (!extValidation.valid) {
      return jsonError(400, "INVALID_EXTENSION", extValidation.error || "Extensión de archivo no permitida", {
        fileName: file.name,
      })
    }

    // 4. Read file buffer for signature validation
    const buffer = Buffer.from(await file.arrayBuffer())

    // 5. Validate file signature (magic numbers)
    const signatureValidation = validateFileSignature(buffer, file.type)
    if (!signatureValidation.valid) {
      return jsonError(400, "INVALID_SIGNATURE", signatureValidation.error || "El contenido del archivo no coincide con su tipo", {
        fileType: file.type,
        detectedMimeType: signatureValidation.detectedMimeType,
        fileName: file.name,
      })
    }

    // Prepare folder structure
    const folderBase = process.env.CLOUDINARY_BASE_FOLDER || "chomyn/dev"
    const folder = `${folderBase}/pacientes/${pacienteId}/${tipo.toLowerCase()}`
    const accessMode =
      (process.env.CLOUDINARY_DEFAULT_ACCESS_MODE?.toUpperCase() as "PUBLIC" | "AUTHENTICATED") ||
      "AUTHENTICATED"

    // Upload to Cloudinary (validation passed)
    const uploadResult = await new Promise<{
      public_id: string
      secure_url: string
      bytes: number
      format?: string
      width?: number
      height?: number
      duration?: number
      resource_type: string
      folder?: string
      original_filename?: string
      etag?: string
      version?: number
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          access_mode: accessMode.toLowerCase(),
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else if (!result) {
            reject(new Error("No result from Cloudinary"))
          } else {
            resolve(result)
          }
        },
      )
      uploadStream.end(buffer)
    })

    // Persist to database
    const adjunto = await prisma.adjunto.create({
      data: {
        pacienteId,
        tipo: tipo as AdjuntoTipo,
        descripcion,
        publicId: uploadResult.public_id,
        folder: uploadResult.folder || folder,
        resourceType: uploadResult.resource_type || "auto",
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
        secureUrl: uploadResult.secure_url,
        originalFilename: uploadResult.original_filename || file.name,
        accessMode: accessMode as AccessMode,
        uploadedByUserId: gate.userId || 1,
      },
      include: {
        uploadedBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
      },
    })

    // Audit logging - AFTER successful creation
    try {
      await auditAttachmentCreate({
        actorId: gate.userId || 1,
        entityId: adjunto.idAdjunto,
        metadata: {
          pacienteId,
          consultaId: null,
          procedimientoId: null,
          tipo: adjunto.tipo,
          format: adjunto.format ?? null,
          bytes: adjunto.bytes,
          originalFilename: adjunto.originalFilename ?? null,
          publicId: adjunto.publicId,
          accessMode: adjunto.accessMode,
          descripcion: adjunto.descripcion ?? null,
          source: "patient",
          path: req.url,
        },
        headers: req.headers,
        path: req.url,
      })
    } catch (auditError) {
      console.error("[audit] Failed to log attachment creation:", auditError)
    }

    return jsonOk({
      id: adjunto.idAdjunto,
      publicId: adjunto.publicId,
      secureUrl: adjunto.secureUrl,
      tipo: adjunto.tipo,
      descripcion: adjunto.descripcion,
      bytes: adjunto.bytes,
      format: adjunto.format,
      width: adjunto.width,
      height: adjunto.height,
    })
  } catch (error) {
    console.error("[API] Error uploading adjunto:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al subir adjunto"
    return jsonError(500, "UPLOAD_ERROR", errorMessage)
  }
}

