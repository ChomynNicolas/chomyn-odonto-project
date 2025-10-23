// app/api/agenda/citas/_service.ts
import { PrismaClient, EstadoCita } from "@prisma/client";
import type { GetCitasQuery } from "./_schemas";
import type { CitaListItemDTO } from "./_dto";

const prisma = new PrismaClient();

const SORT_WHITELIST = new Set<("inicio" | "createdAt" | "updatedAt")>([
  "inicio",
  "createdAt",
  "updatedAt",
]);

function parseSort(sort: string): { field: "inicio" | "createdAt" | "updatedAt"; dir: "asc" | "desc" } {
  const [rawField, rawDir] = (sort || "inicio:asc").split(":");
  const field = (rawField as any) as "inicio" | "createdAt" | "updatedAt";
  const dir = rawDir?.toLowerCase() === "desc" ? "desc" : "asc";
  return {
    field: SORT_WHITELIST.has(field) ? field : "inicio",
    dir,
  };
}

export async function listCitas(params: GetCitasQuery, page: number, limit: number, skip: number) {
  const { fechaInicio, fechaFin, profesionalId, pacienteId, consultorioId, estado, sort } = params;

  // estados: puede venir string "A,B,C" o array de schema
  const estados: EstadoCita[] | undefined = Array.isArray(estado)
    ? (estado as EstadoCita[])
    : (typeof estado === "string" ? (estado.split(",").filter(Boolean) as EstadoCita[]) : undefined);

  const { field, dir } = parseSort(sort || "inicio:asc");

  const where: any = {};
  if (fechaInicio || fechaFin) {
    where.inicio = {};
    if (fechaInicio) where.inicio.gte = fechaInicio;
    if (fechaFin) where.inicio.lte = fechaFin;
  }
  if (profesionalId) where.profesionalId = profesionalId;
  if (pacienteId) where.pacienteId = pacienteId;
  if (consultorioId) where.consultorioId = consultorioId;
  if (estados && estados.length > 0) where.estado = { in: estados };

  const [total, filas] = await prisma.$transaction([
    prisma.cita.count({ where }),
    prisma.cita.findMany({
      where,
      orderBy: { [field]: dir },
      skip,
      take: limit,
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        tipo: true,
        estado: true,
        motivo: true,
        profesional: {
          select: {
            idProfesional: true,
            persona: { select: { nombres: true, apellidos: true } },
          },
        },
        paciente: {
          select: {
            idPaciente: true,
            persona: { select: { nombres: true, apellidos: true } },
          },
        },
        consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
      },
    }),
  ]);

  const data: CitaListItemDTO[] = filas.map((c) => ({
    idCita: c.idCita,
    inicio: c.inicio.toISOString(),
    fin: c.fin.toISOString(),
    duracionMinutos: c.duracionMinutos,
    tipo: c.tipo,
    estado: c.estado,
    motivo: c.motivo ?? null,
    profesional: {
      id: c.profesional.idProfesional,
      nombre: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
    },
    paciente: {
      id: c.paciente.idPaciente,
      nombre: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim(),
    },
    consultorio: c.consultorio
      ? {
          id: c.consultorio.idConsultorio,
          nombre: c.consultorio.nombre,
          colorHex: c.consultorio.colorHex,
        }
      : undefined,
  }));

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const meta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return { data, meta };
}
