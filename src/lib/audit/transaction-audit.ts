// ============================================================================
// TRANSACTION AUDIT HELPERS
// ============================================================================
// Helper functions for writing audit logs within Prisma transactions
// These functions accept PrismaClient (which can be a transaction client)
// to ensure audit logs are written atomically with the main operation

import type { EstadoCita, TipoCita, MotivoCancelacion } from "@prisma/client";
import { AuditAction, AuditEntity } from "./actions";
import type { Prisma } from "@prisma/client";

/**
 * Writes audit log within a transaction (safe - logs errors but doesn't throw)
 */
async function safeTransactionAudit(
  tx: Prisma.TransactionClient,
  opts: {
    actorId: number;
    action: string;
    entity: string;
    entityId: number;
    ip?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await tx.auditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        ip: opts.ip ?? null,
        metadata: opts.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    // Log error but don't break the transaction
    console.error("[transaction-audit] Failed to write audit log:", (e as Error).message);
  }
}

/**
 * Audits appointment cancellation with complete metadata
 */
export async function auditCitaCancel(opts: {
  tx: Prisma.TransactionClient;
  actorId: number;
  citaId: number;
  motivoCancelacion: MotivoCancelacion;
  notas?: string | null;
  estadoPrevio: EstadoCita;
  inicioISO: string;
  finISO: string;
  pacienteId: number;
  profesionalId: number;
  consultorioId?: number | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await safeTransactionAudit(opts.tx, {
    actorId: opts.actorId,
    action: AuditAction.CITA_CANCEL,
    entity: AuditEntity.Cita,
    entityId: opts.citaId,
    ip: opts.ip ?? null,
    metadata: {
      motivoCancelacion: opts.motivoCancelacion,
      notas: opts.notas ?? null,
      estadoPrevio: opts.estadoPrevio,
      estadoNuevo: "CANCELLED",
      inicioISO: opts.inicioISO,
      finISO: opts.finISO,
      pacienteId: opts.pacienteId,
      profesionalId: opts.profesionalId,
      consultorioId: opts.consultorioId ?? null,
      timestamp: new Date().toISOString(),
      ...(opts.metadata ?? {}),
    },
  });
}

/**
 * Audits appointment creation
 */
export async function auditCitaCreate(opts: {
  tx: Prisma.TransactionClient;
  actorId: number;
  citaId: number;
  tipo: TipoCita;
  inicioISO: string;
  finISO: string;
  duracionMinutos: number;
  pacienteId: number;
  profesionalId: number;
  consultorioId?: number | null;
  motivo?: string | null;
  notas?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await safeTransactionAudit(opts.tx, {
    actorId: opts.actorId,
    action: AuditAction.CITA_CREATE,
    entity: AuditEntity.Cita,
    entityId: opts.citaId,
    ip: opts.ip ?? null,
    metadata: {
      tipo: opts.tipo,
      inicioISO: opts.inicioISO,
      finISO: opts.finISO,
      duracionMinutos: opts.duracionMinutos,
      pacienteId: opts.pacienteId,
      profesionalId: opts.profesionalId,
      consultorioId: opts.consultorioId ?? null,
      motivo: opts.motivo ?? null,
      notas: opts.notas ?? null,
      estado: "SCHEDULED",
      timestamp: new Date().toISOString(),
      ...(opts.metadata ?? {}),
    },
  });
}

/**
 * Audits appointment state change
 */
export async function auditCitaEstadoChange(opts: {
  tx: Prisma.TransactionClient;
  actorId: number;
  citaId: number;
  estadoPrevio: EstadoCita;
  estadoNuevo: EstadoCita;
  nota?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await safeTransactionAudit(opts.tx, {
    actorId: opts.actorId,
    action: AuditAction.CITA_ESTADO_CHANGE,
    entity: AuditEntity.Cita,
    entityId: opts.citaId,
    ip: opts.ip ?? null,
    metadata: {
      estadoPrevio: opts.estadoPrevio,
      estadoNuevo: opts.estadoNuevo,
      nota: opts.nota ?? null,
      timestamp: new Date().toISOString(),
      ...(opts.metadata ?? {}),
    },
  });
}

/**
 * Audits appointment rescheduling (success)
 */
export async function auditCitaReprogramar(opts: {
  tx: Prisma.TransactionClient;
  actorId: number;
  citaOriginalId: number;
  citaNuevaId: number;
  anteriorInicioISO: string;
  anteriorFinISO: string;
  nuevoInicioISO: string;
  nuevoFinISO: string;
  profesionalId: number;
  consultorioId?: number | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await safeTransactionAudit(opts.tx, {
    actorId: opts.actorId,
    action: AuditAction.CITA_REPROGRAMAR,
    entity: AuditEntity.Cita,
    entityId: opts.citaNuevaId,
    ip: opts.ip ?? null,
    metadata: {
      citaOriginalId: opts.citaOriginalId,
      anteriorInicioISO: opts.anteriorInicioISO,
      anteriorFinISO: opts.anteriorFinISO,
      nuevoInicioISO: opts.nuevoInicioISO,
      nuevoFinISO: opts.nuevoFinISO,
      profesionalId: opts.profesionalId,
      consultorioId: opts.consultorioId ?? null,
      timestamp: new Date().toISOString(),
      ...(opts.metadata ?? {}),
    },
  });
}

/**
 * Audits failed rescheduling attempt due to overlap
 */
export async function auditCitaReprogramarOverlap(opts: {
  tx: Prisma.TransactionClient;
  actorId: number;
  citaId: number;
  intentoInicioISO: string;
  intentoFinISO: string;
  profesionalId: number;
  consultorioId?: number | null;
  conflictos: Array<{
    citaId: number;
    inicioISO: string;
    finISO: string;
  }>;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await safeTransactionAudit(opts.tx, {
    actorId: opts.actorId,
    action: AuditAction.CITA_REPROGRAMAR_OVERLAP,
    entity: AuditEntity.Cita,
    entityId: opts.citaId,
    ip: opts.ip ?? null,
    metadata: {
      intentoInicioISO: opts.intentoInicioISO,
      intentoFinISO: opts.intentoFinISO,
      profesionalId: opts.profesionalId,
      consultorioId: opts.consultorioId ?? null,
      conflictos: opts.conflictos,
      timestamp: new Date().toISOString(),
      ...(opts.metadata ?? {}),
    },
  });
}

