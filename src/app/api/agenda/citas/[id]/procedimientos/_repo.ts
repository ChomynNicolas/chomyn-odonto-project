import { prisma as db } from "@/lib/prisma";

// Cita (para validar existencia, estado y profesional/paciente)
export async function repoFindCitaForProcedure(citaId: number) {
  return db.cita.findUnique({
    where: { idCita: citaId },
    select: {
      idCita: true,
      estado: true,
      profesionalId: true,
      pacienteId: true,
      Consulta: { select: { citaId: true } },
    },
  });
}

// Garantiza Consulta (acto clínico) 1:1 con Cita
export async function repoEnsureConsulta(citaId: number, performedById: number, createdByUserId: number) {
  const existing = await db.consulta.findUnique({ where: { citaId } });
  if (existing) return existing.citaId;

  const created = await db.consulta.create({
    data: {
      citaId,
      performedById,
      status: "DRAFT",
      createdByUserId,
    },
    select: { citaId: true },
  });
  return created.citaId;
}

// Catálogo de procedimientos
export async function repoGetCatalogo(procedureId: number) {
  return db.procedimientoCatalogo.findUnique({
    where: { idProcedimiento: procedureId },
    select: { idProcedimiento: true, activo: true, aplicaDiente: true, aplicaSuperficie: true },
  });
}

// Treatment Step
export async function repoGetTreatmentStep(stepId: number) {
  return db.treatmentStep.findUnique({
    where: { idTreatmentStep: stepId },
    select: { idTreatmentStep: true, plan: { select: { pacienteId: true } } },
  });
}

// Crear procedimiento clínico
export async function repoCreateConsultaProcedimiento(data: {
  consultaId: number;
  procedureId?: number | null;
  serviceType?: string | null;
  toothNumber?: number | null;
  toothSurface?: any | null;
  quantity: number;
  unitPriceCents?: number | null;
  totalCents?: number | null;
  treatmentStepId?: number | null;
  resultNotes?: string | null;
}) {
  return db.consultaProcedimiento.create({
    data: {
      consultaId: data.consultaId,
      procedureId: data.procedureId ?? null,
      serviceType: data.serviceType ?? null,
      toothNumber: data.toothNumber ?? null,
      toothSurface: data.toothSurface ?? null,
      quantity: data.quantity,
      unitPriceCents: data.unitPriceCents ?? null,
      totalCents: data.totalCents ?? null,
      treatmentStepId: data.treatmentStepId ?? null,
      resultNotes: data.resultNotes ?? null,
    },
    select: {
      idConsultaProcedimiento: true,
      consultaId: true,
      procedureId: true,
      serviceType: true,
      toothNumber: true,
      toothSurface: true,
      quantity: true,
      unitPriceCents: true,
      totalCents: true,
      treatmentStepId: true,
      resultNotes: true,
      createdAt: true,
    },
  });
}


export async function repoFindCitaBasic(idCita: number) {
  return db.cita.findUnique({
    where: { idCita },
    select: { idCita: true, estado: true },
  });
}

export async function repoListProcedimientosByCita(opts: {
  citaId: number;
  limit: number;
  cursor?: number;
  filters?: {
    toothNumber?: number;
    hasCatalog?: boolean;
    q?: string;
  };
}) {
  const where: any = { consultaId: opts.citaId };

  // Filtros
  if (typeof opts.filters?.toothNumber === "number") {
    where.toothNumber = opts.filters.toothNumber;
  }
  if (typeof opts.filters?.hasCatalog === "boolean") {
    where.procedureId = opts.filters.hasCatalog ? { not: null } : null;
  }
  if (opts.filters?.q) {
    const q = opts.filters.q.trim();
    where.OR = [
      { serviceType: { contains: q, mode: "insensitive" } },
      { resultNotes: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await db.consultaProcedimiento.findMany({
    where,
    include: {
      catalogo: { select: { idProcedimiento: true, code: true, nombre: true } },
      _count: { select: { ConsultaAdjunto: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit + 1,
    ...(opts.cursor ? { skip: 1, cursor: { idConsultaProcedimiento: opts.cursor } } : {}),
  });

  let nextCursor: number | undefined;
  if (items.length > opts.limit) {
    const next = items.pop()!;
    nextCursor = next.idConsultaProcedimiento;
  }

  const mapped = items.map((p) => ({
    idConsultaProcedimiento: p.idConsultaProcedimiento,
    consultaId: p.consultaId,
    procedureId: p.procedureId,
    serviceType: p.serviceType,
    toothNumber: p.toothNumber,
    toothSurface: p.toothSurface,
    quantity: p.quantity,
    unitPriceCents: p.unitPriceCents,
    totalCents: p.totalCents,
    treatmentStepId: p.treatmentStepId,
    resultNotes: p.resultNotes,
    createdAt: p.createdAt.toISOString(),
    catalogo: p.catalogo
      ? { id: p.catalogo.idProcedimiento, code: p.catalogo.code, nombre: p.catalogo.nombre }
      : null,
    adjuntosCount: p._count.ConsultaAdjunto,
  }));

  return { items: mapped, nextCursor };
}