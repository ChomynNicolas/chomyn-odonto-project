// src/app/api/diagnosis-catalog/route.ts
/**
 * GET /api/diagnosis-catalog - Lista diagnosis catalogs con filtros
 * POST /api/diagnosis-catalog - Crea un nuevo diagnosis catalog
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../_lib/auth"
import { DiagnosisCatalogListQuerySchema, DiagnosisCatalogCreateBodySchema } from "./_schemas"
import { listDiagnosisCatalogs, createDiagnosisCatalog } from "./_service"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN", "ODONT"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = DiagnosisCatalogListQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listDiagnosisCatalogs(parsed.data)

    // Optional: Log de visualización (solo ADMIN)
    if (auth.session?.user?.id && auth.role === "ADMIN") {
      await safeAuditWrite({
        actorId: parseInt(auth.session.user.id),
        action: AuditAction.DIAGNOSIS_CATALOG_LIST_VIEW,
        entity: AuditEntity.DiagnosisCatalog,
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
    console.error("GET /api/diagnosis-catalog error:", code || errorMessage)
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
    const parsed = DiagnosisCatalogCreateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (!auth.session?.user?.id) {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
    }
    const actorId = parseInt(auth.session.user.id as string)
    const diagnosisCatalog = await createDiagnosisCatalog(
      parsed.data,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: diagnosisCatalog }, { status: 201 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/diagnosis-catalog error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

