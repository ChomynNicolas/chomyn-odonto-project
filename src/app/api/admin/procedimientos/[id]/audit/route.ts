// src/app/api/admin/procedimientos/[id]/audit/route.ts
/**
 * GET /api/admin/procedimientos/[id]/audit - Obtiene el log de auditoría de un procedimiento
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../../_lib/auth"
import { ProcedimientoIdSchema } from "../../_schemas"
import { prisma } from "@/lib/prisma"
import { AuditEntity } from "@/lib/audit/actions"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await context.params
    const parsed = ProcedimientoIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    // Verify procedimiento exists
    const procedimiento = await prisma.procedimientoCatalogo.findUnique({
      where: { idProcedimiento: parsed.data.id },
    })

    if (!procedimiento) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "Procedimiento no encontrado" },
        { status: 404 }
      )
    }

    // Get audit logs for this procedimiento
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: AuditEntity.ProcedimientoCatalogo,
        entityId: parsed.data.id,
      },
      include: {
        actor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            usuario: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit to last 100 entries
    })

    const logs = auditLogs.map((log) => ({
      idAuditLog: log.idAuditLog,
      action: log.action,
      actor: {
        id: log.actor.idUsuario,
        nombre: log.actor.nombreApellido,
        usuario: log.actor.usuario,
      },
      createdAt: log.createdAt.toISOString(),
      metadata: log.metadata,
      ip: log.ip,
    }))

    return NextResponse.json({ ok: true, data: logs }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/admin/procedimientos/[id]/audit error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

