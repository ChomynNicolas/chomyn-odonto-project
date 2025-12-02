// app/api/agenda/citas/[id]/estado/_service.ts
import { PrismaClient, EstadoCita } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { EstadoBody } from "./_schemas";
import type { CitaEstadoDTO } from "./_dto";
import { auditCitaEstadoChange } from "@/lib/audit/transaction-audit";

const prisma = new PrismaClient();

// Estados que NO admiten más cambios (terminales)
const TERMINAL: EstadoCita[] = ["CANCELLED", "COMPLETED", "NO_SHOW"];

// Grafo de transiciones permitidas
const ALLOWED: Record<EstadoCita, EstadoCita[]> = {
  SCHEDULED:   ["CONFIRMED", "CHECKED_IN", "NO_SHOW"],
  CONFIRMED:   ["CHECKED_IN", "NO_SHOW"],
  CHECKED_IN:  ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED:   [],       // terminal
  CANCELLED:   [],       // terminal
  NO_SHOW:     [],       // terminal
};

// Aplica efectos colaterales por transición (timestamps operativos)
function sideEffectsFor(state: EstadoCita, now: Date) {
  if (state === "CHECKED_IN") return { checkedInAt: now } as const;
  if (state === "IN_PROGRESS") return { startedAt: now } as const;
  if (state === "COMPLETED") return { completedAt: now } as const;
  return {} as const;
}

type CitaWithRelations = Prisma.CitaGetPayload<{
  select: {
    idCita: true;
    inicio: true;
    fin: true;
    duracionMinutos: true;
    tipo: true;
    estado: true;
    checkedInAt: true;
    startedAt: true;
    completedAt: true;
    profesional: { select: { idProfesional: true; persona: { select: { nombres: true; apellidos: true } } } };
    paciente: { select: { idPaciente: true; persona: { select: { nombres: true; apellidos: true } } } };
    consultorio: { select: { idConsultorio: true; nombre: true; colorHex: true } };
  };
}>;

function toDTO(c: CitaWithRelations | null): CitaEstadoDTO {
  if (!c) {
    throw new Error("Cita is null");
  }
  return {
    idCita: c.idCita,
    inicio: c.inicio.toISOString(),
    fin: c.fin.toISOString(),
    duracionMinutos: c.duracionMinutos,
    tipo: c.tipo,
    estado: c.estado,
    checkedInAt: c.checkedInAt ? c.checkedInAt.toISOString() : null,
    startedAt: c.startedAt ? c.startedAt.toISOString() : null,
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
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
 * Cambia el estado con control de transición y auditoría.
 * Concurrencia: usa updateMany con condición de estado previo para evitar carreras.
 */
export async function changeCitaEstado(
  idCita: number,
  body: EstadoBody,
  userId: number,
  ip?: string | null
): Promise<
  | { ok: true; data: CitaEstadoDTO }
  | { ok: false; status: number; error: string; details?: unknown }
> {
  const now = new Date();
  const nuevo = body.nuevoEstado as EstadoCita;

  return prisma.$transaction(async (tx) => {
    // 1) Traer estado actual y datos base
    const current = await tx.cita.findUnique({
      where: { idCita },
      select: {
        idCita: true,
        estado: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        tipo: true,
        checkedInAt: true,
        startedAt: true,
        completedAt: true,
        profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
        paciente:    { select: { idPaciente: true,    persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });
    if (!current) return { ok: false as const, status: 404, error: "NOT_FOUND" };

    const previo = current.estado as EstadoCita;
    if (TERMINAL.includes(previo)) {
      return { ok: false as const, status: 422, error: "STATE_TERMINAL" };
    }
    const allowed = ALLOWED[previo] || [];
    if (!allowed.includes(nuevo)) {
      return { ok: false as const, status: 422, error: "TRANSITION_NOT_ALLOWED" };
    }

    // 2) Preparar side-effects (timestamps)
    const effects: Partial<{
      checkedInAt: Date;
      startedAt: Date;
      completedAt: Date;
    }> = sideEffectsFor(nuevo, now);
    // Si completamos y no hay startedAt, marcamos startedAt también
    if (nuevo === "COMPLETED" && !current.startedAt) {
      effects.startedAt = now;
    }

    // 3) Concurrencia: actualizar solo si sigue en 'previo'
    const updatedCount = await tx.cita.updateMany({
      where: { idCita, estado: previo },
      data: { estado: nuevo, ...effects, updatedAt: now },
    });
    if (updatedCount.count !== 1) {
      // Otro proceso lo cambió; retornar conflicto
      return { ok: false as const, status: 409, error: "CONCURRENT_MODIFICATION" };
    }

    // 4) Registrar historial de estado
    await tx.citaEstadoHistorial.create({
      data: {
        citaId: idCita,
        estadoPrevio: previo,
        estadoNuevo: nuevo,
        nota: body.nota ?? null,
        changedByUserId: userId,
        changedAt: now,
      },
    });

    // 5) Auditoría: registrar cambio de estado
    await auditCitaEstadoChange({
      tx,
      actorId: userId,
      citaId: idCita,
      estadoPrevio: previo,
      estadoNuevo: nuevo,
      nota: body.nota ?? null,
      ip: ip ?? null,
    });

    // 6) Recuperar cita para DTO final
    const refreshed = await tx.cita.findUnique({
      where: { idCita },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        tipo: true,
        estado: true,
        checkedInAt: true,
        startedAt: true,
        completedAt: true,
        profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
        paciente:    { select: { idPaciente: true,    persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    });

    return { ok: true as const, data: toDTO(refreshed) };
  });
}
