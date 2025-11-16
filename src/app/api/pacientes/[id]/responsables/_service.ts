import { prisma } from "@/lib/prisma"
import { pacienteRepo } from "@/app/api/pacientes/_repo"
import { RelacionPaciente, TipoDocumento } from "@prisma/client"

export class LinkResponsableError extends Error {
  code: "NOT_FOUND" | "VALIDATION_ERROR" | "UNIQUE_CONFLICT" | "INTERNAL_ERROR"
  status: number
  extra?: unknown
  constructor(code: LinkResponsableError["code"], message: string, status = 400, extra?: unknown) {
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
  const { pacienteId, personaId, relacion, esPrincipal } = params

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
      relacion: relacion as RelacionPaciente,
      esPrincipal,
    })

    // Audit opcional
    // await tx.auditLog.create({ data: { actorId: actorUserId ?? null, action: "PACIENTE_LINK_RESPONSABLE", entity:"Paciente", entityId:String(pacienteId), meta:{ personaId, relacion, esPrincipal } }})
  })

  return { pacienteId, personaId, relacion, esPrincipal, idempotent: false }
}

/**
 * Crea una persona nueva y la vincula como responsable del paciente
 */
/**
 * Mapea tipos de documento del frontend a valores del enum TipoDocumento
 */
function mapTipoDocumento(tipo: string): TipoDocumento {
  const tipoMap: Record<string, TipoDocumento> = {
    DNI: TipoDocumento.DNI,
    CEDULA: TipoDocumento.CI, // "CEDULA" se mapea a "CI"
    CI: TipoDocumento.CI,
    PASAPORTE: TipoDocumento.PASAPORTE,
    RUC: TipoDocumento.RUC,
    OTRO: TipoDocumento.OTRO,
  }
  return tipoMap[tipo] ?? TipoDocumento.OTRO
}

export async function createResponsableWithPersona(params: {
  pacienteId: number
  data: {
    nombreCompleto: string
    tipoDocumento: "DNI" | "CEDULA" | "RUC" | "PASAPORTE"
    numeroDocumento: string
    tipoVinculo: "PADRE" | "MADRE" | "TUTOR" | "AUTORIZADO"
    telefono?: string
  }
  actorUserId?: number
}) {
  const { pacienteId, data } = params

  await ensurePacienteExists(pacienteId)

  // Separar nombre completo en nombres, apellidos y segundo apellido
  const partesNombre = data.nombreCompleto.trim().split(/\s+/).filter(Boolean)
  let nombres: string
  let apellidos: string
  let segundoApellido: string | null = null

  if (partesNombre.length === 1) {
    nombres = partesNombre[0] || "Responsable"
    apellidos = ""
  } else if (partesNombre.length === 2) {
    nombres = partesNombre[0]
    apellidos = partesNombre[1]
  } else {
    // 3+ words: last 2 are last names
    segundoApellido = partesNombre.pop()!
    apellidos = partesNombre.pop()!
    nombres = partesNombre.join(" ")
  }

  // Mapear tipo de documento a enum
  const tipoDocumento = mapTipoDocumento(data.tipoDocumento)

  // Crear persona y vincular en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear persona
    const persona = await tx.persona.create({
      data: {
        nombres,
        apellidos,
        segundoApellido,
        genero: "NO_ESPECIFICADO",
      },
    })

    // 2. Crear documento si se proporciona
    if (data.numeroDocumento) {
      await tx.documento.create({
        data: {
          personaId: persona.idPersona,
          tipo: tipoDocumento,
          numero: data.numeroDocumento.trim(),
        },
      })
    }

    // 3. Crear contacto si se proporciona teléfono
    if (data.telefono) {
      await tx.personaContacto.create({
        data: {
          personaId: persona.idPersona,
          tipo: "PHONE",
          valorRaw: data.telefono,
          valorNorm: data.telefono.replace(/\D/g, ""),
          activo: true,
        },
      })
    }

    // 4. Vincular como responsable (la autoridad legal se determina automáticamente según la relación)
    await pacienteRepo.linkResponsablePago(tx, {
      pacienteId,
      personaId: persona.idPersona,
      relacion: data.tipoVinculo as RelacionPaciente,
      esPrincipal: true,
      // autoridadLegal se determina automáticamente según la relación en linkResponsablePago
    })

    // Obtener el vínculo creado para devolver la autoridad legal
    const vinculo = await tx.pacienteResponsable.findFirst({
      where: {
        pacienteId,
        personaId: persona.idPersona,
      },
      select: {
        autoridadLegal: true,
      },
    })

    return {
      pacienteId,
      personaId: persona.idPersona,
      relacion: data.tipoVinculo,
      esPrincipal: true,
      autoridadLegal: vinculo?.autoridadLegal ?? false,
    }
  })

  return result
}

/**
 * Obtiene todos los responsables de un paciente
 */
export async function getResponsables(pacienteId: number) {
  await ensurePacienteExists(pacienteId)

  const responsables = await prisma.pacienteResponsable.findMany({
    where: {
      pacienteId,
      // Solo responsables vigentes (sin vigenteHasta o vigenteHasta en el futuro)
      OR: [
        { vigenteHasta: null },
        { vigenteHasta: { gte: new Date() } },
      ],
    },
    include: {
      persona: {
        select: {
          idPersona: true,
          nombres: true,
          apellidos: true,
        },
      },
    },
    orderBy: [
      { esPrincipal: "desc" },
      { createdAt: "asc" },
    ],
  })

  return responsables.map((resp) => ({
    id: resp.persona.idPersona,
    nombre: `${resp.persona.nombres} ${resp.persona.apellidos}`.trim(),
    tipoVinculo: resp.relacion,
    esPrincipal: resp.esPrincipal,
    autoridadLegal: resp.autoridadLegal,
  }))
}