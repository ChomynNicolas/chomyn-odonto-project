import {
  type PrismaClient,
  ConsultaEstado,
  type DienteSuperficie,
  TreatmentStepStatus,
  DiagnosisStatus,
  AllergySeverity,
  AdjuntoTipo,
  AccessMode,
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
    startedAt?: Date | null
    finishedAt?: Date | null
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
      startedAt: params.startedAt ?? null,
      finishedAt: params.finishedAt ?? null,
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
    diagnosisId?: number | null
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

  const procedimiento = await prisma.consultaProcedimiento.create({
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
      diagnosisId: params.diagnosisId ?? null,
      resultNotes: params.resultNotes ?? faker.helpers.arrayElement([
        "Procedimiento completado satisfactoriamente",
        "Sin complicaciones",
        "Paciente toleró bien el tratamiento",
        "Se indica control en 7 días",
      ]),
    },
  })

  // If linked to a treatment step, update the step status
  if (params.treatmentStepId) {
    await prisma.treatmentStep.update({
      where: { idTreatmentStep: params.treatmentStepId },
      data: {
        status: TreatmentStepStatus.COMPLETED,
        completedAt: new Date(),
      },
    })
  }

  return procedimiento
}

function deriveStorageFromUrl(url: string, originalName?: string, mimeType?: string) {
  const u = new URL(url)
  const file = originalName ?? u.pathname.split("/").pop() ?? "file.bin"
  const dot = file.lastIndexOf(".")
  const nameNoExt = dot > -1 ? file.slice(0, dot) : file
  const ext = dot > -1 ? file.slice(dot + 1) : "bin"
  
  // Determine resource type from mime type or extension
  let resourceType = "image"
  if (mimeType) {
    if (mimeType.startsWith("video/")) resourceType = "video"
    else if (mimeType.startsWith("application/pdf")) resourceType = "raw"
    else if (mimeType.startsWith("application/") || mimeType.startsWith("text/")) resourceType = "raw"
  }

  // Determine dimensions for images
  const width = resourceType === "image" ? faker.number.int({ min: 800, max: 4000 }) : null
  const height = resourceType === "image" ? faker.number.int({ min: 600, max: 3000 }) : null

  return {
    publicId: `seed/${nameNoExt}-${Math.random().toString(36).slice(2, 8)}`,
    folder: "seed",
    resourceType,
    format: ext,
    secureUrl: url,
    width,
    height,
  }
}

/**
 * Creates an attachment (Adjunto) linked to a consulta, paciente, and optionally a procedimiento.
 * This function properly handles Cloudinary-like storage metadata and ensures all required fields
 * are populated according to the Prisma schema.
 */
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
    pacienteId?: number | null
    descripcion?: string | null
    metadata?: any
  },
) {
  // Derive storage metadata from URL and filename
  const st = deriveStorageFromUrl(params.url, params.originalName, params.mimeType)
  
  // Ensure publicId is unique by adding timestamp
  const uniquePublicId = `${st.publicId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  
  return prisma.adjunto.create({
    data: {
      consultaId: params.consultaCitaId,
      pacienteId: params.pacienteId ?? null,
      procedimientoId: params.procedimientoId ?? null,
      tipo: params.tipo,
      descripcion: params.descripcion ?? params.originalName,
      publicId: uniquePublicId,
      folder: st.folder,
      resourceType: st.resourceType as any,
      format: st.format,
      secureUrl: st.secureUrl,
      bytes: params.size,
      width: st.width,
      height: st.height,
      originalFilename: params.originalName,
      uploadedByUserId: params.uploadedByUserId,
      accessMode: AccessMode.AUTHENTICATED,
      isActive: true,
    },
  })
}

/**
 * Creates comprehensive attachments (Adjuntos) for a consulta with realistic variety.
 * Generates X-rays, intraoral photos, and documents with appropriate probabilities.
 * All attachments are properly linked to the consulta, paciente, and optionally procedimientos.
 */
export async function addComprehensiveAdjuntos(
  prisma: PrismaClient,
  params: {
    consultaCitaId: number
    pacienteId: number
    uploadedByUserId: number
    procedimientoIds?: number[]
  }
) {
  const adjuntos = []

  // Add X-ray with probability (60% chance)
  if (faker.datatype.boolean({ probability: 0.6 })) {
    try {
      const xray = await addAdjuntoConsulta(prisma, {
        consultaCitaId: params.consultaCitaId,
        pacienteId: params.pacienteId,
        uploadedByUserId: params.uploadedByUserId,
        url: `https://example.com/xray_${params.consultaCitaId}_${Date.now()}.jpg`,
        originalName: `xray_${params.consultaCitaId}.jpg`,
        mimeType: "image/jpeg",
        size: faker.number.int({ min: 200_000, max: 2_000_000 }),
        tipo: AdjuntoTipo.XRAY,
        procedimientoId: faker.helpers.maybe(() => faker.helpers.arrayElement(params.procedimientoIds ?? []), { probability: 0.5 }),
        descripcion: faker.helpers.arrayElement([
          "Radiografía periapical",
          "Radiografía panorámica",
          "Radiografía bitewing",
        ]),
      })
      adjuntos.push(xray)
    } catch (error: any) {
      // Log but don't throw - continue with other attachments
      console.error(`Error creating X-ray attachment: ${error.message}`)
    }
  }

  // Add intraoral photo with probability (50% chance)
  if (faker.datatype.boolean({ probability: 0.5 })) {
    try {
      const photo = await addAdjuntoConsulta(prisma, {
        consultaCitaId: params.consultaCitaId,
        pacienteId: params.pacienteId,
        uploadedByUserId: params.uploadedByUserId,
        url: `https://example.com/intraoral_${params.consultaCitaId}_${Date.now()}.jpg`,
        originalName: `intraoral_${params.consultaCitaId}.jpg`,
        mimeType: "image/jpeg",
        size: faker.number.int({ min: 150_000, max: 1_500_000 }),
        tipo: AdjuntoTipo.INTRAORAL_PHOTO,
        descripcion: faker.helpers.arrayElement([
          "Foto intraoral anterior",
          "Foto intraoral posterior",
          "Foto de detalle",
        ]),
      })
      adjuntos.push(photo)
    } catch (error: any) {
      console.error(`Error creating intraoral photo: ${error.message}`)
    }
  }

  // Add document/PDF with lower probability (20% chance)
  if (faker.datatype.boolean({ probability: 0.2 })) {
    try {
      const doc = await addAdjuntoConsulta(prisma, {
        consultaCitaId: params.consultaCitaId,
        pacienteId: params.pacienteId,
        uploadedByUserId: params.uploadedByUserId,
        url: `https://example.com/doc_${params.consultaCitaId}_${Date.now()}.pdf`,
        originalName: `documento_${params.consultaCitaId}.pdf`,
        mimeType: "application/pdf",
        size: faker.number.int({ min: 50_000, max: 500_000 }),
        tipo: AdjuntoTipo.DOCUMENT,
        descripcion: "Documento adjunto",
      })
      adjuntos.push(doc)
    } catch (error: any) {
      console.error(`Error creating document attachment: ${error.message}`)
    }
  }

  return adjuntos
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
      title: faker.helpers.arrayElement([
        "Antecedentes",
        "Historia clínica inicial",
        "Notas de consulta",
        "Evolución",
      ]),
      notes: faker.helpers.arrayElement([
        "Antecedentes odontológicos registrados automáticamente para demo.",
        "Paciente refiere buena salud general.",
        "Sin antecedentes relevantes.",
        "Historia clínica completa registrada.",
      ]),
      createdByUserId: params.createdByUserId,
    },
  })

  // Diagnóstico activo desde catálogo (con probabilidad)
  if (faker.datatype.boolean({ probability: 0.7 })) {
    const diagnoses = await prisma.diagnosisCatalog.findMany({ where: { isActive: true }, take: 3 })
    if (diagnoses.length > 0) {
      const dx = faker.helpers.arrayElement(diagnoses)
      await prisma.patientDiagnosis.create({
        data: {
          pacienteId: params.pacienteId,
          diagnosisId: dx.idDiagnosisCatalog,
          label: dx.name,
          status: DiagnosisStatus.ACTIVE,
          notes: faker.helpers.arrayElement([
            "Diagnóstico establecido en consulta",
            "Hallazgo clínico",
            "Diagnóstico confirmado",
          ]),
          createdByUserId: params.createdByUserId,
          consultaId: params.consultaId ?? null,
        },
      })
    }
  }

  // Alergia activa (con probabilidad)
  if (faker.datatype.boolean({ probability: 0.3 })) {
    const allergies = await prisma.allergyCatalog.findMany({ where: { isActive: true }, take: 2 })
    if (allergies.length > 0) {
      const alg = faker.helpers.arrayElement(allergies)
      await prisma.patientAllergy.create({
        data: {
          pacienteId: params.pacienteId,
          allergyId: alg.idAllergyCatalog,
          label: alg.name,
          severity: faker.helpers.arrayElement([
            AllergySeverity.MILD,
            AllergySeverity.MODERATE,
            AllergySeverity.SEVERE,
          ]),
          reaction: faker.helpers.arrayElement([
            "Rash leve",
            "Reacción cutánea",
            "Reacción respiratoria",
            "Anafilaxis",
          ]),
          createdByUserId: params.createdByUserId,
        },
      })
    }
  }

  // Medicación en curso (con probabilidad)
  if (faker.datatype.boolean({ probability: 0.4 })) {
    const medications = await prisma.medicationCatalog.findMany({ where: { isActive: true }, take: 2 })
    if (medications.length > 0) {
      const med = faker.helpers.arrayElement(medications)
      await prisma.patientMedication.create({
        data: {
          pacienteId: params.pacienteId,
          medicationId: med.idMedicationCatalog,
          label: med.name,
          dose: faker.helpers.arrayElement(["1 comp", "500mg", "1 tableta", "2 comp"]),
          freq: faker.helpers.arrayElement(["c/8h", "c/12h", "1x día", "2x día"]),
          route: faker.helpers.arrayElement(["VO", "IM", "IV"]),
          startAt: faker.date.past({ years: 1 }),
          endAt: faker.helpers.maybe(() => faker.date.future({ years: 1 }), { probability: 0.5 }),
          isActive: true,
          createdByUserId: params.createdByUserId,
        },
      })
    }
  }

  // Vitals "de sillón" con variación
  await prisma.patientVitals.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      heightCm: faker.number.int({ min: 150, max: 190 }),
      weightKg: faker.number.int({ min: 50, max: 100 }),
      bmi: faker.number.float({ min: 18, max: 30, fractionDigits: 1 }),
      bpSyst: faker.number.int({ min: 100, max: 140 }),
      bpDiast: faker.number.int({ min: 60, max: 90 }),
      heartRate: faker.number.int({ min: 60, max: 100 }),
      notes: faker.helpers.arrayElement([
        "Signos vitales dentro de parámetros.",
        "Presión arterial normal.",
        "Frecuencia cardíaca regular.",
        "Sin alteraciones.",
      ]),
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
      notes: faker.helpers.arrayElement([
        "Odontograma de referencia",
        "Estado dental actual",
        "Evaluación odontológica",
      ]),
      createdByUserId: params.createdByUserId,
    },
  })

  // Create more comprehensive odontogram entries
  const teethToRecord = faker.helpers.arrayElements(
    [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48],
    { min: 3, max: 8 }
  )

  const conditions = ["INTACT", "CARIES", "FILLED", "ROOT_CANAL", "CROWN", "MISSING", "FRACTURED"] as const
  const surfaces = ["O", "M", "D", "V", "L", "MO", "DO", "MOD"] as const

  const entries = teethToRecord.flatMap((tooth) => {
    const condition = faker.helpers.arrayElement(conditions)
    const hasSurface = faker.datatype.boolean({ probability: 0.6 })
    if (hasSurface) {
      return [
        {
          snapshotId: od.idOdontogramSnapshot,
          toothNumber: tooth,
          surface: faker.helpers.arrayElement(surfaces),
          condition,
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        },
      ]
    }
    return [
      {
        snapshotId: od.idOdontogramSnapshot,
        toothNumber: tooth,
        surface: null,
        condition,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      },
    ]
  })

  await prisma.odontogramEntry.createMany({
    data: entries,
    skipDuplicates: true,
  })

  const perio = await prisma.periodontogramSnapshot.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      notes: faker.helpers.arrayElement([
        "Periodontograma de referencia",
        "Evaluación periodontal",
        "Estado de encías",
      ]),
      createdByUserId: params.createdByUserId,
    },
  })

  // Create more comprehensive periodontogram measures
  const teethForPerio = faker.helpers.arrayElements(teethToRecord, { min: 2, max: 6 })
  const sites = ["DB", "B", "MB", "DL", "L", "ML"] as const

  const measures = teethForPerio.flatMap((tooth) =>
    sites.map((site) => ({
      snapshotId: perio.idPeriodontogramSnapshot,
      toothNumber: tooth,
      site,
      probingDepthMm: faker.number.int({ min: 1, max: 6 }),
      bleeding: faker.helpers.arrayElement(["NONE", "YES"] as const),
      plaque: faker.datatype.boolean({ probability: 0.3 }),
      mobility: faker.helpers.maybe(() => faker.number.int({ min: 0, max: 3 }), { probability: 0.2 }),
      furcation: faker.helpers.maybe(() => faker.number.int({ min: 0, max: 3 }), { probability: 0.1 }),
    }))
  )

  await prisma.periodontogramMeasure.createMany({
    data: measures,
    skipDuplicates: true,
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
