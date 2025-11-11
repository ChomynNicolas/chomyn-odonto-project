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
  } catch (e: any) {
    // Log interno si querés (sin datos sensibles)
    console.error("GET /api/agenda/citas error:", e?.code || e?.message)
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
    const userId = (auth.session.user as any)?.idUsuario ?? (auth.session.user as any)?.id
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
      return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status: result.status })
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 })
  } catch (e: any) {
    // Manejo de errores de Prisma:
    // - P2003 FK, P2002 unique, etc. -> 409 o 400 según corresponda
    const code = e?.code as string | undefined
    if (code === "P2003") {
      return NextResponse.json({ ok: false, error: "FOREIGN_KEY_CONSTRAINT" }, { status: 400 })
    }
    if (code === "P2002") {
      return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 })
    }
    console.error("POST /api/agenda/citas error:", code || e?.message)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
