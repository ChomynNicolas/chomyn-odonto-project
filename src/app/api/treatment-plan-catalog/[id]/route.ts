// src/app/api/treatment-plan-catalog/[id]/route.ts
/**
 * GET /api/treatment-plan-catalog/[id] - Obtiene detalle de un treatment plan catalog
 * PUT /api/treatment-plan-catalog/[id] - Actualiza un treatment plan catalog
 * DELETE /api/treatment-plan-catalog/[id] - Elimina un treatment plan catalog
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { TreatmentPlanCatalogIdSchema, TreatmentPlanCatalogUpdateBodySchema } from "../_schemas"
import { getTreatmentPlanCatalogById, updateTreatmentPlanCatalog, deleteTreatmentPlanCatalog } from "../_service"

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
    const parsed = TreatmentPlanCatalogIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const catalog = await getTreatmentPlanCatalogById(parsed.data.id)

    return NextResponse.json({ ok: true, data: catalog }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    
    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("GET /api/treatment-plan-catalog/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await context.params
    const parsedId = TreatmentPlanCatalogIdSchema.safeParse({ id })

    if (!parsedId.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const parsedBody = TreatmentPlanCatalogUpdateBodySchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsedBody.error.flatten() },
        { status: 400 }
      )
    }

    const userId = auth.session.user.id
    if (typeof userId !== "string") {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: "Invalid user id" }, { status: 500 })
    }
    const actorId = parseInt(userId)
    if (isNaN(actorId)) {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: "User id is not a number" }, { status: 500 })
    }
    const catalog = await updateTreatmentPlanCatalog(
      parsedId.data.id,
      parsedBody.data,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: catalog }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("PUT /api/treatment-plan-catalog/[id] error:", errorMessage)
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
    const parsed = TreatmentPlanCatalogIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const userId = auth.session.user.id
    if (typeof userId !== "string") {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: "Invalid user id" }, { status: 500 })
    }
    const actorId = parseInt(userId)
    if (isNaN(actorId)) {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: "User id is not a number" }, { status: 500 })
    }
    await deleteTreatmentPlanCatalog(parsed.data.id, actorId, req.headers, req.nextUrl.pathname)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    if (errorMessage.includes("siendo utilizado") || errorMessage.includes("plan(es) de tratamiento")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    console.error("DELETE /api/treatment-plan-catalog/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

