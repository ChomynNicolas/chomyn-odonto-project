import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { requireSessionWithRoles } from "@/app/api/_lib/auth";

export const revalidate = 0; // no ISR
export const dynamic = "force-dynamic"; // evita caché en runtime

const prisma = new PrismaClient();

const asDate = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());
const querySchema = z.object({
  start: asDate, // requerido por FullCalendar
  end: asDate,   // requerido por FullCalendar
});

export async function GET(req: NextRequest) {
  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { start, end } = parsed.data;

  try {
    const rows = await prisma.cita.findMany({
      where: {
        inicio: { lt: end },
        fin: { gt: start },
      },
      orderBy: { inicio: "asc" },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        tipo: true,
        estado: true,
        motivo: true,
        profesional: {
          select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } },
        },
        paciente: {
          select: { idPaciente: true, persona: { select: { nombres: true, apellidos: true } } },
        },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    const events = rows.map((c) => {
      const pacienteNombre = `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim();
      const profesionalNombre = `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim();
      const title = `${pacienteNombre} — ${c.motivo ?? c.tipo}`;

      return {
        id: c.idCita,
        title,
        start: c.inicio.toISOString(),
        end: c.fin.toISOString(),
        extendedProps: {
          estado: c.estado,
          tipo: c.tipo,
          pacienteId: c.paciente.idPaciente,
          pacienteNombre,
          profesionalId: c.profesional.idProfesional,
          profesionalNombre,
          consultorioId: c.consultorio?.idConsultorio ?? null,
          consultorioNombre: c.consultorio?.nombre ?? null,
          consultorioColor: c.consultorio?.colorHex ?? null,
          // flags opcionales para badges UI:
          urgencia: c.tipo === "URGENCIA",
          primeraVez: false,
          planActivo: false,
        },
      };
    });

    const res = NextResponse.json({ ok: true, data: events }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    console.error("GET /api/agenda/citas/calendar error:", e?.code || e?.message);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
