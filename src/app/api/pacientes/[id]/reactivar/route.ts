// src/app/api/pacientes/[id]/reactivar/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/app/api/pacientes/_rbac";
import { pathParamsSchema } from "../_schemas"; // del feature padre [id]
import { reactivateQuerySchema, reactivateBodySchema } from "./_schemas";
import { reactivatePacienteById, ReactivatePacienteError } from "./_service.reactivate";
import { auth } from "@/auth";

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  // Roles permitidos: ADMIN | RECEP | ODONT
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"]);
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado");

  try {
    const { id } = pathParamsSchema.parse(ctx.params);
    const query = reactivateQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const body = reactivateBodySchema.parse(await safeReadJson(req)); // motivo opcional

    const session = await auth();
    const actorUserId = Number((session?.user as any)?.id) || undefined;

    const result = await reactivatePacienteById({
      pacienteId: id,
      alsoReactivatePersona: !!query.persona,
      actorUserId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return jsonError(400, "VALIDATION_ERROR", e.issues?.[0]?.message ?? "Parámetros inválidos");
    }
    if (e instanceof ReactivatePacienteError) {
      return jsonError(e.status, e.code, e.message);
    }
    return jsonError(500, "INTERNAL_ERROR", e?.message ?? "Error al reactivar paciente");
  }
}

// Lee JSON de forma tolerante (permite body vacío)
async function safeReadJson(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
