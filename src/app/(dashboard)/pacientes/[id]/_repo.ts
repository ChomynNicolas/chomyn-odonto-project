import { prisma } from "@/lib/prisma"

export const fichaRepo = {
  getPacienteCompleto: async (idPaciente: number) => {
    const [
      base,
      responsables,
      allergies,
      medications,
      diagnoses,
      vitals,
      plans,
      odontograms,
      periodontograms,
      adjuntos,
    ] = await Promise.all([
      // Base: Paciente con persona, documento, contactos y citas
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
                where: { activo: true },
                select: {
                  tipo: true,
                  valorNorm: true,
                  label: true,
                  esPrincipal: true,
                  activo: true,
                  whatsappCapaz: true,
                  esPreferidoRecordatorio: true,
                  esPreferidoCobranza: true,
                },
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
            orderBy: { inicio: "desc" },
            take: 100,
          },
        },
      }),

      // Responsables
      prisma.pacienteResponsable.findMany({
        where: { pacienteId: idPaciente },
        include: {
          persona: {
            select: {
              idPersona: true,
              nombres: true,
              apellidos: true,
              documento: { select: { tipo: true, numero: true } },
              contactos: {
                where: { activo: true, esPrincipal: true },
                take: 1,
                select: { valorNorm: true, tipo: true },
              },
            },
          },
        },
        orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
      }),

      // Allergies
      prisma.patientAllergy.findMany({
        where: { pacienteId: idPaciente },
        include: { allergyCatalog: { select: { name: true } } },
        orderBy: { notedAt: "desc" },
      }),

      // Medications
      prisma.patientMedication.findMany({
        where: { pacienteId: idPaciente },
        include: { medicationCatalog: { select: { name: true } } },
        orderBy: { startAt: "desc" },
      }),

      // Diagnoses
      prisma.patientDiagnosis.findMany({
        where: { pacienteId: idPaciente },
        include: { diagnosisCatalog: { select: { name: true, code: true } } },
        orderBy: { notedAt: "desc" },
      }),

      // Vitals with createdBy
      prisma.patientVitals.findMany({
        where: { pacienteId: idPaciente },
        include: {
          createdBy: {
            select: {
              idUsuario: true,
              nombreApellido: true,
            },
          },
        },
        orderBy: { measuredAt: "desc" },
        take: 10,
      }),

      // Treatment plans
      prisma.treatmentPlan.findMany({
        where: { pacienteId: idPaciente },
        include: {
          steps: {
            orderBy: { order: "asc" },
            include: {
              procedimientoCatalogo: { select: { nombre: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Odontograms
      prisma.odontogramSnapshot.findMany({
        where: { pacienteId: idPaciente },
        include: {
          entries: {
            orderBy: { toothNumber: "asc" },
          },
        },
        orderBy: { takenAt: "desc" },
        take: 5,
      }),

      // Periodontograms
      prisma.periodontogramSnapshot.findMany({
        where: { pacienteId: idPaciente },
        include: {
          measures: {
            orderBy: [{ toothNumber: "asc" }, { site: "asc" }],
          },
        },
        orderBy: { takenAt: "desc" },
        take: 5,
      }),

      // Adjuntos
      prisma.adjunto.findMany({
        where: { pacienteId: idPaciente, isActive: true },
        include: {
          uploadedBy: { select: { nombreApellido: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ])

    return {
      base,
      responsables,
      allergies,
      medications,
      diagnoses,
      vitals,
      plans,
      odontograms,
      periodontograms,
      adjuntos,
    }
  },
}
