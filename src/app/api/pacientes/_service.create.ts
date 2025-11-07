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

  const toList = (s?: string) =>
    (s ?? "")
      .split(/[,;\n]/g)
      .map((x) => x.trim())
      .filter(Boolean)

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
    const movil = esMovilPY(telefonoNorm)
    await pacienteRepo.createContactoTelefono(tx, {
      personaId: persona.idPersona,
      valorRaw: body.telefono,
      valorNorm: telefonoNorm,
      whatsappCapaz: movil,  // ✅ ahora respetado por repo
      smsCapaz: movil,       // ✅ ahora respetado por repo
      prefer: {
        recordatorio: preferRecordatorio,
        cobranza: preferCobranza || !body.email, // si no hay email, cobranza por teléfono
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
    for (const alergia of toList(body.alergias)) {
      await tx.patientAllergy.create({
        data: {
          pacienteId: paciente.idPaciente,
          label: alergia,
          severity: "MODERATE", // default
          isActive: true,
          createdByUserId: actorUserId,
        },
      })
    }

    // 7) Medicación (lista libre → PatientMedication)
    for (const medicamento of toList(body.medicacion)) {
      await tx.patientMedication.create({
        data: {
          pacienteId: paciente.idPaciente,
          label: medicamento,
          isActive: true,
          createdByUserId: actorUserId,
        },
      })
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

    if (body.vitals) {
      await tx.patientVitals.create({
        data: {
          pacienteId: paciente.idPaciente,
          measuredAt: body.vitals.measuredAt ? new Date(body.vitals.measuredAt) : new Date(),
          heightCm: body.vitals.heightCm ?? null,
          weightKg: body.vitals.weightKg ?? null,
          bmi: body.vitals.bmi ?? null,
          bpSyst: body.vitals.bpSyst ?? null,
          bpDiast: body.vitals.bpDiast ?? null,
          heartRate: body.vitals.heartRate ?? null,
          notes: body.vitals.notes ?? null,
          createdByUserId: actorUserId,
        },
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
