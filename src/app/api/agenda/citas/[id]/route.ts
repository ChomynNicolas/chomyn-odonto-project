import { NextResponse, type NextRequest } from "next/server";
import { requireSessionWithRoles } from "@/app/api/_lib/auth";
import { paramsSchema } from "./_schemas";
import { getCitaDetail } from "./_service";

export const revalidate = 0;          // sin cacheo
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // RBAC
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // ✅ Next 15: params es Promise
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten?.() },
      { status: 400 }
    );
  }

  try {
    const dto = await getCitaDetail(parsed.data.id);
    if (!dto) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    // Puedes devolver el wrapper o el DTO directo; tu cliente soporta ambos.
    const res = NextResponse.json({ ok: true, data: dto }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    console.error("GET /api/agenda/citas/[id] error:", e?.message);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
