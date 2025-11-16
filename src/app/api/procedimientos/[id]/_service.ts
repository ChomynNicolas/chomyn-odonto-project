// src/app/api/procedimientos/[id]/_service.ts

import { PatchProcedimientoSchema } from "./_schemas";
import { repoDeleteProcedimiento, repoGetCatalogo, repoGetProcedimientoForUpdate, repoGetTreatmentStep, repoUpdateProcedimiento } from "./_repo";
import { NotFoundError, ConflictError, UnauthorizedError, BadRequestError } from "../../_lib/errors";
import type { Prisma } from "@prisma/client";

type Rol = "ADMIN" | "ODONT" | "RECEP";
const canUpdate = (r?: string) => r === "ADMIN" || r === "ODONT";
const canDelete = (r?: string) => r === "ADMIN";

export async function servicePatchProcedimiento(opts: {
  id: number;
  body: unknown;
  userId: number;
  role?: Rol | string;
}) {
  // 1) Parse + reglas de negocio por acción
  const patch = PatchProcedimientoSchema.parse(opts.body);

  // 2) Cargar procedimiento + contexto
  const procRaw = await repoGetProcedimientoForUpdate(opts.id);
  if (!procRaw) throw new NotFoundError("Procedimiento no encontrado");
  // Type assertion: TypeScript no infiere correctamente el tipo con include+select anidados
  // pero sabemos que la query incluye estas relaciones según la definición en _repo.ts
  type ProcWithRelations = {
    idConsultaProcedimiento: number;
    consultaId: number;
    procedureId: number | null;
    serviceType: string | null;
    toothNumber: number | null;
    toothSurface: string | null;
    quantity: number;
    unitPriceCents: number | null;
    totalCents: number | null;
    treatmentStepId: number | null;
    resultNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    ConsultaAdjunto: Array<{ idAdjunto: number }>;
    catalogo: { idProcedimiento: number; aplicaDiente: boolean; aplicaSuperficie: boolean; activo: boolean } | null;
    consulta: {
      citaId: number;
      cita: { pacienteId: number; profesionalId: number };
    };
  };
  const proc = procRaw as unknown as ProcWithRelations;

  // 3) Optimistic locking (si viene)
  if (patch.updatedAt) {
    const current = proc.updatedAt.toISOString();
    if (current !== patch.updatedAt) {
      throw new ConflictError("Conflicto de versión: el registro cambió recientemente.");
    }
  }

  // 4) Enrutado por acción
  if (patch.accion === "ELIMINAR") {
    if (!canDelete(opts.role)) throw new UnauthorizedError("No autorizado para eliminar");
    if (proc.ConsultaAdjunto.length > 0) {
      throw new ConflictError("No se puede eliminar porque tiene adjuntos; use ANULAR.");
    }
    const del = await repoDeleteProcedimiento(opts.id);
    return { op: "DELETED", id: del.idConsultaProcedimiento };
  }

  if (!canUpdate(opts.role)) throw new UnauthorizedError("No autorizado");

  if (patch.accion === "ANULAR") {
    // Regla ANULAR: neutraliza y conserva trazabilidad
    const neutralData: Prisma.ConsultaProcedimientoUpdateInput = {
      catalogo: { disconnect: true },
      serviceType: null,
      toothNumber: null,
      toothSurface: null,
      quantity: 0,
      unitPriceCents: null,
      totalCents: null,
      treatmentStep: { disconnect: true },
      resultNotes: `${proc.resultNotes ? proc.resultNotes + " | " : ""}[ANULADO] ${new Date().toISOString()}`,
    };
    const res = await repoUpdateProcedimiento(opts.id, neutralData);
    return { op: "ANNULLED", data: res };
  }

  // ACCIÓN = ACTUALIZAR
  const data: Prisma.ConsultaProcedimientoUpdateInput = {};

  // Cambios de catálogo / texto libre
  if (patch.procedureId !== undefined) {
    if (patch.procedureId === null) {
      data.catalogo = { disconnect: true };
    } else {
      const cat = await repoGetCatalogo(patch.procedureId);
      if (!cat || !cat.activo) throw new BadRequestError("procedureId inválido o inactivo");
      data.catalogo = { connect: { idProcedimiento: patch.procedureId } };
      // Validar diente/superficie si aplica más abajo con los valores resultantes
      // Actualizar el catálogo en proc para las validaciones siguientes
      proc.catalogo = cat;
    }
  }
  if (patch.serviceType !== undefined) data.serviceType = patch.serviceType;

  // Diente / superficie (validar con catálogo si corresponde)
  const toothNumber = patch.toothNumber !== undefined ? patch.toothNumber : proc.toothNumber;
  const toothSurface = patch.toothSurface !== undefined ? patch.toothSurface : proc.toothSurface;

  const effectiveCatalog = patch.procedureId !== undefined ? (patch.procedureId ? (proc.catalogo ?? null) : null) : proc.catalogo;

  if (effectiveCatalog?.aplicaDiente && toothNumber == null) {
    throw new BadRequestError("Este procedimiento requiere toothNumber");
  }
  if (!effectiveCatalog?.aplicaDiente && toothNumber != null) {
    throw new BadRequestError("Este procedimiento no admite toothNumber");
  }
  if (effectiveCatalog?.aplicaSuperficie && toothSurface == null) {
    throw new BadRequestError("Este procedimiento requiere toothSurface");
  }
  if (!effectiveCatalog?.aplicaSuperficie && toothSurface != null) {
    throw new BadRequestError("Este procedimiento no admite toothSurface");
  }

  if (patch.toothNumber !== undefined) data.toothNumber = patch.toothNumber;
  if (patch.toothSurface !== undefined) data.toothSurface = patch.toothSurface;

  // Cantidades y costos
  if (patch.quantity !== undefined) data.quantity = patch.quantity;
  if (patch.unitPriceCents !== undefined) data.unitPriceCents = patch.unitPriceCents;
  if (patch.totalCents !== undefined) data.totalCents = patch.totalCents;

  // Vinculación con TreatmentStep (validar paciente)
  if (patch.treatmentStepId !== undefined) {
    if (patch.treatmentStepId === null) {
      data.treatmentStep = { disconnect: true };
    } else {
      const step = await repoGetTreatmentStep(patch.treatmentStepId);
      if (!step) throw new BadRequestError("treatmentStepId inválido");
      const pacienteProc = proc.consulta?.cita?.pacienteId;
      if (step.plan.pacienteId !== pacienteProc) {
        throw new ConflictError("El step no pertenece al paciente del procedimiento");
      }
      data.treatmentStep = { connect: { idTreatmentStep: patch.treatmentStepId } };
    }
  }

  // Notas de resultado
  if (patch.resultNotes !== undefined) data.resultNotes = patch.resultNotes;

  const updated = await repoUpdateProcedimiento(opts.id, data);
  return { op: "UPDATED", data: updated };
}
