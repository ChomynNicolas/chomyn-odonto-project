// ============================================================================
// SERVICE - Crear Cita (robusto y con mejores prácticas)
// ============================================================================
import { PrismaClient, type EstadoCita } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { CreateCitaBody } from "./_create.schema";
import {
  validateWorkingHours,
  parseProfesionalDisponibilidad,
  
} from "@/lib/utils/availability-validation";
import {
  validateSpecialtyCompatibility,
  
} from "@/lib/utils/specialty-validation";
import {
  validateConsultorioIsActive,
  validateConsultorioAvailability,
} from "@/lib/utils/consultorio-validation";
import { auditCitaCreate } from "@/lib/audit/transaction-audit";
import { getErrorMessage, type ErrorCode } from "@/lib/messages/agenda-messages";

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
  body: CreateCitaBody & { createdByUserId: number; ip?: string | null }
): Promise<{ 
  ok: boolean; 
  data?: CreateCitaResponse; 
  error?: string; 
  status: number;
  code?: string;
  conflicts?: ConflictInfo[];
  details?: unknown; // For availability validation details
}> {
  try {
    const inicio = new Date(body.inicio);
    if (Number.isNaN(inicio.getTime())) {
      const errorMsg = getErrorMessage("INVALID_DATETIME");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 400 };
    }
    const fin = new Date(inicio.getTime() + body.duracionMinutos * 60_000);

    // Validar que fin > inicio
    if (fin <= inicio) {
      const errorMsg = getErrorMessage("INVALID_TIME_RANGE");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 400 };
    }

    // (1) FKs existen y están activos
    const [pac, prof] = await Promise.all([
      prisma.paciente.findUnique({
        where: { idPaciente: body.pacienteId },
        select: { idPaciente: true, estaActivo: true },
      }),
      prisma.profesional.findUnique({
        where: { idProfesional: body.profesionalId },
        select: {
          idProfesional: true,
          estaActivo: true,
          disponibilidad: true,
          especialidades: {
            select: {
              especialidad: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!pac) {
      const errorMsg = getErrorMessage("PACIENTE_NOT_FOUND");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 404 };
    }
    if (!prof) {
      const errorMsg = getErrorMessage("PROFESIONAL_NOT_FOUND");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 404 };
    }
    if (pac.estaActivo === false) {
      const errorMsg = getErrorMessage("PACIENTE_INACTIVO");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 409 };
    }
    if (prof.estaActivo === false) {
      const errorMsg = getErrorMessage("PROFESIONAL_INACTIVO");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 409 };
    }

    // (1.1) Validar consultorio existe y está activo
    const consultorioValidation = await validateConsultorioIsActive(body.consultorioId, prisma);
    if (!consultorioValidation.isValid) {
      const errorCode = consultorioValidation.error!.code as ErrorCode;
      const errorMsg = getErrorMessage(errorCode, consultorioValidation.error!.details);
      return {
        ok: false,
        error: errorMsg.userMessage,
        code: errorMsg.code,
        status: consultorioValidation.error!.status,
        details: consultorioValidation.error!.details,
      };
    }

    // (1.5) Validar horarios de trabajo del profesional
    const disponibilidad = parseProfesionalDisponibilidad(prof.disponibilidad);
    const availabilityValidation = validateWorkingHours(inicio, fin, disponibilidad);
    if (!availabilityValidation.isValid) {
      const errorCode = (availabilityValidation.error?.code || "OUTSIDE_WORKING_HOURS") as ErrorCode;
      const errorMsg = getErrorMessage(errorCode, availabilityValidation.error?.details);
      return {
        ok: false,
        error: errorMsg.userMessage,
        code: errorMsg.code,
        status: 409,
        details: availabilityValidation.error?.details,
      };
    }

    // (1.6) Validar compatibilidad de especialidad
    const profesionalEspecialidades = prof.especialidades.map((pe) => pe.especialidad.nombre);
    const specialtyValidation = validateSpecialtyCompatibility(body.tipo, profesionalEspecialidades);
    if (!specialtyValidation.isValid) {
      const errorCode = (specialtyValidation.error?.code || "INCOMPATIBLE_SPECIALTY") as ErrorCode;
      const errorDetails = {
        ...specialtyValidation.error?.details,
        requiredEspecialidades: specialtyValidation.error?.details?.requiredEspecialidades,
        profesionalEspecialidades,
      };
      const errorMsg = getErrorMessage(errorCode, errorDetails);
      return {
        ok: false,
        error: errorMsg.userMessage,
        code: errorMsg.code,
        status: 409,
        details: errorDetails,
      };
    }

    // (2) Política: no crear citas en el pasado
    if (inicio < new Date()) {
      const errorMsg = getErrorMessage("NO_PAST_APPOINTMENTS");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 400 };
    }

    // (3) Verificar bloqueos de agenda
    // (3.1) Validar bloqueos de consultorio específicamente
    const consultorioAvailability = await validateConsultorioAvailability(
      body.consultorioId ?? null,
      inicio,
      fin,
      prisma
    );
    if (!consultorioAvailability.isValid) {
      const errorCode = consultorioAvailability.error!.code as ErrorCode;
      const errorMsg = getErrorMessage(errorCode, consultorioAvailability.error!.details);
      return {
        ok: false,
        error: errorMsg.userMessage,
        code: errorMsg.code,
        status: consultorioAvailability.error!.status,
        details: consultorioAvailability.error!.details,
      };
    }

    // (3.2) Validar bloqueos de profesional (mantener lógica existente)
    const hasProfBlock = await hasBlocking({
      profesionalId: body.profesionalId,
      consultorioId: null, // Solo profesional
      inicio,
      fin,
    });
    if (hasProfBlock) {
      const errorMsg = getErrorMessage("PROFESIONAL_BLOCKED");
      return { 
        ok: false, 
        error: errorMsg.userMessage, 
        code: errorMsg.code, 
        status: 409 
      };
    }

    // (4) Chequeo de solape en servidor con detalles
    const conflicts = await findConflicts({
      profesionalId: body.profesionalId,
      consultorioId: body.consultorioId ?? null,
      inicio,
      fin,
    });
    
    if (conflicts.length > 0) {
      const errorMsg = getErrorMessage("OVERLAP");
      return { 
        ok: false, 
        error: errorMsg.userMessage, 
        code: errorMsg.code,
        status: 409,
        conflicts,
      };
    }

    // (5) Crear con relaciones via connect (best practice) y auditoría
    const created = await prisma.$transaction(async (tx) => {
      const cita = await tx.cita.create({
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

      // Auditoría: registrar creación de cita
      await auditCitaCreate({
        tx,
        actorId: body.createdByUserId,
        citaId: cita.idCita,
        tipo: body.tipo,
        inicioISO: cita.inicio.toISOString(),
        finISO: cita.fin.toISOString(),
        duracionMinutos: body.duracionMinutos,
        pacienteId: body.pacienteId,
        profesionalId: body.profesionalId,
        consultorioId: body.consultorioId ?? null,
        motivo: body.motivo,
        notas: body.notas ?? null,
        ip: body.ip ?? null,
      });

      return cita;
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
    if (code === "P2003") {
      const errorMsg = getErrorMessage("FOREIGN_KEY_CONSTRAINT");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 400 };
    }
    if (code === "P2002") {
      const errorMsg = getErrorMessage("DUPLICATE");
      return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 409 };
    }
    console.error("createCita error:", code || errorMessage);
    const errorMsg = getErrorMessage("INTERNAL_ERROR");
    return { ok: false, error: errorMsg.userMessage, code: errorMsg.code, status: 500 };
  }
}
