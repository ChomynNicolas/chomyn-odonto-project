import {
  type PrismaClient,
  ConsultaEstado,
  type DienteSuperficie,
  TreatmentStepStatus,
  DiagnosisStatus,
  AllergySeverity,
  type AdjuntoTipo,
} from "@prisma/client"
import { faker } from "@faker-js/faker"

export async function createPlanConSteps(
  prisma: PrismaClient,
  params: {
    pacienteId: number
    createdByUserId: number
    steps: Array<{
      code?: string
      serviceType?: string
      toothNumber?: number | null
      toothSurface?: DienteSuperficie | null
      estimatedDurationMin?: number | null
      estimatedCostCents?: number | null
      priority?: number | null
    }>
  },
) {
  const plan = await prisma.treatmentPlan.create({
    data: {
      pacienteId: params.pacienteId,
      titulo: "Plan inicial",
      isActive: true,
      createdByUserId: params.createdByUserId,
    },
  })

  let order = 1
  for (const st of params.steps) {
    let procedureId: number | undefined = undefined
    if (st.code) {
      const proc = await prisma.procedimientoCatalogo.findUnique({ where: { code: st.code } })
      procedureId = proc?.idProcedimiento
    }
    await prisma.treatmentStep.create({
      data: {
        treatmentPlanId: plan.idTreatmentPlan,
        order: order++,
        procedureId,
        serviceType: procedureId ? null : (st.serviceType ?? "Procedimiento"),
        toothNumber: st.toothNumber ?? null,
        toothSurface: st.toothSurface ?? null,
        estimatedDurationMin: st.estimatedDurationMin ?? null,
        estimatedCostCents: st.estimatedCostCents ?? null,
        priority: st.priority ?? 3,
        status: TreatmentStepStatus.PENDING,
      },
    })
  }
  return plan
}

export async function ensureConsultaParaCita(
  prisma: PrismaClient,
  params: {
    citaId: number
    performedByProfessionalId: number
    createdByUserId: number
    status?: ConsultaEstado
    reason?: string | null
    diagnosis?: string | null
    clinicalNotes?: string | null
  },
) {
  return prisma.consulta.upsert({
    where: { citaId: params.citaId },
    update: {},
    create: {
      citaId: params.citaId,
      performedById: params.performedByProfessionalId,
      createdByUserId: params.createdByUserId,
      status: params.status ?? ConsultaEstado.DRAFT,
      reason: params.reason ?? null,
      diagnosis: params.diagnosis ?? null,
      clinicalNotes: params.clinicalNotes ?? null,
    },
  })
}

export async function addLineaProcedimiento(
  prisma: PrismaClient,
  params: {
    consultaCitaId: number
    code?: string
    serviceType?: string
    toothNumber?: number | null
    toothSurface?: DienteSuperficie | null
    quantity?: number
    unitPriceCents?: number | null
    totalCents?: number | null
    treatmentStepId?: number | null
    resultNotes?: string | null
  },
) {
  let procedureId: number | undefined = undefined
  if (params.code) {
    const found = await prisma.procedimientoCatalogo.findUnique({ where: { code: params.code } })
    procedureId = found?.idProcedimiento
  }
  const q = params.quantity && params.quantity > 0 ? params.quantity : 1

  let unit = params.unitPriceCents ?? null
  if (unit == null && procedureId) {
    const proc = await prisma.procedimientoCatalogo.findUnique({ where: { idProcedimiento: procedureId } })
    unit = proc?.defaultPriceCents ?? null
  }
  const total = params.totalCents ?? (unit != null ? unit * q : null)

  return prisma.consultaProcedimiento.create({
    data: {
      consultaId: params.consultaCitaId,
      procedureId,
      serviceType: procedureId ? null : (params.serviceType ?? "Procedimiento"),
      toothNumber: params.toothNumber ?? null,
      toothSurface: params.toothSurface ?? null,
      quantity: q,
      unitPriceCents: unit,
      totalCents: total,
      treatmentStepId: params.treatmentStepId ?? null,
      resultNotes: params.resultNotes ?? null,
    },
  })
}

function deriveStorageFromUrl(url: string, originalName?: string) {
  const u = new URL(url)
  const file = originalName ?? u.pathname.split("/").pop() ?? "file.bin"
  const dot = file.lastIndexOf(".")
  const nameNoExt = dot > -1 ? file.slice(0, dot) : file
  const ext = dot > -1 ? file.slice(dot + 1) : "bin"
  return {
    publicId: `seed/${nameNoExt}-${Math.random().toString(36).slice(2, 8)}`,
    folder: "seed",
    resourceType: "image",
    format: ext,
    secureUrl: url,
  }
}

export async function addAdjuntoConsulta(
  prisma: PrismaClient,
  params: {
    consultaCitaId: number
    uploadedByUserId: number
    url: string
    originalName: string
    mimeType: string
    size: number
    tipo: AdjuntoTipo
    procedimientoId?: number | null
    metadata?: any
  },
) {
  const st = deriveStorageFromUrl(params.url, params.originalName)
  return prisma.adjunto.create({
    data: {
      consultaId: params.consultaCitaId,
      procedimientoId: params.procedimientoId ?? null,
      tipo: params.tipo,
      descripcion: params.originalName,
      publicId: st.publicId,
      folder: st.folder,
      resourceType: st.resourceType,
      format: st.format,
      secureUrl: st.secureUrl,
      bytes: params.size,
      originalFilename: params.originalName,
      uploadedByUserId: params.uploadedByUserId,
    },
  })
}

/** Historia clínica breve, diagnósticos, alergias, medicación, vitales */
export async function addClinicalBasics(
  prisma: PrismaClient,
  params: { pacienteId: number; createdByUserId: number; consultaId?: number | null },
) {
  await prisma.clinicalHistoryEntry.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      title: "Antecedentes",
      notes: "Antecedentes odontológicos registrados automáticamente para demo.",
      createdByUserId: params.createdByUserId,
    },
  })

  // Diagnóstico activo desde catálogo
  const dx = await prisma.diagnosisCatalog.findFirst()
  if (dx) {
    await prisma.patientDiagnosis.create({
      data: {
        pacienteId: params.pacienteId,
        diagnosisId: dx.idDiagnosisCatalog,
        label: dx.name,
        status: DiagnosisStatus.ACTIVE,
        notes: "Diagnóstico demo",
        createdByUserId: params.createdByUserId,
        consultaId: params.consultaId ?? null,
      },
    })
  }

  // Alergia activa
  const alg = await prisma.allergyCatalog.findFirst()
  if (alg) {
    await prisma.patientAllergy.create({
      data: {
        pacienteId: params.pacienteId,
        allergyId: alg.idAllergyCatalog,
        label: alg.name,
        severity: AllergySeverity.MODERATE,
        reaction: "Rash leve",
        createdByUserId: params.createdByUserId,
      },
    })
  }

  // Medicación en curso
  const med = await prisma.medicationCatalog.findFirst()
  if (med) {
    await prisma.patientMedication.create({
      data: {
        pacienteId: params.pacienteId,
        medicationId: med.idMedicationCatalog,
        label: med.name,
        dose: "1 comp",
        freq: "c/8h",
        route: "VO",
        startAt: new Date(),
        isActive: true,
        createdByUserId: params.createdByUserId,
      },
    })
  }

  // Vitals “de sillón”
  await prisma.patientVitals.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      heightCm: 170,
      weightKg: 72,
      bmi: 24.9,
      bpSyst: 120,
      bpDiast: 78,
      heartRate: 72,
      notes: "Signos vitales dentro de parámetros.",
      createdByUserId: params.createdByUserId,
    },
  })
}

/** Odontograma/Periodontograma simples enlazados a una consulta */
export async function addOdontoAndPerio(
  prisma: PrismaClient,
  params: { pacienteId: number; createdByUserId: number; consultaId?: number | null },
) {
  const od = await prisma.odontogramSnapshot.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      notes: "Odontograma de referencia demo",
      createdByUserId: params.createdByUserId,
    },
  })

  await prisma.odontogramEntry.createMany({
    data: [
      { snapshotId: od.idOdontogramSnapshot, toothNumber: 16, surface: "O", condition: "CARIES" },
      { snapshotId: od.idOdontogramSnapshot, toothNumber: 26, surface: "O", condition: "FILLED" },
    ],
  })

  const perio = await prisma.periodontogramSnapshot.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      notes: "Periodontograma demo",
      createdByUserId: params.createdByUserId,
    },
  })

  await prisma.periodontogramMeasure.createMany({
    data: [
      { snapshotId: perio.idPeriodontogramSnapshot, toothNumber: 16, site: "MB", probingDepthMm: 3, bleeding: "NONE" },
      { snapshotId: perio.idPeriodontogramSnapshot, toothNumber: 16, site: "B", probingDepthMm: 2, bleeding: "NONE" },
    ],
  })
}

export async function generarConsentimientosPaciente(
  prisma: PrismaClient,
  params: {
    pacienteId: number
    personaId: number
    responsableId: number
    registradoPorUserId: number
    citaId?: number | null
  },
) {
  const tipos = ["CONSENTIMIENTO_MENOR_ATENCION", "DATOS_PERSONALES", "RADIOGRAFIA"] as any[]

  for (const tipo of tipos) {
    const firmadoEn = new Date()
    firmadoEn.setMonth(firmadoEn.getMonth() - faker.number.int({ min: 1, max: 12 }))

    const vigenteHasta = new Date(firmadoEn)
    vigenteHasta.setFullYear(vigenteHasta.getFullYear() + 2)

    await prisma.consentimiento.create({
      data: {
        Paciente_idPaciente: params.pacienteId,
        Persona_idPersona_responsable: params.responsableId,
        Cita_idCita: params.citaId ?? null,
        Usuario_idUsuario_registradoPor: params.registradoPorUserId,
        tipo,
        firmado_en: firmadoEn,
        vigente_hasta: vigenteHasta,
        public_id: `consent/${params.pacienteId}_${tipo}_${Date.now()}`,
        secure_url: `https://example.com/consent_${params.pacienteId}_${tipo}.pdf`,
        format: "pdf",
        bytes: faker.number.int({ min: 50000, max: 500000 }),
        observaciones: "Consentimiento generado automáticamente para seed",
        activo: true,
      },
    })
  }
}
