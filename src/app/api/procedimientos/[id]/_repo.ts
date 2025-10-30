// src/app/api/procedimientos/[id]/_repo.ts
import { prisma as db } from "@/lib/prisma";

export async function repoGetProcedimientoForUpdate(id: number) {
  return db.consultaProcedimiento.findUnique({
    where: { idConsultaProcedimiento: id },
    include: {
      consulta: {
        select: {
          citaId: true,
          cita: { select: { pacienteId: true, profesionalId: true } },
        },
      },
      ConsultaAdjunto: { select: { idConsultaAdjunto: true }, take: 1 },
      catalogo: { select: { idProcedimiento: true, aplicaDiente: true, aplicaSuperficie: true, activo: true } },
    },
  });
}

export async function repoGetCatalogo(procedureId: number) {
  return db.procedimientoCatalogo.findUnique({
    where: { idProcedimiento: procedureId },
    select: { idProcedimiento: true, aplicaDiente: true, aplicaSuperficie: true, activo: true },
  });
}

export async function repoGetTreatmentStep(stepId: number) {
  return db.treatmentStep.findUnique({
    where: { idTreatmentStep: stepId },
    select: { idTreatmentStep: true, plan: { select: { pacienteId: true } } },
  });
}

// UPDATE parcial
export async function repoUpdateProcedimiento(id: number, data: any) {
  return db.consultaProcedimiento.update({
    where: { idConsultaProcedimiento: id },
    data,
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
      updatedAt: true,
    },
  });
}

// DELETE (hard)
export async function repoDeleteProcedimiento(id: number) {
  return db.consultaProcedimiento.delete({
    where: { idConsultaProcedimiento: id },
    select: { idConsultaProcedimiento: true },
  });
}
