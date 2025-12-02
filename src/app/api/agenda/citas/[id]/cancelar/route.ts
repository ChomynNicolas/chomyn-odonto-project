// app/api/agenda/citas/[id]/cancelar/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireSessionWithRoles } from "../../../../_lib/auth";
import { paramsSchema, cancelarBodySchema } from "./_schemas";
import { cancelarCita } from "./_service";
import { extractClientIP } from "@/lib/utils/extract-ip";

/**
 * PATCH /api/agenda/citas/[id]/cancelar
 * Cancela una cita (no elimina) y registra auditoría.
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Params
  const parsedParams = paramsSchema.safeParse(await context.params);
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
    const userId = auth.session.user.id;
    if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const ip = extractClientIP(req);
    const result = await cancelarCita(parsedParams.data.id, parsedBody.data, Number(userId), ip);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    // 200 OK: devolvemos la cita cancelada (DTO mini)
    return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2003") {
      return NextResponse.json({ ok: false, error: "FOREIGN_KEY_CONSTRAINT" }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("PATCH /api/agenda/citas/[id]/cancelar error:", code || errorMessage);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
