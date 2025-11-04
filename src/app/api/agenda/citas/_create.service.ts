// ============================================================================
// SERVICE - Crear Cita (robusto y con mejores prácticas)
// ============================================================================
import { PrismaClient, type EstadoCita } from "@prisma/client";
import type { CreateCitaBody } from "./_create.schema";

const prisma = new PrismaClient();
const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

export async function createCita(
  body: CreateCitaBody & { createdByUserId: number }
): Promise<{ ok: boolean; data?: any; error?: string; status: number }> {
  try {
    const inicio = new Date(body.inicio);
    if (Number.isNaN(inicio.getTime())) {
      return { ok: false, error: "INVALID_DATETIME", status: 400 };
    }
    const fin = new Date(inicio.getTime() + body.duracionMinutos * 60_000);

    // (1) FKs existen y están activos
    const [pac, prof, cons] = await Promise.all([
      prisma.paciente.findUnique({
        where: { idPaciente: body.pacienteId },
        select: { idPaciente: true, estaActivo: true },
      }),
      prisma.profesional.findUnique({
        where: { idProfesional: body.profesionalId },
        select: { idProfesional: true, estaActivo: true },
      }),
      body.consultorioId
        ? prisma.consultorio.findUnique({
            where: { idConsultorio: body.consultorioId },
            select: { idConsultorio: true, activo: true },
          })
        : Promise.resolve(null),
    ]);

    if (!pac) return { ok: false, error: "PACIENTE_NOT_FOUND", status: 404 };
    if (!prof) return { ok: false, error: "PROFESIONAL_NOT_FOUND", status: 404 };
    if (body.consultorioId && !cons) return { ok: false, error: "CONSULTORIO_NOT_FOUND", status: 404 };
    if (pac.estaActivo === false) return { ok: false, error: "PACIENTE_INACTIVO", status: 409 };
    if (prof.estaActivo === false) return { ok: false, error: "PROFESIONAL_INACTIVO", status: 409 };
    if (cons && cons.activo === false) return { ok: false, error: "CONSULTORIO_INACTIVO", status: 409 };

    // (2) Política: no crear citas en el pasado (opcional)
    if (inicio < new Date()) return { ok:false, error:"NO_PAST_APPOINTMENTS", status:400 };

    // (3) Chequeo de solape en servidor (siempre)
    const clash = await prisma.cita.findFirst({
      where: {
        estado: { in: ACTIVE_STATES },
        inicio: { lt: fin },
        fin: { gt: inicio },
        OR: [
          { profesionalId: body.profesionalId },
          ...(body.consultorioId ? [{ consultorioId: body.consultorioId }] : []),
        ],
      },
      select: { idCita: true },
    });
    if (clash) return { ok: false, error: "SLOT_TAKEN", status: 409 };

    // (4) Crear con relaciones via connect (best practice)
    const created = await prisma.cita.create({
      data: {
        inicio,
        fin,
        duracionMinutos: body.duracionMinutos,
        tipo: body.tipo,
        estado: "SCHEDULED",
        motivo: body.motivo,
        notas: body.notas ?? null,

        paciente: { connect: { idPaciente: body.pacienteId } },
        profesional: { connect: { idProfesional: body.profesionalId } },
        ...(body.consultorioId
          ? { consultorio: { connect: { idConsultorio: body.consultorioId } } }
          : {}),

        // OJO: el nombre de la relación es "creadoPor" y la PK es idUsuario
        creadoPor: { connect: { idUsuario: body.createdByUserId } },
      },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        
        tipo: true,
        estado: true,
        motivo: true,
        duracionMinutos: true,
      },
    });

    return {
      ok: true,
      status: 201,
      data: {
        idCita: created.idCita,
        inicio: created.inicio.toISOString(),
        fin: created.fin.toISOString(),
        tipo: created.tipo,
        estado: created.estado,
        motivo: created.motivo,
        duracionMinutos: created.duracionMinutos,
      },
    };
  } catch (e: any) {
    // Errores típicos Prisma
    if (e?.code === "P2003") return { ok: false, error: "FOREIGN_KEY_CONSTRAINT", status: 400 };
    if (e?.code === "P2002") return { ok: false, error: "DUPLICATE", status: 409 };
    console.error("createCita error:", e?.code || e?.message);
    return { ok: false, error: "INTERNAL_ERROR", status: 500 };
  }
}
