// src/app/api/agenda/citas/[id]/consulta/_service.ts
import { prisma } from "@/lib/prisma"
import { ConsultaEstado, DiagnosisStatus } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import type {
  ConsultaClinicaDTO,
  ConsultaAdminDTO,
} from "./_dto"
import { sanitizeProcedimientoForRole } from "./_utils"

const userMiniSelect = {
  idUsuario: true,
  usuario: true,
  nombreApellido: true,
  profesional: {
    select: {
      persona: {
        select: {
          nombres: true,
          apellidos: true,
        },
      },
    },
  },
} as const

type UserMini = Prisma.UsuarioGetPayload<{ select: typeof userMiniSelect }>

function displayUser(user: UserMini | null | undefined): string {
  if (!user) return "Usuario"
  const p = user.profesional?.persona
  if (p?.nombres || p?.apellidos) {
    return `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim() || (user.nombreApellido ?? user.usuario ?? "Usuario")
  }
  return (user.nombreApellido?.trim() || user.usuario || "Usuario")
}

/**
 * Obtiene la consulta completa con todos sus módulos (solo ODONT/ADMIN)
 * @param citaId - ID de la cita
 * @param userRole - Rol del usuario para filtrar datos sensibles (precios para ODONT)
 */
export async function getConsultaClinica(
  citaId: number,
  userRole?: "ADMIN" | "ODONT" | "RECEP"
): Promise<ConsultaClinicaDTO | null> {
  const consulta = await prisma.consulta.findUnique({
    where: { citaId },
    include: {
      cita: {
        include: {
          paciente: {
            include: {
              persona: {
                include: {
                  contactos: {
                    where: { activo: true },
                    select: {
                      tipo: true,
                      valorNorm: true,
                      esPrincipal: true,
                    },
                  },
                },
              },
            },
          },
          profesional: {
            include: {
              persona: true,
            },
          },
        },
      },
      performedBy: {
        include: {
          persona: true,
        },
      },
      createdBy: {
        select: userMiniSelect,
      },
      ClinicalHistoryEntry: {
        include: {
          createdBy: {
            select: userMiniSelect,
          },
        },
        orderBy: { fecha: "desc" },
      },
      PatientDiagnosis: {
        include: {
          createdBy: {
            select: userMiniSelect,
          },
          encounterDiagnoses: {
            where: { consultaId: citaId },
            select: {
              encounterNotes: true,
              wasEvaluated: true,
              wasManaged: true,
            },
          },
          consultaProcedimientos: {
            where: { consultaId: citaId },
            select: {
              idConsultaProcedimiento: true,
            },
          },
        },
        orderBy: { notedAt: "desc" },
      },
      procedimientos: {
        include: {
          diagnosis: {
            select: {
              idPatientDiagnosis: true,
              label: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      adjuntos: {
        where: { isActive: true },
        include: {
          uploadedBy: {
            select: userMiniSelect,
          },
        },
        orderBy: { createdAt: "desc" },
      },
      OdontogramSnapshot: {
        include: {
          createdBy: {
            select: userMiniSelect,
          },
          entries: {
            orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
          },
        },
        orderBy: { takenAt: "desc" },
        take: 1,
      },
      PeriodontogramSnapshot: {
        include: {
          createdBy: {
            select: userMiniSelect,
          },
          measures: {
            orderBy: [{ toothNumber: "asc" }, { site: "asc" }],
          },
        },
        orderBy: { takenAt: "desc" },
        take: 1,
      },
      PatientVitals: {
        include: {
          createdBy: {
            select: userMiniSelect,
          },
        },
        orderBy: { measuredAt: "desc" },
      },
    },
  })

  if (!consulta) return null

  // Obtener medicaciones del paciente activas (mostrar todas las activas)
  const medicaciones = await prisma.patientMedication.findMany({
    where: {
      pacienteId: consulta.cita.pacienteId,
      isActive: true,
    },
    include: {
      createdBy: {
        select: userMiniSelect,
      },
      updatedBy: {
        select: userMiniSelect,
      },
      discontinuedBy: {
        select: userMiniSelect,
      },
      medicationCatalog: {
        select: {
          name: true,
          description: true,
        },
      },
    },
    orderBy: { startAt: "desc" },
  })

  // Obtener vitales de la consulta, o si no hay, obtener el último del paciente
  type VitalWithUser = Prisma.PatientVitalsGetPayload<{
    include: {
      createdBy: { select: typeof userMiniSelect }
    }
  }>
  
  let vitales: VitalWithUser[] = consulta.PatientVitals
  if (!vitales || vitales.length === 0) {
    // Si no hay vitales en la consulta, obtener el último registro del paciente
    const pacienteVitals = await prisma.patientVitals.findFirst({
      where: {
        pacienteId: consulta.cita.pacienteId,
      },
      include: {
        createdBy: {
          select: userMiniSelect,
        },
      },
      orderBy: { measuredAt: "desc" },
    })
    if (pacienteVitals) {
      vitales = [pacienteVitals]
    } else {
      vitales = []
    }
  }

  // Obtener alergias activas del paciente
  const alergias = await prisma.patientAllergy.findMany({
    where: {
      pacienteId: consulta.cita.pacienteId,
      isActive: true,
    },
    include: {
      allergyCatalog: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { notedAt: "desc" },
  })

  // Obtener plan de tratamiento: primero intentar plan activo, luego el más reciente completado/cancelado
  let planTratamiento = await prisma.treatmentPlan.findFirst({
    where: {
      pacienteId: consulta.cita.pacienteId,
      status: "ACTIVE",
    },
    include: {
      creadoPor: {
        select: userMiniSelect,
      },
      steps: {
        include: {
          procedimientoCatalogo: {
            select: {
              idProcedimiento: true,
              code: true,
              nombre: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  })

  // Si no hay plan activo, obtener el más reciente plan completado o cancelado (para contexto)
  if (!planTratamiento) {
    planTratamiento = await prisma.treatmentPlan.findFirst({
      where: {
        pacienteId: consulta.cita.pacienteId,
        status: { in: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        creadoPor: {
          select: userMiniSelect,
        },
        steps: {
          include: {
            procedimientoCatalogo: {
              select: {
                idProcedimiento: true,
                code: true,
                nombre: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
  }

  // Calcular edad del paciente
  const calcularEdad = (fechaNacimiento: Date | null): number | null => {
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

  // Obtener teléfono principal del paciente
  const telefonoPrincipal = consulta.cita.paciente.persona.contactos?.find(
    (c) => c.tipo === "PHONE" && c.esPrincipal
  )?.valorNorm || null

  // Fetch active diagnoses from previous encounters
  const diagnosticosPreviousEncounters = await prisma.patientDiagnosis.findMany({
    where: {
      pacienteId: consulta.cita.pacienteId,
      status: {
        in: [DiagnosisStatus.ACTIVE, DiagnosisStatus.UNDER_FOLLOW_UP],
      },
      // Exclude diagnoses already in current encounter
      NOT: {
        consultaId: citaId,
      },
    },
    include: {
      createdBy: {
        select: userMiniSelect,
      },
      encounterDiagnoses: {
        where: { consultaId: citaId },
        select: {
          encounterNotes: true,
          wasEvaluated: true,
          wasManaged: true,
        },
      },
      consultaProcedimientos: {
        where: { consultaId: citaId },
        select: {
          idConsultaProcedimiento: true,
        },
      },
    },
    orderBy: { notedAt: "desc" },
  })

  // Helper function to format diagnosis
  const formatDiagnosis = (
    d: typeof consulta.PatientDiagnosis[0] | typeof diagnosticosPreviousEncounters[0],
    source: 'current_encounter' | 'previous_encounter'
  ) => {
    const encounterDiagnosis = d.encounterDiagnoses[0]
    return {
      id: d.idPatientDiagnosis,
      diagnosisId: d.diagnosisId,
      code: d.code,
      label: d.label,
      status: d.status,
      notedAt: d.notedAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      notes: d.notes,
      createdBy: {
        id: d.createdBy.idUsuario,
        nombre: displayUser(d.createdBy),
      },
      source,
      encounterNotes: encounterDiagnosis?.encounterNotes ?? null,
      wasEvaluated: encounterDiagnosis?.wasEvaluated ?? false,
      wasManaged: encounterDiagnosis?.wasManaged ?? false,
      linkedProceduresCount: d.consultaProcedimientos.length,
    }
  }

  // Map current encounter diagnoses
  const currentDiagnoses = consulta.PatientDiagnosis.map((d) =>
    formatDiagnosis(d, 'current_encounter')
  )

  // Map previous encounter diagnoses
  const previousDiagnoses = diagnosticosPreviousEncounters.map((d) =>
    formatDiagnosis(d, 'previous_encounter')
  )

  // Merge diagnoses (current first, then previous)
  const allDiagnoses = [...currentDiagnoses, ...previousDiagnoses]

  const dto: ConsultaClinicaDTO = {
    citaId: consulta.citaId,
    pacienteId: consulta.cita.pacienteId,
    status: consulta.status,
    startedAt: consulta.startedAt?.toISOString() ?? null,
    finishedAt: consulta.finishedAt?.toISOString() ?? null,
    // ⚠️ DEPRECATED: reason field - use PatientAnamnesis.motivoConsulta instead
    reason: null, // Always return null - motivoConsulta is now in PatientAnamnesis
    diagnosis: consulta.diagnosis,
    clinicalNotes: consulta.clinicalNotes,
    performedBy: {
      id: consulta.performedById,
      nombre: `${consulta.performedBy.persona.nombres} ${consulta.performedBy.persona.apellidos}`.trim(),
    },
    createdAt: consulta.createdAt.toISOString(),
    updatedAt: consulta.updatedAt.toISOString(),
    
    // Estado de la cita para sincronización
    citaEstado: consulta.cita.estado,
    citaInicio: consulta.cita.inicio.toISOString(),
    citaFin: consulta.cita.fin.toISOString(),

    // Información del paciente
    paciente: {
      id: consulta.cita.pacienteId,
      nombres: consulta.cita.paciente.persona.nombres,
      apellidos: consulta.cita.paciente.persona.apellidos,
      fechaNacimiento: consulta.cita.paciente.persona.fechaNacimiento?.toISOString() ?? null,
      genero: consulta.cita.paciente.persona.genero,
      direccion: consulta.cita.paciente.persona.direccion,
      telefono: telefonoPrincipal,
      edad: calcularEdad(consulta.cita.paciente.persona.fechaNacimiento),
    },

    anamnesis: consulta.ClinicalHistoryEntry.map((e) => ({
      id: e.idClinicalHistoryEntry,
      title: e.title,
      notes: e.notes,
      fecha: e.fecha.toISOString(),
      createdBy: {
        id: e.createdBy.idUsuario,
        nombre: displayUser(e.createdBy),
      },
      createdAt: e.createdAt.toISOString(),
    })),

    diagnosticos: allDiagnoses,

    procedimientos: consulta.procedimientos.map((p) => {
      const procDto = {
        id: p.idConsultaProcedimiento,
        procedureId: p.procedureId,
        serviceType: p.serviceType,
        toothNumber: p.toothNumber,
        toothSurface: p.toothSurface,
        quantity: p.quantity,
        unitPriceCents: p.unitPriceCents,
        totalCents: p.totalCents,
        resultNotes: p.resultNotes,
        treatmentStepId: p.treatmentStepId,
        diagnosisId: p.diagnosisId ?? null,
        diagnosis: p.diagnosis
          ? {
              id: p.diagnosis.idPatientDiagnosis,
              label: p.diagnosis.label,
              status: p.diagnosis.status,
            }
          : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }
      // Apply role-based price filtering
      return sanitizeProcedimientoForRole(procDto, userRole ?? "ADMIN")
    }),

    medicaciones: medicaciones.map((m) => ({
      id: m.idPatientMedication,
      medicationId: m.medicationId,
      // Usar label si existe, si no, usar nombre del catálogo, o "Medicación desconocida"
      label: m.label ?? m.medicationCatalog?.name ?? "Medicación desconocida",
      description: m.description,
      dose: m.dose,
      freq: m.freq,
      route: m.route,
      startAt: m.startAt?.toISOString() ?? null,
      endAt: m.endAt?.toISOString() ?? null,
      isActive: m.isActive,
      updatedAt: m.updatedAt?.toISOString() ?? null,
      discontinuedAt: m.discontinuedAt?.toISOString() ?? null,
      consultaId: m.consultaId,
      createdBy: {
        id: m.createdBy.idUsuario,
        nombre: displayUser(m.createdBy),
      },
      updatedBy: m.updatedBy
        ? {
            id: m.updatedBy.idUsuario,
            nombre: displayUser(m.updatedBy),
          }
        : null,
      discontinuedBy: m.discontinuedBy
        ? {
            id: m.discontinuedBy.idUsuario,
            nombre: displayUser(m.discontinuedBy),
          }
        : null,
    })),

    adjuntos: consulta.adjuntos.map((a) => ({
      id: a.idAdjunto,
      tipo: a.tipo,
      descripcion: a.descripcion,
      secureUrl: a.secureUrl,
      publicId: a.publicId,
      format: a.format,
      bytes: a.bytes,
      width: a.width,
      height: a.height,
      originalFilename: a.originalFilename,
      uploadedBy: {
        id: a.uploadedBy.idUsuario,
        nombre: displayUser(a.uploadedBy),
      },
      createdAt: a.createdAt.toISOString(),
    })),

    odontograma: consulta.OdontogramSnapshot[0]
      ? {
          id: consulta.OdontogramSnapshot[0].idOdontogramSnapshot,
          takenAt: consulta.OdontogramSnapshot[0].takenAt.toISOString(),
          notes: consulta.OdontogramSnapshot[0].notes,
          createdBy: {
            id: consulta.OdontogramSnapshot[0].createdBy.idUsuario,
            nombre: displayUser(consulta.OdontogramSnapshot[0].createdBy),
          },
          entries: consulta.OdontogramSnapshot[0].entries.map((e) => ({
            id: e.idOdontogramEntry,
            toothNumber: e.toothNumber,
            surface: e.surface,
            condition: e.condition,
            notes: e.notes,
          })),
        }
      : null,

    periodontograma: consulta.PeriodontogramSnapshot[0]
      ? {
          id: consulta.PeriodontogramSnapshot[0].idPeriodontogramSnapshot,
          takenAt: consulta.PeriodontogramSnapshot[0].takenAt.toISOString(),
          notes: consulta.PeriodontogramSnapshot[0].notes,
          createdBy: {
            id: consulta.PeriodontogramSnapshot[0].createdBy.idUsuario,
            nombre: displayUser(consulta.PeriodontogramSnapshot[0].createdBy),
          },
          measures: consulta.PeriodontogramSnapshot[0].measures.map((m) => ({
            id: m.idPeriodontogramMeasure,
            toothNumber: m.toothNumber,
            site: m.site,
            probingDepthMm: m.probingDepthMm,
            bleeding: m.bleeding,
            plaque: m.plaque,
            mobility: m.mobility,
            furcation: m.furcation,
          })),
        }
      : null,

    vitales: vitales.map((v) => ({
      id: v.idPatientVitals,
      measuredAt: v.measuredAt.toISOString(),
      heightCm: v.heightCm,
      weightKg: v.weightKg,
      bmi: v.bmi,
      bpSyst: v.bpSyst,
      bpDiast: v.bpDiast,
      heartRate: v.heartRate,
      notes: v.notes,
      createdBy: {
        id: v.createdBy.idUsuario,
        nombre: displayUser(v.createdBy),
      },
    })),

    alergias: alergias.map((a) => ({
      id: a.idPatientAllergy,
      label: a.label ?? a.allergyCatalog?.name ?? "Alergia desconocida",
      severity: a.severity,
      reaction: a.reaction,
      notedAt: a.notedAt.toISOString(),
      isActive: a.isActive,
    })),

    planTratamiento: planTratamiento
      ? {
          id: planTratamiento.idTreatmentPlan,
          titulo: planTratamiento.titulo,
          descripcion: planTratamiento.descripcion,
          status: planTratamiento.status,
          createdAt: planTratamiento.createdAt.toISOString(),
          updatedAt: planTratamiento.updatedAt.toISOString(),
          createdBy: {
            id: planTratamiento.creadoPor.idUsuario,
            nombre: displayUser(planTratamiento.creadoPor),
          },
          steps: planTratamiento.steps.map((step) => ({
            id: step.idTreatmentStep,
            order: step.order,
            procedureId: step.procedureId,
            procedimientoCatalogo: step.procedimientoCatalogo
              ? {
                  id: step.procedimientoCatalogo.idProcedimiento,
                  code: step.procedimientoCatalogo.code,
                  nombre: step.procedimientoCatalogo.nombre,
                }
              : null,
            serviceType: step.serviceType,
            toothNumber: step.toothNumber,
            toothSurface: step.toothSurface,
            estimatedDurationMin: step.estimatedDurationMin,
            estimatedCostCents: step.estimatedCostCents,
            priority: step.priority,
            status: step.status,
            notes: step.notes,
            createdAt: step.createdAt.toISOString(),
            updatedAt: step.updatedAt.toISOString(),
          })),
        }
      : null,
  }

  return dto
}

/**
 * Obtiene solo datos administrativos mínimos (para RECEP)
 */
export async function getConsultaAdmin(citaId: number): Promise<ConsultaAdminDTO | null> {
  const consulta = await prisma.consulta.findUnique({
    where: { citaId },
    include: {
      cita: {
        include: {
          profesional: {
            include: {
              persona: true,
            },
          },
        },
      },
    },
  })

  if (!consulta) return null

  return {
    citaId: consulta.citaId,
    fecha: consulta.cita.inicio.toISOString(),
    profesional: {
      id: consulta.cita.profesionalId,
      nombre: `${consulta.cita.profesional.persona.nombres} ${consulta.cita.profesional.persona.apellidos}`.trim(),
    },
    motivo: null, // consulta.reason no longer exists; use PatientAnamnesis.motivoConsulta instead
    estado: consulta.status,
    createdAt: consulta.createdAt.toISOString(),
  }
}

/**
 * Crea o actualiza una consulta (crea si no existe)
 */
export async function ensureConsulta(citaId: number, performedById: number, createdByUserId: number) {
  return await prisma.consulta.upsert({
    where: { citaId },
    create: {
      citaId,
      performedById,
      createdByUserId,
      status: ConsultaEstado.DRAFT,
    },
    update: {},
  })
}

/**
 * Actualiza el resumen de la consulta (diagnosis, clinicalNotes)
 * ⚠️ DEPRECATED: reason field removed. Use PatientAnamnesis.motivoConsulta instead
 */
export async function updateConsultaResumen(
  citaId: number,
  data: {
    diagnosis?: string | null
    clinicalNotes?: string | null
  }
) {
  // Construir objeto de actualización solo con campos presentes
  const updateData: {
    diagnosis?: string | null
    clinicalNotes?: string | null
  } = {}

  if (data.diagnosis !== undefined) {
    updateData.diagnosis = data.diagnosis
  }
  if (data.clinicalNotes !== undefined) {
    updateData.clinicalNotes = data.clinicalNotes
  }

  return await prisma.consulta.update({
    where: { citaId },
    data: updateData,
  })
}

