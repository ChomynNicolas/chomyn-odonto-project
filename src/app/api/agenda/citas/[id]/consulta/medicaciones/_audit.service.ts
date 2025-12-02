// src/app/api/agenda/citas/[id]/consulta/medicaciones/_audit.service.ts
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

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

type MedicationWithRelations = Prisma.PatientMedicationGetPayload<{
  include: {
    createdBy: {
      select: typeof userMiniSelect
    }
    updatedBy: {
      select: typeof userMiniSelect
    }
    discontinuedBy: {
      select: typeof userMiniSelect
    }
    medicationCatalog: {
      select: {
        name: true
      }
    }
  }
}>

/**
 * Get medication history for a specific medication
 */
export async function getMedicationHistory(medicationId: number) {
  const medication = await prisma.patientMedication.findUnique({
    where: { idPatientMedication: medicationId },
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
        },
      },
    },
  }) as MedicationWithRelations | null

  if (!medication) {
    return null
  }

  const events: Array<{
    id: number
    action: "CREATED" | "UPDATED" | "DISCONTINUED"
    performedAt: string
    performedBy: { id: number; nombre: string }
    consultaId: number | null
  }> = []

  // Add creation event (using updatedAt as fallback since createdAt doesn't exist in schema)
  // Note: PatientMedication model doesn't have createdAt field, so we use updatedAt or current time
  const creationTime = medication.updatedAt || new Date()
  events.push({
    id: medication.idPatientMedication,
    action: "CREATED",
    performedAt: creationTime.toISOString(),
    performedBy: {
      id: medication.createdBy.idUsuario,
      nombre: displayUser(medication.createdBy),
    },
    consultaId: medication.consultaId,
  })

  // Add update event if exists
  if (medication.updatedAt && medication.updatedBy) {
    events.push({
      id: medication.idPatientMedication,
      action: "UPDATED",
      performedAt: medication.updatedAt.toISOString(),
      performedBy: {
        id: medication.updatedBy.idUsuario,
        nombre: displayUser(medication.updatedBy),
      },
      consultaId: medication.consultaId,
    })
  }

  // Add discontinuation event if exists
  if (medication.discontinuedAt && medication.discontinuedBy) {
    events.push({
      id: medication.idPatientMedication,
      action: "DISCONTINUED",
      performedAt: medication.discontinuedAt.toISOString(),
      performedBy: {
        id: medication.discontinuedBy.idUsuario,
        nombre: displayUser(medication.discontinuedBy),
      },
      consultaId: medication.consultaId,
    })
  }

  // Sort events by date (newest first)
  events.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())

  return {
    medicationId: medication.idPatientMedication,
    medicationLabel: medication.label ?? medication.medicationCatalog?.name ?? "Medicación desconocida",
    patientId: medication.pacienteId,
    events,
    createdAt: (medication.updatedAt || new Date()).toISOString(),
    createdBy: {
      id: medication.createdBy.idUsuario,
      nombre: displayUser(medication.createdBy),
    },
    lastUpdatedAt: medication.updatedAt?.toISOString() ?? null,
    lastUpdatedBy: medication.updatedBy
      ? {
          id: medication.updatedBy.idUsuario,
          nombre: displayUser(medication.updatedBy),
        }
      : null,
    discontinuedAt: medication.discontinuedAt?.toISOString() ?? null,
    discontinuedBy: medication.discontinuedBy
      ? {
          id: medication.discontinuedBy.idUsuario,
          nombre: displayUser(medication.discontinuedBy),
        }
      : null,
  }
}

/**
 * Get medication history for a patient (all medications with audit info)
 */
export async function getPatientMedicationHistory(pacienteId: number) {
  const medications = (await prisma.patientMedication.findMany({
    where: {
      pacienteId,
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
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })) as MedicationWithRelations[]

  return medications.map((med) => {
    const events: Array<{
      id: number
      action: "CREATED" | "UPDATED" | "DISCONTINUED"
      performedAt: string
      performedBy: { id: number; nombre: string }
      consultaId: number | null
    }> = []

    // Add creation event (using updatedAt as fallback since createdAt doesn't exist in schema)
    const creationTime = med.updatedAt || new Date()
    events.push({
      id: med.idPatientMedication,
      action: "CREATED",
      performedAt: creationTime.toISOString(),
      performedBy: {
        id: med.createdBy.idUsuario,
        nombre: displayUser(med.createdBy),
      },
      consultaId: med.consultaId,
    })

    // Add update event if exists
    if (med.updatedAt && med.updatedBy) {
      events.push({
        id: med.idPatientMedication,
        action: "UPDATED",
        performedAt: med.updatedAt.toISOString(),
        performedBy: {
          id: med.updatedBy.idUsuario,
          nombre: displayUser(med.updatedBy),
        },
        consultaId: med.consultaId,
      })
    }

    // Add discontinuation event if exists
    if (med.discontinuedAt && med.discontinuedBy) {
      events.push({
        id: med.idPatientMedication,
        action: "DISCONTINUED",
        performedAt: med.discontinuedAt.toISOString(),
        performedBy: {
          id: med.discontinuedBy.idUsuario,
          nombre: displayUser(med.discontinuedBy),
        },
        consultaId: med.consultaId,
      })
    }

    // Sort events by date (newest first)
    events.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())

    return {
      medicationId: med.idPatientMedication,
      medicationLabel: med.label ?? med.medicationCatalog?.name ?? "Medicación desconocida",
      patientId: med.pacienteId,
      events,
      createdAt: (med.updatedAt || new Date()).toISOString(),
      createdBy: {
        id: med.createdBy.idUsuario,
        nombre: displayUser(med.createdBy),
      },
      lastUpdatedAt: med.updatedAt?.toISOString() ?? null,
      lastUpdatedBy: med.updatedBy
        ? {
            id: med.updatedBy.idUsuario,
            nombre: displayUser(med.updatedBy),
          }
        : null,
      discontinuedAt: med.discontinuedAt?.toISOString() ?? null,
      discontinuedBy: med.discontinuedBy
        ? {
            id: med.discontinuedBy.idUsuario,
            nombre: displayUser(med.discontinuedBy),
          }
        : null,
    }
  })
}

/**
 * Get medication history for a consultation
 */
export async function getConsultationMedicationHistory(consultaId: number) {
  const medications = (await prisma.patientMedication.findMany({
    where: {
      consultaId,
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
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })) as MedicationWithRelations[]

  return medications.map((med) => {
    const events: Array<{
      id: number
      action: "CREATED" | "UPDATED" | "DISCONTINUED"
      performedAt: string
      performedBy: { id: number; nombre: string }
      consultaId: number | null
    }> = []

    // Add creation event (using updatedAt as fallback since createdAt doesn't exist in schema)
    const creationTime = med.updatedAt || new Date()
    events.push({
      id: med.idPatientMedication,
      action: "CREATED",
      performedAt: creationTime.toISOString(),
      performedBy: {
        id: med.createdBy.idUsuario,
        nombre: displayUser(med.createdBy),
      },
      consultaId: med.consultaId,
    })

    // Add update event if exists
    if (med.updatedAt && med.updatedBy) {
      events.push({
        id: med.idPatientMedication,
        action: "UPDATED",
        performedAt: med.updatedAt.toISOString(),
        performedBy: {
          id: med.updatedBy.idUsuario,
          nombre: displayUser(med.updatedBy),
        },
        consultaId: med.consultaId,
      })
    }

    // Add discontinuation event if exists
    if (med.discontinuedAt && med.discontinuedBy) {
      events.push({
        id: med.idPatientMedication,
        action: "DISCONTINUED",
        performedAt: med.discontinuedAt.toISOString(),
        performedBy: {
          id: med.discontinuedBy.idUsuario,
          nombre: displayUser(med.discontinuedBy),
        },
        consultaId: med.consultaId,
      })
    }

    // Sort events by date (newest first)
    events.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())

    return {
      medicationId: med.idPatientMedication,
      medicationLabel: med.label ?? med.medicationCatalog?.name ?? "Medicación desconocida",
      patientId: med.pacienteId,
      events,
      createdAt: (med.updatedAt || new Date()).toISOString(),
      createdBy: {
        id: med.createdBy.idUsuario,
        nombre: displayUser(med.createdBy),
      },
      lastUpdatedAt: med.updatedAt?.toISOString() ?? null,
      lastUpdatedBy: med.updatedBy
        ? {
            id: med.updatedBy.idUsuario,
            nombre: displayUser(med.updatedBy),
          }
        : null,
      discontinuedAt: med.discontinuedAt?.toISOString() ?? null,
      discontinuedBy: med.discontinuedBy
        ? {
            id: med.discontinuedBy.idUsuario,
            nombre: displayUser(med.discontinuedBy),
          }
        : null,
    }
  })
}

