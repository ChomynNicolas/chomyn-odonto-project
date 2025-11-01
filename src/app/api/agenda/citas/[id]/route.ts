// src/app/api/agenda/citas/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionWithRoles } from "../../../_lib/auth";
import { getCitaDetail } from "./_service";

export const revalidate = 0;

const paramsSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

  try {
    const dto = await getCitaDetail(parsed.data.id);
    if (!dto) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(dto, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("GET /api/agenda/citas/[id] error:", e?.message);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
