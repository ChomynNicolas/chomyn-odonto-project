import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const consentimientoRepo = {
  // Verificar si paciente existe
  verificarPacienteExiste: async (pacienteId: number) => {
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: {
        idPaciente: true,
        persona: {
          select: {
            fechaNacimiento: true,
          },
        },
      },
    })
    return paciente
  },

  // Verificar si responsable está vinculado al paciente
  verificarResponsableVinculado: async (pacienteId: number, responsablePersonaId: number) => {
    const vinculo = await prisma.pacienteResponsable.findFirst({
      where: {
        pacienteId,
        personaId: responsablePersonaId,
        // Solo responsables vigentes (sin vigenteHasta o vigenteHasta en el futuro)
        OR: [
          { vigenteHasta: null },
          { vigenteHasta: { gte: new Date() } },
        ],
      },
      select: {
        idPacienteResponsable: true,
        relacion: true,
        autoridadLegal: true,
      },
    })
    return vinculo
  },

  // Buscar consentimiento vigente
  buscarConsentimientoVigente: async (pacienteId: number, tipo: string, responsablePersonaId?: number) => {
    const where: Prisma.ConsentimientoWhereInput = {
      Paciente_idPaciente: pacienteId,
      tipo: tipo as any,
      activo: true,
      vigente_hasta: { gte: new Date() },
    }

    if (responsablePersonaId) {
      where.Persona_idPersona_responsable = responsablePersonaId
    }

    return await prisma.consentimiento.findFirst({
      where,
      orderBy: { firmado_en: "desc" },
      select: {
        idConsentimiento: true,
        vigente_hasta: true,
      },
    })
  },

  // Crear consentimiento
  crear: async (
    tx: Prisma.TransactionClient,
    data: {
      pacienteId: number
      responsablePersonaId: number
      citaId: number | null
      tipo: string
      firmadoEn: Date
      vigenteHasta: Date
      publicId: string
      secureUrl: string
      format: string | null
      bytes: number
      width: number | null
      height: number | null
      hash: string | null
      observaciones: string | null
      registradoPorUsuarioId: number
    },
  ) => {
    return await tx.consentimiento.create({
      data: {
        Paciente_idPaciente: data.pacienteId,
        Persona_idPersona_responsable: data.responsablePersonaId,
        Cita_idCita: data.citaId,
        tipo: data.tipo as any,
        firmado_en: data.firmadoEn,
        vigente_hasta: data.vigenteHasta,
        public_id: data.publicId,
        secure_url: data.secureUrl,
        format: data.format,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        hash: data.hash,
        provider: "CLOUDINARY",
        observaciones: data.observaciones,
        version: 1,
        activo: true,
        Usuario_idUsuario_registradoPor: data.registradoPorUsuarioId,
      },
      include: {
        responsable: {
          include: {
            documento: true,
          },
        },
        cita: {
          select: {
            idCita: true,
            inicio: true,
            tipo: true,
          },
        },
        registradoPor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
      },
    })
  },

  // Listar consentimientos
  listar: async (params: {
    pacienteId: number
    tipo?: string
    vigente?: boolean
    responsableId?: number
    limit: number
  }) => {
    const where: Prisma.ConsentimientoWhereInput = {
      Paciente_idPaciente: params.pacienteId,
      activo: true,
    }

    if (params.tipo) {
      where.tipo = params.tipo as any
    }

    if (params.vigente !== undefined) {
      if (params.vigente) {
        where.vigente_hasta = { gte: new Date() }
      } else {
        where.vigente_hasta = { lt: new Date() }
      }
    }

    if (params.responsableId) {
      where.Persona_idPersona_responsable = params.responsableId
    }

    const consentimientos = await prisma.consentimiento.findMany({
      where,
      orderBy: { firmado_en: "desc" },
      take: params.limit,
      include: {
        responsable: {
          include: {
            documento: true,
            PacienteResponsable: {
              where: { pacienteId: params.pacienteId },
              select: { relacion: true },
              take: 1,
            },
          },
        },
        cita: {
          select: {
            idCita: true,
            inicio: true,
            tipo: true,
          },
        },
        registradoPor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
      },
    })

    return consentimientos
  },

  // Obtener consentimiento por ID
  obtenerPorId: async (idConsentimiento: number) => {
    return await prisma.consentimiento.findUnique({
      where: { idConsentimiento },
      include: {
        responsable: {
          include: {
            documento: true,
            PacienteResponsable: {
              select: { relacion: true, pacienteId: true },
              take: 1,
            },
          },
        },
        cita: {
          select: {
            idCita: true,
            inicio: true,
            tipo: true,
          },
        },
        registradoPor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
      },
    })
  },

  // Revocar consentimiento (soft delete)
  revocar: async (tx: Prisma.TransactionClient, idConsentimiento: number, observaciones: string) => {
    return await tx.consentimiento.update({
      where: { idConsentimiento },
      data: {
        activo: false,
        observaciones: observaciones,
        updatedAt: new Date(),
      },
    })
  },
}
