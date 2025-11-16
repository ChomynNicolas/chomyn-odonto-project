// src/app/api/procedimientos/[id]/route.ts
import { NextResponse } from "next/server";
import { ParamIdSchema, PatchProcedimientoSchema } from "./_schemas";
import {  servicePatchProcedimiento } from "./_service";
import { auth } from "@/auth";
import { fail, ok } from "assert";
import { HttpError } from "../../_lib/errors";

// RBAC Lectura: ADMIN | ODONT | RECEP
function canRead(role?: string) {
  return role === "ADMIN" || role === "ODONT" || role === "RECEP";
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Auth + RBAC
    const session = await auth();
    const role = session?.user?.role as string | undefined;
    if (!session?.user?.id) return NextResponse.json(fail("No autenticado"), { status: 401 });
    if (!canRead(role)) return NextResponse.json(fail("No autorizado"), { status: 403 });

    // Params
    const { id } = ParamIdSchema.parse(await ctx.params);

    // Servicio
    const data = await serviceGetProcedimientoDetalle(id);
    return NextResponse.json(ok(data), { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "ZodError") {
      const zodError = err as unknown as { flatten: () => unknown }
      return NextResponse.json(fail("Parámetros inválidos", zodError.flatten()), { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json(fail(err.message, err.details), { status: err.status });
    }
    console.error("GET /api/procedimientos/[id]", err);
    return NextResponse.json(fail("Error interno"), { status: 500 });
  }
}

const canPatch = (role?: string) => role === "ADMIN" || role === "ODONT";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Auth
    const session = await auth();
    const role = session?.user?.role as string | undefined;
    const userId = session?.user?.id ? Number(session.user.id) : undefined;
    if (!userId) return NextResponse.json(fail("No autenticado"), { status: 401 });
    if (!canPatch(role)) return NextResponse.json(fail("No autorizado"), { status: 403 });

    // Params + Body (validación temprana para devolver 400 rápido)
    const { id } = ParamIdSchema.parse(await ctx.params);
    const body = await req.json();
    PatchProcedimientoSchema.parse(body);

    // Servicio
    const result = await servicePatchProcedimiento({ id, body, userId, role });
    return NextResponse.json(ok(result), { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "ZodError") {
      const zodError = err as unknown as { flatten: () => unknown }
      return NextResponse.json(fail("Datos inválidos", zodError.flatten()), { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json(fail(err.message, err.details), { status: err.status });
    }
    const code = (err as { code?: string })?.code
    if (code === "P2003") {
      return NextResponse.json(fail("Referencia inválida (FK)"), { status: 400 });
    }
    console.error("PATCH /api/procedimientos/[id]", err);
    return NextResponse.json(fail("Error interno"), { status: 500 });
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function serviceGetProcedimientoDetalle(_id: number) {
    throw new Error("Function not implemented.");
}

