// app/api/agenda/citas/[id]/reprogramar/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireSessionWithRoles } from "../../../../_lib/auth";
import { paramsSchema, reprogramarBodySchema } from "./_schemas";
import { reprogramarCita } from "./_service";

/**
 * PUT /api/agenda/citas/[id]/reprogramar
 * Crea nueva cita y cancela la anterior en una transacción.
 */
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsedBody = reprogramarBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const userId = (auth.session.user as any)?.idUsuario ?? (auth.session.user as any)?.id;
    if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const result = await reprogramarCita(parsedParams.data.id, parsedBody.data, Number(userId));
    if (!("ok" in result) || !result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: (result as any).status ?? 400 },
      );
    }

    // 201? 200? → Es una mutación que crea un recurso nuevo vinculado: usamos 201 Created.
    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (e: any) {
    const code = e?.code as string | undefined;
    if (code === "P2003") {
      return NextResponse.json({ ok: false, error: "FOREIGN_KEY_CONSTRAINT" }, { status: 400 });
    }
    console.error("PUT /api/agenda/citas/[id]/reprogramar error:", code || e?.message);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
