// src/app/api/pacientes/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/app/api/pacientes/_rbac";
import { pathParamsSchema, pacienteUpdateBodySchema, deleteQuerySchema } from "./_schemas";
import { getPacienteFicha } from "./_service.get";
import { updatePaciente } from "./_service.update";
import { deletePacienteById, DeletePacienteError } from "./_service.delete";

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status });
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"]);
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado");

  try {
    const { id } = pathParamsSchema.parse(ctx.params);
    const ficha = await getPacienteFicha(id);
    if (!ficha) return jsonError(404, "NOT_FOUND", "Paciente no encontrado");
    return NextResponse.json({ ok: true, data: ficha });
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonError(400, "VALIDATION_ERROR", e.issues?.[0]?.message ?? "Parámetros inválidos");
    return jsonError(e?.status ?? 500, e?.code ?? "INTERNAL_ERROR", e?.message ?? "Error al obtener paciente");
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  // Reglas: si luego necesitas restringir campos, cambia allowed roles aquí o agrega checks por campo
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"]);
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado");

  try {
    const { id } = pathParamsSchema.parse(ctx.params);
    const body = pacienteUpdateBodySchema.parse(await req.json());

    const result = await updatePaciente(id, body);
    return NextResponse.json(result);
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonError(400, "VALIDATION_ERROR", e.issues?.[0]?.message ?? "Datos inválidos");
    if (e?.status === 404) return jsonError(404, "NOT_FOUND", e.message);
    if (e?.code === "P2002") return jsonError(409, "UNIQUE_CONFLICT", "Conflicto de unicidad");
    return jsonError(500, "INTERNAL_ERROR", e?.message ?? "Error al actualizar paciente");
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"]);
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado");

  try {
    const { id } = pathParamsSchema.parse(ctx.params);
    const query = deleteQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const role = gate.role!; // "ADMIN" | "RECEP" | "ODONT"

    const result = await deletePacienteById({
      pacienteId: id,
      role,
      hard: query.hard,                 // solo ADMIN lo respetará
      alsoInactivatePersona: true,      // opcional: inactivar persona junto al paciente
    });

    // 200 OK con payload informativo
    return NextResponse.json({ ok: true, mode: result.mode, result });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return jsonError(400, "VALIDATION_ERROR", e.issues?.[0]?.message ?? "Parámetros inválidos");
    }
    if (e instanceof DeletePacienteError) {
      return jsonError(e.status, e.code, e.message, e.extra);
    }
    if (e?.code === "P2003") {
      // FK violation (por si el schema no tiene cascadas esperadas)
      return jsonError(409, "FK_CONSTRAINT", "No se puede eliminar por restricciones de integridad");
    }
    return jsonError(500, "INTERNAL_ERROR", e?.message ?? "Error al eliminar/inactivar paciente");
  }
}
