import { CrearProcedimientoDTO, ListQuery, ProcedimientoListItem } from "./_dto";
import { repoCreateConsultaProcedimiento, repoEnsureConsulta, repoFindCitaBasic, repoFindCitaForProcedure, repoGetCatalogo, repoGetTreatmentStep, repoListProcedimientosByCita } from "./_repo";
import { BadRequestError, ConflictError, NotFoundError } from "../../../../_lib/errors";
// Surgery consent validation removed - now handled during check-in

export async function serviceCreateProcedureForCita(opts: {
  citaId: number;
  dto: CrearProcedimientoDTO;
  userId: number;
}) {
  // 1) Cita existente y válida
  const cita = await repoFindCitaForProcedure(opts.citaId);
  if (!cita) throw new NotFoundError("Cita no encontrada");
  if (["CANCELLED", "NO_SHOW"].includes(cita.estado)) {
    throw new ConflictError("La cita no permite registrar procedimientos");
  }

  // 2) Asegurar Consulta 1:1
  const consultaId = await repoEnsureConsulta(cita.idCita, cita.profesionalId, opts.userId);

  // 3) Validaciones de catálogo/diente/superficie
  let cat: Awaited<ReturnType<typeof repoGetCatalogo>> | null = null;
  if (opts.dto.procedureId) {
    cat = await repoGetCatalogo(opts.dto.procedureId);
    if (!cat || !cat.activo) throw new BadRequestError("procedureId inválido o inactivo");
  }
  if (cat?.aplicaDiente && opts.dto.toothNumber == null) {
    throw new BadRequestError("Este procedimiento requiere toothNumber");
  }
  if (!cat?.aplicaDiente && opts.dto.toothNumber != null) {
    throw new BadRequestError("Este procedimiento no admite toothNumber");
  }
  if (cat?.aplicaSuperficie && !opts.dto.toothSurface) {
    throw new BadRequestError("Este procedimiento requiere toothSurface");
  }
  if (!cat?.aplicaSuperficie && opts.dto.toothSurface) {
    throw new BadRequestError("Este procedimiento no admite toothSurface");
  }

  // 4) Validar TreatmentStep coherente con paciente
  if (opts.dto.treatmentStepId) {
    const step = await repoGetTreatmentStep(opts.dto.treatmentStepId);
    if (!step) throw new BadRequestError("treatmentStepId inválido");
    if (step.plan.pacienteId !== cita.pacienteId) {
      throw new ConflictError("El step no pertenece al paciente de la cita");
    }
  }

  // Surgery consent validation removed - now handled during check-in

  // 6) Crear procedimiento
  const created = await repoCreateConsultaProcedimiento({
    consultaId,
    procedureId: opts.dto.procedureId ?? null,
    serviceType: opts.dto.serviceType ?? null,
    toothNumber: opts.dto.toothNumber ?? null,
    toothSurface: opts.dto.toothSurface ?? null,
    quantity: opts.dto.quantity,
    unitPriceCents: opts.dto.unitPriceCents ?? null,
    totalCents: opts.dto.totalCents ?? null,
    treatmentStepId: opts.dto.treatmentStepId ?? null,
    resultNotes: opts.dto.resultNotes ?? null,
  });

  return created;
}


export async function serviceListProcedimientosByCita(params: {
  citaId: number;
  query: ListQuery;
}): Promise<{ items: ProcedimientoListItem[]; nextCursor?: number }> {
  // 1) La cita debe existir (permitimos listar incluso si está cancelada, para trazabilidad)
  const cita = await repoFindCitaBasic(params.citaId);
  if (!cita) throw new NotFoundError("Cita no encontrada");

  // 2) Listado con filtros + paginación
  const { items, nextCursor } = await repoListProcedimientosByCita({
    citaId: params.citaId,
    limit: params.query.limit!,
    cursor: params.query.cursor,
    filters: {
      toothNumber: params.query.toothNumber,
      hasCatalog: params.query.hasCatalog,
      q: params.query.q,
    },
  });

  return { items, nextCursor };
}