// app/api/agenda/citas/[id]/reprogramar/_service.ts
import { PrismaClient, EstadoCita, MotivoCancelacion } from "@prisma/client";
import type { ReprogramarBody } from "./_schemas";
import type { CitaMini } from "./_dto";

const prisma = new PrismaClient();

const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];
const REPROGRAMMABLE: EstadoCita[] = ["SCHEDULED", "CONFIRMED"];

function makeFin(inicio: Date, duracionMinutos: number) {
  return new Date(inicio.getTime() + duracionMinutos * 60 * 1000);
}

function makeMini(c: any): CitaMini {
  return {
    idCita: c.idCita,
    inicio: c.inicio.toISOString(),
    fin: c.fin.toISOString(),
    duracionMinutos: c.duracionMinutos,
    tipo: c.tipo,
    estado: c.estado,
    motivo: c.motivo ?? null,
    profesional: {
      id: c.profesional.idProfesional,
      nombre: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
    },
    paciente: {
      id: c.paciente.idPaciente,
      nombre: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim(),
    },
    consultorio: c.consultorio
      ? { id: c.consultorio.idConsultorio, nombre: c.consultorio.nombre, colorHex: c.consultorio.colorHex }
      : undefined,
  };
}

async function hasOverlap(tx: PrismaClient, params: {
  profesionalId: number;
  consultorioId?: number | null;
  inicio: Date;
  fin: Date;
}) {
  const { profesionalId, consultorioId, inicio, fin } = params;
  const [prof, room] = await Promise.all([
    tx.cita.findFirst({
      where: { profesionalId, estado: { in: ACTIVE_STATES }, inicio: { lt: fin }, fin: { gt: inicio } },
      select: { idCita: true },
    }),
    consultorioId
      ? tx.cita.findFirst({
          where: { consultorioId, estado: { in: ACTIVE_STATES }, inicio: { lt: fin }, fin: { gt: inicio } },
          select: { idCita: true },
        })
      : null,
  ]);
  return Boolean(prof || room);
}

async function hasBlocking(tx: PrismaClient, params: {
  profesionalId: number;
  consultorioId?: number | null;
  inicio: Date;
  fin: Date;
}) {
  const { profesionalId, consultorioId, inicio, fin } = params;
  const bloqueo = await tx.bloqueoAgenda.findFirst({
    where: {
      activo: true,
      OR: [{ profesionalId }, consultorioId ? { consultorioId } : undefined].filter(Boolean) as any,
      desde: { lt: fin },
      hasta: { gt: inicio },
    },
    select: { idBloqueoAgenda: true },
  });
  return Boolean(bloqueo);
}

/**
 * Reprograma la cita `idCita` creando una nueva y cancelando la anterior.
 * Todo sucede en transacción atómica.
 */
export async function reprogramarCita(
  idCita: number,
  body: ReprogramarBody,
  userId: number
): Promise<
  | { ok: true; data: { nueva: CitaMini; anterior: CitaMini } }
  | { ok: false; status: number; error: string; details?: any }
> {
  const nuevoInicio = new Date(body.inicio);
  const nuevoFin = makeFin(nuevoInicio, body.duracionMinutos);

  return prisma.$transaction(async (tx) => {
    // 1) Traer cita original con datos necesarios
    const original = await tx.cita.findUnique({
      where: { idCita },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        tipo: true,
        estado: true,
        motivo: true,
        profesionalId: true,
        consultorioId: true,
        pacienteId: true,
        profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
        paciente: { select: { idPaciente: true, persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    if (!original) return { ok: false as const, status: 404, error: "NOT_FOUND" };
    if (!REPROGRAMMABLE.includes(original.estado)) {
      return { ok: false as const, status: 422, error: "NOT_REPROGRAMMABLE" };
    }

    // 2) Resolver profesional/consultorio resultantes
    const profesionalId = body.profesionalId ?? original.profesionalId;
    const consultorioId = body.consultorioId ?? original.consultorioId ?? null;

    // 3) Chequear solape y bloqueos para la nueva ventana
    if (await hasOverlap(tx as any, { profesionalId, consultorioId, inicio: nuevoInicio, fin: nuevoFin })) {
      return { ok: false as const, status: 409, error: "OVERLAP_DETECTED" };
    }
    if (await hasBlocking(tx as any, { profesionalId, consultorioId, inicio: nuevoInicio, fin: nuevoFin })) {
      return { ok: false as const, status: 409, error: "BLOCKED_BY_SCHEDULE" };
    }

    // 4) Crear nueva cita enlazada y cancelar la anterior (ambas con historial)
    const nueva = await tx.cita.create({
      data: {
        pacienteId: original.pacienteId,
        profesionalId,
        consultorioId,
        createdByUserId: userId,
        inicio: nuevoInicio,
        fin: nuevoFin,
        duracionMinutos: body.duracionMinutos,
        tipo: original.tipo, // conserva el tipo por defecto
        motivo: body.motivo ?? original.motivo ?? null,
        notas: body.notas ?? null,
        estado: "SCHEDULED",
        reprogramadaDesdeId: original.idCita,
      },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        tipo: true,
        estado: true,
        motivo: true,
        profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
        paciente: { select: { idPaciente: true, persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    // Cancelar la anterior
    const anteriorActualizada = await tx.cita.update({
      where: { idCita: original.idCita },
      data: {
        estado: "CANCELLED",
        cancelReason: MotivoCancelacion.CLINICA,
        cancelledAt: new Date(),
        cancelledByUserId: userId,
      },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        tipo: true,
        estado: true,
        motivo: true,
        profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
        paciente: { select: { idPaciente: true, persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    // Historial: nueva (SCHEDULED) y anterior (-> CANCELLED)
    await tx.citaEstadoHistorial.createMany({
      data: [
        {
          citaId: nueva.idCita,
          estadoPrevio: null,
          estadoNuevo: "SCHEDULED",
          nota: "Reprogramación: nueva cita",
          changedByUserId: userId,
          changedAt: new Date(),
        },
        {
          citaId: original.idCita,
          estadoPrevio: original.estado,
          estadoNuevo: "CANCELLED",
          nota: "Reprogramación: se cancela la cita original",
          changedByUserId: userId,
          changedAt: new Date(),
        },
      ],
    });

    return {
      ok: true as const,
      data: { nueva: makeMini(nueva), anterior: makeMini(anteriorActualizada) },
    };
  });
}
