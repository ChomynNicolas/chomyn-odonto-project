// app/api/agenda/citas/[id]/cancelar/_service.ts
import { PrismaClient, EstadoCita, MotivoCancelacion } from "@prisma/client";
import type { CancelarBody } from "./_schemas";
import type { CitaMiniDTO } from "./_dto";

const prisma = new PrismaClient();

const CANCELLABLE: EstadoCita[] = ["SCHEDULED","CONFIRMED","CHECKED_IN","IN_PROGRESS"];

function toMini(c: any): CitaMiniDTO {
  return {
    idCita: c.idCita,
    inicio: c.inicio.toISOString(),
    fin: c.fin.toISOString(),
    duracionMinutos: c.duracionMinutos,
    tipo: c.tipo,
    estado: c.estado,
    motivo: c.motivo ?? null,
    cancelReason: c.cancelReason ?? null,
    cancelledAt: c.cancelledAt ? c.cancelledAt.toISOString() : null,
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

export async function cancelarCita(
  idCita: number,
  body: CancelarBody,
  userId: number
): Promise<
  | { ok: true; data: CitaMiniDTO }
  | { ok: false; status: number; error: string; details?: unknown }
> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // 1) Cargar cita con estado actual para validar y para respuesta
    const cita = await tx.cita.findUnique({
      where: { idCita },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        tipo: true,
        estado: true,
        motivo: true,
        cancelReason: true,
        cancelledAt: true,
        profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
        paciente: { select: { idPaciente: true, persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    if (!cita) return { ok: false as const, status: 404, error: "NOT_FOUND" };
    if (!CANCELLABLE.includes(cita.estado)) {
      return { ok: false as const, status: 422, error: "NOT_CANCELLABLE" };
    }

    // 2) Cancelar (estado + motivo + timestamps + usuario)
    const updated = await tx.cita.update({
      where: { idCita: cita.idCita },
      data: {
        estado: "CANCELLED",
        cancelReason: body.motivoCancelacion as MotivoCancelacion,
        cancelledAt: now,
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
        cancelReason: true,
        cancelledAt: true,
        profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
        paciente: { select: { idPaciente: true, persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    // 3) Registrar historial
    await tx.citaEstadoHistorial.create({
      data: {
        citaId: cita.idCita,
        estadoPrevio: cita.estado,
        estadoNuevo: "CANCELLED",
        nota: body.notas ?? `Cancelada (${body.motivoCancelacion})`,
        changedByUserId: userId,
        changedAt: now,
      },
    });

    return { ok: true as const, data: toMini(updated) };
  });
}
