// src/app/api/pacientes/[id]/_service.delete.ts
import { prisma } from "@/lib/prisma";
import { fichaRepo } from "./_repo";

export class DeletePacienteError extends Error {
  code: string;
  status: number;
  extra?: any;
  constructor(code: string, message: string, status = 400, extra?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

/**
 * Elimina o inactiva un paciente.
 * - roles "RECEP" | "ODONT": siempre soft-delete (ignora `hard`)
 * - role "ADMIN": si `hard=true`, solo si no hay actividad clínica; si hay, 409.
 */
export async function deletePacienteById(params: {
  pacienteId: number;
  role: "ADMIN" | "ODONT" | "RECEP";
  hard: boolean;
  alsoInactivatePersona?: boolean; // opcional
}) {
  const { pacienteId, role, hard, alsoInactivatePersona } = params;

  // Verifica existencia e idempotencia
  const identity = await fichaRepo.getPacienteIdentity(pacienteId);
  if (!identity) {
    throw new DeletePacienteError("NOT_FOUND", "Paciente no encontrado", 404);
  }

  // Si no es ADMIN, forzar soft
  const wantHard = role === "ADMIN" && hard === true;

  if (!wantHard) {
    // Soft delete idempotente (si ya está inactivo, no es error)
    const result = await prisma.$transaction(async (tx) => {
      const updated = await fichaRepo.softInactivatePaciente(pacienteId);
      if (alsoInactivatePersona && identity.personaId) {
        await fichaRepo.softInactivatePersona(identity.personaId);
      }
      // (Opcional) AuditLog: PACIENTE_INACTIVATE
      return { idPaciente: updated.idPaciente, estaActivo: updated.estaActivo, updatedAt: updated.updatedAt };
    });
    return { mode: "soft", ...result };
  }

  // ADMIN + hard=true → verificar dependencias
  const deps = await fichaRepo.countDependencies(pacienteId);
  if (deps.total > 0) {
    throw new DeletePacienteError(
      "HAS_ACTIVITY",
      "No se puede eliminar definitivamente: el paciente tiene actividad clínica.",
      409,
      { deps }
    );
  }

  // Hard delete
  const result = await prisma.$transaction(async (tx) => {
    const deleted = await fichaRepo.hardDeletePaciente(pacienteId);
    // (Opcional) también podrías eliminar Persona si sabes que no la usas en otra entidad
    // await tx.persona.delete({ where: { idPersona: identity.personaId } });
    // (Opcional) AuditLog: PACIENTE_DELETE_HARD
    return { idPaciente: deleted.idPaciente };
  });

  return { mode: "hard", ...result };
}
