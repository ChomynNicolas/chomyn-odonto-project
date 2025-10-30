import { PrismaClient, RolNombre, Genero, AdjuntoTipo } from "@prisma/client";
import { ALLOW_PROD_SEED, RESEED, COUNTS } from "./config";
import { log } from "./logger";
import { hashPassword } from "./utils";
import {
  ensureRoles, ensureUsuario, ensureEspecialidades, ensureProfesionalEspecialidades,
  ensurePersonaConDocumento, ensureContactos, ensurePacienteFromPersona,
  ensureConsultorio, ensureProcedimientoCatalogo,
  ensureDiagnosisCatalog, ensureAllergyCatalog, ensureMedicationCatalog,
} from "./ensure";
import { ESPECIALIDADES, CONSULTORIOS, PROCEDIMIENTOS_CATALOGO, DIAGNOSIS_CATALOG, ALLERGY_CATALOG, MEDICATION_CATALOG } from "./data";
import { fakePersona, fakeDocumento, fakeContactosPersona } from "./factories";
import { generarAgendaParaProfesional } from "./agenda";
import { createPlanConSteps, ensureConsultaParaCita, addLineaProcedimiento, addAdjuntoConsulta, addClinicalBasics, addOdontoAndPerio } from "./clinical";

const prisma = new PrismaClient();

async function safeTruncate() {
  const tables = [
  '"PeriodontogramMeasure"', '"PeriodontogramSnapshot"',
  '"OdontogramEntry"', '"OdontogramSnapshot"',
  '"PatientVitals"', '"PatientMedication"', '"MedicationCatalog"',
  '"PatientAllergy"', '"AllergyCatalog"', '"PatientDiagnosis"', '"DiagnosisCatalog"',
  '"ClinicalHistoryEntry"',
  '"ConsultaAdjunto"', '"ConsultaProcedimiento"', '"Consulta"',
  '"TreatmentStep"', '"TreatmentPlan"',
  '"CitaEstadoHistorial"', '"Cita"', '"BloqueoAgenda"',
  '"PacienteResponsable"',
  '"ProfesionalEspecialidad"', '"Especialidad"',
  '"Profesional"', '"Paciente"',
  '"PersonaContacto"', '"Documento"', '"Consultorio"',
  '"Usuario"', '"Rol"'
];
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE;`);
}

async function main() {
  log.info("Seed iniciado");

  if (process.env.NODE_ENV === "production" && !ALLOW_PROD_SEED) {
    throw new Error("Semilla bloqueada en producción. Exporta ALLOW_PROD_SEED=1 si estás seguro.");
  }

  if (RESEED) {
    log.warn("RESEED=1 → limpiando tablas...");
    await safeTruncate();
  }

  // 1) Roles
  await ensureRoles(prisma);

  // 2) Usuarios base
  const [adminHash, recepHash, odontHash] = await Promise.all([
    hashPassword("Admin123!"), hashPassword("Recep123!"), hashPassword("Odont123!")
  ]);

  const admin = await ensureUsuario(prisma, { usuario: "admin", email: "admin@clinica.com", nombreApellido: "Administrador General", rol: RolNombre.ADMIN, passwordHash: adminHash });
  const recep = await ensureUsuario(prisma, { usuario: "recep.sosa", email: "recep@clinica.com", nombreApellido: "Recepcionista Sosa", rol: RolNombre.RECEP, passwordHash: recepHash });

  // 3) Especialidades y profesionales
  await ensureEspecialidades(prisma, ESPECIALIDADES);

  const profesionales: { idProfesional: number }[] = [];
  for (let i = 0; i < COUNTS.profesionales; i++) {
    const user = await ensureUsuario(prisma, {
      usuario: i === 0 ? "dra.vera" : `dr_${i}`,
      email: i === 0 ? "doctora@clinica.com" : `doctor_${i}@clinica.com`,
      nombreApellido: i === 0 ? "Dra. Vera López" : `Dr. ${i} ${i % 2 ? "Gómez" : "Martínez"}`,
      rol: RolNombre.ODONT,
      passwordHash: odontHash,
    });

    const persona = await ensurePersonaConDocumento(prisma, {
      ...fakePersona(1000 + i),
      doc: fakeDocumento(1000 + i),
    });
    await ensureContactos(prisma, persona.idPersona, fakeContactosPersona(1000 + i, "odont"));

    const profesional = await prisma.profesional.upsert({
      where: { userId: user.idUsuario },
      update: {},
      create: { userId: user.idUsuario, personaId: persona.idPersona, numeroLicencia: `ODT-${10000 + i}`, estaActivo: true },
      select: { idProfesional: true },
    });
    await ensureProfesionalEspecialidades(prisma, profesional.idProfesional, ESPECIALIDADES.slice(0, 2));
    profesionales.push(profesional);
  }

  // 4) Consultorios
  const consultorios = [] as { idConsultorio: number }[];
  for (const c of CONSULTORIOS.slice(0, COUNTS.consultorios)) {
    const row = await ensureConsultorio(prisma, c.nombre, c.colorHex);
    consultorios.push({ idConsultorio: row.idConsultorio });
  }

  // 5) Pacientes
  const pacientesIds: number[] = [];
  for (let i = 0; i < COUNTS.pacientes; i++) {
    const per = await ensurePersonaConDocumento(prisma, { ...fakePersona(i), doc: fakeDocumento(i) });
    await ensureContactos(prisma, per.idPersona, fakeContactosPersona(i, "paciente"));
    const pac = await ensurePacienteFromPersona(prisma, per.idPersona);
    pacientesIds.push(pac.idPaciente);
  }

  // 6) Catálogos clínicos
  await ensureProcedimientoCatalogo(prisma, PROCEDIMIENTOS_CATALOGO);
  await ensureDiagnosisCatalog(prisma, DIAGNOSIS_CATALOG);
  await ensureAllergyCatalog(prisma, ALLERGY_CATALOG);
  await ensureMedicationCatalog(prisma, MEDICATION_CATALOG);

  // 7) Agenda sólo futuro por profesional
  let totalCreadas = 0;
  for (const prof of profesionales) {
    const creadas = await generarAgendaParaProfesional(prisma, {
      profesionalId: prof.idProfesional,
      pacienteIds: pacientesIds,
      consultorioIds: consultorios.map(c => c.idConsultorio),
      createdByUserId: recep.idUsuario,
    });
    totalCreadas += creadas;
  }

  // 8) Para probar clínica: toma 5 pacientes, crea plan + consulta con 2 procedimientos y adjuntos
  const subset = pacientesIds.slice(0, Math.min(5, pacientesIds.length));
  for (const pid of subset) {
    // Plan simple con 3 steps del catálogo
    await createPlanConSteps(prisma, {
      pacienteId: pid,
      createdByUserId: recep.idUsuario,
      steps: [
        { code: "CONS-INI" },
        { code: "LIMP" },
        { code: "OBT", toothNumber: 16, toothSurface: "O" as any },
      ],
    });

    // Tomamos una cita futura CONFIRMED de ese paciente y abrimos consulta
    const cita = await prisma.cita.findFirst({
      where: { pacienteId: pid },
      orderBy: { inicio: "asc" },
    });
    if (!cita) continue;

    const consulta = await ensureConsultaParaCita(prisma, {
      citaId: cita.idCita,
      performedByProfessionalId: cita.profesionalId,
      createdByUserId: recep.idUsuario,
      status: "DRAFT" as any,
      reason: "Consulta demo",
    });

    // 2 procedimientos (del catálogo) y 1 libre
    const p1 = await addLineaProcedimiento(prisma, {
      consultaCitaId: consulta.citaId,
      code: "CONS-INI",
      quantity: 1,
      resultNotes: "Evaluación completa",
    });

    const p2 = await addLineaProcedimiento(prisma, {
      consultaCitaId: consulta.citaId,
      code: "OBT",
      toothNumber: 16,
      toothSurface: "O" as any,
      quantity: 1,
      resultNotes: "Resina aplicada",
    });

    await addLineaProcedimiento(prisma, {
      consultaCitaId: consulta.citaId,
      serviceType: "Fluorización tópica",
      quantity: 1,
      unitPriceCents: 60000,
      resultNotes: "Aplicación preventiva",
    });

    // Adjuntos de clínica
    await addAdjuntoConsulta(prisma, {
      consultaCitaId: consulta.citaId,
      uploadedByUserId: recep.idUsuario,
      url: "https://example.com/xray_16.png",
      originalName: "xray_16.png",
      mimeType: "image/png",
      size: 120_000,
      tipo: AdjuntoTipo.XRAY,
      procedimientoId: p2.idConsultaProcedimiento,
      metadata: { tooth: 16 },
    });

    // Historia, diagnósticos, alergias, medicación, vitales
    await addClinicalBasics(prisma, {
      pacienteId: pid,
      createdByUserId: recep.idUsuario,
      consultaId: consulta.citaId,
    });

    // Odontograma + periodontograma
    await addOdontoAndPerio(prisma, {
      pacienteId: pid,
      createdByUserId: recep.idUsuario,
      consultaId: consulta.citaId,
    });
  }

  log.ok("Seed completado:", {
    profesionales: profesionales.length,
    consultorios: consultorios.length,
    pacientes: pacientesIds.length,
    citas: totalCreadas,
  });
}

main().catch((e) => {
  log.err("Seed falló:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
