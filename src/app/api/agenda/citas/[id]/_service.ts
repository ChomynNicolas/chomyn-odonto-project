// app/api/agenda/citas/[id]/_service.ts
// ============================================================================
// SERVICE - Detalle de Cita (con RBAC)
// ============================================================================
import { PrismaClient, EstadoCita } from "@prisma/client"
import type { CitaDetalleDTO, RolUsuario } from "@/types/agenda"

const prisma = new PrismaClient()

export async function getCitaDetail(idCita: number, rol?: RolUsuario): Promise<CitaDetalleDTO | null> {
  // construir select dinámico para PatientAllergy (evitar take: undefined)
  const patientAllergySelect: any = {
    where: { isActive: true },
    select: { idPatientAllergy: true, label: true },
  }
  if (rol === "RECEP") patientAllergySelect.take = 1

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
      cancelReason: true,

      // nombres correctos
      checkedInAt: true,
      startedAt: true,
      completedAt: true,

      createdAt: true,

      paciente: {
        select: {
          idPaciente: true,
          persona: {
            select: {
              nombres: true,
              apellidos: true,
              documento: { select: { tipo: true, numero: true } },
              contactos: {
                where: { activo: true },
                select: { tipo: true, valorNorm: true, esPrincipal: true },
              },
            },
          },
          PatientAllergy: patientAllergySelect,
          // aproximación de no-show
          citas: { where: { estado: EstadoCita.NO_SHOW }, select: { idCita: true } },
        },
      },

      profesional: {
        select: {
          idProfesional: true,
          persona: { select: { nombres: true, apellidos: true } },
        },
      },

      consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },

      // 🔧 Usuario NO tiene 'persona'; usamos profesional.persona o nombreApellido / usuario
      creadoPor: {
        select: {
          idUsuario: true,
          usuario: true,
          nombreApellido: true,
          profesional: {
            select: { persona: { select: { nombres: true, apellidos: true } } },
          },
        },
      },
    },
  })

  if (!cita) return null

  // Contacto principal
  const contactos = cita.paciente.persona.contactos
  const principal = contactos.find((c) => c.esPrincipal)
  const telefono =
    principal?.tipo === "PHONE" ? principal.valorNorm : (contactos.find((c) => c.tipo === "PHONE")?.valorNorm ?? null)
  const email =
    principal?.tipo === "EMAIL" ? principal.valorNorm : (contactos.find((c) => c.tipo === "EMAIL")?.valorNorm ?? null)

  // Alergias y KPIs
  const tieneAlergias = (cita.paciente.PatientAllergy?.length ?? 0) > 0
  const alergiasDetalle =
    rol === "RECEP"
      ? null
      : (cita.paciente.PatientAllergy
          ?.map((a: any) => a.label)
          .filter(Boolean)
          .join(", ") || null)

  const noShowCount = cita.paciente.citas.length

  // Nombre del creador (fallbacks)
  const creadorProfesional = cita.creadoPor.profesional?.persona
  const creadoPorNombre =
    (creadorProfesional
      ? `${creadorProfesional.nombres} ${creadorProfesional.apellidos}`.trim()
      : (cita.creadoPor.nombreApellido?.trim() || cita.creadoPor.usuario)) || "Usuario"

  const dto: CitaDetalleDTO = {
    idCita: cita.idCita,
    inicio: cita.inicio.toISOString(),
    fin: cita.fin.toISOString(),
    duracionMinutos: cita.duracionMinutos,
    estado: cita.estado,
    tipo: cita.tipo,
    motivo: cita.motivo,
    notas: cita.notas,

    paciente: {
      id: cita.paciente.idPaciente,
      nombre: `${cita.paciente.persona.nombres} ${cita.paciente.persona.apellidos}`.trim(),
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
      obraSocial: null, // aún no modelada
      noShowCount,
    },

    contexto: {
      planActivo: null,
      ultimaConsulta: null,
      proximoTurno: null,
    },

    adjuntos: [],

    auditoria: {
      creadoPor: creadoPorNombre,
      creadoEn: cita.createdAt.toISOString(),
      ultimaTransicion: null,
    },

    cancelReason: cita.cancelReason,

    timestamps: {
      checkinAt: cita.checkedInAt ? cita.checkedInAt.toISOString() : null,
      startAt: cita.startedAt ? cita.startedAt.toISOString() : null,
      completeAt: cita.completedAt ? cita.completedAt.toISOString() : null,
    },
  }

  return dto
}
