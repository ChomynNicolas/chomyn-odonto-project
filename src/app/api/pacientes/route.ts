// src/app/api/pacientes/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { pacienteCreateBodySchema } from "./_schemas";
import { createPaciente } from "./_service.create";
import { requireRole } from "./_rbac";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { parsePacientesListQuery, listPacientes } from "./_service.list";
import z from "zod";

// Utilidad para respuestas de error uniformes
function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status });
}


// (opcional) mueve este mapper a ./_dto.ts y reutilízalo en POST
function mapGeneroToDB(g: string) {
  if (g === "NO_ESPECIFICADO") return "NO_DECLARA"
  return g
}

export async function GET(request: NextRequest) {
  // 1) RBAC lectura
  const authz = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!authz.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 })
  }

  try {
    // 2) Parseo de query con Zod centralizado
    const query = parsePacientesListQuery(request.nextUrl.searchParams)

    // 3) Lógica delegada al service → repo (sin N+1)
    const { items, nextCursor, hasMore, totalCount } = await listPacientes(query)

    // 4) Respuesta y headers de paginado
    const res = NextResponse.json({ items, nextCursor, hasMore, totalCount }, { status: 200 })
    res.headers.set("X-Total-Count", String(totalCount))
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (e: any) {
    // 5) Errores previstos: Zod → 400
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: "Parámetros inválidos", details: e.issues },
        { status: 400 }
      )
    }
    // (opcional) Prisma P2025 (no encontrado) o validaciones de negocio → 400/404
    if (typeof e?.code === "string" && e.code.startsWith("P")) {
      return NextResponse.json(
        { ok: false, error: "Error de base de datos", code: e.code },
        { status: 400 }
      )
    }
    // 6) Fallback
    return NextResponse.json({ ok: false, error: "Error inesperado" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // RBAC
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"]);
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado");

  try {
    const raw = await req.json();
    const body = pacienteCreateBodySchema.parse(raw);

    // Puedes pasar el actor (si lo usas en auditoría)
    const session = await auth();
    const actorUserId = Number((session?.user as any)?.id) || undefined;

    const result = await createPaciente(body, actorUserId);
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    // Prisma unique conflict
    if (e?.code === "P2002") {
      return jsonError(409, "UNIQUE_CONFLICT", "Documento o contacto ya existe");
    }
    // Zod
    if (e?.name === "ZodError") {
      return jsonError(400, "VALIDATION_ERROR", e.issues?.[0]?.message ?? "Datos inválidos");
    }
    // Otros
    const message = e?.message ?? "Error interno al crear paciente";
    return jsonError(500, "INTERNAL_ERROR", message);
  }
}


const patchSchema = z.object({
  accion: z.enum(["INACTIVAR", "ACTIVAR"]),
  motivo: z.string().max(300).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (!role || !["ADMIN", "RECEP"].includes(role))
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const idPaciente = Number(params.id);
  const body = patchSchema.parse(await req.json());

  const updated = await db.$transaction(async (tx) => {
    const paciente = await tx.paciente.update({
      where: { idPaciente },
      data: { estaActivo: body.accion === "ACTIVAR" },
      include: {
        persona: {
          select: {
            idPersona: true, nombres: true, apellidos: true, genero: true,
            documento: { select: { tipo: true, numero: true, ruc: true } },
            contactos: { select: { tipo: true, valorNorm: true, esPrincipal: true, activo: true } },
          },
        },
      },
    });

    // AuditLog (simple; activa cuando tengas el modelo)
    // await tx.auditLog.create({
    //   data: {
    //     actorId: Number((session!.user as any).idUsuario),
    //     action: body.accion === "ACTIVAR" ? "PACIENTE_ACTIVAR" : "PACIENTE_INACTIVAR",
    //     entity: "Paciente",
    //     entityId: String(idPaciente),
    //     meta: { motivo: body.motivo ?? null },
    //   },
    // });

    return paciente;
  });

  return NextResponse.json({ ok: true, item: updated });
}