import { type PrismaClient, DiagnosisStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";

export async function seedEncounterDiagnoses(
  prisma: PrismaClient,
  params: {
    consultaId: number;
    pacienteId: number;
  }
) {
  // Get active diagnoses for this patient
  const diagnoses = await prisma.patientDiagnosis.findMany({
    where: {
      pacienteId: params.pacienteId,
      status: { in: [DiagnosisStatus.ACTIVE, DiagnosisStatus.UNDER_FOLLOW_UP] },
    },
    take: 1, // Reducido a solo 1 diagnóstico por consulta
  });

  for (const diagnosis of diagnoses) {
    try {
      await prisma.encounterDiagnosis.create({
        data: {
          consultaId: params.consultaId,
          diagnosisId: diagnosis.idPatientDiagnosis,
          wasEvaluated: faker.datatype.boolean({ probability: 0.9 }),
          wasManaged: faker.datatype.boolean({ probability: 0.7 }),
          encounterNotes: faker.helpers.maybe(
            () => faker.lorem.sentence(),
            { probability: 0.6 }
          ),
        },
      });
    } catch (error: any) {
      // Ignore duplicate errors (P2002)
      if (error.code !== "P2002") {
        throw error;
      }
    }
  }
}

export async function seedDiagnosisStatusHistory(
  prisma: PrismaClient,
  params: {
    diagnosisId: number;
    consultaId?: number | null;
    changedByUserId: number;
  }
) {
  const diagnosis = await prisma.patientDiagnosis.findUnique({
    where: { idPatientDiagnosis: params.diagnosisId },
  });

  if (!diagnosis) return;

  // Create a status change history entry
  const previousStatus = diagnosis.status;
  
  // Si ya está resuelto, no cambiar
  if (previousStatus === DiagnosisStatus.RESOLVED) return;
  
  // 60% de probabilidad de resolver, 20% UNDER_FOLLOW_UP, 20% otros estados
  const statusRoll = faker.number.float({ min: 0, max: 1 });
  let newStatus: DiagnosisStatus;
  
  if (statusRoll < 0.6) {
    newStatus = DiagnosisStatus.RESOLVED;
  } else if (statusRoll < 0.8) {
    newStatus = DiagnosisStatus.UNDER_FOLLOW_UP;
  } else {
    newStatus = faker.helpers.arrayElement([
      DiagnosisStatus.ACTIVE,
      DiagnosisStatus.DISCARDED,
    ]);
  }

  // Don't create history if status hasn't changed
  if (previousStatus === newStatus) return;

  // Calcular fecha de resolución si se resuelve
  let resolvedAt: Date | null = null;
  if (newStatus === DiagnosisStatus.RESOLVED) {
    // Tiempo de resolución variado: rápido (<30 días), normal (30-90 días), lento (>90 días)
    const resolutionSpeed = faker.helpers.arrayElement(["rapido", "normal", "lento"]);
    let resolutionDays: number;
    
    switch (resolutionSpeed) {
      case "rapido":
        resolutionDays = faker.number.int({ min: 7, max: 30 });
        break;
      case "normal":
        resolutionDays = faker.number.int({ min: 30, max: 90 });
        break;
      case "lento":
        resolutionDays = faker.number.int({ min: 90, max: 180 });
        break;
    }
    
    resolvedAt = new Date(diagnosis.notedAt);
    resolvedAt.setDate(resolvedAt.getDate() + resolutionDays);
    
    // Asegurar que resolvedAt no sea futuro
    if (resolvedAt > new Date()) {
      resolvedAt = new Date();
    }
  }

  const history = await prisma.diagnosisStatusHistory.create({
    data: {
      diagnosisId: params.diagnosisId,
      consultaId: params.consultaId ?? null,
      previousStatus,
      newStatus,
      reason: newStatus === DiagnosisStatus.RESOLVED
        ? faker.helpers.arrayElement([
            "Tratamiento completado exitosamente",
            "Mejora clínica completa",
            "Resolución espontánea",
            "Éxito terapéutico",
            "Curación confirmada",
          ])
        : faker.helpers.arrayElement([
            "Evaluación en consulta",
            "Mejora clínica",
            "Nuevo hallazgo",
            "Reevaluación",
            "Cambio de estado",
          ]),
      changedByUserId: params.changedByUserId,
    },
  });

  // Update the diagnosis status
  await prisma.patientDiagnosis.update({
    where: { idPatientDiagnosis: params.diagnosisId },
    data: {
      status: newStatus,
      resolvedAt,
    },
  });

  return history;
}

/**
 * Resuelve diagnósticos existentes con diferentes tiempos de resolución
 * para enriquecer los datos del reporte de diagnósticos resueltos
 */
export async function resolveDiagnosesWithVariedTimes(
  prisma: PrismaClient,
  params: {
    pacienteId?: number;
    changedByUserId: number;
    maxDiagnoses?: number;
  }
) {
  // Buscar diagnósticos activos o en seguimiento que aún no estén resueltos
  const where: any = {
    status: { in: [DiagnosisStatus.ACTIVE, DiagnosisStatus.UNDER_FOLLOW_UP] },
    resolvedAt: null,
  };
  
  if (params.pacienteId) {
    where.pacienteId = params.pacienteId;
  }
  
  const diagnoses = await prisma.patientDiagnosis.findMany({
    where,
    take: params.maxDiagnoses ?? 20, // Ya está reducido desde index.ts
  });

  let resolvedCount = 0;
  
  for (const diagnosis of diagnoses) {
    // 50% de probabilidad de resolver este diagnóstico (reducido)
    if (!faker.datatype.boolean({ probability: 0.5 })) continue;
    
    // Tiempo de resolución variado para tener datos completos en el reporte
    const resolutionSpeed = faker.helpers.arrayElement(["rapido", "normal", "lento", "muy_lento"]);
    let resolutionDays: number;
    
    switch (resolutionSpeed) {
      case "rapido":
        // Resueltos en menos de 30 días
        resolutionDays = faker.number.int({ min: 7, max: 30 });
        break;
      case "normal":
        // Resueltos entre 30-90 días
        resolutionDays = faker.number.int({ min: 30, max: 90 });
        break;
      case "lento":
        // Resueltos entre 90-180 días
        resolutionDays = faker.number.int({ min: 90, max: 180 });
        break;
      case "muy_lento":
        // Resueltos entre 180-365 días
        resolutionDays = faker.number.int({ min: 180, max: 365 });
        break;
    }
    
    const resolvedAt = new Date(diagnosis.notedAt);
    resolvedAt.setDate(resolvedAt.getDate() + resolutionDays);
    
    // Asegurar que resolvedAt no sea futuro
    if (resolvedAt > new Date()) {
      resolvedAt.setTime(new Date().getTime());
    }
    
    // Crear historial de cambio de estado
    try {
      await prisma.diagnosisStatusHistory.create({
        data: {
          diagnosisId: diagnosis.idPatientDiagnosis,
          consultaId: null,
          previousStatus: diagnosis.status,
          newStatus: DiagnosisStatus.RESOLVED,
          reason: faker.helpers.arrayElement([
            "Tratamiento completado exitosamente",
            "Mejora clínica completa",
            "Resolución espontánea",
            "Éxito terapéutico",
            "Curación confirmada",
            "Control post-tratamiento satisfactorio",
          ]),
          changedByUserId: params.changedByUserId,
        },
      });
      
      // Actualizar el diagnóstico
      await prisma.patientDiagnosis.update({
        where: { idPatientDiagnosis: diagnosis.idPatientDiagnosis },
        data: {
          status: DiagnosisStatus.RESOLVED,
          resolvedAt,
        },
      });
      
      resolvedCount++;
    } catch (error: any) {
      // Ignore errors (duplicates, etc.)
      if (error.code !== "P2002") {
        console.warn(`Error resolviendo diagnóstico ${diagnosis.idPatientDiagnosis}: ${error.message}`);
      }
    }
  }
  
  return resolvedCount;
}

