// src/app/api/pacientes/[id]/_repo.ts
import { prisma } from "@/lib/prisma";

export const fichaRepo = {
  getPacienteBase: (idPaciente: number) =>
    prisma.paciente.findUnique({
      where: { idPaciente },
      include: {
        persona: {
          select: {
            idPersona: true,
            nombres: true,
            apellidos: true,
            genero: true,
            fechaNacimiento: true,
            direccion: true,
            documento: { select: { tipo: true, numero: true, ruc: true } },
            contactos: {
              select: { tipo: true, valorNorm: true, label: true, esPrincipal: true, activo: true, createdAt: true },
              orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
            },
          },
        },
        citas: {
          where: {
            estado: {
              in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
            },
          },
          include: {
            profesional: {
              include: { persona: { select: { nombres: true, apellidos: true } } },
            },
            consultorio: { select: { idConsultorio: true, nombre: true } },
          },
          orderBy: { inicio: "asc" },
          take: 200, // margen para KPIs
        },
      },
    }),

  // clínico estructurado (catálogos)
  getClinicoEstructurado: (idPaciente: number) =>
    Promise.all([
      prisma.patientAllergy.findMany({
        where: { pacienteId: idPaciente },
        select: { idPatientAllergy: true, label: true, isActive: true, severity: true, notedAt: true, allergyCatalog: { select: { name: true } } },
        orderBy: { notedAt: "desc" },
      }),
      prisma.patientMedication.findMany({
        where: { pacienteId: idPaciente },
        select: { idPatientMedication: true, label: true, isActive: true, startAt: true, endAt: true, medicationCatalog: { select: { name: true } } },
        orderBy: { startAt: "desc" },
      }),
      prisma.patientDiagnosis.findMany({
        where: { pacienteId: idPaciente },
        select: { idPatientDiagnosis: true, label: true, status: true, notedAt: true, resolvedAt: true, diagnosisCatalog: { select: { name: true } } },
        orderBy: { notedAt: "desc" },
      }),
    ]),
  
  // actualización
  getPacienteWithPersona: (idPaciente: number) =>
    prisma.paciente.findUnique({
      where: { idPaciente },
      include: { persona: true },
    }),

  updatePersona: (idPersona: number, data: {
    nombres?: string | null;
    apellidos?: string | null;
    genero?: any;
    fechaNacimiento?: Date | null;
    direccion?: string | null;
  }) => prisma.persona.update({ where: { idPersona }, data }),

  updatePacienteNotas: (idPaciente: number, notas: any) =>
    prisma.paciente.update({ where: { idPaciente }, data: { notas: JSON.stringify(notas) } }),

  countDependencies: async (pacienteId: number) => {
    const [citas, consultas, plans, diag, alerg, meds, vitals, odo, perio] = await Promise.all([
      prisma.cita.count({ where: { pacienteId } }),
      prisma.consulta.count({ where: { cita: { pacienteId } } }), // 1:1 con Cita, pero dejamos explícito
      prisma.treatmentPlan.count({ where: { pacienteId } }),
      prisma.patientDiagnosis.count({ where: { pacienteId } }),
      prisma.patientAllergy.count({ where: { pacienteId } }),
      prisma.patientMedication.count({ where: { pacienteId } }),
      prisma.patientVitals.count({ where: { pacienteId } }),
      prisma.odontogramSnapshot.count({ where: { pacienteId } }),
      prisma.periodontogramSnapshot.count({ where: { pacienteId } }),
    ]);
    const total = citas + consultas + plans + diag + alerg + meds + vitals + odo + perio;
    return { total, citas, consultas, plans, diag, alerg, meds, vitals, odo, perio };
  },

  softInactivatePaciente: (pacienteId: number) =>
    prisma.paciente.update({
      where: { idPaciente: pacienteId },
      data: { estaActivo: false },
      select: { idPaciente: true, estaActivo: true, updatedAt: true },
    }),

  hardDeletePaciente: (pacienteId: number) =>
    prisma.paciente.delete({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    }),

  getPacienteIdentity: (pacienteId: number) =>
    prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true, personaId: true, estaActivo: true },
    }),

  // (Opcional) si quieres también inactivar Persona para ocultarla de búsquedas
  softInactivatePersona: (personaId: number) =>
    prisma.persona.update({ where: { idPersona: personaId }, data: { estaActivo: false } }),

  

  

  // 👉 NUEVO: consultar estado de Persona
  getPersonaActivo: (personaId: number) =>
    prisma.persona.findUnique({ where: { idPersona: personaId }, select: { idPersona: true, estaActivo: true } }),

  // 👉 NUEVO: reactivar paciente/persona
  reactivatePaciente: (pacienteId: number) =>
    prisma.paciente.update({
      where: { idPaciente: pacienteId },
      data: { estaActivo: true },
      select: { idPaciente: true, estaActivo: true, updatedAt: true },
    }),

  reactivatePersona: (personaId: number) =>
    prisma.persona.update({
      where: { idPersona: personaId },
      data: { estaActivo: true },
      select: { idPersona: true, estaActivo: true, updatedAt: true },
    }),
};
