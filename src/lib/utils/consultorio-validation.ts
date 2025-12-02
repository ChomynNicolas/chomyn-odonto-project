// ============================================================================
// CONSULTORIO VALIDATION UTILITY
// ============================================================================
// Shared module for validating consultorio availability and status
// Used by both createCita and reprogramarCita services

import { PrismaClient, EstadoCita } from "@prisma/client";

export interface ConsultorioValidationResult {
  isValid: boolean;
  error?: {
    code: "CONSULTORIO_NOT_FOUND" | "CONSULTORIO_INACTIVO" | "CONSULTORIO_BLOCKED";
    message: string;
    status: number;
    details?: {
      consultorioId?: number;
      consultorioNombre?: string;
      bloqueoId?: number;
      motivo?: string;
      desde?: string;
      hasta?: string;
      tipo?: string;
    };
  };
}

/**
 * Valida que un consultorio existe y está activo
 */
export async function validateConsultorioIsActive(
  consultorioId: number | null | undefined,
  prisma: PrismaClient
): Promise<ConsultorioValidationResult> {
  // Si no se especifica consultorio, es válido (opcional)
  if (!consultorioId) {
    return { isValid: true };
  }

  const consultorio = await prisma.consultorio.findUnique({
    where: { idConsultorio: consultorioId },
    select: { idConsultorio: true, activo: true, nombre: true },
  });

  if (!consultorio) {
    return {
      isValid: false,
      error: {
        code: "CONSULTORIO_NOT_FOUND",
        message: `El consultorio con ID ${consultorioId} no existe.`,
        status: 404,
        details: { consultorioId },
      },
    };
  }

  if (!consultorio.activo) {
    return {
      isValid: false,
      error: {
        code: "CONSULTORIO_INACTIVO",
        message: `El consultorio "${consultorio.nombre}" está inactivo y no puede recibir citas.`,
        status: 409,
        details: { consultorioId, consultorioNombre: consultorio.nombre },
      },
    };
  }

  return { isValid: true };
}

/**
 * Valida que un consultorio no está bloqueado en el rango de tiempo solicitado
 */
export async function validateConsultorioAvailability(
  consultorioId: number | null | undefined,
  inicio: Date,
  fin: Date,
  prisma: PrismaClient
): Promise<ConsultorioValidationResult> {
  // Si no se especifica consultorio, no hay nada que validar
  if (!consultorioId) {
    return { isValid: true };
  }

  const bloqueo = await prisma.bloqueoAgenda.findFirst({
    where: {
      consultorioId,
      activo: true,
      desde: { lt: fin },
      hasta: { gt: inicio },
    },
    select: {
      idBloqueoAgenda: true,
      motivo: true,
      desde: true,
      hasta: true,
      tipo: true,
    },
    orderBy: { desde: "asc" },
  });

  if (bloqueo) {
    return {
      isValid: false,
      error: {
        code: "CONSULTORIO_BLOCKED",
        message: `El consultorio está bloqueado en el horario solicitado${bloqueo.motivo ? `: ${bloqueo.motivo}` : ""}.`,
        status: 409,
        details: {
          consultorioId,
          bloqueoId: bloqueo.idBloqueoAgenda,
          motivo: bloqueo.motivo ?? undefined,
          desde: bloqueo.desde.toISOString(),
          hasta: bloqueo.hasta.toISOString(),
          tipo: bloqueo.tipo,
        },
      },
    };
  }

  return { isValid: true };
}

/**
 * Busca conflictos específicos de consultorio (citas que se solapan)
 * Útil para obtener detalles específicos de conflictos de consultorio
 */
export async function findConsultorioConflicts(
  consultorioId: number,
  inicio: Date,
  fin: Date,
  excludeCitaId?: number,
  prisma?: PrismaClient
): Promise<Array<{
  citaId: number;
  inicioISO: string;
  finISO: string;
  profesional: { id: number; nombre: string };
  consultorio: { id: number; nombre: string };
}>> {
  const client = prisma || new PrismaClient();
  const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

  const conflicts = await client.cita.findMany({
    where: {
      consultorioId,
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

  return conflicts.map((c) => ({
    citaId: c.idCita,
    inicioISO: c.inicio.toISOString(),
    finISO: c.fin.toISOString(),
    profesional: {
      id: c.profesional.idProfesional,
      nombre: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
    },
    consultorio: {
      id: c.consultorio!.idConsultorio,
      nombre: c.consultorio!.nombre,
    },
  }));
}

