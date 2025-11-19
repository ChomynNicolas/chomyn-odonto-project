// src/app/api/admin/procedimientos/[id]/route.ts
/**
 * GET /api/admin/procedimientos/[id] - Obtiene detalle de un procedimiento
 * PATCH /api/admin/procedimientos/[id] - Actualiza un procedimiento
 * DELETE /api/admin/procedimientos/[id] - Elimina un procedimiento (solo si no tiene referencias)
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../_lib/auth"
import { ProcedimientoIdSchema, ProcedimientoUpdateSchema } from "../_schemas"
import {
  getProcedimientoById,
  updateProcedimiento,
  deleteProcedimientoIfUnused,
} from "../_service"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSessionWithRoles(req, ["ADMIN", "ODONT", "RECEP"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await context.params
    const parsed = ProcedimientoIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const procedimiento = await getProcedimientoById(parsed.data.id)

    return NextResponse.json({ ok: true, data: procedimiento }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("GET /api/admin/procedimientos/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await context.params
    const parsedId = ProcedimientoIdSchema.safeParse({ id })

    if (!parsedId.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const parsedBody = ProcedimientoUpdateSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsedBody.error.flatten() },
        { status: 400 }
      )
    }

    const actorId = parseInt(auth.session.user.id)
    const procedimiento = await updateProcedimiento(
      parsedId.data.id,
      parsedBody.data,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: procedimiento }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    if (errorMessage.includes("código") || errorMessage.includes("referencias")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    console.error("PATCH /api/admin/procedimientos/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function DELETE(
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

    const actorId = parseInt(auth.session.user.id)
    await deleteProcedimientoIfUnused(parsed.data.id, actorId, req.headers, req.nextUrl.pathname)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    if (errorMessage.includes("referencias") || errorMessage.includes("tratamientos") || errorMessage.includes("consultas")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    console.error("DELETE /api/admin/procedimientos/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

