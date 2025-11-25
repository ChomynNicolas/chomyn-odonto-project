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
import { patientOdontogramService } from "@/lib/services/patient-odontogram.service"
import type { OdontogramEntryDTO } from "../_dto"

/**
 * GET /api/agenda/citas/[id]/consulta/odontograma
 * Obtiene el odontograma más reciente del paciente (no específico de la consulta)
 * CAMBIO IMPORTANTE: Ahora carga el último odontograma del paciente para mantener continuidad
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

    // Get consultation and patient info
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
    if (!consulta) return errors.notFound("Consulta no encontrada")

    // CAMBIO CLAVE: Obtener el último odontograma del paciente (no de la consulta específica)
    const odontograma = await patientOdontogramService.getLatestOdontogram(consulta.cita.pacienteId)

    if (!odontograma) {
      return ok(null)
    }

    return ok(odontograma)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/odontograma]", e)
    return errors.internal(errorMessage ?? "Error al obtener odontograma")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/odontograma
 * Crea/actualiza el odontograma del paciente (mantiene continuidad entre consultas)
 * CAMBIO IMPORTANTE: Ahora actualiza el odontograma del paciente en lugar de crear uno por consulta
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

    // Asegurar que la consulta existe y obtener pacienteId
    let consulta = await prisma.consulta.findUnique({
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
      consulta = await prisma.consulta.findUnique({
        where: { citaId },
        include: {
          cita: {
            select: {
              pacienteId: true,
            },
          },
        },
      })
      if (!consulta) return errors.internal("Error al crear consulta")
    }

    const pacienteId = consulta.cita.pacienteId

    // CAMBIO CLAVE: Obtener el último odontograma del paciente para calcular diff
    const previousOdontogram = await patientOdontogramService.getLatestOdontogram(pacienteId)
    const previousEntries: OdontogramEntryDTO[] | null = previousOdontogram?.entries || null

    // CAMBIO CLAVE: Usar el servicio de paciente para crear/actualizar el odontograma
    const odontograma = await patientOdontogramService.createOrUpdateOdontogram(
      pacienteId,
      {
        entries: input.entries,
        notes: input.notes,
        consultaId: citaId, // Mantener referencia a la consulta actual
      },
      userId
    )

    // Preparar entradas nuevas para diff
    const newEntries: OdontogramEntryDTO[] = odontograma.entries

    // Calcular diff y registrar auditoría
    const diff = calculateOdontogramDiff(previousEntries, newEntries)
    const isUpdate = previousOdontogram !== null

    // Registrar auditoría de forma segura (no debe fallar el guardado si la auditoría falla)
    try {
      if (isUpdate) {
        // Registrar como actualización
        await auditOdontogramUpdate({
          actorId: userId,
          snapshotId: odontograma.id,
          pacienteId,
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
            previousSnapshotId: previousOdontogram.id,
            entriesAdded: diff.added.length,
            entriesRemoved: diff.removed.length,
            entriesModified: diff.modified.length,
            patientLevelUpdate: true, // Indica que es una actualización a nivel de paciente
          },
        })
      } else {
        // Registrar como creación
        await auditOdontogramCreate({
          actorId: userId,
          snapshotId: odontograma.id,
          pacienteId,
          consultaId: citaId,
          entriesCount: newEntries.length,
          headers: req.headers,
          path: `/api/agenda/citas/${citaId}/consulta/odontograma`,
          metadata: {
            entriesCount: newEntries.length,
            hasNotes: !!input.notes,
            patientLevelCreation: true, // Indica que es una creación a nivel de paciente
          },
        })
      }
    } catch (auditError) {
      // Log el error de auditoría pero no fallar la operación principal
      console.error("[POST /api/agenda/citas/[id]/consulta/odontograma] Error en auditoría:", auditError)
      // Continuar con la respuesta exitosa ya que el odontograma se guardó correctamente
    }

    return ok(odontograma)
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

