import type { PacienteCreateBody } from "./_schemas"
import { pacienteRepo } from "./_repo"
import { prisma } from "@/lib/prisma"
import { normalizarTelefono, normalizarEmail, esMovilPY } from "@/lib/normalize"
import { mapGeneroToDB, splitNombreCompleto } from "./_dto"

export async function createPaciente(body: PacienteCreateBody, actorUserId: number) {
  const { nombres, apellidos } = splitNombreCompleto(body.nombreCompleto)

  const generoDB = body.genero ? mapGeneroToDB(body.genero) : "NO_ESPECIFICADO"

  const preferRecordatorio = !!(
    body.preferenciasRecordatorio?.whatsapp ||
    body.preferenciasRecordatorio?.sms ||
    body.preferenciasRecordatorio?.email
  )
  const preferCobranza = !!(
    body.preferenciasCobranza?.whatsapp ||
    body.preferenciasCobranza?.email ||
    body.preferenciasCobranza?.sms
  )

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Persona + Documento
    const persona = await pacienteRepo.createPersonaConDocumento(tx, {
      nombres,
      apellidos,
      genero: generoDB,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      direccion: body.direccion ?? null,
      doc: {
        tipo: body.tipoDocumento ?? "CI",
        numero: body.numeroDocumento.trim(),
        ruc: body.ruc || null,
        paisEmision: body.paisEmision || "PY",
      },
    })

    // 2. Create PersonaContacto (telefono)
    const telefonoNorm = normalizarTelefono(body.telefono)
    const esMovil = esMovilPY(telefonoNorm)

    await pacienteRepo.createContactoTelefono(tx, {
      personaId: persona.idPersona,
      valorRaw: body.telefono,
      valorNorm: telefonoNorm,
      whatsappCapaz: esMovil,
      smsCapaz: esMovil,
      prefer: {
        recordatorio: preferRecordatorio,
        cobranza: preferCobranza || !body.email, // Default to phone if no email
      },
    })

    // 3. Create PersonaContacto (email) if provided
    if (body.email) {
      const norm = normalizarEmail(body.email)
      if (norm) {
        await pacienteRepo.createContactoEmail(tx, {
          personaId: persona.idPersona,
          valorRaw: body.email,
          valorNorm: norm,
          prefer: {
            recordatorio: !!body.preferenciasRecordatorio?.email,
            cobranza: true, // Email is always preferred for billing
          },
        })
      }
    }

    // 4. Create Paciente with ciudad/pais in notas JSON
    const notasJson: any = {}
    if (body.ciudad) notasJson.ciudad = body.ciudad
    if (body.pais) notasJson.pais = body.pais
    if (body.observaciones) notasJson.observaciones = body.observaciones

    const paciente = await pacienteRepo.createPaciente(tx, {
      personaId: persona.idPersona,
      notasJson,
    })

    // 5. Create ClinicalHistoryEntry for antecedentes
    if (body.antecedentes) {
      await tx.clinicalHistoryEntry.create({
        data: {
          pacienteId: paciente.idPaciente,
          title: "Antecedentes iniciales",
          notes: body.antecedentes,
          createdByUserId: actorUserId,
        },
      })
    }

    // 6. Create PatientAllergy records
    if (body.alergias) {
      const alergiasList = body.alergias
        .split(/[,;]/)
        .map((a) => a.trim())
        .filter(Boolean)
      for (const alergia of alergiasList) {
        await tx.patientAllergy.create({
          data: {
            pacienteId: paciente.idPaciente,
            label: alergia,
            severity: "MODERATE",
            isActive: true,
            createdByUserId: actorUserId,
          },
        })
      }
    }

    // 7. Create PatientMedication records
    if (body.medicacion) {
      const medicacionList = body.medicacion
        .split(/[,;]/)
        .map((m) => m.trim())
        .filter(Boolean)
      for (const medicamento of medicacionList) {
        await tx.patientMedication.create({
          data: {
            pacienteId: paciente.idPaciente,
            label: medicamento,
            isActive: true,
            createdByUserId: actorUserId,
          },
        })
      }
    }

    // 8. Link PacienteResponsable if provided
    if (body.responsablePago?.personaId) {
      await pacienteRepo.linkResponsablePago(tx, {
        pacienteId: paciente.idPaciente,
        personaId: body.responsablePago.personaId,
        relacion: body.responsablePago.relacion,
        esPrincipal: body.responsablePago.esPrincipal ?? true,
      })
    }

    // 9. Create AuditLog entry
    await tx.auditLog.create({
      data: {
        action: "PATIENT_CREATE",
        entity: "Patient",
        entityId: paciente.idPaciente.toString(),
        actorId: actorUserId,
        metadata: JSON.stringify({
          nombreCompleto: body.nombreCompleto,
          documento: body.numeroDocumento,
          telefono: body.telefono,
          email: body.email,
        }),
      },
    })

    return { idPaciente: paciente.idPaciente, personaId: persona.idPersona }
  })

  const item = await pacienteRepo.getPacienteUI(result.idPaciente)

  return {
    idPaciente: result.idPaciente,
    personaId: result.personaId,
    item,
  }
}
