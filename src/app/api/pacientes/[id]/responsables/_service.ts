import { prisma } from "@/lib/prisma"
import { pacienteRepo } from "@/app/api/pacientes/_repo"

export class LinkResponsableError extends Error {
  code: "NOT_FOUND" | "VALIDATION_ERROR" | "UNIQUE_CONFLICT" | "INTERNAL_ERROR"
  status: number
  extra?: any
  constructor(code: LinkResponsableError["code"], message: string, status = 400, extra?: any) {
    super(message)
    this.code = code
    this.status = status
    this.extra = extra
  }
}

export async function ensurePacienteExists(idPaciente: number) {
  const found = await prisma.paciente.findUnique({ where: { idPaciente }, select: { idPaciente: true } })
  if (!found) throw new LinkResponsableError("NOT_FOUND", "Paciente no encontrado", 404)
}

export async function ensurePersonaExists(idPersona: number) {
  const found = await prisma.persona.findUnique({ where: { idPersona }, select: { idPersona: true } })
  if (!found) throw new LinkResponsableError("NOT_FOUND", "Persona no encontrada", 404)
}

/**
 * Idempotencia mínima:
 * - Si ya existe un vínculo (pacienteId + personaId) devolvemos OK sin duplicar.
 * - Si el modelo permite múltiples relaciones, deduplicamos por (pacienteId, personaId) igualmente para evitar reintentos dobles.
 *   (Ajusta el where si deseas considerar 'relacion' en la unicidad.)
 */
export async function linkResponsablePago(params: {
  pacienteId: number
  personaId: number
  relacion: string
  esPrincipal: boolean
  actorUserId?: number
}) {
  const { pacienteId, personaId, relacion, esPrincipal, actorUserId } = params

  await ensurePacienteExists(pacienteId)
  await ensurePersonaExists(personaId)

  // ¿Existe ya vínculo? (idempotencia mínima)
  const existing = await prisma.pacienteResponsable.findFirst({
    where: { pacienteId, personaId },
    select: { pacienteId: true, personaId: true, relacion: true, esPrincipal: true },
  })

  if (existing) {
    // Opcional: si cambia relacion/esPrincipal podrías actualizar aquí.
    return { pacienteId, personaId, relacion: existing.relacion, esPrincipal: existing.esPrincipal, idempotent: true }
  }

  // Crear vínculo usando tu repo (respetamos tu arquitectura)
  await prisma.$transaction(async (tx) => {
    await pacienteRepo.linkResponsablePago(tx, {
      pacienteId,
      personaId,
      relacion: relacion as any,
      esPrincipal,
    })

    // Audit opcional
    // await tx.auditLog.create({ data: { actorId: actorUserId ?? null, action: "PACIENTE_LINK_RESPONSABLE", entity:"Paciente", entityId:String(pacienteId), meta:{ personaId, relacion, esPrincipal } }})
  })

  return { pacienteId, personaId, relacion, esPrincipal, idempotent: false }
}
