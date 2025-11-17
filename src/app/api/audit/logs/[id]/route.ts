// src/app/api/audit/logs/[id]/route.ts
/**
 * GET /api/audit/logs/[id]
 * Obtiene el detalle completo de un registro de auditoría específico
 */

import { type NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    // Solo ADMIN puede ver detalles de logs
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    if (userRole !== "ADMIN") {
      return errors.forbidden("Solo administradores pueden ver detalles de auditoría")
    }

    // Validar parámetros
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) {
      return errors.validation("ID inválido")
    }
    const { id } = parsed.data

    // Obtener log con información completa
    const log = await prisma.auditLog.findUnique({
      where: { idAuditLog: id },
      include: {
        actor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            email: true,
            rol: {
              select: {
                nombreRol: true,
              },
            },
          },
        },
      },
    })

    if (!log) {
      return errors.notFound("Registro de auditoría no encontrado")
    }

    // Formatear respuesta con información completa
    return ok({
      id: log.idAuditLog,
      createdAt: log.createdAt.toISOString(),
      actor: {
        id: log.actor.idUsuario,
        nombre: log.actor.nombreApellido,
        email: log.actor.email,
        role: log.actor.rol.nombreRol as "ADMIN" | "ODONT" | "RECEP",
      },
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      ip: log.ip,
      metadata: log.metadata as Record<string, unknown> | null,
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/audit/logs/[id]]", e)
    return errors.internal(errorMessage ?? "Error al obtener registro de auditoría")
  }
}

