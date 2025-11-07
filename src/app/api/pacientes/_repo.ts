// src/app/api/pacientes/_repo.ts
import { prisma } from "@/lib/prisma";
import type { Prisma, EstadoCita } from "@prisma/client";
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
        genero: data.genero as any,
        fechaNacimiento: data.fechaNacimiento,
        direccion: data.direccion,
        estaActivo: true,
        documento: {
          create: {
            tipo: (data.doc.tipo as any) ?? "CI",
            numero: data.doc.numero,
            ruc: data.doc.ruc ?? null,
            paisEmision: data.doc.paisEmision ?? "PY",
          },
        },
      },
    });
  },

  createContactoTelefono: (
    tx: Prisma.TransactionClient,
    data: {
      personaId: number;
      valorRaw: string;
      valorNorm: string;
      prefer: { recordatorio?: boolean; cobranza?: boolean };
    }
  ) =>
    tx.personaContacto.create({
      data: {
        personaId: data.personaId,
        tipo: "PHONE",
        valorRaw: data.valorRaw,
        valorNorm: data.valorNorm,
        label: "Móvil",
        whatsappCapaz: true,
        smsCapaz: true,
        esPrincipal: true,
        esPreferidoRecordatorio: !!data.prefer.recordatorio,
        esPreferidoCobranza: !!data.prefer.cobranza,
        activo: true,
      },
    }),

  createContactoEmail: (
    tx: Prisma.TransactionClient,
    data: {
      personaId: number;
      valorRaw: string;
      valorNorm: string;
      prefer: { recordatorio?: boolean; cobranza?: boolean };
    }
  ) =>
    tx.personaContacto.create({
      data: {
        personaId: data.personaId,
        tipo: "EMAIL",
        valorRaw: data.valorRaw,
        valorNorm: data.valorNorm,
        label: "Correo",
        esPrincipal: true,
        esPreferidoRecordatorio: !!data.prefer.recordatorio,
        esPreferidoCobranza: !!data.prefer.cobranza,
        activo: true,
      },
    }),

  createPaciente: (
    tx: Prisma.TransactionClient,
    data: { personaId: number; notasJson: any }
  ) =>
    tx.paciente.create({
      data: {
        personaId: data.personaId,
        notas: JSON.stringify(data.notasJson ?? {}),
        estaActivo: true,
      },
    }),

  linkResponsablePago: (
    tx: Prisma.TransactionClient,
    data: { pacienteId: number; personaId: number; relacion: any; esPrincipal: boolean }
  ) =>
    tx.pacienteResponsable.create({
      data: {
        pacienteId: data.pacienteId,
        personaId: data.personaId,
        relacion: data.relacion,
        esPrincipal: data.esPrincipal,
        autoridadLegal: false,
      },
    }),

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
        genero: data.genero as any,
        direccion: data.direccion,
      },
    })

    // Create Documento if provided
    if (data.documento) {
      await tx.documento.create({
        data: {
          personaId: persona.idPersona,
          tipo: data.documento.tipo as any,
          numero: data.documento.numero,
          paisEmision: data.documento.paisEmision ?? "PY",
        },
      })
    }

    // Create contacts
    if (data.telefono) {
      const { normalizePhonePY } = await import("@/lib/normalize")
      await tx.personaContacto.create({
        data: {
          personaId: persona.idPersona,
          tipo: "PHONE",
          valorRaw: data.telefono,
          valorNorm: normalizePhonePY(data.telefono),
          esPrincipal: true,
          whatsappCapaz: true,
        },
      })
    }

    if (data.email) {
      const { normalizeEmail } = await import("@/lib/normalize")
      await tx.personaContacto.create({
        data: {
          personaId: persona.idPersona,
          tipo: "EMAIL",
          valorRaw: data.email,
          valorNorm: normalizeEmail(data.email),
          esPrincipal: !data.telefono,
        },
      })
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
