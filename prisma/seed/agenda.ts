import { type PrismaClient, EstadoCita, type TipoCita, MotivoCancelacion, TipoBloqueoAgenda } from "@prisma/client"
import { faker } from "@faker-js/faker/locale/es"
import { COUNTS, DAYS_WINDOW_FWD, DAYS_WINDOW_PAST, PROB, RETRY_CONFIG } from "./config"
import { addMinutes, generateSlotWithRetry } from "./utils"
import { crearCitaSegura, cancelarCita } from "./ensure"
import { log } from "./logger"

export async function generarAgendaParaProfesional(
  prisma: PrismaClient,
  opts: {
    profesionalId: number
    pacienteIds: number[]
    consultorioIds: number[]
    createdByUserId: number
  },
) {
  let totalCreadas = 0
  let totalFallidas = 0
  const consecutiveFailures = 0

  log.info(`📅 Generando citas pasadas para profesional ${opts.profesionalId}...`)
  const citasPasadas = await generarCitasPorVentana(prisma, {
    ...opts,
    cantidad: COUNTS.citasPasadas,
    isPast: true,
    daysWindow: DAYS_WINDOW_PAST,
  })
  totalCreadas += citasPasadas.creadas
  totalFallidas += citasPasadas.fallidas

  log.info(`📅 Generando citas futuras para profesional ${opts.profesionalId}...`)
  const citasFuturas = await generarCitasPorVentana(prisma, {
    ...opts,
    cantidad: COUNTS.citasFuturas,
    isPast: false,
    daysWindow: DAYS_WINDOW_FWD,
  })
  totalCreadas += citasFuturas.creadas
  totalFallidas += citasFuturas.fallidas

  log.ok(
    `✅ Profesional ${opts.profesionalId}: ${totalCreadas} citas creadas, ${totalFallidas} rechazadas por solapamiento`,
  )

  return { creadas: totalCreadas, fallidas: totalFallidas }
}

async function generarCitasPorVentana(
  prisma: PrismaClient,
  opts: {
    profesionalId: number
    pacienteIds: number[]
    consultorioIds: number[]
    createdByUserId: number
    cantidad: number
    isPast: boolean
    daysWindow: number
  },
) {
  let creadas = 0
  let fallidas = 0
  let consecutiveFailures = 0

  for (let i = 0; i < opts.cantidad; i++) {
    if (consecutiveFailures >= RETRY_CONFIG.maxConsecutiveFailures) {
      log.warn(`⚠️  Demasiados fallos consecutivos, deteniendo generación`)
      break
    }

    const pacienteId = faker.helpers.arrayElement(opts.pacienteIds)
    const consultorioId = faker.helpers.arrayElement(opts.consultorioIds)

    const { inicio, duracion } = generateSlotWithRetry(opts.isPast, opts.daysWindow, RETRY_CONFIG.maxRetries)
    const fin = addMinutes(inicio, duracion)

    let estado: EstadoCita
    if (opts.isPast) {
      const rand = Math.random()
      if (rand < PROB.citaPasadaCompletada) {
        estado = EstadoCita.COMPLETED
      } else if (rand < PROB.citaPasadaCompletada + PROB.citaPasadaNoShow) {
        estado = EstadoCita.NO_SHOW
      } else {
        estado = EstadoCita.CANCELLED
      }
    } else {
      const rand = Math.random()
      if (rand < PROB.citaFuturaConfirmada) {
        estado = EstadoCita.CONFIRMED
      } else if (rand < PROB.citaFuturaConfirmada + PROB.citaFuturaScheduled) {
        estado = EstadoCita.SCHEDULED
      } else {
        estado = EstadoCita.CANCELLED
      }
    }

    const tipo = faker.helpers.arrayElement<TipoCita>([
      "CONSULTA",
      "LIMPIEZA",
      "CONTROL",
      "ENDODONCIA",
      "EXTRACCION",
      "URGENCIA",
    ] as TipoCita[])

    const motivo = faker.helpers.arrayElement([
      "Dolor molar",
      "Control post tratamiento",
      "Limpieza semestral",
      "Evaluación ortodoncia",
      "Urgencia: fractura",
      "Endodoncia",
      "Extracción cordal",
      "Blanqueamiento",
      "Primera consulta",
    ])

    const cita = await crearCitaSegura(prisma, {
      pacienteId,
      profesionalId: opts.profesionalId,
      consultorioId,
      createdByUserId: opts.createdByUserId,
      inicio,
      fin,
      tipo,
      estado,
      motivo,
    })

    if (!cita) {
      fallidas++
      consecutiveFailures++
      continue
    }

    consecutiveFailures = 0
    creadas++

    if (estado === EstadoCita.CANCELLED) {
      const reason = faker.helpers.arrayElement([
        MotivoCancelacion.PACIENTE,
        MotivoCancelacion.PROFESIONAL,
        MotivoCancelacion.CLINICA,
      ])
      await cancelarCita(prisma, {
        citaId: cita.idCita,
        userId: opts.createdByUserId,
        reason,
        nota: `Cancelación por ${reason}`,
        when: inicio,
      })
    }

    if (estado === EstadoCita.COMPLETED) {
      await prisma.cita.update({
        where: { idCita: cita.idCita },
        data: {
          checkedInAt: addMinutes(inicio, -5),
          startedAt: inicio,
          completedAt: fin,
        },
      })
    }
  }

  return { creadas, fallidas }
}

export async function generarReprogramaciones(
  prisma: PrismaClient,
  opts: {
    profesionalId: number
    createdByUserId: number
  },
) {
  // Busca citas canceladas o no-show para reprogramar
  const citasCandidatas = await prisma.cita.findMany({
    where: {
      profesionalId: opts.profesionalId,
      estado: { in: [EstadoCita.CANCELLED, EstadoCita.NO_SHOW] },
    },
    take: 20,
  })

  let reprogramadas = 0

  for (const citaOriginal of citasCandidatas) {
    const shouldReprogram =
      (citaOriginal.estado === EstadoCita.CANCELLED && Math.random() < PROB.reprogramarDesdeCancelada) ||
      (citaOriginal.estado === EstadoCita.NO_SHOW && Math.random() < PROB.reprogramarDesdeNoShow)

    if (!shouldReprogram) continue

    // Genera nuevo slot futuro
    const { inicio, duracion } = generateSlotWithRetry(false, DAYS_WINDOW_FWD)
    const fin = addMinutes(inicio, duracion)

    const nuevaCita = await crearCitaSegura(prisma, {
      pacienteId: citaOriginal.pacienteId,
      profesionalId: citaOriginal.profesionalId,
      consultorioId: citaOriginal.consultorioId,
      createdByUserId: opts.createdByUserId,
      inicio,
      fin,
      tipo: citaOriginal.tipo,
      estado: EstadoCita.CONFIRMED,
      motivo: citaOriginal.motivo,
      notas: `Reprogramada desde cita #${citaOriginal.idCita}`,
      reprogramadaDesdeId: citaOriginal.idCita,
    })

    if (nuevaCita) {
      reprogramadas++
    }
  }

  log.ok(`🔄 ${reprogramadas} citas reprogramadas para profesional ${opts.profesionalId}`)
  return reprogramadas
}

export async function generarBloqueosAgenda(
  prisma: PrismaClient,
  opts: {
    profesionalId: number
    consultorioId?: number
    createdByUserId: number
    cantidad: number
  },
) {
  let creados = 0

  for (let i = 0; i < opts.cantidad; i++) {
    const tipoBloqueo = faker.helpers.arrayElement([
      "VACACIONES",
      "CAPACITACION",
      "MANTENIMIENTO",
      "BLOQUEO_MANUAL",
    ] as const) as TipoBloqueoAgenda

    // Genera rango de fechas futuro
    const desde = generateSlotWithRetry(false, DAYS_WINDOW_FWD).inicio
    const duracionDias = faker.number.int({ min: 1, max: 7 })
    const hasta = new Date(desde)
    hasta.setDate(hasta.getDate() + duracionDias)
    hasta.setHours(18, 0, 0, 0)

    await prisma.bloqueoAgenda.create({
      data: {
        profesionalId: opts.profesionalId,
        consultorioId: opts.consultorioId ?? null,
        desde,
        hasta,
        tipo: tipoBloqueo,
        motivo: faker.helpers.arrayElement([
          "Vacaciones programadas",
          "Curso de actualización",
          "Mantenimiento equipos",
          "Evento especial",
        ]),
        activo: true,
        createdByUserId: opts.createdByUserId,
      },
    })

    creados++
  }

  log.ok(`🚫 ${creados} bloqueos de agenda creados`)
  return creados
}
