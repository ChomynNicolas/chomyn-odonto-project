import { PrismaClient, EstadoCita, TipoCita } from "@prisma/client";
import { faker } from "@faker-js/faker/locale/es";
import { COUNTS, DAYS_WINDOW_FWD } from "./config";
import { addMinutes, randomFutureSlot } from "./utils";

export async function generarAgendaParaProfesional(prisma: PrismaClient, opts: {
  profesionalId: number; pacienteIds: number[]; consultorioIds: number[]; createdByUserId: number;
}) {
  const total = Math.floor(COUNTS.citas / Math.max(1, opts.consultorioIds.length));
  let creadas = 0;

  for (let i = 0; i < total; i++) {
    const pacienteId = faker.helpers.arrayElement(opts.pacienteIds);
    const consultorioId = faker.helpers.arrayElement(opts.consultorioIds);

    const inicio = randomFutureSlot(DAYS_WINDOW_FWD);
    const dur = faker.helpers.arrayElement([30, 40, 45, 60, 90]);
    const fin = addMinutes(inicio, dur);

    const estado = Math.random() < 0.7 ? EstadoCita.CONFIRMED : EstadoCita.SCHEDULED;
    const tipo = faker.helpers.arrayElement<TipoCita>(["CONSULTA","LIMPIEZA","CONTROL"] as any);

    // Evitar solapes por app (además de la constraint SQL)
    const overlap = await prisma.cita.findFirst({
      where: {
        profesionalId: opts.profesionalId,
        inicio: { lt: fin },
        fin: { gt: inicio },
        estado: { in: [EstadoCita.SCHEDULED, EstadoCita.CONFIRMED, EstadoCita.CHECKED_IN, EstadoCita.IN_PROGRESS] },
      },
      select: { idCita: true },
    });
    if (overlap) continue;

    const cita = await prisma.cita.create({
      data: {
        estado,
        pacienteId,
        profesionalId: opts.profesionalId,
        consultorioId,
        createdByUserId: opts.createdByUserId,
        inicio,
        fin,
        duracionMinutos: dur,
        tipo,
        motivo: faker.helpers.arrayElement(["Dolor molar","Control","Limpieza"]),
      },
    });
    await prisma.citaEstadoHistorial.create({
      data: { citaId: cita.idCita, estadoPrevio: null, estadoNuevo: estado, nota: "Creación de cita" },
    });
    creadas++;
  }
  return creadas;
}
