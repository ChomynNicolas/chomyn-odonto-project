// ===================================================
// path: prisma/seed/procedimientos.ts
// ===================================================
/**
 * Seed de procedimientos, planes de tratamiento y consultas
 * 
 * NOTA: Los precios (defaultPriceCents, estimatedCostCents, unitPriceCents, totalCents)
 * están en guaraníes (PYG), no en centavos. El nombre del campo se mantiene por compatibilidad.
 */
import {
  PrismaClient,
  EstadoCita,
  ConsultaEstado,
  AdjuntoTipo,
  DienteSuperficie,
  TreatmentStepStatus,
  TreatmentPlanStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { PROCEDIMIENTOS_CATALOGO } from "./data";
import { log } from "./logger";
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

  // 2) Crear planes con 1–2 steps para ~10% de pacientes (reducido para menos datos)
  const subset = opts.pacientesIds.filter(() => Math.random() < 0.1);
  for (const pacienteId of subset) {
    const steps: Array<{
      code?: string;
      toothNumber?: number | null;
      toothSurface?: DienteSuperficie | null;
      estimatedDurationMin?: number | null;
      estimatedCostCents?: number | null;
      priority?: number | null;
    }> = [];
    const n = faker.number.int({ min: 1, max: 2 }); // Reducido de 1-3 a 1-2 steps
    for (let i = 0; i < n; i++) {
      const item = faker.helpers.arrayElement(PROCEDIMIENTOS_CATALOGO);
      steps.push({
        code: item.code,
        toothNumber: item.aplicaDiente ? randomTooth() : null,
        toothSurface: item.aplicaSuperficie ? randomSurface() : null,
        estimatedDurationMin: item.defaultDurationMin ?? null,
        estimatedCostCents: item.defaultPriceCents ?? null, // en guaraníes (PYG) - viene del catálogo
        priority: faker.number.int({ min: 1, max: 5 }),
      });
    }
    await createPlanSimpleConSteps(prisma, {
      pacienteId,
      createdByUserId: opts.createdByUserId,
      steps,
    });
  }

  // 3) A partir de citas COMPLETED crear Consulta + líneas + adjuntos
  // Procesar citas completadas (limitar a un número razonable para evitar timeouts)
  const citas = await prisma.cita.findMany({
    where: {
      estado: EstadoCita.COMPLETED,
    },
    select: { idCita: true, profesionalId: true, pacienteId: true, fin: true, inicio: true },
    orderBy: { fin: "desc" },
    take: 60, // Limitar a 60 citas para datos moderados (reducido de 200)
  });

  log.info(`📊 Procesando ${citas.length} citas completadas...`);

  // Distribución de procedimientos más realista basada en frecuencia
  // Procedimientos más comunes tienen mayor probabilidad
  const procedimientosComunes = PROCEDIMIENTOS_CATALOGO.filter(p => 
    ["CONS-INI", "CTRL", "LIMP", "OBT", "EXT", "ENDO", "CURET", "RX-PERI", "RX-PANO"].includes(p.code)
  );
  const procedimientosIntermedios = PROCEDIMIENTOS_CATALOGO.filter(p => 
    !procedimientosComunes.includes(p) && 
    !["IMPLANTE", "PUENTE", "CORONA-ZIR", "BLANQ", "ENDO-RET", "APICEC"].includes(p.code)
  );
  const procedimientosEspeciales = PROCEDIMIENTOS_CATALOGO.filter(p => 
    ["IMPLANTE", "PUENTE", "CORONA-ZIR", "BLANQ", "ENDO-RET", "APICEC"].includes(p.code)
  );

  function seleccionarProcedimiento(): typeof PROCEDIMIENTOS_CATALOGO[0] {
    const rand = Math.random();
    if (rand < 0.7) {
      // 70% procedimientos comunes
      return faker.helpers.arrayElement(procedimientosComunes);
    } else if (rand < 0.95) {
      // 25% procedimientos intermedios
      return faker.helpers.arrayElement(procedimientosIntermedios);
    } else {
      // 5% procedimientos especiales
      return faker.helpers.arrayElement(procedimientosEspeciales);
    }
  }

  let consultasCreadas = 0;
  let procedimientosCreados = 0;
  let errores = 0;

  // Procesar en lotes para mejor rendimiento y logging
  const batchSize = 50;
  for (let i = 0; i < citas.length; i += batchSize) {
    const batch = citas.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(citas.length / batchSize);
    
    if (i % 100 === 0 || batchNum === 1) {
      log.info(`   Procesando lote ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, citas.length)} de ${citas.length})...`);
    }

    for (const c of batch) {
      try {
        // Verificar si ya existe una consulta para esta cita
        const consultaExistente = await prisma.consulta.findUnique({
          where: { citaId: c.idCita },
          select: { citaId: true },
        });

        let consulta;
        if (consultaExistente) {
          // Si ya existe, usar la existente
          consulta = await prisma.consulta.findUnique({
            where: { citaId: c.idCita },
          });
        } else {
          // Crear nueva consulta solo si no existe
          consulta = await createConsultaParaCita(prisma, {
            citaId: c.idCita,
            performedByProfessionalId: c.profesionalId,
            createdByUserId: opts.createdByUserId,
            status: ConsultaEstado.FINAL,
            startedAt: new Date(c.fin.getTime() - 45 * 60 * 1000),
            finishedAt: c.fin,
            diagnosis: faker.helpers.arrayElement(["Caries superficial", "Pulpitis reversible", "Sin hallazgos relevantes", "Gingivitis", "Periodontitis"]),
            clinicalNotes: faker.lorem.sentence(),
          });
          consultasCreadas++;
        }

        // Verificar si ya hay procedimientos para esta consulta
        const procedimientosExistentes = await prisma.consultaProcedimiento.count({
          where: { consultaId: consulta.citaId },
        });

        // Solo agregar procedimientos si no hay ninguno (evitar duplicados)
        if (procedimientosExistentes === 0) {
          // 1 procedimiento por consulta (reducido a solo 1 para menos datos)
          const count = 1; // Siempre 1 procedimiento por consulta
          for (let j = 0; j < count; j++) {
            const item = seleccionarProcedimiento();
            const line = await addProcedimientoALaConsulta(prisma, {
              consultaCitaId: consulta.citaId,
              code: item.code,
              toothNumber: item.aplicaDiente ? randomTooth() : null,
              toothSurface: item.aplicaSuperficie ? randomSurface() : null,
              quantity: 1,
              // precios: si no pasas unit, toma default del catálogo automáticamente
              resultNotes: faker.helpers.arrayElement([
                "Procedimiento sin complicaciones.",
                "Paciente toleró bien el tratamiento.",
                "Se indica control en 7 días.",
                "Procedimiento completado exitosamente.",
                "Sin complicaciones durante el procedimiento.",
              ]),
            });
            procedimientosCreados++;

            // Adjuntos (fotos RX/IO) con menor probabilidad para no sobrecargar
            if (Math.random() < 0.1) { // Reducido a 10% para menos adjuntos
              try {
                await addAdjuntoAConsulta(prisma, {
                  consultaCitaId: consulta.citaId,
                  procedimientoId: line.idConsultaProcedimiento,
                  uploadedByUserId: opts.createdByUserId,
                  url: `https://storage.example.com/clinica/c_${consulta.citaId}_p_${line.idConsultaProcedimiento}.jpg`,
                  originalName: `foto_${line.idConsultaProcedimiento}.jpg`,
                  mimeType: "image/jpeg",
                  size: faker.number.int({ min: 120_000, max: 2_000_000 }),
                  tipo: faker.helpers.arrayElement([AdjuntoTipo.INTRAORAL_PHOTO, AdjuntoTipo.XRAY]),
                  metadata: { side: faker.helpers.arrayElement(["left", "right"]), angle: faker.helpers.arrayElement(["occlusal", "bitewing"]) },
                });
              } catch (error: any) {
                // Ignorar errores de adjuntos
              }
            }
          }
        }

        // NO crear datos clínicos adicionales aquí para evitar duplicados
        // Los datos clínicos ya se crean en la sección 8 del seed principal
        // Esto evita crear demasiados diagnósticos y datos clínicos duplicados

        // (Opcional) Si hay plan activo, marcar algún step como COMPLETED aleatoriamente
        if (Math.random() < 0.1) { // Reducido de 20% a 10% para menos operaciones
          try {
            const planActivo = await prisma.treatmentPlan.findFirst({
              where: { pacienteId: c.pacienteId, status: TreatmentPlanStatus.ACTIVE },
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
          } catch (error: any) {
            // Ignorar errores de actualización de steps
          }
        }
      } catch (error: any) {
        errores++;
        if (errores <= 5) {
          log.warn(`   ⚠️  Error procesando cita ${c.idCita}: ${error.message}`);
        }
        // Continuar con la siguiente cita
      }
    }
  }

  log.ok(`   ✅ Procesadas ${citas.length} citas: ${consultasCreadas} consultas nuevas, ${procedimientosCreados} procedimientos creados${errores > 0 ? `, ${errores} errores` : ''}`);

  return { 
    consultasCreadas: consultasCreadas,
    procedimientosCreados: procedimientosCreados,
    citasProcesadas: citas.length,
    errores: errores,
  };
}
