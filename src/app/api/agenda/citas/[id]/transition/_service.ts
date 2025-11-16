import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit/log"
import type { CitaAction } from "./_schemas"
import { EstadoCita, MotivoCancelacion, ConsultaEstado } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import { differenceInYears } from "date-fns"

interface TransitionContext {
  citaId: number
  action: CitaAction
  usuarioId: number
  notas?: string
  motivoCancelacion?: keyof typeof MotivoCancelacion | undefined
  ip?: string
  userAgent?: string
}

export async function executeCitaTransition(ctx: TransitionContext) {
  // Obtener datos necesarios incluyendo profesionalId para crear consulta
  const cita = await prisma.cita.findUnique({
    where: { idCita: ctx.citaId },
    select: { 
      idCita: true, 
      inicio: true, 
      estado: true, 
      pacienteId: true,
      profesionalId: true, // Necesario para crear consulta automáticamente
    },
  })
  if (!cita) throw new Error("Cita no encontrada")

  // Gate de consentimiento para iniciar consulta
  if (ctx.action === "START") {
    await validateConsentForStart(cita.idCita, cita.pacienteId, cita.inicio, ctx)
  }

  const newEstado = getNewEstado(cita.estado, ctx.action)

  const now = new Date()
  const data: Prisma.CitaUncheckedUpdateInput = { estado: newEstado, updatedAt: now }

  switch (ctx.action) {
    case "CONFIRM":
      // sin timestamps adicionales
      break
    case "CHECKIN":
      data.checkedInAt = now
      break
    case "START":
      data.startedAt = now
      break
    case "COMPLETE":
      data.completedAt = now
      break
    case "CANCEL":
      data.cancelledAt = now
      if (ctx.motivoCancelacion) data.cancelReason = ctx.motivoCancelacion as MotivoCancelacion
      data.cancelledByUserId = ctx.usuarioId
      break
    case "NO_SHOW":
      // sin timestamps adicionales
      break
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Actualizar estado de la cita
    const up = await tx.cita.update({ where: { idCita: ctx.citaId }, data })

    // 2. Registrar cambio de estado en historial
    await tx.citaEstadoHistorial.create({
      data: {
        citaId: ctx.citaId,
        estadoPrevio: cita.estado as EstadoCita,
        estadoNuevo: newEstado as EstadoCita,
        nota: ctx.notas,
        changedByUserId: ctx.usuarioId,
        changedAt: now,
      },
    })

    // 3. Crear consulta automáticamente cuando se inicia la consulta (START)
    if (ctx.action === "START") {
      // Verificar si ya existe consulta (evitar duplicados)
      const consultaExistente = await tx.consulta.findUnique({
        where: { citaId: ctx.citaId },
        select: { citaId: true },
      })

      if (!consultaExistente) {
        await tx.consulta.create({
          data: {
            citaId: ctx.citaId,
            performedById: cita.profesionalId,
            createdByUserId: ctx.usuarioId,
            status: ConsultaEstado.DRAFT,
            startedAt: now, // Sincronizar con startedAt de la cita
          },
        })
      }
    }

    return up
  })

  await logAudit({
    actorUserId: ctx.usuarioId,
    entity: "Cita",
    entityId: ctx.citaId,
    action: `TRANSITION_${ctx.action}`,
    payload: {
      from: cita.estado,
      to: newEstado,
      notas: ctx.notas,
      motivoCancelacion: ctx.motivoCancelacion,
      consultaCreada: ctx.action === "START", // Indicar si se creó consulta automáticamente
    },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  })

  return updated
}

async function validateConsentForStart(citaId: number, pacienteId: number, inicio: Date, ctx: TransitionContext) {
  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente: pacienteId },
    include: { persona: true },
  })

  if (!paciente?.persona?.fechaNacimiento) {
    throw {
      status: 422,
      code: "MISSING_DOB_FOR_MINOR_CHECK",
      message: "Falta fecha de nacimiento del paciente",
      details: { pacienteId },
    }
  }

  const edadAlInicio = differenceInYears(inicio, paciente.persona.fechaNacimiento)
  if (edadAlInicio >= 18) return // mayor de edad

  // Verifica que haya al menos un responsable vigente
  const responsable = await prisma.pacienteResponsable.findFirst({
    where: {
      pacienteId,
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: inicio } }],
    },
  })
  if (!responsable) {
    throw {
      status: 422,
      code: "NO_RESPONSIBLE_LINKED",
      message: "No hay responsable vigente vinculado al menor.",
      details: { pacienteId },
    }
  }

  // Consentimiento de menor vigente a la fecha/hora de la cita
  const consentimientoVigente = await prisma.consentimiento.findFirst({
    where: {
      Paciente_idPaciente: pacienteId,
      tipo: "CONSENTIMIENTO_MENOR_ATENCION",
      activo: true,
      vigente_hasta: { gte: inicio }, // <- nombre correcto en DB
    },
    include: { responsable: true },     // <- relación correcta
    orderBy: { vigente_hasta: "desc" },
  })

  if (!consentimientoVigente) {
    await logAudit({
      actorUserId: ctx.usuarioId,
      entity: "Cita",
      entityId: citaId,
      action: "TRANSITION_START_BLOCKED",
      payload: { reason: "CONSENT_REQUIRED_FOR_MINOR", pacienteId, edadAlInicio },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    throw {
      status: 422,
      code: "CONSENT_REQUIRED_FOR_MINOR",
      message: "Se requiere consentimiento vigente para iniciar la consulta.",
      details: { pacienteId, edadAlInicio },
    }
  }

  await logAudit({
    actorUserId: ctx.usuarioId,
    entity: "Cita",
    entityId: citaId,
    action: "CONSENT_VERIFIED",
    payload: {
      consentimientoId: consentimientoVigente.idConsentimiento,
      responsableNombre: consentimientoVigente.responsable
        ? `${consentimientoVigente.responsable.nombres} ${consentimientoVigente.responsable.apellidos}`.trim()
        : undefined,
      edadAlInicio,
    },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  })
}

function getNewEstado(current: EstadoCita, action: CitaAction): EstadoCita {
  const t: Record<EstadoCita, Partial<Record<CitaAction, EstadoCita>>> = {
    SCHEDULED: {
      CONFIRM: "CONFIRMED",
      CHECKIN: "CHECKED_IN",
      CANCEL: "CANCELLED",
      NO_SHOW: "NO_SHOW",
    },
    CONFIRMED: {
      CHECKIN: "CHECKED_IN",
      CANCEL: "CANCELLED",
      NO_SHOW: "NO_SHOW",
    },
    CHECKED_IN: {
      START: "IN_PROGRESS",
      CANCEL: "CANCELLED",
    },
    IN_PROGRESS: {
      COMPLETE: "COMPLETED",
      CANCEL: "CANCELLED",
    },
    COMPLETED: {},
    CANCELLED: {},
    NO_SHOW: {},
  }

  const next = t[current]?.[action]
  if (!next) throw new Error(`Transición no permitida: ${current} → ${action}`)
  return next
}
