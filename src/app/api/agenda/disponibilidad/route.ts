// app/api/agenda/disponibilidad/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { getDisponibilidadQuerySchema } from "./_schemas"
import { getDisponibilidad } from "./_service"
import { requireSessionWithRoles } from "../../_lib/auth"

/**
 * GET /api/agenda/disponibilidad
 * Calcula slots disponibles (citas + bloqueos + working hours).
 */
export async function GET(req: NextRequest) {
  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const parsed = getDisponibilidadQuerySchema.safeParse(query)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const { slots, meta } = await getDisponibilidad(parsed.data)
    return NextResponse.json({ ok: true, meta, data: slots }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("GET /api/agenda/disponibilidad error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
