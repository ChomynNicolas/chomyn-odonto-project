// app/api/agenda/citas/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireSessionWithRoles } from "../../../_lib/auth";
import { paramsSchema } from "./_schemas";
import { getCitaDetail } from "./_service";

/**
 * GET /api/agenda/citas/[id]
 * Devuelve el detalle completo de una cita.
 */
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  // RBAC básico: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Validación del path param
  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const dto = await getCitaDetail(parsed.data.id);
    if (!dto) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    // No cache (datos sensibles y dinámicos)
    const res = NextResponse.json({ ok: true, data: dto }, { status: 200 });
    res.headers.set("Cache-Control", "no-store"); // evitar cachear detalle de pacientes/citas
    return res;
  } catch (e: any) {
    console.error("GET /api/agenda/citas/[id] error:", e?.code || e?.message);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
