import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { PrismaClient, EstadoCita } from "@prisma/client";
import { requireSessionWithRoles } from "@/app/api/_lib/auth";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

const asDate = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());
const querySchema = z.object({
  start: asDate,
  end: asDate,
  profesionalId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  estado: z.string().optional(), // comma-separated
  tipo: z.string().optional(),   // comma-separated
  soloUrgencias: z.enum(["true", "false"]).optional(),
  soloPrimeraVez: z.enum(["true", "false"]).optional(),
  soloPlanActivo: z.enum(["true", "false"]).optional(),
  busquedaPaciente: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const {
    start,
    end,
    profesionalId,
    consultorioId,
    estado,
    tipo,
    soloUrgencias,
    soloPrimeraVez,
    soloPlanActivo,
    busquedaPaciente,
  } = parsed.data;

  try {
    const where: any = {
      inicio: { lt: end },
      fin: { gt: start },
    };

    if (profesionalId) where.profesionalId = profesionalId;
    if (consultorioId) where.consultorioId = consultorioId;

    if (estado) {
      const estados = estado.split(",").map((s) => s.trim().toUpperCase());
      where.estado = { in: estados };
    }

    if (tipo) {
      const tipos = tipo.split(",").map((t) => t.trim().toUpperCase());
      where.tipo = { in: tipos };
    }

    if (soloUrgencias === "true") {
      where.tipo = "URGENCIA";
    }

    if (busquedaPaciente) {
      const q = busquedaPaciente.trim();
      where.paciente = {
        OR: [
          {
            persona: {
              OR: [
                { nombres: { contains: q, mode: "insensitive" } },
                { apellidos: { contains: q, mode: "insensitive" } },
              ],
            },
          },
          // documento es 1:1 opcional → usar `is`
          {
            persona: {
              documento: {
                is: {
                  OR: [
                    { numero: { contains: q } },
                    { ruc: { contains: q } },
                  ],
                },
              },
            },
          },
        ],
      };
    }

    const rows = await prisma.cita.findMany({
      where,
      orderBy: { inicio: "asc" },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        tipo: true,
        estado: true,
        motivo: true,
        profesional: {
          select: {
            idProfesional: true,
            persona: { select: { nombres: true, apellidos: true } },
          },
        },
        paciente: {
          select: {
            idPaciente: true,
            persona: { select: { nombres: true, apellidos: true } },
            // No existe `antecedentes`: detectamos alergias por relación PatientAllergy
            PatientAllergy: {
              where: { isActive: true },
              select: { idPatientAllergy: true },
              take: 1,
            },
            // No existe `kpis`: aproximamos no-show contando citas NO_SHOW del paciente
            citas: {
              where: { estado: EstadoCita.NO_SHOW },
              select: { idCita: true },
            },
          },
        },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    const events = rows.map((c) => {
      const pacienteNombre = `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim();
      const profesionalNombre = `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim();
      const title = `${pacienteNombre} — ${c.motivo ?? c.tipo}`;

      const tieneAlergias = (c.paciente.PatientAllergy?.length ?? 0) > 0;
      const noShowCount = c.paciente.citas.length;

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
          consultorioColorHex: c.consultorio?.colorHex ?? null,
          urgencia: c.tipo === "URGENCIA",
          primeraVez: false,    // TODO
          planActivo: false,    // TODO
          tieneAlergias,
          noShowCount,
          obraSocial: null,     // TODO: modelar seguro/obra social
          saldoPendiente: false // TODO
        },
      };
    });

    let filtered = events;
    if (soloPrimeraVez === "true") filtered = filtered.filter((e) => e.extendedProps.primeraVez);
    if (soloPlanActivo === "true") filtered = filtered.filter((e) => e.extendedProps.planActivo);

    const res = NextResponse.json({ ok: true, data: filtered }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    console.error("GET /api/agenda/citas/calendar error:", e?.code || e?.message);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
