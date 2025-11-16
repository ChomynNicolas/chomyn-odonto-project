// app/api/agenda/citas/[id]/estado/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireSessionWithRoles } from "../../../../_lib/auth";
import { paramsSchema, estadoBodySchema } from "./_schemas";
import { changeCitaEstado } from "./_service";

/**
 * PATCH /api/agenda/citas/[id]/estado
 * Cambia el estado operativo de la cita con auditoría y control de transiciones.
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // RBAC
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Params
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  // Body
  const body = await req.json().catch(() => null);
  const parsedBody = estadoBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const userId = auth.session.user.id;
    if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const result = await changeCitaEstado(parsedParams.data.id, parsedBody.data, Number(userId));
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2003") {
      return NextResponse.json({ ok: false, error: "FOREIGN_KEY_CONSTRAINT" }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("PATCH /api/agenda/citas/[id]/estado error:", code || errorMessage);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
