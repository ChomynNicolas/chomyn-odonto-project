// src/app/api/pacientes/[id]/reactivar/_service.reactivate.ts
import { prisma } from "@/lib/prisma";
import { fichaRepo } from "../_repo";

export class ReactivatePacienteError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Reactiva un Paciente (estaActivo=true). Opera de forma idempotente:
 * - Si ya está activo, devuelve mode="noop" (200).
 * - Si persona=true, también reactiva Persona.estaActivo (si estuviera inactiva).
 */
export async function reactivatePacienteById(params: {
  pacienteId: number;
  alsoReactivatePersona?: boolean;
  actorUserId?: number; // para futura auditoría
}) {
  const { pacienteId, alsoReactivatePersona } = params;

  const identity = await fichaRepo.getPacienteIdentity(pacienteId);
  if (!identity) {
    throw new ReactivatePacienteError("NOT_FOUND", "Paciente no encontrado", 404);
  }

  // Idempotencia: si ya está activo, opcionalmente reactiva persona y retorna
  if (identity.estaActivo) {
    let persona: { idPersona: number; estaActivo: boolean; updatedAt?: Date } | undefined;
    if (alsoReactivatePersona && identity.personaId) {
      const p = await fichaRepo.getPersonaActivo(identity.personaId);
      if (p && !p.estaActivo) {
        const updated = await fichaRepo.reactivatePersona(identity.personaId);
        persona = { idPersona: updated.idPersona, estaActivo: updated.estaActivo, updatedAt: updated.updatedAt };
      } else if (p) {
        persona = { idPersona: p.idPersona, estaActivo: p.estaActivo };
      }
    }
    return { mode: "noop", result: { idPaciente: identity.idPaciente, estaActivo: true }, persona };
  }

  // Reactivación transaccional
  const out = await prisma.$transaction(async () => {
    const updatedPaciente = await fichaRepo.reactivatePaciente(identity.idPaciente);

    let updatedPersona:
      | { idPersona: number; estaActivo: boolean; updatedAt?: Date }
      | undefined;

    if (alsoReactivatePersona && identity.personaId) {
      const persona = await fichaRepo.getPersonaActivo(identity.personaId);
      if (persona && !persona.estaActivo) {
        const p = await fichaRepo.reactivatePersona(identity.personaId);
        updatedPersona = { idPersona: p.idPersona, estaActivo: p.estaActivo, updatedAt: p.updatedAt };
      } else if (persona) {
        updatedPersona = { idPersona: persona.idPersona, estaActivo: persona.estaActivo };
      }
    }

    // (Opcional) AuditLog: PACIENTE_REACTIVATE con actorUserId y motivo
    return {
      mode: "reactivated",
      result: updatedPaciente,
      persona: updatedPersona,
    };
  });

  return out;
}
