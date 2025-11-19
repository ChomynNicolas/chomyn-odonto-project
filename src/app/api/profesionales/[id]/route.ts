// src/app/api/profesionales/[id]/route.ts
/**
 * GET /api/profesionales/[id] - Obtiene detalle de un profesional
 * PUT /api/profesionales/[id] - Actualiza un profesional
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { ProfesionalUpdateBodySchema } from "../_schemas"
import { getProfesionalById, updateProfesional } from "../_service"
import { validateProfesionalAccess, validateUpdatePermissions } from "../_security"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ADMIN, RECEP y ODONT pueden ver detalles (ODONT solo su propio registro)
  const auth = await requireSessionWithRoles(req, ["ADMIN", "RECEP", "ODONT"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    // Validar acceso según rol
    const actorId = parseInt(auth.session.user.id)
    const accessCheck = await validateProfesionalAccess(id, actorId, auth.role)
    if (!accessCheck.ok) {
      return NextResponse.json({ ok: false, error: accessCheck.error }, { status: 403 })
    }

    const profesional = await getProfesionalById(id)

    if (!profesional) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: profesional }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/profesionales/[id] error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ADMIN puede actualizar todo, ODONT solo su propia disponibilidad
  const auth = await requireSessionWithRoles(req, ["ADMIN", "ODONT"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const parsed = ProfesionalUpdateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Validar permisos de actualización
    const actorId = parseInt(auth.session.user.id)
    const permissionCheck = await validateUpdatePermissions(id, actorId, auth.role, parsed.data)
    if (!permissionCheck.ok) {
      return NextResponse.json({ ok: false, error: permissionCheck.error }, { status: 403 })
    }

    const profesional = await updateProfesional(id, parsed.data, actorId, req.headers, req.nextUrl.pathname)

    return NextResponse.json({ ok: true, data: profesional }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (
      errorMessage.includes("ya existe") ||
      errorMessage.includes("ya está vinculado") ||
      errorMessage.includes("ya está en uso")
    ) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("PUT /api/profesionales/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

