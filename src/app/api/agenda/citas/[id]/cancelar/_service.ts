// app/api/agenda/citas/[id]/cancelar/_service.ts
import { PrismaClient, EstadoCita, MotivoCancelacion, Prisma } from "@prisma/client";
import type { CancelarBody } from "./_schemas";
import type { CitaMiniDTO } from "./_dto";
import { auditCitaCancel } from "@/lib/audit/transaction-audit";

const prisma = new PrismaClient();

const CANCELLABLE: EstadoCita[] = ["SCHEDULED","CONFIRMED","CHECKED_IN","IN_PROGRESS"];

type CitaWithRelations = Prisma.CitaGetPayload<{
  select: {
    idCita: true;
    inicio: true;
    fin: true;
    duracionMinutos: true;
    tipo: true;
    estado: true;
    motivo: true;
    cancelReason: true;
    cancelledAt: true;
    profesional: { select: { idProfesional: true; persona: { select: { nombres: true; apellidos: true } } } };
    paciente: { select: { idPaciente: true; persona: { select: { nombres: true; apellidos: true } } } };
    consultorio: { select: { idConsultorio: true; nombre: true; colorHex: true } };
  };
}>;

function toMini(c: CitaWithRelations): CitaMiniDTO {
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
  userId: number,
  ip?: string | null
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

    // 4) Auditoría completa con motivo y notas
    await auditCitaCancel({
      tx,
      actorId: userId,
      citaId: cita.idCita,
      motivoCancelacion: body.motivoCancelacion as MotivoCancelacion,
      notas: body.notas ?? null,
      estadoPrevio: cita.estado,
      inicioISO: cita.inicio.toISOString(),
      finISO: cita.fin.toISOString(),
      pacienteId: cita.paciente.idPaciente,
      profesionalId: cita.profesional.idProfesional,
      consultorioId: cita.consultorio?.idConsultorio ?? null,
      ip: ip ?? null,
    });

    return { ok: true as const, data: toMini(updated) };
  });
}
