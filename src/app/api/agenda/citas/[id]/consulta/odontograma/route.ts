// src/app/api/agenda/citas/[id]/consulta/odontograma/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createOdontogramSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"
import { auditOdontogramCreate, auditOdontogramUpdate } from "@/lib/audit/log"
import { calculateOdontogramDiff, formatOdontogramDiffSummary } from "@/lib/utils/odontogram-audit-helpers"
import type { OdontogramEntryDTO } from "../_dto"

/**
 * GET /api/agenda/citas/[id]/consulta/odontograma
 * Obtiene el odontograma más reciente de la consulta
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewOdontogram(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver odontograma")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const odontograma = await prisma.odontogramSnapshot.findFirst({
      where: { consultaId: citaId },
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

    if (!odontograma) {
      return ok(null)
    }

    return ok({
      id: odontograma.idOdontogramSnapshot,
      takenAt: odontograma.takenAt.toISOString(),
      notes: odontograma.notes,
      createdBy: {
        id: odontograma.createdBy.idUsuario,
        nombre:
          odontograma.createdBy.profesional?.persona?.nombres && odontograma.createdBy.profesional?.persona?.apellidos
            ? `${odontograma.createdBy.profesional.persona.nombres} ${odontograma.createdBy.profesional.persona.apellidos}`.trim()
            : odontograma.createdBy.nombreApellido ?? "Usuario",
      },
      entries: odontograma.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/odontograma]", e)
    return errors.internal(errorMessage ?? "Error al obtener odontograma")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/odontograma
 * Crea un nuevo snapshot de odontograma
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

    if (!CONSULTA_RBAC.canEditOdontogram(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear odontograma")
    }

    const body = await req.json()
    
    // Validar con mejor manejo de errores
    const validationResult = createOdontogramSchema.safeParse(body)
    if (!validationResult.success) {
      console.error("[POST /api/agenda/citas/[id]/consulta/odontograma] Validation error:", JSON.stringify(validationResult.error.issues, null, 2))
      console.error("[POST /api/agenda/citas/[id]/consulta/odontograma] Received body:", JSON.stringify(body, null, 2))
      return errors.validation(validationResult.error.issues[0]?.message ?? "Datos inválidos")
    }
    const input = validationResult.data

    // Asegurar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      include: {
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) {
      const cita = await prisma.cita.findUnique({
        where: { idCita: citaId },
        include: { profesional: true },
      })
      if (!cita) return errors.notFound("Cita no encontrada")
      await ensureConsulta(citaId, cita.profesionalId, userId)
      const nuevaConsulta = await prisma.consulta.findUnique({
        where: { citaId },
        include: {
          cita: {
            select: {
              pacienteId: true,
            },
          },
        },
      })
      if (!nuevaConsulta) return errors.internal("Error al crear consulta")

      const odontograma = await prisma.odontogramSnapshot.create({
        data: {
          pacienteId: nuevaConsulta.cita.pacienteId,
          consultaId: citaId,
          notes: input.notes ?? null,
          createdByUserId: userId,
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

      // Registrar auditoría como creación (no hay snapshot anterior en este caso)
      const newEntries: OdontogramEntryDTO[] = odontograma.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      }))

      // Registrar auditoría de forma segura
      try {
        await auditOdontogramCreate({
          actorId: userId,
          snapshotId: odontograma.idOdontogramSnapshot,
          pacienteId: nuevaConsulta.cita.pacienteId,
          consultaId: citaId,
          entriesCount: newEntries.length,
          headers: req.headers,
          path: `/api/agenda/citas/${citaId}/consulta/odontograma`,
          metadata: {
            consultaCreated: true, // Indica que la consulta se creó automáticamente
            entriesCount: newEntries.length,
            hasNotes: !!input.notes,
          },
        })
      } catch (auditError) {
        // Log el error de auditoría pero no fallar la operación principal
        console.error("[POST /api/agenda/citas/[id]/consulta/odontograma] Error en auditoría:", auditError)
        // Continuar con la respuesta exitosa ya que el odontograma se guardó correctamente
      }

      return ok({
        id: odontograma.idOdontogramSnapshot,
        takenAt: odontograma.takenAt.toISOString(),
        notes: odontograma.notes,
        createdBy: {
          id: odontograma.createdBy.idUsuario,
          nombre:
            odontograma.createdBy.profesional?.persona?.nombres && odontograma.createdBy.profesional?.persona?.apellidos
              ? `${odontograma.createdBy.profesional.persona.nombres} ${odontograma.createdBy.profesional.persona.apellidos}`.trim()
              : odontograma.createdBy.nombreApellido ?? "Usuario",
        },
        entries: odontograma.entries.map((e) => ({
          id: e.idOdontogramEntry,
          toothNumber: e.toothNumber,
          surface: e.surface,
          condition: e.condition,
          notes: e.notes,
        })),
      })
    }

    // Obtener snapshot anterior para calcular diff (si existe)
    const previousSnapshot = await prisma.odontogramSnapshot.findFirst({
      where: { consultaId: citaId },
      include: {
        entries: {
          orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
        },
      },
      orderBy: { takenAt: "desc" },
    })

    // Preparar entradas anteriores para diff (antes de crear el nuevo snapshot)
    const previousEntries: OdontogramEntryDTO[] | null = previousSnapshot
      ? previousSnapshot.entries.map((e) => ({
          id: e.idOdontogramEntry,
          toothNumber: e.toothNumber,
          surface: e.surface,
          condition: e.condition,
          notes: e.notes,
        }))
      : null

    // Crear nuevo snapshot en una transacción para asegurar atomicidad
    const odontograma = await prisma.$transaction(async (tx) => {
      const snapshot = await tx.odontogramSnapshot.create({
        data: {
          pacienteId: consulta.cita.pacienteId,
          consultaId: citaId,
          notes: input.notes ?? null,
          createdByUserId: userId,
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

      return snapshot
    })

    // Preparar entradas nuevas para diff
    const newEntries: OdontogramEntryDTO[] = odontograma.entries.map((e) => ({
      id: e.idOdontogramEntry,
      toothNumber: e.toothNumber,
      surface: e.surface,
      condition: e.condition,
      notes: e.notes,
    }))

    // Calcular diff y registrar auditoría
    const diff = calculateOdontogramDiff(previousEntries, newEntries)
    const isUpdate = previousSnapshot !== null

    // Registrar auditoría de forma segura (no debe fallar el guardado si la auditoría falla)
    try {
      if (isUpdate) {
        // Registrar como actualización
        await auditOdontogramUpdate({
          actorId: userId,
          snapshotId: odontograma.idOdontogramSnapshot,
          pacienteId: consulta.cita.pacienteId,
          consultaId: citaId,
          diff: {
            added: diff.added.length,
            removed: diff.removed.length,
            modified: diff.modified.length,
          },
          diffSummary: formatOdontogramDiffSummary(diff),
          headers: req.headers,
          path: `/api/agenda/citas/${citaId}/consulta/odontograma`,
          metadata: {
            previousSnapshotId: previousSnapshot.idOdontogramSnapshot,
            entriesAdded: diff.added.length,
            entriesRemoved: diff.removed.length,
            entriesModified: diff.modified.length,
          },
        })
      } else {
        // Registrar como creación
        await auditOdontogramCreate({
          actorId: userId,
          snapshotId: odontograma.idOdontogramSnapshot,
          pacienteId: consulta.cita.pacienteId,
          consultaId: citaId,
          entriesCount: newEntries.length,
          headers: req.headers,
          path: `/api/agenda/citas/${citaId}/consulta/odontograma`,
          metadata: {
            entriesCount: newEntries.length,
            hasNotes: !!input.notes,
          },
        })
      }
    } catch (auditError) {
      // Log el error de auditoría pero no fallar la operación principal
      console.error("[POST /api/agenda/citas/[id]/consulta/odontograma] Error en auditoría:", auditError)
      // Continuar con la respuesta exitosa ya que el odontograma se guardó correctamente
    }

    return ok({
      id: odontograma.idOdontogramSnapshot,
      takenAt: odontograma.takenAt.toISOString(),
      notes: odontograma.notes,
      createdBy: {
        id: odontograma.createdBy.idUsuario,
        nombre:
          odontograma.createdBy.profesional?.persona?.nombres && odontograma.createdBy.profesional?.persona?.apellidos
            ? `${odontograma.createdBy.profesional.persona.nombres} ${odontograma.createdBy.profesional.persona.apellidos}`.trim()
            : odontograma.createdBy.nombreApellido ?? "Usuario",
      },
      entries: odontograma.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: Array<{ message?: string }> }
      return errors.validation(zodError.issues?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/odontograma]", e)
    return errors.internal(errorMessage ?? "Error al crear odontograma")
  }
}

