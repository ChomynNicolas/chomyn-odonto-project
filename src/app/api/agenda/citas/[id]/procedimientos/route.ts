import { fail, ok } from "@/app/api/_lib/responses";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { canCreateProcedure } from "./_rbac";
import { CrearProcedimientoSchema, ListQuerySchema, ParamIdSchema } from "./_schemas";
import { serviceCreateProcedureForCita, serviceListProcedimientosByCita } from "./_service";
import { HttpError } from "@/app/api/_lib/errors";

function canList(role?: string) {
  return role === "ADMIN" || role === "ODONT" || role === "RECEP";
}


export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    // Auth + RBAC
    const session = await auth();
    const role = session?.user?.role as string | undefined;
    if (!session?.user?.id) return NextResponse.json(fail("No autenticado"), { status: 401 });
    if (!canList(role)) return NextResponse.json(fail("No autorizado"), { status: 403 });

    // Params + Query
    const { id: citaId } = ParamIdSchema.parse(ctx.params);
    const { searchParams } = new URL(req.url);
    const query = ListQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      toothNumber: searchParams.get("toothNumber") ?? undefined,
      hasCatalog: searchParams.get("hasCatalog") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    const data = await serviceListProcedimientosByCita({ citaId, query });
    return NextResponse.json(ok(data), { status: 200 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(fail("Parámetros inválidos", err.flatten()), { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json(fail(err.message, err.details), { status: err.status });
    }
    console.error("GET /api/agenda/citas/[id]/procedimientos", err);
    return NextResponse.json(fail("Error interno"), { status: 500 });
  }
}


export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    // Auth + RBAC
    const session = await auth();
    const role = session?.user?.role as string | undefined;
    const userId = session?.user?.id ? Number(session.user.id) : undefined;

    if (!userId) return NextResponse.json(fail("No autenticado"), { status: 401 });
    if (!canCreateProcedure(role)) return NextResponse.json(fail("No autorizado"), { status: 403 });

    // Params + Body (validación temprana)
    const { id: citaId } = ParamIdSchema.parse(ctx.params);
    const body = await req.json();
    const dto = CrearProcedimientoSchema.parse(body);

    // Servicio
    const created = await serviceCreateProcedureForCita({ citaId, dto, userId });
    return NextResponse.json(ok(created), { status: 201 });
  } catch (err: any) {
    // Zod
    if (err?.name === "ZodError") {
      return NextResponse.json(fail("Datos inválidos", err.flatten()), { status: 400 });
    }
    // HttpErrors propias
    if (err instanceof HttpError) {
      return NextResponse.json(fail(err.message, err.details), { status: err.status });
    }
    // Prisma FK, etc.
    if (err?.code === "P2003") {
      return NextResponse.json(fail("Referencia inválida (FK)"), { status: 400 });
    }
    console.error("POST /api/agenda/citas/[id]/procedimientos", err);
    return NextResponse.json(fail("Error interno"), { status: 500 });
  }
}


