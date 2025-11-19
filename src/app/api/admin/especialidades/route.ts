// src/app/api/admin/especialidades/route.ts
/**
 * GET /api/admin/especialidades - Lista especialidades con filtros
 * POST /api/admin/especialidades - Crea una nueva especialidad
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { EspecialidadListQuerySchema, EspecialidadCreateBodySchema } from "./_schemas"
import { listEspecialidades, createEspecialidad } from "./_service"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN", "ODONT", "RECEP"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = EspecialidadListQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listEspecialidades(parsed.data)

    // Optional: Log de visualización (solo ADMIN)
    if (auth.session?.user?.id && auth.role === "ADMIN") {
      await safeAuditWrite({
        actorId: parseInt(auth.session.user.id),
        action: AuditAction.ESPECIALIDAD_LIST_VIEW,
        entity: AuditEntity.Especialidad,
        entityId: 0,
        metadata: {
          filters: parsed.data,
          count: result.data.length,
        },
        headers: req.headers,
        path: req.nextUrl.pathname,
      })
    }

    return NextResponse.json({ ok: true, ...result }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/admin/especialidades error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = EspecialidadCreateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const actorId = parseInt(auth.session.user.id)
    const especialidad = await createEspecialidad(
      parsed.data,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: especialidad }, { status: 201 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrada") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/admin/especialidades error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

