// Service to determine anamnesis context (first-time vs follow-up)

import { prisma } from '@/lib/prisma';

export interface AnamnesisContext {
  isFirstTime: boolean;
  hasExistingAnamnesis: boolean;
  hasPreviousConsultations: boolean;
  lastAnamnesisUpdate: Date | null;
  daysSinceLastUpdate: number | null;
  lastConsultationDate: Date | null;
  isSignificantlyOutdated: boolean; // > 1 year since last update
  previousAnamnesisId: number | null;
}

export async function getAnamnesisContext(pacienteId: number): Promise<AnamnesisContext> {
  // Check if patient has existing anamnesis
  const existingAnamnesis = await prisma.patientAnamnesis.findUnique({
    where: { pacienteId },
    select: {
      idPatientAnamnesis: true,
      updatedAt: true,
    },
  });

  // Check if patient has previous consultations (excluding current one)
  const previousConsultations = await prisma.consulta.findMany({
    where: {
      cita: {
        pacienteId,
      },
    },
    select: {
      cita: {
        select: {
          inicio: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  });

  const hasExistingAnamnesis = !!existingAnamnesis;
  const hasPreviousConsultations = previousConsultations.length > 0;
  const lastAnamnesisUpdate = existingAnamnesis?.updatedAt || null;
  const lastConsultationDate = previousConsultations[0]?.cita.inicio || null;

  // Calculate days since last update
  let daysSinceLastUpdate: number | null = null;
  if (lastAnamnesisUpdate) {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastAnamnesisUpdate.getTime());
    daysSinceLastUpdate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Determine if significantly outdated (> 1 year = 365 days)
  const isSignificantlyOutdated = daysSinceLastUpdate !== null && daysSinceLastUpdate > 365;

  // Determine if first-time consultation
  // First-time if: no existing anamnesis AND no previous consultations
  const isFirstTime = !hasExistingAnamnesis && !hasPreviousConsultations;

  return {
    isFirstTime,
    hasExistingAnamnesis,
    hasPreviousConsultations,
    lastAnamnesisUpdate,
    daysSinceLastUpdate,
    lastConsultationDate,
    isSignificantlyOutdated,
    previousAnamnesisId: existingAnamnesis?.idPatientAnamnesis || null,
  };
}

