// src/app/api/agenda/citas/[id]/consulta/adjuntos/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createAttachmentSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

/**
 * GET /api/agenda/citas/[id]/consulta/adjuntos
 * Obtiene todos los adjuntos de la consulta
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver adjuntos clínicos")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const adjuntos = await prisma.adjunto.findMany({
      where: {
        consultaId: citaId,
        isActive: true,
      },
      include: {
        uploadedBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            profesional: {
              select: {
                persona: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return ok(
      adjuntos.map((a) => ({
        id: a.idAdjunto,
        tipo: a.tipo,
        descripcion: a.descripcion,
        secureUrl: a.secureUrl,
        publicId: a.publicId,
        format: a.format,
        bytes: a.bytes,
        width: a.width,
        height: a.height,
        originalFilename: a.originalFilename,
        uploadedBy: {
          id: a.uploadedBy.idUsuario,
          nombre:
            a.uploadedBy.profesional?.persona?.nombres && a.uploadedBy.profesional?.persona?.apellidos
              ? `${a.uploadedBy.profesional.persona.nombres} ${a.uploadedBy.profesional.persona.apellidos}`.trim()
              : a.uploadedBy.nombreApellido ?? "Usuario",
        },
        createdAt: a.createdAt.toISOString(),
      }))
    )
  } catch (e: any) {
    console.error("[GET /api/agenda/citas/[id]/consulta/adjuntos]", e)
    return errors.internal(e?.message ?? "Error al obtener adjuntos")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/adjuntos
 * Crea un nuevo adjunto (RX, foto, etc.)
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canUploadAttachments(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden subir adjuntos")
    }

    const body = await req.json()
    const input = createAttachmentSchema.parse(body)

    // Asegurar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      include: {
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) {
      const cita = await prisma.cita.findUnique({
        where: { idCita: citaId },
        include: { profesional: true },
      })
      if (!cita) return errors.notFound("Cita no encontrada")
      await ensureConsulta(citaId, cita.profesionalId, session.user.id)
      const nuevaConsulta = await prisma.consulta.findUnique({
        where: { citaId },
        include: {
          cita: {
            select: {
              pacienteId: true,
            },
          },
        },
      })
      if (!nuevaConsulta) return errors.internal("Error al crear consulta")

      const adjunto = await prisma.adjunto.create({
        data: {
          pacienteId: nuevaConsulta.cita.pacienteId,
          consultaId: citaId,
          publicId: input.publicId,
          folder: input.folder,
          resourceType: input.resourceType,
          format: input.format ?? null,
          bytes: input.bytes,
          width: input.width ?? null,
          height: input.height ?? null,
          duration: input.duration ?? null,
          originalFilename: input.originalFilename ?? null,
          secureUrl: input.secureUrl,
          tipo: input.tipo,
          descripcion: input.descripcion ?? null,
          uploadedByUserId: session.user.id,
        },
        include: {
          uploadedBy: {
            select: {
              idUsuario: true,
              nombreApellido: true,
              profesional: {
                select: {
                  persona: {
                    select: {
                      nombres: true,
                      apellidos: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      return ok({
        id: adjunto.idAdjunto,
        tipo: adjunto.tipo,
        descripcion: adjunto.descripcion,
        secureUrl: adjunto.secureUrl,
        publicId: adjunto.publicId,
        format: adjunto.format,
        bytes: adjunto.bytes,
        width: adjunto.width,
        height: adjunto.height,
        originalFilename: adjunto.originalFilename,
        uploadedBy: {
          id: adjunto.uploadedBy.idUsuario,
          nombre:
            adjunto.uploadedBy.profesional?.persona?.nombres && adjunto.uploadedBy.profesional?.persona?.apellidos
              ? `${adjunto.uploadedBy.profesional.persona.nombres} ${adjunto.uploadedBy.profesional.persona.apellidos}`.trim()
              : adjunto.uploadedBy.nombreApellido ?? "Usuario",
        },
        createdAt: adjunto.createdAt.toISOString(),
      })
    }

    const adjunto = await prisma.adjunto.create({
      data: {
        pacienteId: consulta.cita.pacienteId,
        consultaId: citaId,
        publicId: input.publicId,
        folder: input.folder,
        resourceType: input.resourceType,
        format: input.format ?? null,
        bytes: input.bytes,
        width: input.width ?? null,
        height: input.height ?? null,
        duration: input.duration ?? null,
        originalFilename: input.originalFilename ?? null,
        secureUrl: input.secureUrl,
        tipo: input.tipo,
        descripcion: input.descripcion ?? null,
        uploadedByUserId: session.user.id,
      },
      include: {
        uploadedBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            profesional: {
              select: {
                persona: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return ok({
      id: adjunto.idAdjunto,
      tipo: adjunto.tipo,
      descripcion: adjunto.descripcion,
      secureUrl: adjunto.secureUrl,
      publicId: adjunto.publicId,
      format: adjunto.format,
      bytes: adjunto.bytes,
      width: adjunto.width,
      height: adjunto.height,
      originalFilename: adjunto.originalFilename,
      uploadedBy: {
        id: adjunto.uploadedBy.idUsuario,
        nombre:
          adjunto.uploadedBy.profesional?.persona?.nombres && adjunto.uploadedBy.profesional?.persona?.apellidos
            ? `${adjunto.uploadedBy.profesional.persona.nombres} ${adjunto.uploadedBy.profesional.persona.apellidos}`.trim()
            : adjunto.uploadedBy.nombreApellido ?? "Usuario",
      },
      createdAt: adjunto.createdAt.toISOString(),
    })
  } catch (e: any) {
    if (e.name === "ZodError") return errors.validation(e.errors[0]?.message ?? "Datos inválidos")
    console.error("[POST /api/agenda/citas/[id]/consulta/adjuntos]", e)
    return errors.internal(e?.message ?? "Error al crear adjunto")
  }
}

