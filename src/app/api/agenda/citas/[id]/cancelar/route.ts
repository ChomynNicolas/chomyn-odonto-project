// app/api/agenda/citas/[id]/cancelar/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireSessionWithRoles } from "../../../../_lib/auth";
import { paramsSchema, cancelarBodySchema } from "./_schemas";
import { cancelarCita } from "./_service";

/**
 * PATCH /api/agenda/citas/[id]/cancelar
 * Cancela una cita (no elimina) y registra auditoría.
 */
export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Params
  const parsedParams = paramsSchema.safeParse(await context.params); // ✅
  if (!parsedParams.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsedParams.error.flatten() },
      { status: 400 }
    );
  }

  // Body
  const body = await req.json().catch(() => null);
  const parsedBody = cancelarBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const userId = (auth.session.user as any)?.idUsuario ?? (auth.session.user as any)?.id;
    if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const result = await cancelarCita(parsedParams.data.id, parsedBody.data, Number(userId));
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    // 200 OK: devolvemos la cita cancelada (DTO mini)
    return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
  } catch (e: any) {
    const code = e?.code as string | undefined;
    if (code === "P2003") {
      return NextResponse.json({ ok: false, error: "FOREIGN_KEY_CONSTRAINT" }, { status: 400 });
    }
    console.error("PATCH /api/agenda/citas/[id]/cancelar error:", code || e?.message);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
