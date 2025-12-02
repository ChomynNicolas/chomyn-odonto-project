// src/lib/services/patient-odontogram.service.ts
import { prisma } from "@/lib/prisma"
import type { DienteSuperficie, ToothCondition } from "@prisma/client"

export interface OdontogramEntryInput {
  toothNumber: number
  surface?: DienteSuperficie | null
  condition: ToothCondition
  notes?: string | null
}

export interface CreateOdontogramInput {
  entries: OdontogramEntryInput[]
  notes?: string | null
  consultaId?: number | null
}

export interface OdontogramEntry {
  id: number
  toothNumber: number
  surface: DienteSuperficie | null
  condition: ToothCondition
  notes: string | null
}

export interface OdontogramSnapshot {
  id: number
  takenAt: string
  notes: string | null
  consultaId: number | null
  createdBy: {
    id: number
    nombre: string
  }
  entries: OdontogramEntry[]
}

export interface PatientOdontogramService {
  getLatestOdontogram(pacienteId: number): Promise<OdontogramSnapshot | null>
  createOrUpdateOdontogram(
    pacienteId: number, 
    input: CreateOdontogramInput, 
    createdByUserId: number
  ): Promise<OdontogramSnapshot>
  getOdontogramHistory(
    pacienteId: number, 
    limit?: number, 
    offset?: number
  ): Promise<{ snapshots: OdontogramSnapshot[], total: number }>
}

/**
 * Patient-level odontogram service that maintains continuity across consultations
 */
export const patientOdontogramService: PatientOdontogramService = {
  /**
   * Gets the most recent odontogram for a patient (across all consultations)
   */
  async getLatestOdontogram(pacienteId: number) {
    const snapshot = await prisma.odontogramSnapshot.findFirst({
      where: { pacienteId },
      include: {
        createdBy: {
          select: {
            idUsuario: true,
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
          },
        },
        entries: {
          orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
        },
      },
      orderBy: { takenAt: "desc" },
    })

    if (!snapshot) return null

    return {
      id: snapshot.idOdontogramSnapshot,
      takenAt: snapshot.takenAt.toISOString(),
      notes: snapshot.notes,
      consultaId: snapshot.consultaId,
      createdBy: {
        id: snapshot.createdBy.idUsuario,
        nombre:
          snapshot.createdBy.profesional?.persona?.nombres && 
          snapshot.createdBy.profesional?.persona?.apellidos
            ? `${snapshot.createdBy.profesional.persona.nombres} ${snapshot.createdBy.profesional.persona.apellidos}`.trim()
            : snapshot.createdBy.nombreApellido ?? "Usuario",
      },
      entries: snapshot.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    }
  },

  /**
   * Creates a new odontogram snapshot, maintaining patient continuity
   * This replaces the consultation-specific approach with patient-level persistence
   */
  async createOrUpdateOdontogram(
    pacienteId: number, 
    input: CreateOdontogramInput, 
    createdByUserId: number
  ) {
    // Verify patient exists
    const patient = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })
    if (!patient) {
      throw new Error("Paciente no encontrado")
    }

    // Create new snapshot with patient-level persistence
    const snapshot = await prisma.odontogramSnapshot.create({
      data: {
        pacienteId,
        consultaId: input.consultaId ?? null,
        notes: input.notes ?? null,
        createdByUserId,
        entries: {
          create: input.entries.map((e) => ({
            toothNumber: e.toothNumber,
            surface: e.surface ?? null,
            condition: e.condition,
            notes: e.notes ?? null,
          })),
        },
      },
      include: {
        createdBy: {
          select: {
            idUsuario: true,
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
          },
        },
        entries: {
          orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
        },
      },
    })

    return {
      id: snapshot.idOdontogramSnapshot,
      takenAt: snapshot.takenAt.toISOString(),
      notes: snapshot.notes,
      consultaId: snapshot.consultaId,
      createdBy: {
        id: snapshot.createdBy.idUsuario,
        nombre:
          snapshot.createdBy.profesional?.persona?.nombres && 
          snapshot.createdBy.profesional?.persona?.apellidos
            ? `${snapshot.createdBy.profesional.persona.nombres} ${snapshot.createdBy.profesional.persona.apellidos}`.trim()
            : snapshot.createdBy.nombreApellido ?? "Usuario",
      },
      entries: snapshot.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    }
  },

  /**
   * Gets paginated odontogram history for a patient
   */
  async getOdontogramHistory(pacienteId: number, limit = 50, offset = 0) {
    const [snapshots, total] = await Promise.all([
      prisma.odontogramSnapshot.findMany({
        where: { pacienteId },
        include: {
          createdBy: {
            select: {
              idUsuario: true,
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
            },
          },
          entries: {
            orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
          },
        },
        orderBy: { takenAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.odontogramSnapshot.count({
        where: { pacienteId },
      }),
    ])

    const formattedSnapshots = snapshots.map((snapshot) => ({
      id: snapshot.idOdontogramSnapshot,
      takenAt: snapshot.takenAt.toISOString(),
      notes: snapshot.notes,
      consultaId: snapshot.consultaId,
      createdBy: {
        id: snapshot.createdBy.idUsuario,
        nombre:
          snapshot.createdBy.profesional?.persona?.nombres && 
          snapshot.createdBy.profesional?.persona?.apellidos
            ? `${snapshot.createdBy.profesional.persona.nombres} ${snapshot.createdBy.profesional.persona.apellidos}`.trim()
            : snapshot.createdBy.nombreApellido ?? "Usuario",
      },
      entries: snapshot.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    }))

    return { snapshots: formattedSnapshots, total }
  },
}
