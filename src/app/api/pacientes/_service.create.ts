// src/app/api/pacientes/_service.create.ts
import type { PacienteCreateBody } from "./_schemas"
import { pacienteRepo } from "./_repo"
import { prisma } from "@/lib/prisma"
import { normalizarTelefono, normalizarEmail, esMovilPY } from "@/lib/normalize"
import { mapGeneroToDB, splitNombreCompleto } from "./_dto"
import { withTxRetry } from "./_tx"
import type { AllergySeverity, Prisma, RelacionPaciente } from "@prisma/client"

export async function createPaciente(body: PacienteCreateBody, actorUserId: number) {
  const { nombres, apellidos, segundoApellido } = splitNombreCompleto(body.nombreCompleto)
  const generoDB = body.genero ? mapGeneroToDB(body.genero) : "NO_ESPECIFICADO"

  const parseFreeList = (s?: string) =>
    (s ?? "")
      .split(/[,;\n]/g)
      .map((x) => x.trim())
      .filter(Boolean)

  // Normaliza a arrays tipados (retro-compat string -> array)
  const alergiasArr = Array.isArray(body.alergias)
    ? body.alergias
    : parseFreeList(body.alergias).map((label) => ({ label, severity: "MODERATE" as const }))

  const medsArr = Array.isArray(body.medicacion)
    ? body.medicacion
    : parseFreeList(body.medicacion).map((label) => ({ label }))

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
      doc: {
        tipo: body.tipoDocumento ?? "CI",
        numero: body.numeroDocumento.trim(),
        ruc: body.ruc || null,
        paisEmision: body.paisEmision || "PY",
      },
    })

    // 2) Contactos (dedupe + principal por tipo)
    const telNorm = normalizarTelefono(body.telefono)
    const movil = esMovilPY(telNorm)
    
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
    const notasJson: Record<string, unknown> = {}
    if (body.ciudad) notasJson.ciudad = body.ciudad
    if (body.pais) notasJson.pais = body.pais
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

  // ========== FASE B: fuera de transacción (best effort) ==========
  // 5) Antecedentes
  if (body.antecedentes) {
    await prisma.clinicalHistoryEntry.create({
      data: {
        pacienteId: idPaciente,
        title: "Antecedentes iniciales",
        notes: body.antecedentes,
        createdByUserId: actorUserId,
      },
    }).catch((e) => {
      console.error("[warn] antecedentes create failed", e)
    })
  }

  // 6) Alergias (dedupe in-memory y createMany)
  if (alergiasArr.length > 0) {
    // dedupe por (allergyId|label) en memoria
    type AlergiaItem = { id?: number | null; label?: string | null; severity?: AllergySeverity; reaction?: string | null; notedAt?: string | Date | null; isActive?: boolean }
    const key = (a: AlergiaItem): string => {
      const id = "id" in a && a.id !== undefined && a.id !== null ? a.id : null
      if (id !== null) {
        return `id:${id}`
      }
      return `label:${(a.label ?? "").trim().toLowerCase()}`
    }
    const map = new Map<string, AlergiaItem>()
    for (const a of alergiasArr) {
      const hasId = "id" in a && a.id !== undefined && a.id !== null
      if (!hasId && (!a.label || !a.label.trim())) continue
      map.set(key(a), a)
    }
    const toInsert = Array.from(map.values()).map((a) => {
      const allergyId = "id" in a && a.id !== undefined && a.id !== null ? a.id : null
      return {
        pacienteId: idPaciente,
        allergyId,
        label: a.label ?? null,
        severity: (a.severity as AllergySeverity) ?? "MODERATE",
        reaction: a.reaction ?? null,
        notedAt: a.notedAt ? new Date(a.notedAt) : new Date(),
        isActive: a.isActive ?? true,
        createdByUserId: actorUserId,
      }
    })

    if (toInsert.length) {
      await prisma.patientAllergy.createMany({ data: toInsert, skipDuplicates: true })
        .catch(async () => {
          // fallback 1x1 si el proveedor no soporta skipDuplicates o colisiona en unique compuesta
          for (const row of toInsert) {
            try {
              await prisma.patientAllergy.create({ data: row })
            } catch { /* ignore dup */ }
          }
        })
    }
  }

  // 7) Medicación (dedupe + createMany)
  if (medsArr.length > 0) {
    type MedicacionItem = { id?: number | null; label?: string | null; dose?: string | null; freq?: string | null; route?: string | null; startAt?: string | Date | null; endAt?: string | Date | null; isActive?: boolean }
    const key = (m: MedicacionItem): string => {
      const id = "id" in m && m.id !== undefined && m.id !== null ? m.id : null
      if (id !== null) {
        return `id:${id}`
      }
      return `label:${(m.label ?? "").trim().toLowerCase()}`
    }
    const map = new Map<string, MedicacionItem>()
    for (const m of medsArr) {
      const hasId = "id" in m && m.id !== undefined && m.id !== null
      if (!hasId && (!m.label || !m.label.trim())) continue
      map.set(key(m), m)
    }
    const toInsert = Array.from(map.values()).map((m) => {
      const medicationId = "id" in m && m.id !== undefined && m.id !== null ? m.id : null
      return {
        pacienteId: idPaciente,
        medicationId,
        label: m.label ?? null,
        dose: m.dose ?? null,
        freq: m.freq ?? null,
        route: m.route ?? null,
        startAt: m.startAt ? new Date(m.startAt) : null,
        endAt: m.endAt ? new Date(m.endAt) : null,
        isActive: m.isActive ?? true,
        createdByUserId: actorUserId,
      }
    })

    if (toInsert.length) {
      await prisma.patientMedication.createMany({ data: toInsert, skipDuplicates: true })
        .catch(async () => {
          for (const row of toInsert) {
            try { await prisma.patientMedication.create({ data: row }) } catch { /* ignore dup */ }
          }
        })
    }
  }

  // 8) Vitals (si llega)
  if (body.vitals) {
    await prisma.patientVitals.create({
      data: {
        pacienteId: idPaciente,
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
    }).catch((e) => console.error("[warn] vitals create failed", e))
  }

  // 9) Audit (no bloqueante)
  await prisma.auditLog.create({
    data: {
      action: "PATIENT_CREATE",
      entity: "Patient",
      entityId: idPaciente,
      actorId: actorUserId,
      metadata: { nombreCompleto: body.nombreCompleto, documento: body.numeroDocumento } as Prisma.InputJsonValue,
    },
  }).catch((e) => console.error("[warn] audit create failed", e))

  // 10) DTO final para UI
  const item = await pacienteRepo.getPacienteUI(idPaciente)
  return { idPaciente, personaId, item }
}
