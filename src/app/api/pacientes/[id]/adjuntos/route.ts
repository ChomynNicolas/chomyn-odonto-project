import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import type { AdjuntoTipo, AccessMode, Prisma } from "@prisma/client"
import {
  MAX_FILE_SIZE_BYTES,
  validateFileSize,
  validateFileExtension,
  ALLOWED_MIME_TYPES,
} from "@/lib/validation/file-validation"
import { auditAttachmentCreate, auditAttachmentDelete } from "@/lib/audit/attachments"

const CreateAdjuntoSchema = z.object({
  publicId: z.string(),
  secureUrl: z.string().url(),
  bytes: z.number().int().nonnegative(),
  format: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().optional(),
  resourceType: z.string().optional(),
  folder: z.string().optional(),
  originalFilename: z.string().optional(),
  version: z.number().optional(),
  accessMode: z.enum(["PUBLIC", "AUTHENTICATED"]).optional(),
  tipo: z.enum(["XRAY", "INTRAORAL_PHOTO", "EXTRAORAL_PHOTO", "IMAGE", "DOCUMENT", "PDF", "LAB_REPORT", "OTHER"]),
  descripcion: z.string().max(500).optional(),
})

// GET - Fetch attachments with filters, pagination, and search
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pacienteId = Number.parseInt(id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID de paciente inválido" }, { status: 400 })
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const tipoParam = searchParams.get("tipo")
    // "CONSENT" is a virtual filter type for consentimientos only
    const isConsentFilter = tipoParam === "CONSENT"
    const tipo = isConsentFilter ? null : (tipoParam as
      | "XRAY"
      | "INTRAORAL_PHOTO"
      | "EXTRAORAL_PHOTO"
      | "IMAGE"
      | "DOCUMENT"
      | "PDF"
      | "LAB_REPORT"
      | "OTHER"
      | null)
    const search = searchParams.get("search") || null
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Determine what to include based on filter
    // - No filter (null): include both adjuntos and consentimientos
    // - "CONSENT": include only consentimientos
    // - Any AdjuntoTipo: include only adjuntos of that type
    const includeAdjuntos = !isConsentFilter
    const includeConsentimientos = !tipoParam || isConsentFilter

    // Consent type label mapping for search
    const consentTypeLabels: Record<string, string[]> = {
      CONSENTIMIENTO_MENOR_ATENCION: ["menor", "atencion", "atención", "menor de edad"],
      TRATAMIENTO_ESPECIFICO: ["tratamiento", "especifico", "específico"],
      ANESTESIA: ["anestesia"],
      CIRUGIA: ["cirugia", "cirugía", "quirurgico", "quirúrgico"],
      RADIOGRAFIA: ["radiografia", "radiografía", "rx"],
      DATOS_PERSONALES: ["datos", "personales", "privacidad"],
      OTRO: ["otro", "otros"],
    }

    // Build where clause to get ALL attachments for the patient:
    // 1. Direct attachments (pacienteId = pacienteId)
    // 2. Attachments from consultations (consulta.cita.pacienteId = pacienteId)
    // 3. Attachments from procedures (procedimiento.consulta.cita.pacienteId = pacienteId)
    const where: Prisma.AdjuntoWhereInput = {
      isActive: true,
      OR: [
        // Direct patient attachments
        { pacienteId },
        // Attachments from patient's consultations
        {
          consulta: {
            cita: {
              pacienteId,
            },
          },
        },
        // Attachments from procedures in patient's consultations
        {
          procedimiento: {
            consulta: {
              cita: {
                pacienteId,
              },
            },
          },
        },
      ],
    }

    if (tipo) {
      where.tipo = tipo
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { descripcion: { contains: search, mode: "insensitive" } },
            { originalFilename: { contains: search, mode: "insensitive" } },
          ],
        },
      ]
    }

    // Build consentimiento search filter - includes observaciones and tipo label matching
    const buildConsentSearchFilter = (searchTerm: string): Prisma.ConsentimientoWhereInput => {
      const searchLower = searchTerm.toLowerCase()
      
      // Find consent types that match the search term
      const matchingTypes = Object.entries(consentTypeLabels)
        .filter(([, labels]) => labels.some(label => label.includes(searchLower) || searchLower.includes(label)))
        .map(([type]) => type as "CONSENTIMIENTO_MENOR_ATENCION" | "TRATAMIENTO_ESPECIFICO" | "ANESTESIA" | "CIRUGIA" | "RADIOGRAFIA" | "DATOS_PERSONALES" | "OTRO")

      return {
        OR: [
          { observaciones: { contains: searchTerm, mode: "insensitive" } },
          ...(matchingTypes.length > 0 ? [{ tipo: { in: matchingTypes } }] : []),
        ],
      }
    }

    // Fetch attachments AND consentimientos based on filter settings
    // Only fetch what's needed based on the filter
    const [adjuntos, totalAdjuntos, consentimientos, totalConsentimientos] = await Promise.all([
      // Only fetch adjuntos if not filtering by CONSENT
      includeAdjuntos
        ? prisma.adjunto.findMany({
            where,
            include: {
              uploadedBy: {
                select: {
                  idUsuario: true,
                  nombreApellido: true,
                },
              },
              consulta: {
                select: {
                  cita: {
                    select: {
                      idCita: true,
                      inicio: true,
                      tipo: true,
                    },
                  },
                },
              },
              procedimiento: {
                select: {
                  idConsultaProcedimiento: true,
                  consulta: {
                    select: {
                      cita: {
                        select: {
                          idCita: true,
                          inicio: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      includeAdjuntos ? prisma.adjunto.count({ where }) : Promise.resolve(0),
      // Only fetch consentimientos if filter is null or "CONSENT"
      includeConsentimientos
        ? prisma.consentimiento.findMany({
            where: {
              Paciente_idPaciente: pacienteId,
              activo: true,
              ...(search ? buildConsentSearchFilter(search) : {}),
            },
            include: {
              registradoPor: {
                select: {
                  idUsuario: true,
                  nombreApellido: true,
                },
              },
              cita: {
                select: {
                  idCita: true,
                  inicio: true,
                  tipo: true,
                },
              },
            },
            orderBy: { registrado_en: "desc" },
          })
        : Promise.resolve([]),
      includeConsentimientos
        ? prisma.consentimiento.count({
            where: {
              Paciente_idPaciente: pacienteId,
              activo: true,
              ...(search ? buildConsentSearchFilter(search) : {}),
            },
          })
        : Promise.resolve(0),
    ])

    // Map adjuntos to response format
    const mappedAdjuntos = adjuntos.map((a) => {
      // Generate URLs based on access mode
      // For AUTHENTICATED images, use proxy endpoint
      // For PUBLIC images, use direct Cloudinary URL
      const isAuthenticated = a.accessMode === "AUTHENTICATED"
      // Get base URL from request or environment variable
      const url = new URL(req.url)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

      let thumbnailUrl: string | null = null
      let secureUrl: string = a.secureUrl

      if (a.width && a.height && a.publicId) {
        if (isAuthenticated) {
          // Use proxy endpoint for authenticated images (use full ID format)
          const attachmentId = `adjunto-${a.idAdjunto}`
          thumbnailUrl = `${baseUrl}/api/adjuntos/${attachmentId}/image?w=200&h=200&crop=fill`
          secureUrl = `${baseUrl}/api/adjuntos/${attachmentId}/image`
        } else {
          // Use direct Cloudinary URL for public images
          thumbnailUrl = `${a.secureUrl.split("/upload/")[0]}/upload/w_200,h_200,c_fill/${a.publicId}`
        }
      } else if (isAuthenticated && a.publicId) {
        // Even without dimensions, use proxy for authenticated images
        const attachmentId = `adjunto-${a.idAdjunto}`
        secureUrl = `${baseUrl}/api/adjuntos/${attachmentId}/image`
      }

      // Determine context (patient direct, consultation, or procedure)
      let context: "patient" | "consultation" | "procedure" = "patient"
      let contextId: number | null = null
      let contextInfo: { consultaId: number; consultaFecha: string } | { consultaFecha: string; consultaTipo: string } | null = null

      if (a.procedimiento) {
        context = "procedure"
        contextId = a.procedimiento.idConsultaProcedimiento
        contextInfo = {
          consultaId: a.procedimiento.consulta.cita.idCita,
          consultaFecha: a.procedimiento.consulta.cita.inicio.toISOString(),
        }
      } else if (a.consulta) {
        context = "consultation"
        contextId = a.consulta.cita.idCita
        contextInfo = {
          consultaFecha: a.consulta.cita.inicio.toISOString(),
          consultaTipo: a.consulta.cita.tipo,
        }
      } else if (a.pacienteId) {
        context = "patient"
        contextId = a.pacienteId
      }

      return {
        id: `adjunto-${a.idAdjunto}`,
        tipo: a.tipo,
        descripcion: a.descripcion,
        secureUrl,
        thumbnailUrl,
        createdAt: a.createdAt.toISOString(),
        uploadedBy: a.uploadedBy.nombreApellido,
        bytes: a.bytes,
        originalFilename: a.originalFilename,
        format: a.format,
        width: a.width,
        height: a.height,
        publicId: a.publicId,
        resourceType: a.resourceType,
        uploadedById: a.uploadedBy.idUsuario,
        accessMode: a.accessMode, // Include accessMode in response
        // Context information
        context,
        contextId,
        contextInfo,
        source: "adjunto" as const,
      }
    })

    // Map consentimientos to response format (as attachments)
    // Note: Consentimientos are typically stored with PUBLIC access, but we'll handle them the same way
    const mappedConsentimientos = consentimientos.map((c) => {
      // Consentimientos are typically PDFs, so we might not have thumbnails
      // But if they do have dimensions, generate thumbnail URL
      let thumbnailUrl: string | null = null
      const secureUrl: string = c.secure_url

      // For consentimientos, we'll use direct URLs since they're typically PUBLIC
      // But if needed, we can create a similar proxy endpoint for consentimientos
      if (c.width && c.height && c.public_id) {
        thumbnailUrl = `${c.secure_url.split("/upload/")[0]}/upload/w_200,h_200,c_fill/${c.public_id}`
      }

      // Determine context (patient direct or consultation)
      let context: "patient" | "consultation" | "procedure" = "patient"
      let contextId: number | null = null
      let contextInfo: { consultaFecha: string; consultaTipo: string } | null = null

      if (c.cita) {
        context = "consultation"
        contextId = c.cita.idCita
        contextInfo = {
          consultaFecha: c.cita.inicio.toISOString(),
          consultaTipo: c.cita.tipo,
        }
      } else {
        context = "patient"
        contextId = c.Paciente_idPaciente
      }

      // Map consentimiento tipo to attachment tipo
      // Use "DOCUMENT" for consentimientos as they are PDFs/documents
      const attachmentTipo: AdjuntoTipo = "DOCUMENT"

      return {
        id: `consentimiento-${c.idConsentimiento}`,
        tipo: attachmentTipo,
        descripcion: c.observaciones || `Consentimiento: ${c.tipo}`,
        secureUrl,
        thumbnailUrl,
        createdAt: c.registrado_en.toISOString(),
        uploadedBy: c.registradoPor.nombreApellido,
        bytes: c.bytes,
        originalFilename: `consentimiento-${c.tipo}-${c.idConsentimiento}.${c.format || "pdf"}`,
        format: c.format,
        width: c.width,
        height: c.height,
        publicId: c.public_id,
        resourceType: "raw", // Consentimientos are typically PDFs
        uploadedById: c.registradoPor.idUsuario,
        accessMode: "PUBLIC" as const, // Consentimientos are typically public
        // Context information
        context,
        contextId,
        contextInfo,
        source: "consentimiento" as const,
        // Additional consentimiento metadata
        consentimientoMetadata: {
          idConsentimiento: c.idConsentimiento,
          tipo: c.tipo,
          firmadoEn: c.firmado_en.toISOString(),
          vigenteHasta: c.vigente_hasta.toISOString(),
          vigente: new Date() <= c.vigente_hasta,
          esEspecificoPorCita: c.esEspecificoPorCita,
          citaId: c.Cita_idCita,
        },
      }
    })

    // Combine and sort by creation date (most recent first)
    const allMapped = [...mappedAdjuntos, ...mappedConsentimientos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    // Apply pagination to combined results
    const paginatedMapped = allMapped.slice(offset, offset + limit)
    const total = totalAdjuntos + totalConsentimientos

    // Get counts by type (including all attachments from consultations and consentimientos)
    const [countsByType, totalConsentimientosCount] = await Promise.all([
      prisma.adjunto.groupBy({
        by: ["tipo"],
        where: {
          isActive: true,
          OR: [
            { pacienteId },
            {
              consulta: {
                cita: {
                  pacienteId,
                },
              },
            },
            {
              procedimiento: {
                consulta: {
                  cita: {
                    pacienteId,
                  },
                },
              },
            },
          ],
        },
        _count: { tipo: true },
      }),
      prisma.consentimiento.count({
        where: {
          Paciente_idPaciente: pacienteId,
          activo: true,
        },
      }),
    ])

    // Calculate type counts including consentimientos as documents
    // Photos include: INTRAORAL_PHOTO, EXTRAORAL_PHOTO, and IMAGE
    const porTipo = {
      xrays: countsByType.find((c) => c.tipo === "XRAY")?._count.tipo || 0,
      photos:
        (countsByType.find((c) => c.tipo === "INTRAORAL_PHOTO")?._count.tipo || 0) +
        (countsByType.find((c) => c.tipo === "EXTRAORAL_PHOTO")?._count.tipo || 0) +
        (countsByType.find((c) => c.tipo === "IMAGE")?._count.tipo || 0),
      documents:
        (countsByType.find((c) => c.tipo === "DOCUMENT")?._count.tipo || 0) +
        (countsByType.find((c) => c.tipo === "PDF")?._count.tipo || 0) +
        (countsByType.find((c) => c.tipo === "LAB_REPORT")?._count.tipo || 0),
      other: countsByType.find((c) => c.tipo === "OTHER")?._count.tipo || 0,
      consentimientos: totalConsentimientosCount, // Separate count for consentimientos
    }

    return NextResponse.json({
      ok: true,
      data: {
        adjuntos: paginatedMapped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        porTipo,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching adjuntos:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al obtener adjuntos"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}

// POST - Create new attachment
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pacienteId = Number.parseInt(id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID de paciente inválido" }, { status: 400 })
    }

    // Get user ID from session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const userId = Number.parseInt(session.user.id, 10)

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
    })

    if (!paciente) {
      return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = CreateAdjuntoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data

    // Validate file metadata before creating database record
    // 1. Validate file size
    if (data.bytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: `El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` },
        { status: 400 },
      )
    }

    // 2. Validate format (if provided)
    if (data.format) {
      const allowedFormats = ["jpg", "jpeg", "png", "gif", "webp", "dcm", "pdf"]
      if (!allowedFormats.includes(data.format.toLowerCase())) {
        return NextResponse.json(
          { ok: false, error: `Formato de archivo no permitido: ${data.format}` },
          { status: 400 },
        )
      }
    }

    // 3. Validate filename extension (if provided)
    if (data.originalFilename) {
      const extValidation = validateFileExtension(data.originalFilename)
      if (!extValidation.valid) {
        return NextResponse.json(
          { ok: false, error: extValidation.error },
          { status: 400 },
        )
      }
    }

    // Create adjunto record
    const adjunto = await prisma.adjunto.create({
      data: {
        pacienteId,
        tipo: data.tipo as AdjuntoTipo,
        descripcion: data.descripcion,
        publicId: data.publicId,
        folder: data.folder || "chomyn/dev/pacientes",
        resourceType: data.resourceType || "auto",
        format: data.format,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        duration: data.duration,
        secureUrl: data.secureUrl,
        originalFilename: data.originalFilename,
        accessMode: (data.accessMode || "AUTHENTICATED") as AccessMode,
        uploadedByUserId: userId,
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
        actorId: userId,
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

    // Generate URLs based on access mode
    const isAuthenticated = adjunto.accessMode === "AUTHENTICATED"
    // Get base URL from request or environment variable
    const url = new URL(req.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    let thumbnailUrl: string | null = null
    let secureUrl: string = adjunto.secureUrl

    if (adjunto.width && adjunto.height && adjunto.publicId) {
      if (isAuthenticated) {
        // Use proxy endpoint for authenticated images (use full ID format)
        const attachmentId = `adjunto-${adjunto.idAdjunto}`
        thumbnailUrl = `${baseUrl}/api/adjuntos/${attachmentId}/image?w=200&h=200&crop=fill`
        secureUrl = `${baseUrl}/api/adjuntos/${attachmentId}/image`
      } else {
        // Use direct Cloudinary URL for public images
        thumbnailUrl = `${adjunto.secureUrl.split("/upload/")[0]}/upload/w_200,h_200,c_fill/${adjunto.publicId}`
      }
    } else if (isAuthenticated && adjunto.publicId) {
      // Even without dimensions, use proxy for authenticated images
      const attachmentId = `adjunto-${adjunto.idAdjunto}`
      secureUrl = `${baseUrl}/api/adjuntos/${attachmentId}/image`
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: adjunto.idAdjunto,
        tipo: adjunto.tipo,
        descripcion: adjunto.descripcion,
        secureUrl,
        thumbnailUrl,
        createdAt: adjunto.createdAt.toISOString(),
        uploadedBy: adjunto.uploadedBy.nombreApellido,
        bytes: adjunto.bytes,
        originalFilename: adjunto.originalFilename,
        format: adjunto.format,
        width: adjunto.width,
        height: adjunto.height,
        publicId: adjunto.publicId,
        resourceType: adjunto.resourceType,
        uploadedById: adjunto.uploadedBy.idUsuario,
        accessMode: adjunto.accessMode,
      },
    })
  } catch (error) {
    console.error("[API] Error creating adjunto:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear adjunto"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}

// DELETE - Soft delete an attachment
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const pacienteId = Number.parseInt(id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID de paciente inválido" }, { status: 400 })
    }

    // Get user ID from session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const userId = Number.parseInt(session.user.id, 10)

    // Get attachment ID from URL
    const url = new URL(req.url)
    const attachmentId = url.searchParams.get("attachmentId")
    if (!attachmentId) {
      return NextResponse.json({ ok: false, error: "ID de adjunto requerido" }, { status: 400 })
    }

    const adjuntoId = Number.parseInt(attachmentId)
    if (isNaN(adjuntoId)) {
      return NextResponse.json({ ok: false, error: "ID de adjunto inválido" }, { status: 400 })
    }

    // Verify attachment exists and belongs to patient
    const adjunto = await prisma.adjunto.findFirst({
      where: {
        idAdjunto: adjuntoId,
        pacienteId,
        isActive: true,
      },
    })

    if (!adjunto) {
      return NextResponse.json({ ok: false, error: "Adjunto no encontrado" }, { status: 404 })
    }

    // Store metadata BEFORE deletion for audit
    const auditMetadata = {
      pacienteId: adjunto.pacienteId,
      consultaId: adjunto.consultaId ?? null,
      procedimientoId: adjunto.procedimientoId ?? null,
      tipo: adjunto.tipo,
      format: adjunto.format ?? null,
      bytes: adjunto.bytes,
      originalFilename: adjunto.originalFilename ?? null,
      publicId: adjunto.publicId,
      deletedAt: new Date().toISOString(),
      source: adjunto.consultaId ? ("consultation" as const) : adjunto.procedimientoId ? ("procedure" as const) : ("patient" as const),
      path: req.url,
    }

    // Soft delete
    await prisma.adjunto.update({
      where: { idAdjunto: adjuntoId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedByUserId: userId,
      },
    })

    // Audit logging - AFTER successful deletion
    try {
      await auditAttachmentDelete({
        actorId: userId,
        entityId: adjuntoId,
        metadata: auditMetadata,
        headers: req.headers,
        path: req.url,
      })
    } catch (auditError) {
      console.error("[audit] Failed to log attachment deletion:", auditError)
    }

    return NextResponse.json({
      ok: true,
      message: "Adjunto eliminado correctamente",
    })
  } catch (error) {
    console.error("[API] Error deleting adjunto:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al eliminar adjunto"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}
