import { PrismaClient, EstadoCita, MotivoCancelacion } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { COUNTS, DAYS_WINDOW, PROB, NOW } from "./config";
import { addMinutes, randomFutureDate } from "./utils";

import { crearCitaSegura, cancelarCita } from "./ensure";
import { MOTIVOS } from "./data";




export async function generarAgendaParaProfesional(prisma: PrismaClient, opts: {
profesionalId: number; pacienteIds: number[]; consultorioIds: number[]; createdByUserId: number;
}) {
const total = Math.floor(COUNTS.citas / Math.max(1, opts.consultorioIds.length));
let creadas = 0;


for (let i = 0; i < total; i++) {
const pacienteId = faker.helpers.arrayElement(opts.pacienteIds);
const consultorioId = faker.helpers.arrayElement(opts.consultorioIds);


const inicio = randomFutureDate(NOW, DAYS_WINDOW);
const dur = faker.helpers.arrayElement([30, 40, 45, 60, 90]);
const fin = addMinutes(inicio, dur);


const estado = Math.random() < PROB.citaConfirmada
  ? EstadoCita.CONFIRMED
  : EstadoCita.SCHEDULED;


const cita = await crearCitaSegura(prisma, {
pacienteId,
profesionalId: opts.profesionalId,
consultorioId,
createdByUserId: opts.createdByUserId,
inicio,
fin,
tipo: faker.helpers.arrayElement(["CONSULTA","LIMPIEZA","CONTROL"]) as any,
estado,
motivo: faker.helpers.arrayElement(MOTIVOS),
});
if (!cita) continue;
creadas++;


if (Math.random() < PROB.citaCancelada) {
  await cancelarCita(prisma, {
    citaId: cita.idCita,
    userId: opts.createdByUserId,
    reason: faker.helpers.arrayElement([MotivoCancelacion.PACIENTE, MotivoCancelacion.CLINICA, MotivoCancelacion.PROFESIONAL]),
  });
} else if (Math.random() < PROB.reprogramar) {
  const nuevoInicio = new Date(cita.inicio.getTime());
  // reprograma de 1 a 7 días después, mantiene dentro de la ventana
  nuevoInicio.setDate(nuevoInicio.getDate() + faker.number.int({ min: 1, max: 7 }));
  const nuevoFin = addMinutes(nuevoInicio, cita.duracionMinutos);

  await cancelarCita(prisma, {
    citaId: cita.idCita,
    userId: opts.createdByUserId,
    reason: MotivoCancelacion.CLINICA,
    nota: "Reprogramada"
  });

  await crearCitaSegura(prisma, {
    pacienteId: cita.pacienteId,
    profesionalId: cita.profesionalId,
    consultorioId: consultorioId,
    createdByUserId: opts.createdByUserId,
    inicio: nuevoInicio,
    fin: nuevoFin,
    tipo: cita.tipo,
    estado: EstadoCita.SCHEDULED,
    motivo: cita.motivo,
    reprogramadaDesdeId: cita.idCita,
  });
}
}
return creadas;
}