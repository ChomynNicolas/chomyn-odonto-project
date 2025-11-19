// app/api/agenda/citas/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { getCitasQuerySchema } from "./_schemas"
import { toPageLimit } from "../../_lib/pagination"
import { listCitas } from "./_service"
import { createCitaBodySchema } from "./_create.schema"
import { createCita } from "./_create.service"

export async function GET(req: NextRequest) {
  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  // Parseo y validación de query
  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const parsed = getCitasQuerySchema.safeParse(query)

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  const { page, limit, skip } = toPageLimit({
    page: parsed.data.page,
    limit: parsed.data.limit,
  })

  try {
    const { data, meta } = await listCitas(parsed.data, page, limit, skip)
    return NextResponse.json({ ok: true, meta, data }, { status: 200 })
  } catch (e: unknown) {
    // Log interno si querés (sin datos sensibles)
    const errorCode = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/agenda/citas error:", errorCode || errorMessage)
    // Errores comunes de Prisma (P2021, etc.) → 500 genérico
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const bodyJson = await req.json().catch(() => null)
  const parsed = createCitaBodySchema.safeParse(bodyJson)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    // El userId lo tomamos de la sesión para evitar spoofing
    const userId = auth.session.user.id
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 })
    }

    const result = await createCita({ ...parsed.data, createdByUserId: Number(userId) })
    if (!result.ok) {
      // Manejar error 409 OVERLAP con detalles de conflictos
      if (result.status === 409 && result.code === "OVERLAP" && result.conflicts) {
        return NextResponse.json(
          { 
            ok: false, 
            error: result.error, 
            code: result.code,
            conflicts: result.conflicts,
          }, 
          { status: 409 }
        )
      }
      // Manejar errores de disponibilidad con detalles
      if (result.status === 409 && (result.code === "OUTSIDE_WORKING_HOURS" || result.code === "NO_WORKING_DAY")) {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 409 }
        )
      }
      // Manejar errores de especialidad con detalles
      if (result.status === 409 && (result.code === "INCOMPATIBLE_SPECIALTY" || result.code === "PROFESSIONAL_HAS_NO_SPECIALTIES")) {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 409 }
        )
      }
      // Manejar errores de consultorio
      if (result.status === 409 && (
        result.code === "CONSULTORIO_INACTIVO" || 
        result.code === "CONSULTORIO_BLOCKED" ||
        result.code === "PROFESIONAL_BLOCKED"
      )) {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 409 }
        )
      }
      if (result.status === 404 && result.code === "CONSULTORIO_NOT_FOUND") {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 404 }
        )
      }
      return NextResponse.json({ ok: false, error: result.error, code: result.code, details: result.details }, { status: result.status })
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 })
  } catch (e: unknown) {
    // Manejo de errores de Prisma:
    // - P2003 FK, P2002 unique, etc. -> 409 o 400 según corresponda
    const code = (e as { code?: string })?.code
    if (code === "P2003") {
      return NextResponse.json({ ok: false, error: "FOREIGN_KEY_CONSTRAINT" }, { status: 400 })
    }
    if (code === "P2002") {
      return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 })
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("POST /api/agenda/citas error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
