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
