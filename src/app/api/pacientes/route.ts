// src/app/api/pacientes/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { pacienteCreateBodySchema } from "./_schemas";
import { createPaciente } from "./_service.create";
import { requireRole } from "./_rbac";
import { auth } from "@/auth";
import { parsePacientesListQuery, listPacientes } from "./_service.list";

// Helpers de respuesta estándar (puedes moverlos a /api/_http si quieres centralizar)
function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}
function created(data: unknown, req: NextRequest) {
  const res = NextResponse.json({ ok: true, data }, { status: 201 });
  const idem = req.headers.get("x-idempotency-key");
  if (idem) res.headers.set("X-Idempotency-Key", idem);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
function fail(msg: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: msg, details }, { status });
}

export async function GET(request: NextRequest) {
  // 1) RBAC lectura
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"]);
  if (!gate.ok) return fail("No autorizado", 403);

  try {
    // 2) Parseo de query con Zod centralizado
    const query = parsePacientesListQuery(request.nextUrl.searchParams);

    // 3) Lógica delegada al service → repo (sin N+1)
    const { items, nextCursor, hasMore, totalCount } = await listPacientes(query);

    // 4) Respuesta + headers
    const res = ok({ items, nextCursor, hasMore, totalCount });
    res.headers.set("X-Total-Count", String(totalCount));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    if (e?.name === "ZodError") return fail("Parámetros inválidos", 400, e.issues);
    if (typeof e?.code === "string" && e.code.startsWith("P")) {
      return fail("Error de base de datos", 400, { code: e.code });
    }
    return fail("Error inesperado", 500);
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"]);
  if (!gate.ok) return fail("No autorizado", 403);

  try {
    const raw = await req.json();
    const body = pacienteCreateBodySchema.parse(raw);

    const session = await auth();
    const actorUserId = Number((session?.user as any)?.id) || undefined;

    const result = await createPaciente(body, actorUserId);
    return created(result, req);
  } catch (e: any) {
    if (e?.code === "P2002") return fail("Documento o contacto ya existe", 409);
    if (e?.name === "ZodError") return fail(e.issues?.[0]?.message ?? "Datos inválidos", 400, e.issues);
    // Prisma FK
    if (e?.code === "P2003") return fail("Referencia inválida (clave foránea)", 400);
    return fail(e?.message ?? "Error interno al crear paciente", 500);
  }
}
