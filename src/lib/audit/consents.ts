// src/lib/audit/consents.ts
import { safeAuditWrite } from "./log"
import { AuditAction, AuditEntity } from "./actions"

/**
 * Audit metadata for consent creation
 */
export interface ConsentCreateAuditMetadata {
  pacienteId: number
  tipo: string
  responsablePersonaId: number
  vigenciaEnMeses?: number | null
  citaId?: number | null
  path?: string
}

/**
 * Audit metadata for consent revocation
 */
export interface ConsentRevokeAuditMetadata {
  pacienteId: number
  tipo: string
  reason: string
  revokedAt: string
  citaId?: number | null
  path?: string
}

/**
 * Logs audit entry for consent creation
 */
export async function auditConsentCreate(args: {
  actorId: number
  entityId: number
  metadata: ConsentCreateAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.CONSENTIMIENTO_CREATE,
    entity: AuditEntity.Consentimiento,
    entityId: args.entityId,
    metadata: args.metadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Logs audit entry for consent revocation
 */
export async function auditConsentRevoke(args: {
  actorId: number
  entityId: number
  metadata: ConsentRevokeAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.CONSENTIMIENTO_REVOKE,
    entity: AuditEntity.Consentimiento,
    entityId: args.entityId,
    metadata: args.metadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

