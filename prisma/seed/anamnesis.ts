import {
  type PrismaClient,
  AnamnesisTipo,
  AnamnesisUrgencia,
  AnamnesisStatus,
  AnamnesisAuditAction,
  AnamnesisChangeSeverity,
  FieldChangeType,
  InformationSource,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { fakeAnamnesisPayload } from "./factories";
import { calculateAge } from "./utils";
import { ANTECEDENT_CATALOG, ANAMNESIS_CONFIG_SAMPLES } from "./data";

export async function seedAnamnesisCatalog(prisma: PrismaClient, updatedByUserId: number) {
  for (const item of ANTECEDENT_CATALOG) {
    await prisma.antecedentCatalog.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        category: item.category as any,
        description: item.description ?? null,
        isActive: true,
      },
      create: {
        code: item.code,
        name: item.name,
        category: item.category as any,
        description: item.description ?? null,
        isActive: true,
      },
    });
  }
}

export async function seedAnamnesisConfig(prisma: PrismaClient, updatedByUserId: number) {
  for (const config of ANAMNESIS_CONFIG_SAMPLES) {
    await prisma.anamnesisConfig.upsert({
      where: { key: config.key },
      update: {
        value: config.value as any,
        description: config.description ?? null,
        updatedByUserId,
      },
      create: {
        key: config.key,
        value: config.value as any,
        description: config.description ?? null,
        updatedByUserId,
      },
    });
  }
}

export async function seedPatientAnamnesis(
  prisma: PrismaClient,
  params: {
    pacienteId: number;
    personaId: number;
    createdByUserId: number;
    tipo: AnamnesisTipo;
  }
) {
  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente: params.pacienteId },
    include: { persona: true },
  });

  if (!paciente) {
    throw new Error(`Paciente ${params.pacienteId} no encontrado`);
  }

  const edad = paciente.persona.fechaNacimiento
    ? calculateAge(paciente.persona.fechaNacimiento)
    : null;

  const tipo = params.tipo;
  const payload = fakeAnamnesisPayload(tipo);

  // Determinar valores booleanos basados en payload
  const tieneEnfermedadesCronicas =
    tipo === AnamnesisTipo.ADULTO
      ? (payload.antecedentesPersonales?.enfermedadesCronicas?.length ?? 0) > 0
      : false;
  const tieneAlergias =
    (payload.antecedentesPersonales?.alergias?.length ?? 0) > 0;
  const tieneMedicacionActual =
    (payload.antecedentesPersonales?.medicacionActual?.length ?? 0) > 0;

  const motivoConsulta = faker.helpers.arrayElement([
    "Dolor dental",
    "Control de rutina",
    "Limpieza dental",
    "Consulta por urgencia",
    "Seguimiento de tratamiento",
    "Evaluación inicial",
  ]);

  const tieneDolorActual = motivoConsulta.toLowerCase().includes("dolor");
  const dolorIntensidad = tieneDolorActual
    ? faker.number.int({ min: 1, max: 10 })
    : null;
  const urgenciaPercibida = tieneDolorActual
    ? AnamnesisUrgencia.URGENCIA
    : faker.helpers.arrayElement([
        AnamnesisUrgencia.RUTINA,
        AnamnesisUrgencia.PRIORITARIO,
        AnamnesisUrgencia.URGENCIA,
      ]);

  const embarazada =
    tipo === AnamnesisTipo.ADULTO && paciente.persona.genero === "FEMENINO"
      ? faker.datatype.boolean({ probability: 0.05 })
      : null;

  const expuestoHumoTabaco =
    tipo === AnamnesisTipo.PEDIATRICO
      ? faker.datatype.boolean({ probability: 0.15 })
      : null;

  const bruxismo = tipo === AnamnesisTipo.ADULTO
    ? faker.datatype.boolean({ probability: 0.15 })
    : null;

  const higieneCepilladosDia = faker.helpers.arrayElement([1, 2, 3]);
  const usaHiloDental = faker.datatype.boolean({ probability: 0.4 });

  const ultimaVisitaDental = faker.date.past({ years: 2 });

  const tieneHabitosSuccion =
    tipo === AnamnesisTipo.PEDIATRICO
      ? faker.datatype.boolean({ probability: 0.3 })
      : null;

  const lactanciaRegistrada =
    tipo === AnamnesisTipo.PEDIATRICO
      ? faker.datatype.boolean({ probability: 0.6 })
      : null;

  const anamnesis = await prisma.patientAnamnesis.upsert({
    where: { pacienteId: params.pacienteId },
    update: {
      tipo,
      motivoConsulta,
      tieneDolorActual,
      dolorIntensidad,
      urgenciaPercibida,
      tieneEnfermedadesCronicas,
      tieneAlergias,
      tieneMedicacionActual,
      embarazada,
      expuestoHumoTabaco,
      bruxismo,
      higieneCepilladosDia,
      usaHiloDental,
      ultimaVisitaDental,
      tieneHabitosSuccion,
      lactanciaRegistrada,
      payload: payload as any,
      actualizadoPorUserId: params.createdByUserId,
      status: AnamnesisStatus.VALID,
    },
    create: {
      pacienteId: params.pacienteId,
      tipo,
      motivoConsulta,
      tieneDolorActual,
      dolorIntensidad,
      urgenciaPercibida,
      tieneEnfermedadesCronicas,
      tieneAlergias,
      tieneMedicacionActual,
      embarazada,
      expuestoHumoTabaco,
      bruxismo,
      higieneCepilladosDia,
      usaHiloDental,
      ultimaVisitaDental,
      tieneHabitosSuccion,
      lactanciaRegistrada,
      payload: payload as any,
      creadoPorUserId: params.createdByUserId,
      status: AnamnesisStatus.VALID,
      versionNumber: 1,
    },
  });

  return anamnesis;
}

export async function seedAnamnesisAntecedents(
  prisma: PrismaClient,
  anamnesisId: number
) {
  const allAntecedents = await prisma.antecedentCatalog.findMany({
    where: { isActive: true },
  });
  
  const antecedents = faker.helpers.arrayElements(
    allAntecedents,
    { min: 0, max: Math.min(3, allAntecedents.length) }
  );

  for (const antecedent of antecedents) {
    try {
      await prisma.anamnesisAntecedent.create({
        data: {
          anamnesisId,
          antecedentId: antecedent.idAntecedentCatalog,
          isActive: true,
          diagnosedAt: faker.date.past({ years: 5 }),
        },
      });
    } catch (error: any) {
      // Ignore duplicate errors (P2002) - can happen if anamnesis already has this antecedent
      if (error.code !== "P2002") {
        throw error;
      }
    }
  }
}

export async function seedAnamnesisJunctions(
  prisma: PrismaClient,
  params: {
    anamnesisId: number;
    pacienteId: number;
    createdByUserId: number;
  }
) {
  // Link medications
  const allMedications = await prisma.patientMedication.findMany({
    where: {
      pacienteId: params.pacienteId,
      isActive: true,
    },
  });

  const medications = faker.helpers.arrayElements(
    allMedications,
    { min: 0, max: Math.min(3, allMedications.length) }
  );

  for (const medication of medications) {
    try {
      await prisma.anamnesisMedication.create({
        data: {
          anamnesisId: params.anamnesisId,
          medicationId: medication.idPatientMedication,
          isActive: true,
          addedByUserId: params.createdByUserId,
          notes: "Medicación vinculada desde anamnesis",
        },
      });
    } catch (error: any) {
      // Ignore duplicate errors (P2002) - can happen if already linked
      if (error.code !== "P2002") {
        throw error;
      }
    }
  }

  // Link allergies
  const allAllergies = await prisma.patientAllergy.findMany({
    where: {
      pacienteId: params.pacienteId,
      isActive: true,
    },
  });

  const allergies = faker.helpers.arrayElements(
    allAllergies,
    { min: 0, max: Math.min(2, allAllergies.length) }
  );

  for (const allergy of allergies) {
    try {
      await prisma.anamnesisAllergy.create({
        data: {
          anamnesisId: params.anamnesisId,
          allergyId: allergy.idPatientAllergy,
          isActive: true,
          addedByUserId: params.createdByUserId,
          notes: "Alergia vinculada desde anamnesis",
        },
      });
    } catch (error: any) {
      // Ignore duplicate errors (P2002) - can happen if already linked
      if (error.code !== "P2002") {
        throw error;
      }
    }
  }
}

export async function seedAnamnesisVersions(
  prisma: PrismaClient,
  params: {
    anamnesisId: number;
    pacienteId: number;
    consultaId?: number | null;
    createdByUserId: number;
  }
) {
  const anamnesis = await prisma.patientAnamnesis.findUnique({
    where: { idPatientAnamnesis: params.anamnesisId },
  });

  if (!anamnesis) return;

  const version = await prisma.patientAnamnesisVersion.create({
    data: {
      pacienteId: params.pacienteId,
      anamnesisId: params.anamnesisId,
      consultaId: params.consultaId ?? null,
      tipo: anamnesis.tipo,
      motivoConsulta: anamnesis.motivoConsulta,
      tieneDolorActual: anamnesis.tieneDolorActual,
      dolorIntensidad: anamnesis.dolorIntensidad,
      urgenciaPercibida: anamnesis.urgenciaPercibida,
      tieneEnfermedadesCronicas: anamnesis.tieneEnfermedadesCronicas,
      tieneAlergias: anamnesis.tieneAlergias,
      tieneMedicacionActual: anamnesis.tieneMedicacionActual,
      embarazada: anamnesis.embarazada,
      expuestoHumoTabaco: anamnesis.expuestoHumoTabaco,
      bruxismo: anamnesis.bruxismo,
      higieneCepilladosDia: anamnesis.higieneCepilladosDia,
      usaHiloDental: anamnesis.usaHiloDental,
      ultimaVisitaDental: anamnesis.ultimaVisitaDental,
      tieneHabitosSuccion: anamnesis.tieneHabitosSuccion,
      lactanciaRegistrada: anamnesis.lactanciaRegistrada,
      payload: anamnesis.payload as any,
      versionNumber: anamnesis.versionNumber,
      motivoCambio: faker.helpers.arrayElement([
        "Control anual",
        "Actualización pre-operatoria",
        "Cambio de estado clínico",
        "Revisión de rutina",
      ]),
      creadoPorUserId: params.createdByUserId,
    },
  });

  return version;
}

export async function seedAnamnesisAuditLogs(
  prisma: PrismaClient,
  params: {
    anamnesisId: number;
    pacienteId: number;
    actorId: number;
    consultaId?: number | null;
  }
) {
  const anamnesis = await prisma.patientAnamnesis.findUnique({
    where: { idPatientAnamnesis: params.anamnesisId },
    include: { paciente: { include: { persona: true } } },
  });

  if (!anamnesis) return;

  const actor = await prisma.usuario.findUnique({
    where: { idUsuario: params.actorId },
    include: { rol: true },
  });

  const auditLog = await prisma.anamnesisAuditLog.create({
    data: {
      anamnesisId: params.anamnesisId,
      pacienteId: params.pacienteId,
      action: AnamnesisAuditAction.CREATE,
      actorId: params.actorId,
      actorRole: (actor?.rol.nombreRol ?? "RECEP") as any,
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      previousState: null,
      newState: anamnesis as any,
      fieldDiffs: [],
      changesSummary: {
        action: "CREATE",
        fieldsChanged: [],
      },
      severity: AnamnesisChangeSeverity.LOW,
      consultaId: params.consultaId ?? null,
      isOutsideConsultation: !params.consultaId,
      informationSource: params.consultaId
        ? InformationSource.IN_PERSON
        : InformationSource.PHONE,
      verifiedWithPatient: !!params.consultaId,
      requiresReview: false,
      previousVersionNumber: null,
      newVersionNumber: anamnesis.versionNumber,
    },
  });

  return auditLog;
}

export async function seedAnamnesisMedicationAudits(
  prisma: PrismaClient,
  params: {
    anamnesisMedicationId: number;
    performedByUserId: number;
  }
) {
  try {
    const medication = await prisma.anamnesisMedication.findUnique({
      where: { idAnamnesisMedication: params.anamnesisMedicationId },
      include: { medication: true },
    });

    if (!medication) return;

    await prisma.anamnesisMedicationAudit.create({
      data: {
        anamnesisMedicationId: params.anamnesisMedicationId,
        action: "ADDED" as any,
        previousValue: null,
        newValue: medication as any,
        performedByUserId: params.performedByUserId,
        notes: "Medicación agregada a anamnesis",
      },
    });
  } catch (error: any) {
    // Ignore errors
  }
}

export async function seedAnamnesisAllergyAudits(
  prisma: PrismaClient,
  params: {
    anamnesisAllergyId: number;
    performedByUserId: number;
  }
) {
  try {
    const allergy = await prisma.anamnesisAllergy.findUnique({
      where: { idAnamnesisAllergy: params.anamnesisAllergyId },
      include: { allergy: true },
    });

    if (!allergy) return;

    await prisma.anamnesisAllergyAudit.create({
      data: {
        anamnesisAllergyId: params.anamnesisAllergyId,
        action: "ADDED" as any,
        previousValue: null,
        newValue: allergy as any,
        performedByUserId: params.performedByUserId,
        notes: "Alergia agregada a anamnesis",
      },
    });
  } catch (error: any) {
    // Ignore errors
  }
}

export async function seedAnamnesisFieldDiffs(
  prisma: PrismaClient,
  params: {
    auditLogId: number;
  }
) {
  try {
    const auditLog = await prisma.anamnesisAuditLog.findUnique({
      where: { idAnamnesisAuditLog: params.auditLogId },
    });

    if (!auditLog) return;

    // Create field diff for motivoConsulta if it changed
    if (auditLog.fieldDiffs && Array.isArray(auditLog.fieldDiffs) && auditLog.fieldDiffs.length > 0) {
      for (const diff of auditLog.fieldDiffs as any[]) {
        try {
          await prisma.anamnesisFieldDiff.create({
            data: {
              auditLogId: params.auditLogId,
              fieldPath: diff.fieldPath || "motivoConsulta",
              fieldLabel: diff.fieldLabel || "Motivo de consulta",
              fieldType: diff.fieldType || "string",
              oldValue: diff.oldValue,
              newValue: diff.newValue,
              oldValueDisplay: diff.oldValueDisplay,
              newValueDisplay: diff.newValueDisplay,
              isCritical: diff.isCritical || false,
              changeType: (diff.changeType || "MODIFIED") as any,
              requiresReview: diff.requiresReview || false,
            },
          });
        } catch (error: any) {
          // Ignore duplicate errors
        }
      }
    }
  } catch (error: any) {
    // Ignore errors
  }
}

export async function seedAnamnesisPendingReviews(
  prisma: PrismaClient,
  params: {
    anamnesisId: number;
    pacienteId: number;
    auditLogId: number;
    createdByUserId: number;
  }
) {
  // Only create pending reviews for outside-consultation edits
  const auditLog = await prisma.anamnesisAuditLog.findUnique({
    where: { idAnamnesisAuditLog: params.auditLogId },
  });

  if (!auditLog || !auditLog.isOutsideConsultation || !auditLog.requiresReview) {
    return;
  }

  try {
    const pendingReview = await prisma.anamnesisPendingReview.create({
      data: {
        anamnesisId: params.anamnesisId,
        pacienteId: params.pacienteId,
        auditLogId: params.auditLogId,
        fieldPath: "motivoConsulta",
        fieldLabel: "Motivo de consulta",
        oldValue: null,
        newValue: { motivoConsulta: "Actualización fuera de consulta" },
        reason: "Cambio realizado fuera de consulta presencial",
        severity: AnamnesisChangeSeverity.MEDIUM,
        createdByUserId: params.createdByUserId,
      },
    });

    return pendingReview;
  } catch (error: any) {
    // Ignore duplicate errors
    return null;
  }
}

