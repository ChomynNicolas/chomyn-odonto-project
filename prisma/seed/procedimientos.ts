// ===================================================
// path: prisma/seed/procedimientos.ts (NUEVO)
// ===================================================
import {
  PrismaClient,
  EstadoCita,
  ConsultaEstado,
  ClinicoArchivoTipo,
  DienteSuperficie,
  TreatmentStepStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { PROCEDIMIENTOS_CATALOGO } from "./data";
import {
  ensureProcedimientoCatalogo,
  createPlanSimpleConSteps,
  createConsultaParaCita,
  addProcedimientoALaConsulta,
  addAdjuntoAConsulta,
} from "./ensure";

/** Devuelve números de dientes adultos realistas */
function randomTooth(): number {
  // 1-32
  return faker.number.int({ min: 1, max: 32 });
}
function randomSurface(): DienteSuperficie {
  return faker.helpers.arrayElement([
    "O", "M", "D", "V", "L", "MO", "DO", "MOD",
  ]) as DienteSuperficie;
}

export async function poblarTratamientosYConsultas(prisma: PrismaClient, opts: {
  pacientesIds: number[];
  createdByUserId: number;
}) {
  // 1) Catálogo (idempotente)
  await ensureProcedimientoCatalogo(prisma, PROCEDIMIENTOS_CATALOGO);

  // 2) Crear planes con 1–3 steps para ~30% de pacientes
  const subset = opts.pacientesIds.filter(() => Math.random() < 0.3);
  for (const pacienteId of subset) {
    const steps = [];
    const n = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < n; i++) {
      const item = faker.helpers.arrayElement(PROCEDIMIENTOS_CATALOGO);
      steps.push({
        code: item.code,
        toothNumber: item.aplicaDiente ? randomTooth() : null,
        toothSurface: item.aplicaSuperficie ? randomSurface() : null,
        estimatedDurationMin: item.defaultDurationMin ?? null,
        estimatedCostCents: item.defaultPriceCents ?? null,
        priority: faker.number.int({ min: 1, max: 5 }),
      });
    }
    await createPlanSimpleConSteps(prisma, {
      pacienteId,
      createdByUserId: opts.createdByUserId,
      steps,
    });
  }

  // 3) A partir de citas COMPLETED (y algunas CONFIRMED pasadas) crear Consulta + líneas + adjuntos
  const citas = await prisma.cita.findMany({
    where: {
      OR: [
        { estado: EstadoCita.COMPLETED },
        {
          estado: EstadoCita.CONFIRMED,
          fin: { lt: new Date() },
        },
      ],
    },
    select: {
      idCita: true,
      profesionalId: true,
      pacienteId: true,
      fin: true,
    },
    take: 120, // limitar para seeds grandes
  });

  for (const c of citas) {
    const consulta = await createConsultaParaCita(prisma, {
      citaId: c.idCita,
      performedByProfessionalId: c.profesionalId,
      createdByUserId: opts.createdByUserId,
      status: ConsultaEstado.FINAL,
      startedAt: new Date(c.fin.getTime() - 45 * 60 * 1000),
      finishedAt: c.fin,
      reason: faker.helpers.arrayElement(["Dolor", "Control", "Profilaxis"]),
      diagnosis: faker.helpers.arrayElement(["Caries superficial", "Pulpitis reversible", "Sin hallazgos relevantes"]),
      clinicalNotes: faker.lorem.sentence(),
    });

    // 1–2 procedimientos por consulta
    const count = faker.number.int({ min: 1, max: 2 });
    for (let i = 0; i < count; i++) {
      const item = faker.helpers.arrayElement(PROCEDIMIENTOS_CATALOGO);
      const line = await addProcedimientoALaConsulta(prisma, {
        consultaCitaId: consulta.citaId,
        code: item.code,
        toothNumber: item.aplicaDiente ? randomTooth() : null,
        toothSurface: item.aplicaSuperficie ? randomSurface() : null,
        quantity: 1,
        // precios: si no pasas unit, toma default del catálogo
        resultNotes: faker.helpers.arrayElement([
          "Procedimiento sin complicaciones.",
          "Paciente toleró bien el tratamiento.",
          "Se indica control en 7 días.",
        ]),
      });

      // Adjuntos (fotos RX/IO) con probabilidad
      if (Math.random() < 0.5) {
        await addAdjuntoAConsulta(prisma, {
          consultaCitaId: consulta.citaId,
          procedimientoId: line.idConsultaProcedimiento,
          uploadedByUserId: opts.createdByUserId,
          url: `https://storage.example.com/clinica/c_${consulta.citaId}_p_${line.idConsultaProcedimiento}.jpg`,
          originalName: `foto_${line.idConsultaProcedimiento}.jpg`,
          mimeType: "image/jpeg",
          size: faker.number.int({ min: 120_000, max: 2_000_000 }),
          tipo: faker.helpers.arrayElement([ClinicoArchivoTipo.INTRAORAL_PHOTO, ClinicoArchivoTipo.XRAY]),
          metadata: { side: faker.helpers.arrayElement(["left", "right"]), angle: faker.helpers.arrayElement(["occlusal", "bitewing"]) },
        });
      }
    }

    // (Opcional) Si hay plan activo, marcar algún step como COMPLETED aleatoriamente
    const planActivo = await prisma.treatmentPlan.findFirst({
      where: { pacienteId: c.pacienteId, isActive: true },
      select: { idTreatmentPlan: true },
    });
    if (planActivo && Math.random() < 0.4) {
      const step = await prisma.treatmentStep.findFirst({
        where: { treatmentPlanId: planActivo.idTreatmentPlan, status: { in: [TreatmentStepStatus.PENDING, TreatmentStepStatus.SCHEDULED] } },
        orderBy: { order: "asc" },
      });
      if (step) {
        await prisma.treatmentStep.update({
          where: { idTreatmentStep: step.idTreatmentStep },
          data: { status: TreatmentStepStatus.COMPLETED },
        });
      }
    }
  }

  return { consultasCreadas: citas.length };
}
