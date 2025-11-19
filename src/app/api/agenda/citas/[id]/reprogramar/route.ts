// app/api/agenda/citas/[id]/reprogramar/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireSessionWithRoles } from "../../../../_lib/auth";
import { paramsSchema, reprogramarBodySchema } from "./_schemas";
import { reprogramarCita } from "./_service";

/**
 * PUT /api/agenda/citas/[id]/reprogramar
 * Crea nueva cita y cancela la anterior en una transacción.
 * 
 * Validación:
 * - inicioISO: string ISO datetime (normalizado a UTC)
 * - finISO: opcional, o se calcula desde duracionMinutos
 * - motivo: opcional pero validado si se proporciona
 * - idempotencyKey: opcional para prevenir duplicados
 * 
 * Respuestas:
 * - 201: Reprogramación exitosa
 * - 409: Conflicto de solapamiento (con detalles en conflicts[])
 * - 422: Cita no reprogramable
 * - 400: Bad request (validación fallida)
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const handlerStart = performance.now();

  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", code: "BAD_REQUEST", details: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", code: "BAD_REQUEST", details: "Body JSON inválido" },
      { status: 400 },
    );
  }

  // Compatibilidad: si viene "inicio" en lugar de "inicioISO", convertir
  if (body && typeof body === "object" && "inicio" in body && !("inicioISO" in body)) {
    const b = body as { inicio?: string | Date; inicioISO?: string };
    if (typeof b.inicio === "string" || b.inicio instanceof Date) {
      b.inicioISO = typeof b.inicio === "string" ? b.inicio : b.inicio.toISOString();
    }
  }

  const parsedBody = reprogramarBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "BAD_REQUEST",
        code: "BAD_REQUEST",
        details: parsedBody.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const userId = auth.session.user.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const result = await reprogramarCita(parsedParams.data.id, parsedBody.data, Number(userId));
    const handlerTime = performance.now() - handlerStart;

    if (!("ok" in result) || !result.ok) {
      // Log de error con tiempos
      console.log(
        `[PUT /api/agenda/citas/${parsedParams.data.id}/reprogramar] ERROR ${result.status} ${result.error} - Handler: ${handlerTime.toFixed(2)}ms`
      );

      // Respuesta 409 con detalles de conflictos
      if (result.status === 409 && result.code === "OVERLAP" && result.conflicts) {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            conflicts: result.conflicts,
          },
          { status: 409 },
        );
      }

      // Manejar errores de disponibilidad con detalles
      if (result.status === 409 && (result.code === "OUTSIDE_WORKING_HOURS" || result.code === "NO_WORKING_DAY")) {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 409 },
        );
      }
      // Manejar errores de especialidad con detalles
      if (result.status === 409 && (result.code === "INCOMPATIBLE_SPECIALTY" || result.code === "PROFESSIONAL_HAS_NO_SPECIALTIES")) {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 409 },
        );
      }
      // Manejar errores de consultorio
      if (result.status === 409 && (
        result.code === "CONSULTORIO_INACTIVO" || 
        result.code === "CONSULTORIO_BLOCKED" ||
        result.code === "PROFESIONAL_BLOCKED"
      )) {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 409 },
        );
      }
      if (result.status === 404 && result.code === "CONSULTORIO_NOT_FOUND") {
        return NextResponse.json(
          {
            ok: false,
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          code: result.code ?? result.error,
          details: result.details,
        },
        { status: result.status ?? 400 },
      );
    }

    // Log de éxito con tiempos
    console.log(
      `[PUT /api/agenda/citas/${parsedParams.data.id}/reprogramar] OK 201 - Handler: ${handlerTime.toFixed(2)}ms - Nueva cita: ${result.data.nueva.idCita}`
    );

    // 201 Created: mutación que crea un recurso nuevo vinculado
    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (e: unknown) {
    const handlerTime = performance.now() - handlerStart;
    const code = (e as { code?: string })?.code;
    const errorMessage = e instanceof Error ? e.message : String(e);

    console.error(
      `[PUT /api/agenda/citas/${parsedParams.data.id}/reprogramar] EXCEPTION ${code || "UNKNOWN"} - Handler: ${handlerTime.toFixed(2)}ms`,
      errorMessage
    );

    if (code === "P2003") {
      return NextResponse.json(
        { ok: false, error: "FOREIGN_KEY_CONSTRAINT", code: "FOREIGN_KEY_CONSTRAINT" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
