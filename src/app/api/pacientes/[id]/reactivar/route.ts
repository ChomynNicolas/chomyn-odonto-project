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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Roles permitidos: ADMIN | RECEP | ODONT
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"]);
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado");

  try {
    const { id } = pathParamsSchema.parse(await ctx.params);
    const query = reactivateQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    // body no se usa actualmente, pero se parsea para validación futura
    await reactivateBodySchema.parse(await safeReadJson(req)); // motivo opcional

    const session = await auth();
    const actorUserId = session?.user?.id ? Number.parseInt(session.user.id, 10) : undefined;

    const result = await reactivatePacienteById({
      pacienteId: id,
      alsoReactivatePersona: !!query.persona,
      actorUserId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: Array<{ message?: string }> }
      return jsonError(400, "VALIDATION_ERROR", zodError.issues?.[0]?.message ?? "Parámetros inválidos");
    }
    if (e instanceof ReactivatePacienteError) {
      return jsonError(e.status, e.code, e.message);
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    return jsonError(500, "INTERNAL_ERROR", errorMessage ?? "Error al reactivar paciente");
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
