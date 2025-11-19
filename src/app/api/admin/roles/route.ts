// src/app/api/admin/roles/route.ts
/**
 * GET /api/admin/roles
 * Lista todos los roles con conteo de usuarios (solo ADMIN)
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { listRoles } from "./_service"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const roles = await listRoles()

    // Opcional: Log de visualización (baja prioridad)
    if (auth.session?.user?.id) {
      await safeAuditWrite({
        actorId: parseInt(auth.session.user.id),
        action: AuditAction.ROLES_LIST_VIEW,
        entity: AuditEntity.Rol,
        entityId: 0, // No hay ID específico para listado
        metadata: {
          count: roles.length,
        },
        headers: req.headers,
        path: req.nextUrl.pathname,
      })
    }

    return NextResponse.json(
      { ok: true, data: roles },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=300" }, // Cache de 5 minutos
      }
    )
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/admin/roles error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

