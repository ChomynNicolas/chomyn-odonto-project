// src/app/api/pacientes/_repo.ts
import { prisma } from "@/lib/prisma"
import type { Prisma, TipoDocumento, RelacionPaciente, Genero } from "@prisma/client"
import { isTodayInTZ } from "@/lib/date-utils"

/** ==========================
 * Tipos de entrada/vista
 * ========================== */
export type PacienteListInput = {
  where: Prisma.PacienteWhereInput
  orderBy: Prisma.PacienteOrderByWithRelationInput | Prisma.PacienteOrderByWithRelationInput[]
  limit: number
  cursorId?: number | null
}

/** ==========================
 * DTO enriquecido para la lista
 * ========================== */
export type PacienteListItemDTO = {
  idPaciente: number
  personaId: number
  nombres: string
  apellidos: string
  nombreCompleto: string
  fechaNacimiento: string | null
  edad: number | null
  genero: string | null
  documento: {
    tipo: string
    numero: string
  } | null
  contactoPrincipal: {
    tipo: "PHONE" | "EMAIL"
    valor: string
    whatsappCapaz?: boolean
  } | null
  estaActivo: boolean
  createdAt: string
  proximaCita: {
    idCita: number
    inicio: string
    tipo: string
    profesional: string
    esHoy: boolean
  } | null
}

/** ==========================
 * Repositorio
 * ========================== */
export const pacienteRepo = {
  createPersonaConDocumento: async (
    tx: Prisma.TransactionClient,
    data: {
      nombres: string
      apellidos: string
      segundoApellido?: string | null
      genero: Genero | string
      fechaNacimiento: Date | null
      direccion: string | null
      doc: {
        tipo: TipoDocumento | string
        numero: string
        ruc?: string | null
        paisEmision?: string | null
      }
    },
  ) => {
    const persona = await tx.persona.create({
      data: {
        nombres: data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        segundoApellido: data.segundoApellido?.trim() ?? null,
        genero: (data.genero as Genero) ?? null,
        fechaNacimiento: data.fechaNacimiento,
        direccion: data.direccion,
        estaActivo: true,
        documento: {
          create: {
            tipo: data.doc.tipo as TipoDocumento,
            numero: data.doc.numero.trim(),
            ruc: data.doc.ruc ?? null,
            paisEmision: data.doc.paisEmision ?? "PY",
          },
        },
      },
      include: {
        documento: true,
      },
    })

    return persona
  },

  createContactoTelefono: async (
    tx: Prisma.TransactionClient,
    data: {
      personaId: number
      valorRaw: string
      valorNorm: string
      whatsappCapaz?: boolean
      smsCapaz?: boolean
      prefer: { recordatorio?: boolean; cobranza?: boolean }
    },
  ) => {
    // 1) Degradar cualquier PHONE principal previo (si es distinto número)
    await tx.personaContacto.updateMany({
      where: {
        personaId: data.personaId,
        tipo: "PHONE",
        esPrincipal: true,
        NOT: { valorNorm: data.valorNorm },
      },
      data: { esPrincipal: false },
    })

    // 2) Upsert del número (idempotente)
    return tx.personaContacto.upsert({
      where: {
        personaId_tipo_valorNorm: {
          personaId: data.personaId,
          tipo: "PHONE",
          valorNorm: data.valorNorm,
        },
      },
      update: {
        valorRaw: data.valorRaw,
        label: "Móvil",
        whatsappCapaz: data.whatsappCapaz ?? null,
        smsCapaz: data.smsCapaz ?? null,
        esPrincipal: true, // único principal
        esPreferidoRecordatorio: !!data.prefer.recordatorio,
        esPreferidoCobranza: !!data.prefer.cobranza,
        activo: true,
      },
      create: {
        personaId: data.personaId,
        tipo: "PHONE",
        valorRaw: data.valorRaw,
        valorNorm: data.valorNorm,
        label: "Móvil",
        whatsappCapaz: data.whatsappCapaz ?? null,
        smsCapaz: data.smsCapaz ?? null,
        esPrincipal: true,
        esPreferidoRecordatorio: !!data.prefer.recordatorio,
        esPreferidoCobranza: !!data.prefer.cobranza,
        activo: true,
      },
    })
  },

  createContactoEmail: async (
    tx: Prisma.TransactionClient,
    data: {
      personaId: number
      valorRaw: string
      valorNorm: string
      prefer: { recordatorio?: boolean; cobranza?: boolean }
    },
  ) => {
    // 1) Degradar cualquier contacto previo que sea preferido para recordatorio/cobranza
    // si el email va a ser preferido (para evitar conflictos con índices únicos parciales)
    if (data.prefer.recordatorio) {
      await tx.personaContacto.updateMany({
        where: {
          personaId: data.personaId,
          esPreferidoRecordatorio: true,
          NOT: { tipo: "EMAIL", valorNorm: data.valorNorm },
        },
        data: { esPreferidoRecordatorio: false },
      })
    }

    if (data.prefer.cobranza) {
      await tx.personaContacto.updateMany({
        where: {
          personaId: data.personaId,
          esPreferidoCobranza: true,
          NOT: { tipo: "EMAIL", valorNorm: data.valorNorm },
        },
        data: { esPreferidoCobranza: false },
      })
    }

    // 2) Upsert del email (idempotente)
    return tx.personaContacto.upsert({
      where: {
        personaId_tipo_valorNorm: {
          personaId: data.personaId,
          tipo: "EMAIL",
          valorNorm: data.valorNorm,
        },
      },
      update: {
        valorRaw: data.valorRaw,
        label: "Correo",
        esPrincipal: false, // ← nunca principal
        esPreferidoRecordatorio: !!data.prefer.recordatorio,
        esPreferidoCobranza: !!data.prefer.cobranza,
        activo: true,
      },
      create: {
        personaId: data.personaId,
        tipo: "EMAIL",
        valorRaw: data.valorRaw,
        valorNorm: data.valorNorm,
        label: "Correo",
        esPrincipal: false, // ← nunca principal
        esPreferidoRecordatorio: !!data.prefer.recordatorio,
        esPreferidoCobranza: !!data.prefer.cobranza,
        activo: true,
      },
    })
  },

  createPaciente: (tx: Prisma.TransactionClient, data: { personaId: number; notasJson: Record<string, unknown> }) =>
    tx.paciente.create({
      data: {
        personaId: data.personaId,
        notas: JSON.stringify(data.notasJson ?? {}),
        estaActivo: true,
      },
    }),

  /**
   * Determina si una relación tiene autoridad legal para firmar consentimientos
   * Según la legislación paraguaya y buenas prácticas:
   * - PADRE, MADRE: tienen autoridad legal automática sobre menores
   * - TUTOR: tiene autoridad legal cuando está legalmente designado
   * - CONYUGE: puede tener autoridad en casos específicos (adultos con discapacidad)
   * - Otros: requieren autorización específica
   */
  tieneAutoridadLegal: (relacion: string, autoridadLegalExplicita?: boolean): boolean => {
    // Si se especifica explícitamente, respetar esa decisión
    if (autoridadLegalExplicita !== undefined) {
      return autoridadLegalExplicita
    }

    // Relaciones con autoridad legal automática
    const relacionesConAutoridadLegal = ["PADRE", "MADRE", "TUTOR"]
    return relacionesConAutoridadLegal.includes(relacion)
  },

  linkResponsablePago: (tx: Prisma.TransactionClient, data: { pacienteId: number; personaId: number; relacion: RelacionPaciente; esPrincipal: boolean; autoridadLegal?: boolean }) => {
    // Determinar autoridad legal según la relación
    const tieneAutoridadLegal = pacienteRepo.tieneAutoridadLegal(data.relacion, data.autoridadLegal)

    return tx.pacienteResponsable.create({
      data: {
        pacienteId: data.pacienteId,
        personaId: data.personaId,
        relacion: data.relacion,
        esPrincipal: data.esPrincipal,
        autoridadLegal: tieneAutoridadLegal,
      },
    })
  },

  getPacienteUI: (idPaciente: number) =>
    prisma.paciente.findUnique({
      where: { idPaciente },
      include: {
        persona: {
          select: {
            idPersona: true,
            nombres: true,
            apellidos: true,
            genero: true,
            fechaNacimiento: true,
            documento: { select: { tipo: true, numero: true, ruc: true } },
            contactos: {
              select: {
                tipo: true,
                valorNorm: true,
                activo: true,
                esPrincipal: true,
                whatsappCapaz: true,
                esPreferidoRecordatorio: true,
                esPreferidoCobranza: true,
              },
            },
          },
        },
      },
    }),

  listPacientes: async (input: PacienteListInput) => {
    const { where, orderBy, limit, cursorId } = input

    // Fetch data
    const items = await prisma.paciente.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursorId && { skip: 1, cursor: { idPaciente: cursorId } }),
      include: {
        persona: {
          include: {
            documento: true,
            contactos: {
              where: { activo: true },
              orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
              select: {
                tipo: true,
                valorRaw: true,
                valorNorm: true,
                whatsappCapaz: true,
              },
            },
          },
        },
        citas: {
          where: {
            inicio: { gte: new Date() },
            estado: { in: ["SCHEDULED", "CONFIRMED"] },
          },
          orderBy: { inicio: "asc" },
          take: 1,
          include: {
            profesional: {
              include: {
                persona: true,
              },
            },
          },
        },
      },
    })

    const hasMore = items.length > limit
    const resultItems = hasMore ? items.slice(0, limit) : items

    // Count total (for pagination info)
    const totalCount = await prisma.paciente.count({ where })

    // Map to DTOs
    const dtos: PacienteListItemDTO[] = resultItems.map((p) => {
      const edad = p.persona.fechaNacimiento
        ? Math.floor((Date.now() - new Date(p.persona.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      const contactoPrincipal = p.persona.contactos[0]
        ? {
            tipo: p.persona.contactos[0].tipo,
            valor: p.persona.contactos[0].valorRaw ?? p.persona.contactos[0].valorNorm ?? "",
            whatsappCapaz: p.persona.contactos[0].whatsappCapaz ?? undefined,
          }
        : null

      const proximaCita = p.citas[0]
        ? {
            idCita: p.citas[0].idCita,
            inicio: p.citas[0].inicio.toISOString(),
            tipo: p.citas[0].tipo,
            profesional: `${p.citas[0].profesional.persona.nombres} ${p.citas[0].profesional.persona.apellidos}`,
            esHoy: isTodayInTZ(p.citas[0].inicio),
          }
        : null

      return {
        idPaciente: p.idPaciente,
        personaId: p.personaId,
        nombres: p.persona.nombres,
        apellidos: p.persona.apellidos,
        nombreCompleto: `${p.persona.nombres} ${p.persona.apellidos}`,
        fechaNacimiento: p.persona.fechaNacimiento?.toISOString() ?? null,
        edad,
        genero: p.persona.genero,
        documento: p.persona.documento
          ? {
              tipo: p.persona.documento.tipo,
              numero: p.persona.documento.numero,
            }
          : null,
        contactoPrincipal,
        estaActivo: p.estaActivo,
        createdAt: p.createdAt.toISOString(),
        proximaCita,
      }
    })

    // Generate next cursor
    let nextCursor: number | null = null
    if (hasMore) {
      const lastItem = resultItems[resultItems.length - 1]
      nextCursor = lastItem.idPaciente
    }

    return {
      items: dtos,
      nextCursor,
      hasMore,
      totalCount,
    }
  },
}

