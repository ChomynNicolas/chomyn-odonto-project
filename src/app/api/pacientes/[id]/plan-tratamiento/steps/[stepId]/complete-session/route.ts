// src/app/api/pacientes/[id]/plan-tratamiento/steps/[stepId]/complete-session/route.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { requireRole } from "@/app/api/pacientes/[id]/_rbac"
import { errors, ok } from "@/app/api/_http"
import { CompleteSessionSchema } from "../../_schemas"
import { prisma } from "@/lib/prisma"
import { TreatmentStepStatus, TipoCita } from "@prisma/client"
import { repoGetStepWithPlan } from "../../_repo"
import { safeAuditWrite } from "@/lib/audit/log"
import type { TreatmentStepDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

/**
 * PUT /api/pacientes/[patientId]/plan-tratamiento/steps/[stepId]/complete-session
 * Completes a session of a multi-session TreatmentStep
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    // Authentication & Authorization
    const gate = await requireRole(["ADMIN", "ODONT"])
    if (!gate.ok) {
      return errors.forbidden(gate.error)
    }

    const userId = gate.userId
    if (!userId) {
      return errors.forbidden("Usuario no identificado")
    }

    // Parse route parameters
    const { id: idParam, stepId: stepIdParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    const stepId = Number.parseInt(stepIdParam, 10)

    if (!Number.isFinite(pacienteId) || !Number.isFinite(stepId)) {
      return errors.validation("ID inválido")
    }

    // Validate request body
    const body = await req.json().catch(() => null)
    if (!body) {
      return errors.validation("Cuerpo de la petición inválido")
    }

    const validationResult = CompleteSessionSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }

    const input = validationResult.data

    // Fetch step with plan for validation
    const step = await repoGetStepWithPlan(stepId)
    if (!step) {
      return errors.notFound("Paso del plan no encontrado")
    }

    // Validate patient ownership
    if (step.plan.pacienteId !== pacienteId) {
      return errors.forbidden("El paso no pertenece al paciente especificado")
    }

    // Business validations
    if (!step.requiresMultipleSessions) {
      return errors.validation("Este paso no requiere múltiples sesiones")
    }

    if (step.status !== TreatmentStepStatus.IN_PROGRESS) {
      return errors.validation(
        `El paso debe estar en estado IN_PROGRESS. Estado actual: ${step.status}`
      )
    }

    const currentSession = step.currentSession ?? 1
    const totalSessions = step.totalSessions

    if (!totalSessions) {
      return errors.validation("El paso no tiene un número total de sesiones definido")
    }

    // Concurrency check: validate request currentSession matches DB currentSession
    if (input.currentSession !== currentSession) {
      return errors.validation(
        `La sesión actual no coincide. Se esperaba sesión ${currentSession}, se recibió ${input.currentSession}`
      )
    }

    // Validate we haven't already completed all sessions
    if (currentSession >= totalSessions) {
      return errors.validation("Todas las sesiones ya han sido completadas")
    }

    // Calculate new session number and determine if this is the last session
    const newCurrentSession = currentSession + 1
    const isLastSession = newCurrentSession === totalSessions
    const newStatus: TreatmentStepStatus = isLastSession
      ? TreatmentStepStatus.COMPLETED
      : TreatmentStepStatus.IN_PROGRESS

    // Build procedure name for appointment motive
    const procedureName =
      step.procedimientoCatalogo?.nombre || step.serviceType || "Procedimiento"

    // Prepare session notes to append
    const sessionNotesLabel = `\n\n--- Sesión ${currentSession} de ${totalSessions} ---\n`
    const sessionNotesText = input.sessionNotes?.trim() || ""
    const newNotes = step.notes
      ? `${step.notes}${sessionNotesLabel}${sessionNotesText}`
      : `${sessionNotesLabel}${sessionNotesText}`

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update TreatmentStep
      const updatedStep = await tx.treatmentStep.update({
        where: { idTreatmentStep: stepId },
        data: {
          currentSession: newCurrentSession,
          status: newStatus,
          completedAt: isLastSession ? new Date() : null,
          notes: newNotes,
        },
        include: {
          procedimientoCatalogo: {
            select: {
              idProcedimiento: true,
              code: true,
              nombre: true,
            },
          },
          plan: {
            select: {
              idTreatmentPlan: true,
              pacienteId: true,
            },
          },
        },
      })

      let appointmentId: number | undefined

      // Create next appointment if requested and not last session
      if (input.scheduleNextSession && !isLastSession && input.nextSessionData) {
        const { date, time, professionalId, duration } = input.nextSessionData

        // Parse date and time
        const [hours, minutes] = time.split(":").map(Number)
        const appointmentDate = new Date(date)
        appointmentDate.setHours(hours, minutes, 0, 0)

        const appointmentDuration = duration || step.estimatedDurationMin || 30
        const appointmentEnd = new Date(
          appointmentDate.getTime() + appointmentDuration * 60 * 1000
        )

        // Create appointment
        const newAppointment = await tx.cita.create({
          data: {
            inicio: appointmentDate,
            fin: appointmentEnd,
            duracionMinutos: appointmentDuration,
            tipo: TipoCita.CONSULTA,
            estado: "SCHEDULED",
            motivo: `Sesión ${newCurrentSession}/${totalSessions} – ${procedureName}`,
            notas: null,
            pacienteId: pacienteId,
            profesionalId: professionalId,
            createdByUserId: userId,
          },
        })

        appointmentId = newAppointment.idCita
      }

      // Audit log
      await safeAuditWrite({
        actorId: userId,
        action: "UPDATE",
        entity: "TREATMENT_STEP",
        entityId: stepId,
        metadata: {
          previousSession: currentSession,
          newSession: newCurrentSession,
          totalSessions: totalSessions,
          isLastSession: isLastSession,
          newStatus: newStatus,
          appointmentCreated: appointmentId ? true : false,
          appointmentId: appointmentId || null,
          summary: isLastSession
            ? `Completada sesión final ${currentSession} de ${totalSessions}. Procedimiento finalizado.`
            : `Completada sesión ${currentSession} de ${totalSessions}. ${totalSessions - newCurrentSession} sesión(es) restante(s).`,
        },
        headers: req.headers,
        path: req.nextUrl.pathname,
      })

      // Map to DTO
      const stepDTO: TreatmentStepDTO = {
        id: updatedStep.idTreatmentStep,
        order: updatedStep.order,
        procedureId: updatedStep.procedureId,
        procedimientoCatalogo: updatedStep.procedimientoCatalogo
          ? {
              id: updatedStep.procedimientoCatalogo.idProcedimiento,
              code: updatedStep.procedimientoCatalogo.code,
              nombre: updatedStep.procedimientoCatalogo.nombre,
            }
          : null,
        serviceType: updatedStep.serviceType,
        toothNumber: updatedStep.toothNumber,
        toothSurface: updatedStep.toothSurface,
        estimatedDurationMin: updatedStep.estimatedDurationMin,
        estimatedCostCents: updatedStep.estimatedCostCents,
        priority: updatedStep.priority,
        status: updatedStep.status,
        notes: updatedStep.notes,
        requiresMultipleSessions: updatedStep.requiresMultipleSessions,
        totalSessions: updatedStep.totalSessions,
        currentSession: updatedStep.currentSession,
        completedAt: updatedStep.completedAt?.toISOString() ?? null,
        createdAt: updatedStep.createdAt.toISOString(),
        updatedAt: updatedStep.updatedAt.toISOString(),
      }

      // Build success message
      const remainingSessions = totalSessions - newCurrentSession
      const message = isLastSession
        ? `Sesión ${currentSession} de ${totalSessions} completada. El procedimiento ha sido finalizado.`
        : `Sesión ${currentSession} de ${totalSessions} completada. ${remainingSessions} sesión(es) restante(s).`

      return {
        step: stepDTO,
        appointmentId,
        message,
      }
    })

    return ok({
      success: true,
      step: result.step,
      appointmentId: result.appointmentId,
      message: result.message,
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/pacientes/[id]/plan-tratamiento/steps/[stepId]/complete-session]", e)

    // Handle known errors
    if (errorMessage.includes("no encontrado") || errorMessage.includes("not found")) {
      return errors.notFound(errorMessage)
    }
    if (
      errorMessage.includes("inválido") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("requiere múltiples sesiones") ||
      errorMessage.includes("debe estar en estado")
    ) {
      return errors.validation(errorMessage)
    }
    if (errorMessage.includes("no pertenece") || errorMessage.includes("No autorizado")) {
      return errors.forbidden(errorMessage)
    }

    return errors.internal("Error inesperado al completar sesión de tratamiento")
  }
}
