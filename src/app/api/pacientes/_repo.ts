// src/app/api/pacientes/_repo.ts
import { prisma } from "@/lib/prisma";
import type { Prisma, EstadoCita } from "@prisma/client";

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
 * Helpers internos
 * ========================== */
function computeAgeFrom(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

type NotasParsed = {
  antecedentesMedicos?: unknown;
  alergias?: unknown[] | string | null;
  medicacion?: unknown[] | string | null;
  obraSocial?: string | null;
  [k: string]: unknown;
};

function safeParseNotas(notas: string | null | undefined): NotasParsed {
  if (!notas) return {};
  try {
    const obj = JSON.parse(notas) as NotasParsed;
    return obj ?? {};
  } catch {
    return {};
  }
}

const FUTURE_WHITELIST: EstadoCita[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
];
const PAST_EXCLUDE: EstadoCita[] = ["CANCELLED", "NO_SHOW"];

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

  /** ========================================================
   * LISTA ENRIQUECIDA (sin N+1) — B1 completo
   * ======================================================== */
  listPacientes: async (args: PacienteListInput) => {
    const { where, orderBy, limit, cursorId } = args;

    // 1) Base + totalCount
    const [itemsRaw, totalCount] = await Promise.all([
      prisma.paciente.findMany({
        where,
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
                  esPrincipal: true,
                  activo: true,
                  whatsappCapaz: true,
                  esPreferidoRecordatorio: true,
                  esPreferidoCobranza: true,
                },
              },
            },
          },
        },
        orderBy,
        take: limit + 1,
        ...(cursorId ? { skip: 1, cursor: { idPaciente: cursorId } } : {}),
      }),
      prisma.paciente.count({ where }),
    ]);

    // Cursor
    let nextCursor: number | null = null;
    const itemsPage = [...itemsRaw];
    if (itemsPage.length > limit) {
      const next = itemsPage.pop()!;
      nextCursor = next.idPaciente;
    }

    const pageIds = itemsPage.map((p) => p.idPaciente);
    if (pageIds.length === 0) {
      return { items: [] as PacienteListItemDTO[], nextCursor, hasMore: nextCursor !== null, totalCount };
    }

    const now = new Date();

    // 2) ÚLTIMA VISITA
    const lastMaxByPaciente = await prisma.cita.groupBy({
      by: ["pacienteId"],
      where: {
        pacienteId: { in: pageIds },
        inicio: { lt: now },
        estado: { notIn: PAST_EXCLUDE },
      },
      _max: { inicio: true },
    });
    const lastMaxMap = new Map<number, Date>();
    for (const row of lastMaxByPaciente) {
      const d = row._max.inicio;
      if (d) lastMaxMap.set(row.pacienteId, d);
    }

    let lastDetailMap = new Map<number, { at: Date; profesionalId: number | null }>();
    if (lastMaxMap.size > 0) {
      const orPairs = Array.from(lastMaxMap.entries()).map(([pacienteId, inicio]) => ({ pacienteId, inicio }));
      const lastRows = await prisma.cita.findMany({
        where: { OR: orPairs },
        select: { pacienteId: true, inicio: true, profesionalId: true },
      });
      lastDetailMap = new Map(lastRows.map(r => [r.pacienteId, { at: r.inicio, profesionalId: r.profesionalId ?? null }]));
    }

    // 3) PRÓXIMA CITA
    const nextRows = await prisma.cita.findMany({
      where: {
        pacienteId: { in: pageIds },
        inicio: { gte: now },
        estado: { in: FUTURE_WHITELIST },
      },
      orderBy: [{ pacienteId: "asc" }, { inicio: "asc" }],
      select: { pacienteId: true, inicio: true, profesionalId: true, consultorioId: true, estado: true },
    });
    const nextByPaciente = new Map<number, { at: Date; profesionalId: number | null; consultorioId: number | null; estado: EstadoCita }>();
    for (const row of nextRows) {
      if (!nextByPaciente.has(row.pacienteId)) {
        nextByPaciente.set(row.pacienteId, {
          at: row.inicio,
          profesionalId: row.profesionalId ?? null,
          consultorioId: row.consultorioId ?? null,
          estado: row.estado,
        });
      }
    }

    // 4) PLANES ACTIVOS
    const plansGroup = await prisma.treatmentPlan.groupBy({
      by: ["pacienteId"],
      where: { pacienteId: { in: pageIds }, isActive: true },
      _count: { _all: true },
    });
    const plansCountMap = new Map<number, number>(plansGroup.map(g => [g.pacienteId, g._count._all]));

    // 5) RESPONSABLE PRINCIPAL
    const responsables = await prisma.pacienteResponsable.findMany({
      where: { pacienteId: { in: pageIds }, esPrincipal: true },
      select: { pacienteId: true },
    });
    const hasMainPayer = new Set<number>(responsables.map(r => r.pacienteId));

    // 6) DTO final
    const items: PacienteListItemDTO[] = itemsPage.map((p) => {
      const persona = p.persona!;
      const doc = persona.documento ?? null;

      const edad = persona.fechaNacimiento ? computeAgeFrom(persona.fechaNacimiento.toISOString()) : null;
      const parsed = safeParseNotas(p.notas ?? null);

      const obraSocial = typeof parsed.obraSocial === "string" ? parsed.obraSocial : null;
      const hasAlergias =
        Array.isArray(parsed.alergias) ? parsed.alergias.length > 0
        : typeof parsed.alergias === "string" ? parsed.alergias.trim().length > 0
        : false;
      const hasMedicacion =
        Array.isArray(parsed.medicacion) ? parsed.medicacion.length > 0
        : typeof parsed.medicacion === "string" ? parsed.medicacion.trim().length > 0
        : false;

      const last = lastDetailMap.get(p.idPaciente) ?? null;
      const next = nextByPaciente.get(p.idPaciente) ?? null;

      return {
        idPaciente: p.idPaciente,
        estaActivo: p.estaActivo,
        persona: {
          idPersona: persona.idPersona,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          genero: (persona.genero as any) ?? null,
          fechaNacimiento: persona.fechaNacimiento?.toISOString() ?? null,
        },
        documento: {
          tipo: (doc?.tipo as any) ?? null,
          numero: doc?.numero ?? null,
          ruc: doc?.ruc ?? null,
        },
        contactos: (persona.contactos ?? []).map((c) => ({
          tipo: c.tipo as any,
          valorNorm: c.valorNorm,
          esPrincipal: c.esPrincipal,
          activo: c.activo,
          whatsappCapaz: (c as any).whatsappCapaz ?? null,
          esPreferidoRecordatorio: (c as any).esPreferidoRecordatorio ?? false,
          esPreferidoCobranza: (c as any).esPreferidoCobranza ?? false,
        })),
        edad,
        hasAlergias,
        hasMedicacion,
        obraSocial,
        hasResponsablePrincipal: hasMainPayer.has(p.idPaciente),
        lastVisitAt: last ? last.at.toISOString() : null,
        lastVisitProfesionalId: last ? last.profesionalId : null,
        nextAppointmentAt: next ? next.at.toISOString() : null,
        nextAppointmentEstado: (next?.estado as any) ?? null,
        nextAppointmentProfesionalId: next ? next.profesionalId : null,
        nextAppointmentConsultorioId: next ? next.consultorioId : null,
        activePlansCount: plansCountMap.get(p.idPaciente) ?? 0,
      };
    });

    return { items, nextCursor, hasMore: nextCursor !== null, totalCount };
  },
};
