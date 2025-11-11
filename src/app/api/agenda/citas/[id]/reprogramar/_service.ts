// app/api/agenda/citas/[id]/reprogramar/_service.ts
import { PrismaClient, EstadoCita, MotivoCancelacion } from "@prisma/client";
import type { ReprogramarBody } from "./_schemas";
import type { CitaMini } from "./_dto";

const prisma = new PrismaClient();

const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];
const REPROGRAMMABLE: EstadoCita[] = ["SCHEDULED", "CONFIRMED"];

function makeFin(inicio: Date, duracionMinutos: number): Date {
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

/**
 * Tipo para conflictos detectados
 */
export type ConflictInfo = {
  citaId: number;
  inicioISO: string;
  finISO: string;
  profesional: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string };
};

/**
 * Verifica solapamientos y retorna detalles de conflictos.
 * IMPORTANTE: Excluye la cita actual (excludeCitaId) para permitir reprogramación al mismo horario.
 */
async function findConflicts(
  tx: PrismaClient,
  params: {
    profesionalId: number;
    consultorioId?: number | null;
    inicio: Date;
    fin: Date;
    excludeCitaId?: number; // Cita a excluir (la que se está reprogramando)
  }
): Promise<ConflictInfo[]> {
  const { profesionalId, consultorioId, inicio, fin, excludeCitaId } = params;
  const conflicts: ConflictInfo[] = [];

  // Buscar conflictos con profesional
  const profConflicts = await tx.cita.findMany({
    where: {
      profesionalId,
      estado: { in: ACTIVE_STATES },
      inicio: { lt: fin },
      fin: { gt: inicio },
      ...(excludeCitaId ? { idCita: { not: excludeCitaId } } : {}),
    },
    select: {
      idCita: true,
      inicio: true,
      fin: true,
      profesional: {
        select: {
          idProfesional: true,
          persona: { select: { nombres: true, apellidos: true } },
        },
      },
      consultorio: {
        select: {
          idConsultorio: true,
          nombre: true,
        },
      },
    },
  });

  for (const c of profConflicts) {
    conflicts.push({
      citaId: c.idCita,
      inicioISO: c.inicio.toISOString(),
      finISO: c.fin.toISOString(),
      profesional: {
        id: c.profesional.idProfesional,
        nombre: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
      },
      consultorio: c.consultorio
        ? { id: c.consultorio.idConsultorio, nombre: c.consultorio.nombre }
        : undefined,
    });
  }

  // Buscar conflictos con consultorio (si se especificó)
  if (consultorioId) {
    const roomConflicts = await tx.cita.findMany({
      where: {
        consultorioId,
        estado: { in: ACTIVE_STATES },
        inicio: { lt: fin },
        fin: { gt: inicio },
        ...(excludeCitaId ? { idCita: { not: excludeCitaId } } : {}),
        // Evitar duplicados: solo agregar si no está ya en conflicts
        idCita: { notIn: conflicts.map((c) => c.citaId) },
      },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        profesional: {
          select: {
            idProfesional: true,
            persona: { select: { nombres: true, apellidos: true } },
          },
        },
        consultorio: {
          select: {
            idConsultorio: true,
            nombre: true,
          },
        },
      },
    });

    for (const c of roomConflicts) {
      conflicts.push({
        citaId: c.idCita,
        inicioISO: c.inicio.toISOString(),
        finISO: c.fin.toISOString(),
        profesional: {
          id: c.profesional.idProfesional,
          nombre: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
        },
        consultorio: c.consultorio
          ? { id: c.consultorio.idConsultorio, nombre: c.consultorio.nombre }
          : undefined,
      });
    }
  }

  return conflicts;
}

async function hasBlocking(tx: PrismaClient, params: {
  profesionalId: number;
  consultorioId?: number | null;
  inicio: Date;
  fin: Date;
}): Promise<boolean> {
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
 * 
 * @param idCita - ID de la cita a reprogramar
 * @param body - Datos de reprogramación (inicioISO, finISO o duracionMinutos, etc.)
 * @param userId - ID del usuario que realiza la acción
 * @returns Resultado con nueva cita y anterior cancelada, o error con detalles
 */
export async function reprogramarCita(
  idCita: number,
  body: ReprogramarBody,
  userId: number
): Promise<
  | { ok: true; data: { nueva: CitaMini; anterior: CitaMini } }
  | { ok: false; status: number; error: string; code?: string; conflicts?: ConflictInfo[]; details?: any }
> {
  // Normalizar fechas desde ISO strings (ya normalizados por Zod a UTC)
  const nuevoInicio = new Date(body.inicioISO);
  const nuevoFin = body.finISO
    ? new Date(body.finISO)
    : body.duracionMinutos
      ? makeFin(nuevoInicio, body.duracionMinutos)
      : makeFin(nuevoInicio, 30); // fallback a 30 min

  // Validar que fin > inicio
  if (nuevoFin <= nuevoInicio) {
    return {
      ok: false as const,
      status: 400,
      error: "INVALID_TIME_RANGE",
      code: "INVALID_TIME_RANGE",
      details: { inicioISO: body.inicioISO, finISO: nuevoFin.toISOString() },
    };
  }

  return prisma.$transaction(async (tx) => {
    const t0 = performance.now();

    // 1) Traer cita original con datos necesarios
    const queryStart = performance.now();
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
    const queryTime = performance.now() - queryStart;

    if (!original) {
      return { ok: false as const, status: 404, error: "NOT_FOUND", code: "NOT_FOUND" };
    }
    if (!REPROGRAMMABLE.includes(original.estado)) {
      return {
        ok: false as const,
        status: 422,
        error: "NOT_REPROGRAMMABLE",
        code: "NOT_REPROGRAMMABLE",
        details: { estadoActual: original.estado },
      };
    }

    // 2) Resolver profesional/consultorio resultantes
    const profesionalId = body.profesionalId ?? original.profesionalId;
    const consultorioId = body.consultorioId ?? original.consultorioId ?? null;

    // 3) Chequear solape EXCLUYENDO la cita actual
    const overlapStart = performance.now();
    const conflicts = await findConflicts(tx as any, {
      profesionalId,
      consultorioId,
      inicio: nuevoInicio,
      fin: nuevoFin,
      excludeCitaId: original.idCita, // CRÍTICO: excluir la cita que se está reprogramando
    });
    const overlapTime = performance.now() - overlapStart;

    if (conflicts.length > 0) {
      // Auditoría: registrar intento fallido por OVERLAP
      try {
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "CITA_REPROGRAMAR_OVERLAP",
            entity: "Cita",
            entityId: idCita,
            metadata: {
              intentoInicioISO: nuevoInicio.toISOString(),
              intentoFinISO: nuevoFin.toISOString(),
              profesionalId,
              consultorioId,
              conflictos: conflicts.map((c) => ({
                citaId: c.citaId,
                inicioISO: c.inicioISO,
                finISO: c.finISO,
              })),
              queryTimeMs: queryTime.toFixed(2),
              overlapCheckTimeMs: overlapTime.toFixed(2),
            },
          },
        });
      } catch (auditErr) {
        // No fallar la transacción por error de auditoría
        console.error("[reprogramarCita] Error escribiendo auditoría OVERLAP:", auditErr);
      }

      return {
        ok: false as const,
        status: 409,
        error: "OVERLAP_DETECTED",
        code: "OVERLAP",
        conflicts,
      };
    }

    // 4) Chequear bloqueos de agenda
    const blockingStart = performance.now();
    const hasBlock = await hasBlocking(tx as any, {
      profesionalId,
      consultorioId,
      inicio: nuevoInicio,
      fin: nuevoFin,
    });
    const blockingTime = performance.now() - blockingStart;

    if (hasBlock) {
      return {
        ok: false as const,
        status: 409,
        error: "BLOCKED_BY_SCHEDULE",
        code: "BLOCKED_BY_SCHEDULE",
      };
    }

    // 5) Crear nueva cita enlazada y cancelar la anterior (ambas con historial)
    const createStart = performance.now();
    const nueva = await tx.cita.create({
      data: {
        pacienteId: original.pacienteId,
        profesionalId,
        consultorioId,
        createdByUserId: userId,
        inicio: nuevoInicio,
        fin: nuevoFin,
        duracionMinutos: body.duracionMinutos ?? original.duracionMinutos,
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
    const createTime = performance.now() - createStart;

    const totalTime = performance.now() - t0;

    // Auditoría: registrar éxito
    try {
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "CITA_REPROGRAMADA",
          entity: "Cita",
          entityId: nueva.idCita,
          metadata: {
            citaOriginalId: original.idCita,
            nuevoInicioISO: nuevoInicio.toISOString(),
            nuevoFinISO: nuevoFin.toISOString(),
            anteriorInicioISO: original.inicio.toISOString(),
            anteriorFinISO: original.fin.toISOString(),
            profesionalId,
            consultorioId,
            queryTimeMs: queryTime.toFixed(2),
            overlapCheckTimeMs: overlapTime.toFixed(2),
            blockingCheckTimeMs: blockingTime.toFixed(2),
            createTimeMs: createTime.toFixed(2),
            totalTimeMs: totalTime.toFixed(2),
          },
        },
      });
    } catch (auditErr) {
      // No fallar la transacción por error de auditoría
      console.error("[reprogramarCita] Error escribiendo auditoría REPROGRAMADA:", auditErr);
    }

    return {
      ok: true as const,
      data: { nueva: makeMini(nueva), anterior: makeMini(anteriorActualizada) },
    };
  });
}
