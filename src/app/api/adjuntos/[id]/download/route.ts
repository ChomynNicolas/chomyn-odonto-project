import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateAuthenticatedUrl, generatePublicUrl } from "@/lib/utils/cloudinary-auth"
import { detectFileType, getFilenameWithExtension, sanitizeFilename, type FileTypeInfo } from "@/lib/utils/file-type-detection"
import { auditAttachmentDownload } from "@/lib/audit/attachments"

/**
 * Parse attachment ID from format "adjunto-{id}" or "consentimiento-{id}" or just "{id}"
 */
function parseAttachmentId(id: string): { type: "adjunto" | "consentimiento"; numericId: number } | null {
  // Handle format "adjunto-{id}"
  if (id.startsWith("adjunto-")) {
    const numericId = Number.parseInt(id.replace("adjunto-", ""))
    if (!isNaN(numericId)) {
      return { type: "adjunto", numericId }
    }
  }
  
  // Handle format "consentimiento-{id}"
  if (id.startsWith("consentimiento-")) {
    const numericId = Number.parseInt(id.replace("consentimiento-", ""))
    if (!isNaN(numericId)) {
      return { type: "consentimiento", numericId }
    }
  }
  
  // Handle plain numeric ID
  const numericId = Number.parseInt(id)
  if (!isNaN(numericId)) {
    // Assume it's an adjunto by default (backward compatibility)
    return { type: "adjunto", numericId }
  }
  
  return null
}

/**
 * GET /api/adjuntos/[id]/download
 * Download endpoint to stream files from Cloudinary with authentication
 * Sets proper download headers (Content-Disposition)
 * 
 * ID format: "adjunto-{id}", "consentimiento-{id}", or just "{id}"
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const parsed = parseAttachmentId(id)

    if (!parsed) {
      return NextResponse.json({ error: "Invalid attachment ID format" }, { status: 400 })
    }

    let publicId: string
    let accessMode: "PUBLIC" | "AUTHENTICATED"
    let contentType: string | null = null
    let originalFilename: string | null = null
    let fileFormat: string | null = null
    let fileTypeInfo: FileTypeInfo

    if (parsed.type === "adjunto") {
      // Fetch adjunto from database
      const adjunto = await prisma.adjunto.findUnique({
        where: { idAdjunto: parsed.numericId },
        select: {
          idAdjunto: true,
          publicId: true,
          accessMode: true,
          resourceType: true,
          format: true,
          originalFilename: true,
          secureUrl: true,
          folder: true,
          isActive: true,
          pacienteId: true,
          consultaId: true,
          procedimientoId: true,
        },
      })

      if (!adjunto || !adjunto.isActive) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
      }

      // TODO: Add RBAC check - verify user has access to this patient's attachments
      // For now, we rely on authentication check above

      publicId = adjunto.publicId
      accessMode = adjunto.accessMode
      fileFormat = adjunto.format
      originalFilename = adjunto.originalFilename
      fileTypeInfo = detectFileType({
        format: adjunto.format,
        resourceType: adjunto.resourceType,
        originalFilename: adjunto.originalFilename,
        publicId: adjunto.publicId,
        folder: adjunto.folder,
      })
      contentType = fileTypeInfo.mimeType
    } else {
      // Handle consentimiento (similar logic)
      const consentimiento = await prisma.consentimiento.findUnique({
        where: { idConsentimiento: parsed.numericId },
        select: {
          idConsentimiento: true,
          public_id: true,
          format: true,
          secure_url: true,
          activo: true,
          Paciente_idPaciente: true,
        },
      })

      if (!consentimiento || !consentimiento.activo) {
        return NextResponse.json({ error: "Consentimiento not found" }, { status: 404 })
      }

      publicId = consentimiento.public_id
      accessMode = "AUTHENTICATED" // Consentimientos are always authenticated
      fileFormat = consentimiento.format
      fileTypeInfo = detectFileType({
        format: consentimiento.format,
        resourceType: "image",
        originalFilename: null,
        publicId: consentimiento.public_id,
      })
      contentType = fileTypeInfo.mimeType
    }

    // Generate Cloudinary URL
    let cloudinaryUrl: string
    const finalResourceType = fileTypeInfo.resourceType === "auto" ? "image" : fileTypeInfo.resourceType

    if (accessMode === "AUTHENTICATED") {
      cloudinaryUrl = await generateAuthenticatedUrl(publicId, {
        resourceType: finalResourceType as "image" | "video" | "raw",
      })
    } else {
      cloudinaryUrl = generatePublicUrl(publicId, {
        resourceType: finalResourceType as "image" | "video" | "raw",
      })
    }

    // Fetch file from Cloudinary
    const cloudinaryResponse = await fetch(cloudinaryUrl, {
      headers: {
        "User-Agent": "Chomyn-Odonto/1.0",
      },
    })

    if (!cloudinaryResponse.ok) {
      console.error(`[Download] Cloudinary error: ${cloudinaryResponse.status} ${cloudinaryResponse.statusText}`)
      return NextResponse.json(
        { error: "Error fetching file from Cloudinary" },
        { status: cloudinaryResponse.status }
      )
    }

    // Get file content
    const fileBuffer = await cloudinaryResponse.arrayBuffer()

    // Determine filename for download
    const downloadFilename = getFilenameWithExtension(
      originalFilename,
      fileTypeInfo,
      `adjunto-${parsed.numericId}`
    )
    const sanitizedFilename = sanitizeFilename(downloadFilename)

    // Audit log the download action (fire-and-forget, don't block response)
    const userId = session.user?.id ? Number.parseInt(session.user.id, 10) : null
    if (userId) {
      auditAttachmentDownload({
        actorId: userId,
        entityId: parsed.numericId,
        entityType: parsed.type,
        metadata: {
          publicId,
          originalFilename,
          format: fileFormat,
          resourceType: finalResourceType,
          accessMode,
          path: req.url,
        },
        headers: req.headers,
        path: req.url,
      }).catch((err) => {
        console.error("[Download] Failed to log download audit:", err)
      })
    }

    // Return file with download headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"; filename*=UTF-8''${encodeURIComponent(sanitizedFilename)}`,
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    console.error("[Download] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

