// src/app/api/agenda/citas/[id]/consulta/_service.ts
import { prisma } from "@/lib/prisma"
import { ConsultaEstado } from "@prisma/client"
import type {
  ConsultaClinicaDTO,
  AnamnesisDTO,
  DiagnosticoDTO,
  ProcedimientoDTO,
  MedicacionDTO,
  AdjuntoDTO,
  OdontogramaDTO,
  PeriodontogramaDTO,
  ConsultaAdminDTO,
} from "./_dto"
import type { CreateAnamnesisInput, CreateDiagnosisInput, CreateProcedureInput, CreateMedicationInput, CreateOdontogramInput, CreatePeriodontogramInput } from "./_schemas"

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

function displayUser(user: any): string {
  if (!user) return "Usuario"
  const p = user.profesional?.persona
  if (p?.nombres || p?.apellidos) {
    return `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim() || (user.nombreApellido ?? user.usuario ?? "Usuario")
  }
  return (user.nombreApellido?.trim() || user.usuario || "Usuario")
}

/**
 * Obtiene la consulta completa con todos sus módulos (solo ODONT/ADMIN)
 */
export async function getConsultaClinica(citaId: number): Promise<ConsultaClinicaDTO | null> {
  const consulta = await prisma.consulta.findUnique({
    where: { citaId },
    include: {
      cita: {
        include: {
          paciente: {
            include: {
              persona: true,
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
        },
        orderBy: { notedAt: "desc" },
      },
      procedimientos: {
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
    },
  })

  if (!consulta) return null

  // Obtener medicaciones del paciente asociadas a esta consulta
  const medicaciones = await prisma.patientMedication.findMany({
    where: {
      pacienteId: consulta.cita.pacienteId,
      consultaId: citaId,
      isActive: true,
    },
    include: {
      createdBy: {
        select: userMiniSelect,
      },
    },
    orderBy: { startAt: "desc" },
  })

  const dto: ConsultaClinicaDTO = {
    citaId: consulta.citaId,
    status: consulta.status,
    startedAt: consulta.startedAt?.toISOString() ?? null,
    finishedAt: consulta.finishedAt?.toISOString() ?? null,
    reason: consulta.reason,
    diagnosis: consulta.diagnosis,
    clinicalNotes: consulta.clinicalNotes,
    performedBy: {
      id: consulta.performedById,
      nombre: `${consulta.performedBy.persona.nombres} ${consulta.performedBy.persona.apellidos}`.trim(),
    },
    createdAt: consulta.createdAt.toISOString(),
    updatedAt: consulta.updatedAt.toISOString(),

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

    diagnosticos: consulta.PatientDiagnosis.map((d) => ({
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
    })),

    procedimientos: consulta.procedimientos.map((p) => ({
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
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),

    medicaciones: medicaciones.map((m) => ({
      id: m.idPatientMedication,
      medicationId: m.medicationId,
      label: m.label,
      dose: m.dose,
      freq: m.freq,
      route: m.route,
      startAt: m.startAt?.toISOString() ?? null,
      endAt: m.endAt?.toISOString() ?? null,
      isActive: m.isActive,
      createdBy: {
        id: m.createdBy.idUsuario,
        nombre: displayUser(m.createdBy),
      },
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
    motivo: consulta.reason,
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

