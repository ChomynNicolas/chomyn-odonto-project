// src/app/api/pacientes/_service.create.ts
import type { PacienteCreateBody } from "./_schemas"
import { pacienteRepo } from "./_repo"
import { prisma } from "@/lib/prisma"
import { normalizarEmail } from "@/lib/normalize"
import { normalizePhone, isMobilePhone } from "@/lib/phone-utils"
import { mapGeneroToDB, splitNombreCompleto } from "./_dto"
import { withTxRetry } from "./_tx"
import type { Prisma, RelacionPaciente } from "@prisma/client"
import { PacienteAlreadyExistsError } from "./_errors"

export async function createPaciente(body: PacienteCreateBody, actorUserId: number) {
  const { nombres, apellidos, segundoApellido } = splitNombreCompleto(body.nombreCompleto)
  const generoDB = body.genero ? mapGeneroToDB(body.genero) : "NO_ESPECIFICADO"

  // ========== VALIDACIÓN DE DUPLICADOS: Pre-check antes de iniciar transacción ==========
  // Verificar si ya existe un paciente con el mismo documento
  // Esto se hace ANTES de la transacción para evitar trabajo innecesario
  const tipoDocumento = body.tipoDocumento ?? "CI"
  const numeroDocumento = body.numeroDocumento.trim()
  
  const pacienteExistente = await pacienteRepo.findByDocumento(tipoDocumento, numeroDocumento)
  
  if (pacienteExistente) {
    throw new PacienteAlreadyExistsError(
      tipoDocumento,
      numeroDocumento,
      pacienteExistente.idPaciente,
    )
  }

  // ========== FASE A: transacción corta y rápida ==========
  const { idPaciente, personaId } = await withTxRetry(async (tx) => {
    // 1) Persona + Documento
    const persona = await pacienteRepo.createPersonaConDocumento(tx, {
      nombres,
      apellidos,
      segundoApellido,
      genero: generoDB,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      direccion: body.direccion ?? null,
      ciudad: body.ciudad?.trim() ?? null,
      pais: body.pais ?? "PY",
      doc: {
        tipo: body.tipoDocumento ?? "CI",
        numero: body.numeroDocumento.trim(),
        ruc: body.ruc || null,
        paisEmision: body.paisEmision || "PY",
      },
    })

    // 2) Contactos (dedupe + principal por tipo)
    const telNorm = normalizePhone(body.telefono)
    const movil = isMobilePhone(telNorm)
    
    // Determinar preferencias: si hay email, el email tiene prioridad para cobranza
    const telefonoPreferRecordatorio = !!(body.preferenciasRecordatorio?.whatsapp || body.preferenciasRecordatorio?.sms)
    const telefonoPreferCobranza = !!(body.preferenciasCobranza?.whatsapp || body.preferenciasCobranza?.sms) && !body.email
    
    await pacienteRepo.createContactoTelefono(tx, {
      personaId: persona.idPersona,
      valorRaw: body.telefono,
      valorNorm: telNorm,
      whatsappCapaz: movil,
      smsCapaz: movil,
      prefer: {
        recordatorio: telefonoPreferRecordatorio,
        cobranza: telefonoPreferCobranza,
      },
    })

    if (body.email) {
      const emailNorm = normalizarEmail(body.email)
      await pacienteRepo.createContactoEmail(tx, {
        personaId: persona.idPersona,
        valorRaw: body.email,
        valorNorm: emailNorm,
        prefer: {
          recordatorio: !!body.preferenciasRecordatorio?.email,
          cobranza: !!(body.preferenciasCobranza?.email || body.preferenciasCobranza?.whatsapp || body.preferenciasCobranza?.sms),
        },
      })
    }

    // 3) Paciente (metadatos)
    // Nota: ciudad y pais ahora se guardan directamente en Persona.ciudad y Persona.pais
    const notasJson: Record<string, unknown> = {}
    if (body.observaciones) notasJson.observaciones = body.observaciones

    const paciente = await pacienteRepo.createPaciente(tx, {
      personaId: persona.idPersona,
      notasJson,
    })

    // 4) Responsable de pago (si hay)
    if (body.responsablePago?.personaId) {
      // Validar que la persona existe antes de vincular
      const personaExiste = await tx.persona.findUnique({
        where: { idPersona: body.responsablePago.personaId },
        select: { idPersona: true },
      })
      
      if (!personaExiste) {
        throw new Error(`La persona con ID ${body.responsablePago.personaId} no existe`)
      }

      // Verificar si ya existe un vínculo (idempotencia)
      const vinculoExistente = await tx.pacienteResponsable.findFirst({
        where: {
          pacienteId: paciente.idPaciente,
          personaId: body.responsablePago.personaId,
        },
        select: { idPacienteResponsable: true },
      })

      if (!vinculoExistente) {
        await pacienteRepo.linkResponsablePago(tx, {
          pacienteId: paciente.idPaciente,
          personaId: body.responsablePago.personaId,
          relacion: body.responsablePago.relacion as RelacionPaciente,
          esPrincipal: body.responsablePago.esPrincipal ?? true,
          // autoridadLegal se determina automáticamente según la relación
        })
      }
    }

    return { idPaciente: paciente.idPaciente, personaId: persona.idPersona }
  }, { maxWaitMs: 10_000, timeoutMs: 30_000, attempts: 2 })

  // ========== FASE B: Audit (no bloqueante) ==========
  // Nota: Los datos clínicos (alergias, medicación, antecedentes, vitals) y adjuntos
  // se gestionan en otras pantallas después de crear el paciente.
  await prisma.auditLog.create({
    data: {
      action: "PATIENT_CREATE",
      entity: "Patient",
      entityId: idPaciente,
      actorId: actorUserId,
      metadata: { nombreCompleto: body.nombreCompleto, documento: body.numeroDocumento } as Prisma.InputJsonValue,
    },
  }).catch((e) => console.error("[warn] audit create failed", e))

  // ========== DTO final para UI ==========
  const item = await pacienteRepo.getPacienteUI(idPaciente)
  return { idPaciente, personaId, item }
}
