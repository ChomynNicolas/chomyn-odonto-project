// app/api/agenda/citas/[id]/_service.ts
import { PrismaClient, EstadoCita } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import type { CitaDetalleDTO, RolUsuario } from "@/types/agenda"

const prisma = new PrismaClient()

export async function getCitaDetail(idCita: number, rol?: RolUsuario): Promise<CitaDetalleDTO | null> {
  // Select condicional para alergias
  const patientAllergySelect: Prisma.PatientAllergyFindManyArgs = {
    where: { isActive: true },
    select: { idPatientAllergy: true, label: true },
  }
  if (rol === "RECEP") patientAllergySelect.take = 1

  const userMiniSelect = {
    idUsuario: true,
    usuario: true,
    nombreApellido: true,
    profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
  } as const

  const cita = await prisma.cita.findUnique({
    where: { idCita },
    select: {
      idCita: true,
      inicio: true,
      fin: true,
      duracionMinutos: true,
      estado: true,
      tipo: true,
      motivo: true,
      notas: true,

      // cancelación (quién/cuándo/por qué)
      cancelReason: true,
      cancelledAt: true,
      canceladoPor: { select: userMiniSelect },

      // timestamps de flujo
      checkedInAt: true,
      startedAt: true,
      completedAt: true,

      createdAt: true,

      paciente: {
        select: {
          idPaciente: true,
          persona: {
            select: {
              idPersona: true, // Add persona ID for consent responsible party
              nombres: true,
              apellidos: true,
              documento: { select: { tipo: true, numero: true } },
              fechaNacimiento:true,
              contactos: {
                where: { activo: true },
                select: { tipo: true, valorNorm: true, esPrincipal: true },
              },
            },
          },
          PatientAllergy: patientAllergySelect,
          citas: { where: { estado: EstadoCita.NO_SHOW }, select: { idCita: true } },
        },
      },

      profesional: { select: { idProfesional: true, persona: { select: { nombres: true, apellidos: true } } } },
      consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },

      creadoPor: { select: userMiniSelect },

      // ⬇️ Traemos la última transición registrada
      CitaEstadoHistorial: {
        orderBy: { changedAt: "desc" },
        take: 1,
        select: {
          estadoPrevio: true,
          estadoNuevo: true,
          nota: true,
          changedAt: true,
          cambiadoPor: { select: userMiniSelect },
        },
      },
    },
  })

  if (!cita) return null

  const contactos = cita.paciente.persona.contactos
  const principal = contactos.find((c) => c.esPrincipal)
  const telefono =
    principal?.tipo === "PHONE" ? principal.valorNorm : (contactos.find((c) => c.tipo === "PHONE")?.valorNorm ?? null)
  const email =
    principal?.tipo === "EMAIL" ? principal.valorNorm : (contactos.find((c) => c.tipo === "EMAIL")?.valorNorm ?? null)

  const tieneAlergias = (cita.paciente.PatientAllergy?.length ?? 0) > 0
  const alergiasDetalle =
    rol === "RECEP"
      ? null
      : (cita.paciente.PatientAllergy?.map((a) => a.label).filter(Boolean).join(", ") || null)

  const noShowCount = cita.paciente.citas.length

  const displayUser = (u?: {
    usuario?: string | null
    nombreApellido?: string | null
    profesional?: { persona?: { nombres?: string | null; apellidos?: string | null } | null } | null
  }) => {
    if (!u) return "Usuario"
    const p = u.profesional?.persona
    if (p?.nombres || p?.apellidos) return `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim() || (u.nombreApellido ?? u.usuario ?? "Usuario")
    return (u.nombreApellido?.trim() || u.usuario || "Usuario")
  }

  const creadorNombre = displayUser(cita.creadoPor)
  const last = cita.CitaEstadoHistorial?.[0]
  const ultimaTransicion = last
    ? {
        usuario: displayUser(last.cambiadoPor || undefined),
        fecha: last.changedAt.toISOString(),
        motivo: last.nota ?? null,
        estado: last.estadoNuevo, // opcional pero útil
      }
    : null

  const canceladoPorNombre = cita.canceladoPor ? displayUser(cita.canceladoPor) : null

  // Fetch active treatment plan for patient (if exists)
  const activePlan = await prisma.treatmentPlan.findFirst({
    where: {
      pacienteId: cita.paciente.idPaciente,
      status: "ACTIVE",
    },
    include: {
      steps: {
        where: {
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        include: {
          procedimientoCatalogo: {
            select: {
              nombre: true,
            },
          },
        },
        orderBy: { order: "asc" },
        take: 3, // Limit to first 3 pending steps for display
      },
    },
  })

  // Build planActivo context
  const planActivo = activePlan
    ? {
        titulo: activePlan.titulo,
        proximasEtapas: activePlan.steps.map((step) => {
          const stepName =
            step.procedimientoCatalogo?.nombre || step.serviceType || `Paso ${step.order}`
          if (step.requiresMultipleSessions && step.totalSessions && step.totalSessions > 1) {
            const currentSession = step.currentSession ?? 1
            return `${stepName} (Sesión ${currentSession} de ${step.totalSessions})`
          }
          return stepName
        }),
      }
    : null

  // Get last consultation and next appointment for context
  const ultimaConsulta = await prisma.consulta
    .findFirst({
      where: {
        cita: {
          pacienteId: cita.paciente.idPaciente,
          estado: { in: ["COMPLETED", "IN_PROGRESS"] },
        },
      },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    })
    .then((c) => c?.startedAt?.toISOString() ?? null)

  const proximoTurno = await prisma.cita
    .findFirst({
      where: {
        pacienteId: cita.paciente.idPaciente,
        estado: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
        inicio: { gt: cita.inicio }, // Future appointments only
      },
      orderBy: { inicio: "asc" },
      select: { inicio: true },
    })
    .then((c) => c?.inicio.toISOString() ?? null)

  const dto: CitaDetalleDTO = {
    idCita: cita.idCita,
    inicio: cita.inicio.toISOString(),
    fin: cita.fin.toISOString(),
    duracionMinutos: cita.duracionMinutos,
    estado: cita.estado,
    tipo: cita.tipo,
    motivo: cita.motivo ?? null,
    notas: cita.notas ?? null,

    paciente: {
      id: cita.paciente.idPaciente,
      personaId: cita.paciente.persona.idPersona, // Add persona ID for consent responsible party
      nombre: `${cita.paciente.persona.nombres} ${cita.paciente.persona.apellidos}`.trim(),
      fechaNacimiento: cita.paciente.persona.fechaNacimiento
        ? cita.paciente.persona.fechaNacimiento.toISOString()
        : "",
      documento: cita.paciente.persona.documento
        ? `${cita.paciente.persona.documento.tipo} ${cita.paciente.persona.documento.numero}`
        : null,
      telefono,
      email,
    },

    profesional: {
      id: cita.profesional.idProfesional,
      nombre: `${cita.profesional.persona.nombres} ${cita.profesional.persona.apellidos}`.trim(),
    },

    consultorio: cita.consultorio
      ? { id: cita.consultorio.idConsultorio, nombre: cita.consultorio.nombre, colorHex: cita.consultorio.colorHex }
      : null,

    alertas: {
      tieneAlergias,
      alergiasDetalle,
      obraSocial: null,
      noShowCount,
    },

    contexto: { planActivo, ultimaConsulta, proximoTurno },

    adjuntos: [],

    auditoria: {
      creadoPor: creadorNombre,
      creadoEn: cita.createdAt.toISOString(),
      ultimaTransicion,          // ⬅️ ahora se llena
      canceladoPor: canceladoPorNombre ?? null, // ⬅️ nuevo campo (si lo querés)
    },

    cancelReason: cita.cancelReason ?? null,

    timestamps: {
      checkinAt: cita.checkedInAt ? cita.checkedInAt.toISOString() : null,
      startAt: cita.startedAt ? cita.startedAt.toISOString() : null,
      completeAt: cita.completedAt ? cita.completedAt.toISOString() : null,
      cancelledAt: cita.cancelledAt ? cita.cancelledAt.toISOString() : null, // ⬅️ agregado
    },
  }

  return dto
}
