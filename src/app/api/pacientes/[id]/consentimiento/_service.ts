import { prisma } from "@/lib/prisma"
import { consentimientoRepo } from "./_repo"
import { calcularVigenteHasta, esVigente, nombreCompleto, type ConsentimientoDTO } from "./_dto"
import type { ConsentimientoCreateBody, ConsentimientoListQuery } from "./_schemas"
import type { Prisma } from "@prisma/client"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

export class ConsentimientoError extends Error {
  code: string
  status: number
  extra?: unknown

  constructor(code: string, message: string, status = 400, extra?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.extra = extra
  }
}

const EDAD_MAYORIA = 18

export function calcularEdad(fechaNacimiento: Date | null): number | null {
  if (!fechaNacimiento) return null
  const today = new Date()
  const birthDate = new Date(fechaNacimiento)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function esMenorDeEdad(fechaNacimiento: Date | null): boolean {
  const edad = calcularEdad(fechaNacimiento)
  if (edad === null) return false
  return edad < EDAD_MAYORIA
}

export async function crearConsentimiento(params: {
  pacienteId: number
  body: ConsentimientoCreateBody
  userId: number
}): Promise<ConsentimientoDTO> {
  const { pacienteId, body, userId } = params

  // Verificar paciente existe
  const paciente = await consentimientoRepo.verificarPacienteExiste(pacienteId)
  if (!paciente) {
    throw new ConsentimientoError("NOT_FOUND", "Paciente no encontrado", 404)
  }

  // NEW: Require citaId for ALL consent types (appointment-specific consents)
  if (!body.citaId) {
    throw new ConsentimientoError(
      "APPOINTMENT_REQUIRED",
      "Los consentimientos deben estar asociados a una cita específica",
      400,
    )
  }

  // NEW: Check for existing consent of same type for this appointment
  const existingConsent = await consentimientoRepo.buscarConsentimientoPorCita(
    pacienteId,
    body.citaId,
    body.tipo,
  )
  if (existingConsent) {
    throw new ConsentimientoError(
      "CONSENT_ALREADY_EXISTS",
      "Ya existe un consentimiento de este tipo para esta cita",
      409,
    )
  }

  // Si es consentimiento de menor, verificar que el paciente sea menor
  if (body.tipo === "CONSENTIMIENTO_MENOR_ATENCION") {
    if (!paciente.persona.fechaNacimiento) {
      throw new ConsentimientoError(
        "MISSING_DOB_FOR_MINOR_CHECK",
        "No se puede crear consentimiento de menor: falta fecha de nacimiento del paciente",
        400,
      )
    }

    if (!esMenorDeEdad(paciente.persona.fechaNacimiento)) {
      throw new ConsentimientoError(
        "PATIENT_NOT_MINOR",
        "El paciente no es menor de edad, no requiere consentimiento de menor",
        400,
      )
    }
  }

  // Si es consentimiento de cirugía, validar responsable según edad del paciente
  if (body.tipo === "CIRUGIA") {
    if (!paciente.persona.fechaNacimiento) {
      throw new ConsentimientoError(
        "MISSING_DOB_FOR_SURGERY_CHECK",
        "No se puede crear consentimiento de cirugía: falta fecha de nacimiento del paciente",
        400,
      )
    }

    const esMenor = esMenorDeEdad(paciente.persona.fechaNacimiento)
    
    // Para pacientes adultos, el responsable debe ser el mismo paciente
    if (!esMenor && body.responsablePersonaId !== paciente.persona.idPersona) {
      console.error("Adult surgery consent validation failed:", {
        isMinor: esMenor,
        responsablePersonaId: body.responsablePersonaId,
        expectedPersonaId: paciente.persona.idPersona,
        patientName: `${paciente.persona.nombres} ${paciente.persona.apellidos}`,
        consentType: body.tipo
      })
      
      throw new ConsentimientoError(
        "ADULT_SURGERY_CONSENT_SELF_ONLY",
        "Para pacientes adultos, el consentimiento de cirugía debe ser firmado por el propio paciente",
        400,
      )
    }
    
    // Para menores, el responsable debe tener autoridad legal (se valida más abajo)
    // No hay validación adicional aquí porque ya se valida en la sección de autoridad legal
  }

  // Para consentimiento de cirugía de paciente adulto, el paciente es su propio responsable
  const esMenor = paciente.persona.fechaNacimiento ? esMenorDeEdad(paciente.persona.fechaNacimiento) : false
  const esCirugiaAdulto = body.tipo === "CIRUGIA" && !esMenor && body.responsablePersonaId === paciente.persona.idPersona

  if (!esCirugiaAdulto) {
    // Verificar responsable está vinculado (solo para menores o responsables externos)
    const vinculo = await consentimientoRepo.verificarResponsableVinculado(pacienteId, body.responsablePersonaId)

    if (!vinculo) {
      throw new ConsentimientoError(
        "NO_RESPONSIBLE_LINKED",
        "El responsable no está vinculado al paciente o el vínculo no está vigente",
        400,
      )
    }

    // Verificar autoridad legal
    if (!vinculo.autoridadLegal) {
      throw new ConsentimientoError(
        "NO_LEGAL_AUTHORITY",
        "El responsable no tiene autoridad legal para firmar consentimientos",
        403,
      )
    }
  }

  // NEW: All new consents are appointment-specific
  // vigente_hasta is set to a far future date since validity is controlled by appointment status
  const firmadoEn = new Date(body.firmadoEn)
  const vigenteHasta = new Date(2099, 11, 31) // Far future date - validity is appointment-based

  // Crear consentimiento en transacción
  // IMPORTANTE: Este endpoint NO debe modificar el estado de la cita asociada
  // Solo asocia el consentimiento a la cita
  const created = await prisma.$transaction(async (tx) => {
    // Verificar que la cita existe y obtener su estado actual (solo lectura)
    const cita = await tx.cita.findUnique({
      where: { idCita: body.citaId },
      select: { idCita: true, estado: true, pacienteId: true },
    })
    if (!cita) {
      throw new ConsentimientoError("CITA_NOT_FOUND", "La cita asociada no existe", 404)
    }
    // Validar que la cita pertenece al paciente
    if (cita.pacienteId !== pacienteId) {
      throw new ConsentimientoError(
        "CITA_PATIENT_MISMATCH",
        "La cita no pertenece al paciente especificado",
        400,
      )
    }
    // NO modificamos el estado de la cita aquí - solo asociamos el consentimiento

    const consentimiento = await consentimientoRepo.crear(tx, {
      pacienteId,
      responsablePersonaId: body.responsablePersonaId,
      citaId: body.citaId,
      tipo: body.tipo,
      firmadoEn,
      vigenteHasta,
      publicId: body.cloudinary.publicId,
      secureUrl: body.cloudinary.secureUrl,
      format: body.cloudinary.format ?? null,
      bytes: body.cloudinary.bytes,
      width: body.cloudinary.width ?? null,
      height: body.cloudinary.height ?? null,
      hash: body.cloudinary.hash ?? null,
      observaciones: body.observaciones ?? null,
      registradoPorUsuarioId: userId,
      esEspecificoPorCita: true, // NEW: Always true for new consents
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.CONSENTIMIENTO_CREATE,
        entity: AuditEntity.Consentimiento,
        entityId: consentimiento.idConsentimiento,
        metadata: {
          pacienteId,
          tipo: body.tipo,
          responsablePersonaId: body.responsablePersonaId,
          vigenciaEnMeses: body.vigenciaEnMeses ?? null,
          citaId: body.citaId ?? null,
        },
      },
    })

    return consentimiento
  })

  return mapToDTO(created)
}

export async function listarConsentimientos(params: {
  pacienteId: number
  query: ConsentimientoListQuery
}): Promise<ConsentimientoDTO[]> {
  const { pacienteId, query } = params

  // Verificar paciente existe
  const paciente = await consentimientoRepo.verificarPacienteExiste(pacienteId)
  if (!paciente) {
    throw new ConsentimientoError("NOT_FOUND", "Paciente no encontrado", 404)
  }

  const consentimientos = await consentimientoRepo.listar({
    pacienteId,
    tipo: query.tipo,
    vigente: query.vigente,
    responsableId: query.responsableId,
    limit: query.limit,
  })

  return consentimientos.map(mapToDTO)
}

export async function obtenerConsentimiento(idConsentimiento: number): Promise<ConsentimientoDTO | null> {
  const consentimiento = await consentimientoRepo.obtenerPorId(idConsentimiento)
  if (!consentimiento) return null
  return mapToDTO(consentimiento)
}

export async function revocarConsentimiento(params: {
  idConsentimiento: number
  reason: string
  userId: number
}): Promise<void> {
  const { idConsentimiento, reason, userId } = params

  const consentimiento = await consentimientoRepo.obtenerPorId(idConsentimiento)
  if (!consentimiento) {
    throw new ConsentimientoError("NOT_FOUND", "Consentimiento no encontrado", 404)
  }

  if (!consentimiento.activo) {
    throw new ConsentimientoError("ALREADY_REVOKED", "El consentimiento ya fue revocado", 400)
  }

  await prisma.$transaction(async (tx) => {
    await consentimientoRepo.revocar(tx, idConsentimiento, reason)

    // Audit log - include pacienteId and tipo for easier querying
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.CONSENTIMIENTO_REVOKE,
        entity: AuditEntity.Consentimiento,
        entityId: idConsentimiento,
        metadata: {
          pacienteId: consentimiento.Paciente_idPaciente,
          tipo: consentimiento.tipo,
          reason,
          revokedAt: new Date().toISOString(),
          citaId: consentimiento.Cita_idCita ?? null,
        },
      },
    })
  })
}

type ConsentimientoWithRelations = Prisma.ConsentimientoGetPayload<{
  include: {
    responsable: {
      include: {
        documento: true
        PacienteResponsable: {
          select: { relacion: true }
        }
      }
    }
    cita: {
      select: {
        idCita: true
        inicio: true
        tipo: true
        estado: true
      }
    }
    registradoPor: {
      select: {
        idUsuario: true
        nombreApellido: true
      }
    }
  }
}>

function mapToDTO(data: ConsentimientoWithRelations): ConsentimientoDTO {
  const relacion = data.responsable.PacienteResponsable?.[0]?.relacion ?? null
  
  // Prisma devuelve los campos con los nombres del modelo (Paciente_idPaciente, firmado_en, etc.)
  // Access using bracket notation to handle snake_case field names
  const firmadoEn = (data as unknown as { firmado_en: Date }).firmado_en
  const vigenteHasta = (data as unknown as { vigente_hasta: Date }).vigente_hasta
  const registradoEn = (data as unknown as { registrado_en: Date }).registrado_en
  const pacienteId = (data as unknown as { Paciente_idPaciente: number }).Paciente_idPaciente
  const publicId = (data as unknown as { public_id: string }).public_id
  const secureUrl = (data as unknown as { secure_url: string }).secure_url
  const esEspecificoPorCitaValue = data.esEspecificoPorCita ?? false

  // Calculate validity using the updated esVigente function
  const vigenteHastaDate = vigenteHasta instanceof Date ? vigenteHasta : new Date(vigenteHasta)
  const citaId = data.cita?.idCita ?? null
  const citaEstado = data.cita?.estado ?? null

  return {
    idConsentimiento: data.idConsentimiento,
    pacienteId,
    tipo: data.tipo,
    firmadoEn: firmadoEn instanceof Date ? firmadoEn.toISOString() : firmadoEn,
    vigenteHasta: vigenteHasta instanceof Date ? vigenteHasta.toISOString() : vigenteHasta,
    vigente: esVigente(vigenteHastaDate, esEspecificoPorCitaValue, citaId, citaEstado),
    activo: data.activo,
    version: data.version,
    observaciones: data.observaciones,
    esEspecificoPorCita: esEspecificoPorCitaValue,
    responsable: {
      idPersona: data.responsable.idPersona,
      nombreCompleto: nombreCompleto(data.responsable),
      documento: data.responsable.documento
        ? {
            tipo: data.responsable.documento.tipo,
            numero: data.responsable.documento.numero,
          }
        : null,
      relacion,
    },
    cita: data.cita
      ? {
          idCita: data.cita.idCita,
          inicio: data.cita.inicio instanceof Date ? data.cita.inicio.toISOString() : data.cita.inicio,
          tipo: data.cita.tipo,
          estado: data.cita.estado,
        }
      : null,
    archivo: {
      publicId,
      secureUrl,
      format: data.format,
      bytes: data.bytes,
      thumbnailUrl:
        data.width && data.height
          ? `${secureUrl.split("/upload/")[0]}/upload/w_300,h_300,c_fill/${publicId}`
          : null,
    },
    registro: {
      registradoEn: registradoEn instanceof Date ? registradoEn.toISOString() : registradoEn,
      registradoPor: {
        idUsuario: data.registradoPor.idUsuario,
        nombre: data.registradoPor.nombreApellido,
      },
    },
  }
}
