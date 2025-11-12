// src/app/api/pacientes/_repo.ts
import { prisma } from "@/lib/prisma";
import type { Prisma, EstadoCita, Genero, TipoDocumento, RelacionPaciente } from "@prisma/client";
import type { PacienteListFilters } from "@/lib/api/pacientes.types"
import { getStartOfDayInTZ, getEndOfDayInTZ, isTodayInTZ } from "@/lib/date-utils"

/** ==========================
 * Tipos de entrada/vista
 * ========================== */
export type PacienteListInput = {
  where: Prisma.PacienteWhereInput;
  orderBy:
    | Prisma.PacienteOrderByWithRelationInput
    | Prisma.PacienteOrderByWithRelationInput[];
  limit: number;
  cursorId?: number | null;
};

/** ==========================
 * DTO enriquecido para la lista
 * ========================== */
export type PacienteListItemDTO = {
  idPaciente: number;
  estaActivo: boolean;

  persona: {
    idPersona: number;
    nombres: string;
    apellidos: string;
    genero: string | null;
    fechaNacimiento: string | null; // ISO
  };

  documento: {
    tipo: string | null;
    numero: string | null;
    ruc: string | null;
  };

  contactos: Array<{
    tipo: "PHONE" | "EMAIL";
    valorNorm: string;
    esPrincipal: boolean;
    activo: boolean;
    whatsappCapaz?: boolean | null;
    esPreferidoRecordatorio?: boolean;
    esPreferidoCobranza?: boolean;
  }>;

  // Derivados
  edad: number | null;
  hasAlergias: boolean;
  hasMedicacion: boolean;
  obraSocial: string | null;
  hasResponsablePrincipal: boolean;

  // Agenda
  lastVisitAt: string | null; // ISO
  lastVisitProfesionalId: number | null;

  nextAppointmentAt: string | null; // ISO
  nextAppointmentEstado:
    | Extract<EstadoCita,"SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS">
    | null;
  nextAppointmentProfesionalId: number | null;
  nextAppointmentConsultorioId: number | null;

  // Tratamiento
  activePlansCount: number;
};


/** ==========================
 * Repositorio
 * ========================== */
export const pacienteRepo = {
  createPersonaConDocumento: (
    tx: Prisma.TransactionClient,
    data: {
      nombres: string;
      apellidos: string;
      genero: string | null;
      fechaNacimiento: Date | null;
      direccion: string | null;
      doc: { tipo: string; numero: string; ruc?: string | null; paisEmision?: string | null };
    }
  ) => {
    return tx.persona.create({
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        genero: data.genero as Genero | null,
        fechaNacimiento: data.fechaNacimiento,
        direccion: data.direccion,
        estaActivo: true,
        documento: {
          create: {
            tipo: (data.doc.tipo as TipoDocumento) ?? "CI",
            numero: data.doc.numero,
            ruc: data.doc.ruc ?? null,
            paisEmision: data.doc.paisEmision ?? "PY",
          },
        },
      },
    });
  },

  createContactoTelefono: async (
    tx: Prisma.TransactionClient,
    data: {
      personaId: number;
      valorRaw: string;
      valorNorm: string;
      whatsappCapaz?: boolean;
      smsCapaz?: boolean;
      prefer: { recordatorio?: boolean; cobranza?: boolean };
    }
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
    });

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
        label: "Móvil",
        whatsappCapaz: data.whatsappCapaz ?? true,
        smsCapaz: data.smsCapaz ?? true,
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
        whatsappCapaz: data.whatsappCapaz ?? true,
        smsCapaz: data.smsCapaz ?? true,
        esPrincipal: true,
        esPreferidoRecordatorio: !!data.prefer.recordatorio,
        esPreferidoCobranza: !!data.prefer.cobranza,
        activo: true,
      },
    });
  },


  createContactoEmail: async (
    tx: Prisma.TransactionClient,
    data: {
      personaId: number;
      valorRaw: string;
      valorNorm: string;
      prefer: { recordatorio?: boolean; cobranza?: boolean };
    }
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
      });
    }

    if (data.prefer.cobranza) {
      await tx.personaContacto.updateMany({
        where: {
          personaId: data.personaId,
          esPreferidoCobranza: true,
          NOT: { tipo: "EMAIL", valorNorm: data.valorNorm },
        },
        data: { esPreferidoCobranza: false },
      });
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
    });
  },

  createPaciente: (
    tx: Prisma.TransactionClient,
    data: { personaId: number; notasJson: Record<string, unknown> }
  ) =>
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

  linkResponsablePago: (
    tx: Prisma.TransactionClient,
    data: { pacienteId: number; personaId: number; relacion: RelacionPaciente; esPrincipal: boolean; autoridadLegal?: boolean }
  ) => {
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
};






export async function listPacientes(filters: PacienteListFilters) {
  const { q, createdFrom, createdTo, estaActivo, sort = "createdAt_desc", cursor, limit = 20 } = filters

  // Build where clause
  const where: Prisma.PacienteWhereInput = {
    ...(estaActivo !== undefined && { estaActivo }),
  }

  // Date filters with TZ normalization
  if (createdFrom || createdTo) {
    where.createdAt = {}
    if (createdFrom) {
      where.createdAt.gte = getStartOfDayInTZ(createdFrom)
    }
    if (createdTo) {
      where.createdAt.lte = getEndOfDayInTZ(createdTo)
    }
  }

  // Search query
  if (q && q.trim()) {
    const searchTerm = q.trim()
    where.OR = [
      {
        persona: {
          OR: [
            { nombres: { contains: searchTerm, mode: "insensitive" } },
            { apellidos: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
      },
      {
        persona: {
          documento: {
            numero: { contains: searchTerm, mode: "insensitive" },
          },
        },
      },
      {
        persona: {
          contactos: {
            some: {
              valorNorm: { contains: searchTerm, mode: "insensitive" },
            },
          },
        },
      },
    ]
  }

  // Cursor pagination setup
  let cursorObj: Prisma.PacienteWhereUniqueInput | undefined
  if (cursor) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64").toString())
      if (sort.startsWith("createdAt")) {
        cursorObj = { idPaciente: parsed.idPaciente }
      } else if (sort.startsWith("nombre")) {
        cursorObj = { idPaciente: parsed.idPaciente }
      }
    } catch {
      // Invalid cursor, ignore
    }
  }

  // Order by
  let orderBy: Prisma.PacienteOrderByWithRelationInput[]
  if (sort === "createdAt_asc") {
    orderBy = [{ createdAt: "asc" }, { idPaciente: "asc" }]
  } else if (sort === "createdAt_desc") {
    orderBy = [{ createdAt: "desc" }, { idPaciente: "desc" }]
  } else if (sort === "nombre_asc") {
    orderBy = [{ persona: { apellidos: "asc" } }, { persona: { nombres: "asc" } }, { idPaciente: "asc" }]
  } else {
    orderBy = [{ persona: { apellidos: "desc" } }, { persona: { nombres: "desc" } }, { idPaciente: "desc" }]
  }

  // Fetch data
  const items = await prisma.paciente.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursorObj && { skip: 1, cursor: cursorObj }),
    include: {
      persona: {
        include: {
          documento: true,
          contactos: {
            where: { activo: true },
            orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
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

  // Map to DTOs
  const dtos: PacienteListItemDTO[] = resultItems.map((p) => {
    const edad = p.persona.fechaNacimiento
      ? Math.floor((Date.now() - new Date(p.persona.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const contactoPrincipal = p.persona.contactos[0]
      ? {
          tipo: p.persona.contactos[0].tipo,
          valor: p.persona.contactos[0].valorRaw,
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
  let nextCursor: string | null = null
  if (hasMore) {
    const lastItem = resultItems[resultItems.length - 1]
    const cursorData = {
      idPaciente: lastItem.idPaciente,
      createdAt: lastItem.createdAt.toISOString(),
      apellidos: lastItem.persona.apellidos,
      nombres: lastItem.persona.nombres,
    }
    nextCursor = Buffer.from(JSON.stringify(cursorData)).toString("base64")
  }

  return {
    items: dtos,
    nextCursor,
    hasMore,
  }
}

export async function createPaciente(data: {
  nombres: string
  apellidos: string
  fechaNacimiento?: Date
  genero?: string
  direccion?: string
  documento?: {
    tipo: string
    numero: string
    paisEmision?: string
  }
  telefono?: string
  email?: string
  notas?: string
}) {
  return await prisma.$transaction(async (tx) => {
    // Create Persona
    const persona = await tx.persona.create({
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        fechaNacimiento: data.fechaNacimiento,
        genero: data.genero as Genero | null,
        direccion: data.direccion,
      },
    })

    // Create Documento if provided
    if (data.documento) {
      await tx.documento.create({
        data: {
          personaId: persona.idPersona,
          tipo: data.documento.tipo as TipoDocumento,
          numero: data.documento.numero,
          paisEmision: data.documento.paisEmision ?? "PY",
        },
      })
    }

    // Create contacts
    if (data.telefono) {
      const { normalizePhonePY } = await import("@/lib/normalize");
      const telNorm = normalizePhonePY(data.telefono);
      if (telNorm) {
        await pacienteRepo.createContactoTelefono(tx, {
          personaId: persona.idPersona,
          valorRaw: data.telefono,
          valorNorm: telNorm,
          whatsappCapaz: true,
          smsCapaz: true,
          prefer: {},
        });
      }
    }

    if (data.email) {
      const { normalizeEmail } = await import("@/lib/normalize");
      const emailNorm = normalizeEmail(data.email);
      if (emailNorm) {
        await pacienteRepo.createContactoEmail(tx, {
          personaId: persona.idPersona,
          valorRaw: data.email,
          valorNorm: emailNorm,
          prefer: {},
        });
      }
    }

    // Create Paciente
    const paciente = await tx.paciente.create({
      data: {
        personaId: persona.idPersona,
        notas: data.notas,
      },
    })

    return {
      idPaciente: paciente.idPaciente,
      personaId: persona.idPersona,
    }
  })
}
