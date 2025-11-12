// ============================================================================
// SERVICE - Crear Cita (robusto y con mejores prácticas)
// ============================================================================
import { PrismaClient, type EstadoCita } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { CreateCitaBody } from "./_create.schema";

const prisma = new PrismaClient();
const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

/**
 * Información de conflicto detectado
 */
export interface ConflictInfo {
  citaId: number;
  inicioISO: string;
  finISO: string;
  profesional: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string };
}

/**
 * Verifica solapamientos y retorna detalles de conflictos.
 * Busca conflictos con profesional y consultorio por separado.
 */
async function findConflicts(
  params: {
    profesionalId: number;
    consultorioId?: number | null;
    inicio: Date;
    fin: Date;
  }
): Promise<ConflictInfo[]> {
  const { profesionalId, consultorioId, inicio, fin } = params;
  const conflicts: ConflictInfo[] = [];

  // Buscar conflictos con profesional
  const profConflicts = await prisma.cita.findMany({
    where: {
      profesionalId,
      estado: { in: ACTIVE_STATES },
      inicio: { lt: fin },
      fin: { gt: inicio },
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
    const roomConflicts = await prisma.cita.findMany({
      where: {
        consultorioId,
        estado: { in: ACTIVE_STATES },
        inicio: { lt: fin },
        fin: { gt: inicio },
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

/**
 * Verifica si hay bloqueos de agenda que impidan la cita
 */
async function hasBlocking(params: {
  profesionalId: number;
  consultorioId?: number | null;
  inicio: Date;
  fin: Date;
}): Promise<boolean> {
  const { profesionalId, consultorioId, inicio, fin } = params;
  const orConditions: Prisma.BloqueoAgendaWhereInput[] = [{ profesionalId }];
  if (consultorioId) {
    orConditions.push({ consultorioId });
  }
  
  const bloqueo = await prisma.bloqueoAgenda.findFirst({
    where: {
      activo: true,
      OR: orConditions,
      desde: { lt: fin },
      hasta: { gt: inicio },
    },
    select: { idBloqueoAgenda: true },
  });
  return Boolean(bloqueo);
}

type CreateCitaResponse = {
  idCita: number;
  inicio: string;
  fin: string;
  tipo: string;
  estado: string;
  motivo: string | null;
  duracionMinutos: number;
};

export async function createCita(
  body: CreateCitaBody & { createdByUserId: number }
): Promise<{ 
  ok: boolean; 
  data?: CreateCitaResponse; 
  error?: string; 
  status: number;
  code?: string;
  conflicts?: ConflictInfo[];
}> {
  try {
    const inicio = new Date(body.inicio);
    if (Number.isNaN(inicio.getTime())) {
      return { ok: false, error: "INVALID_DATETIME", status: 400 };
    }
    const fin = new Date(inicio.getTime() + body.duracionMinutos * 60_000);

    // Validar que fin > inicio
    if (fin <= inicio) {
      return { ok: false, error: "INVALID_TIME_RANGE", code: "INVALID_TIME_RANGE", status: 400 };
    }

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

    // (2) Política: no crear citas en el pasado
    if (inicio < new Date()) {
      return { ok: false, error: "NO_PAST_APPOINTMENTS", status: 400 };
    }

    // (3) Verificar bloqueos de agenda
    const hasBlock = await hasBlocking({
      profesionalId: body.profesionalId,
      consultorioId: body.consultorioId ?? null,
      inicio,
      fin,
    });
    if (hasBlock) {
      return { ok: false, error: "BLOCKED_SLOT", code: "BLOCKED_SLOT", status: 409 };
    }

    // (4) Chequeo de solape en servidor con detalles
    const conflicts = await findConflicts({
      profesionalId: body.profesionalId,
      consultorioId: body.consultorioId ?? null,
      inicio,
      fin,
    });
    
    if (conflicts.length > 0) {
      return { 
        ok: false, 
        error: "OVERLAP", 
        code: "OVERLAP",
        status: 409,
        conflicts,
      };
    }

    // (5) Crear con relaciones via connect (best practice)
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
  } catch (e: unknown) {
    // Errores típicos Prisma
    const code = (e as { code?: string })?.code;
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (code === "P2003") return { ok: false, error: "FOREIGN_KEY_CONSTRAINT", status: 400 };
    if (code === "P2002") return { ok: false, error: "DUPLICATE", status: 409 };
    console.error("createCita error:", code || errorMessage);
    return { ok: false, error: "INTERNAL_ERROR", status: 500 };
  }
}
