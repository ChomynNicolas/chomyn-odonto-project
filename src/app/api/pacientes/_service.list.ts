// src/app/api/pacientes/_service.list.ts
import { pacientesListQuerySchema, type PacientesListQuery } from "./_schemas";
import { pacienteRepo, type PacienteListItemDTO } from "./_repo";
import { Prisma, Genero } from "@prisma/client";

/** ---------------------------------------------------------
 *  Parseo de query desde URLSearchParams (re-uso Zod)
 *  URLSearchParams siempre devuelve strings, Zod se encarga de la coerción
 * --------------------------------------------------------- */
export function parsePacientesListQuery(searchParams: URLSearchParams): PacientesListQuery {
  // Convert URLSearchParams to plain object (all values are strings)
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return pacientesListQuerySchema.parse(obj);
}

/** ---------------------------------------------------------
 *  listPacientes: centraliza filtros/orden y delega al repo
 *  - Filtros DB: q, soloActivos, genero, hasEmail, hasPhone, rangos, sort
 *  - Derivados (last/next/edad/badges/planes/responsable): lo hace el repo
 * --------------------------------------------------------- */
export async function listPacientes(query: PacientesListQuery): Promise<{
  items: PacienteListItemDTO[];
  nextCursor: number | null;
  hasMore: boolean;
  totalCount: number;
}> {
  const {
    q,
    limit,
    cursor,
    soloActivos,
    genero,
    hasEmail,
    hasPhone,
    createdFrom,
    createdTo,
    sort,
    // ⚠️ Flags futuros de filtrado derivado — NO aplicar aún en DB:
    // hasNextAppt,
    // hasAllergies,
    // hasActivePlans,
  } = query;

  const whereAND: Prisma.PacienteWhereInput[] = [];
  if (soloActivos) whereAND.push({ estaActivo: true });

  // Filtro por género (Persona.genero)
  if (genero) {
    whereAND.push({ persona: { genero: genero as Genero } });
  }

  // Búsqueda q (nombres, apellidos, doc.numero, contactos.valorNorm)
  if (q && q.trim() !== "") {
    const qLower = q.toLowerCase();
    whereAND.push({
      OR: [
        { persona: { nombres: { contains: q, mode: "insensitive" } } },
        { persona: { apellidos: { contains: q, mode: "insensitive" } } },
        { persona: { documento: { numero: { contains: q, mode: "insensitive" } } } },
        { persona: { contactos: { some: { valorNorm: { contains: qLower } } } } },
      ],
    });
  }

  // Contactabilidad
  if (hasEmail === true) {
    whereAND.push({ persona: { contactos: { some: { tipo: "EMAIL", activo: true } } } });
  } else if (hasEmail === false) {
    whereAND.push({ persona: { contactos: { none: { tipo: "EMAIL", activo: true } } } });
  }

  if (hasPhone === true) {
    whereAND.push({ persona: { contactos: { some: { tipo: "PHONE", activo: true } } } });
  } else if (hasPhone === false) {
    whereAND.push({ persona: { contactos: { none: { tipo: "PHONE", activo: true } } } });
  }

  // Rangos por createdAt (Paciente)
  if (createdFrom) whereAND.push({ createdAt: { gte: new Date(createdFrom) } });
  if (createdTo) {
    const to = new Date(createdTo);
    to.setDate(to.getDate() + 1); // exclusivo al día siguiente
    whereAND.push({ createdAt: { lt: to } });
  }

  // Ordenamiento
  const orderBy:
    | Prisma.PacienteOrderByWithRelationInput
    | Prisma.PacienteOrderByWithRelationInput[] =
    sort === "createdAt asc"
      ? { createdAt: "asc" }
      : sort === "nombre asc"
      ? [{ persona: { apellidos: "asc" } }, { persona: { nombres: "asc" } }, { idPaciente: "desc" as const }]
      : sort === "nombre desc"
      ? [{ persona: { apellidos: "desc" } }, { persona: { nombres: "desc" } }, { idPaciente: "desc" as const }]
      : // default
        { createdAt: "desc" as const };

  const where: Prisma.PacienteWhereInput = { AND: whereAND };
  const cursorId = cursor ? Number(cursor) : null;

  // Delegar al repo (sin recalcular nada aquí)
  const { items, nextCursor, hasMore, totalCount } = await pacienteRepo.listPacientes({
    where,
    orderBy,
    limit,
    cursorId,
  });

  /** -------------------------------------------------------
   *  (Opcional) Filtrado sobre DERIVADOS (NO DB)
   *  Si decides activar flags futuros sin columna dedicada,
   *  puedes filtrar acá sobre el DTO (ojo: afecta paginación).
   *
   *  Ejemplo (comentado):
   *
   *  let filtered = items;
   *  if (hasNextAppt === true) {
   *    filtered = filtered.filter(i => i.nextAppointmentAt !== null);
   *  } else if (hasNextAppt === false) {
   *    filtered = filtered.filter(i => i.nextAppointmentAt === null);
   *  }
   *  if (hasAllergies === true) {
   *    filtered = filtered.filter(i => i.hasAlergias);
   *  }
   *  if (hasActivePlans === true) {
   *    filtered = filtered.filter(i => i.activePlansCount > 0);
   *  }
   *
   *  return { items: filtered, nextCursor, hasMore, totalCount };
   * ------------------------------------------------------- */

  return { items, nextCursor, hasMore, totalCount };
}
