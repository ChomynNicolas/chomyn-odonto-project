import { PrismaClient } from "@prisma/client";
import type { CitaDetailDTO } from "./_dto";

const prisma = new PrismaClient();

/**
 * Obtiene una cita con relaciones mínimas necesarias y mapea a DTO estable.
 * Select explícitos para evitar fugas de datos.
 */
export async function getCitaDetail(idCita: number): Promise<CitaDetailDTO | null> {
  const row = await prisma.cita.findUnique({
    where: { idCita },
    select: {
      idCita: true,
      inicio: true,
      fin: true,
      duracionMinutos: true,
      tipo: true,
      estado: true,
      motivo: true,
      notas: true,
      checkedInAt: true,
      startedAt: true,
      completedAt: true,
      cancelReason: true,
      cancelledAt: true,
      createdAt: true,
      updatedAt: true,

      reprogramadaDesdeId: true,
      reprogramaciones: { select: { idCita: true } },

      creadoPor: { select: { idUsuario: true, nombreApellido: true } },
      canceladoPor: { select: { idUsuario: true, nombreApellido: true } },

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
        },
      },
      consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
    },
  });

  if (!row) return null;

  const dto: CitaDetailDTO = {
    idCita: row.idCita,
    inicio: row.inicio.toISOString(),
    fin: row.fin.toISOString(),
    duracionMinutos: row.duracionMinutos,
    tipo: row.tipo,
    estado: row.estado,
    motivo: row.motivo ?? null,
    notas: row.notas ?? null,

    checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,

    cancelReason: row.cancelReason ?? null,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),

    creadoPor: { id: row.creadoPor.idUsuario, nombre: row.creadoPor.nombreApellido },
    canceladoPor: row.canceladoPor
      ? { id: row.canceladoPor.idUsuario, nombre: row.canceladoPor.nombreApellido }
      : null,

    profesional: {
      id: row.profesional.idProfesional,
      nombre: `${row.profesional.persona.nombres} ${row.profesional.persona.apellidos}`.trim(),
    },
    paciente: {
      id: row.paciente.idPaciente,
      nombre: `${row.paciente.persona.nombres} ${row.paciente.persona.apellidos}`.trim(),
    },
    consultorio: row.consultorio
      ? { id: row.consultorio.idConsultorio, nombre: row.consultorio.nombre, colorHex: row.consultorio.colorHex }
      : undefined,

    reprogramadaDesdeId: row.reprogramadaDesdeId ?? null,
    reprogramacionesHijas: row.reprogramaciones.map((r) => r.idCita),
  };

  return dto;
}
