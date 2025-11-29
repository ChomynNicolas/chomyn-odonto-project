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
    take: faker.number.int({ min: 1, max: 3 }),
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
  const newStatus = faker.helpers.arrayElement([
    DiagnosisStatus.ACTIVE,
    DiagnosisStatus.UNDER_FOLLOW_UP,
    DiagnosisStatus.RESOLVED,
    DiagnosisStatus.DISCARDED,
  ]);

  // Don't create history if status hasn't changed
  if (previousStatus === newStatus) return;

  const history = await prisma.diagnosisStatusHistory.create({
    data: {
      diagnosisId: params.diagnosisId,
      consultaId: params.consultaId ?? null,
      previousStatus,
      newStatus,
      reason: faker.helpers.arrayElement([
        "Evaluación en consulta",
        "Mejora clínica",
        "Tratamiento completado",
        "Nuevo hallazgo",
        "Reevaluación",
      ]),
      changedByUserId: params.changedByUserId,
    },
  });

  // Update the diagnosis status
  await prisma.patientDiagnosis.update({
    where: { idPatientDiagnosis: params.diagnosisId },
    data: {
      status: newStatus,
      resolvedAt: newStatus === DiagnosisStatus.RESOLVED ? new Date() : null,
    },
  });

  return history;
}

