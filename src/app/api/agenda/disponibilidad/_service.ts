// app/api/agenda/disponibilidad/_service.ts
import { PrismaClient, type EstadoCita } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { GetDisponibilidadQuery } from "./_schemas";
import type { SlotDTO } from "./_dto";
import {
  parseProfesionalDisponibilidad,
  buildWorkingWindows,
  dayBoundsUtc,
  type ProfesionalDisponibilidad,
} from "@/lib/utils/availability-validation";

const prisma = new PrismaClient();

// Estados de cita que bloquean la agenda
const ACTIVE_CITA_STATES: EstadoCita[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
];

// ----------------------- Utils básicos -----------------------
function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ---------------- Grilla de slots y exclusiones ----------------
function generateGridSlots(
  working: Array<{ start: Date; end: Date }>,
  intervalo: number,
  duracionMinutos: number
): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  for (const win of working) {
    const lastStart = addMinutes(win.end, -duracionMinutos);
    for (let t = new Date(win.start); t.getTime() <= lastStart.getTime(); t = addMinutes(t, intervalo)) {
      slots.push({ start: new Date(t), end: addMinutes(t, duracionMinutos) });
    }
  }
  return slots;
}

function excludeOverlaps(
  slots: Array<{ start: Date; end: Date }>,
  busy: Array<{ start: Date; end: Date }>
) {
  function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
    return a.start < b.end && a.end > b.start;
  }
  return slots.filter((s) => !busy.some((b) => overlaps(s, b)));
}

// ---------------- Servicio principal ----------------
export async function getDisponibilidad(query: GetDisponibilidadQuery): Promise<{
  slots: SlotDTO[];
  meta: { fecha: string; duracionMinutos: number; intervalo: number };
}> {
  const { dayStartUtc, nextDayUtc, ymd } = dayBoundsUtc(query.fecha);

  // 1) Profesional (opcional)
  const profesional = query.profesionalId
    ? await prisma.profesional.findUnique({
        where: { idProfesional: query.profesionalId },
        select: { idProfesional: true, estaActivo: true, disponibilidad: true },
      })
    : null;

  if (profesional && !profesional.estaActivo) {
    return {
      slots: [],
      meta: {
        fecha: dayStartUtc.toISOString(),
        duracionMinutos: query.duracionMinutos,
        intervalo: query.intervalo,
      },
    };
  }

  // 2) Ventanas laborales (preferencia disponibilidad; si no, 08–16 local)
  // Usar función compartida de availability-validation.ts para consistencia
  const disponibilidad = parseProfesionalDisponibilidad(profesional?.disponibilidad ?? null);
  const working = buildWorkingWindows(ymd, disponibilidad);

  // 3) Citas activas que intersecten el día
  const whereCita: Prisma.CitaWhereInput = {
    estado: { in: ACTIVE_CITA_STATES },
    inicio: { lt: nextDayUtc },
    fin: { gt: dayStartUtc },
  };
  if (query.profesionalId) whereCita.profesionalId = query.profesionalId;
  if (query.consultorioId) whereCita.consultorioId = query.consultorioId;
  // Excluir cita específica (útil para reschedule: no considerar la cita que se está reprogramando)
  if (query.excludeCitaId) whereCita.idCita = { not: query.excludeCitaId };

  const citas = await prisma.cita.findMany({
    where: whereCita,
    select: { inicio: true, fin: true },
  });

  // 4) Bloqueos
  const whereBloq: Prisma.BloqueoAgendaWhereInput = {
    activo: true,
    desde: { lt: nextDayUtc },
    hasta: { gt: dayStartUtc },
  };
  if (query.profesionalId) whereBloq.profesionalId = query.profesionalId;
  if (query.consultorioId) whereBloq.consultorioId = query.consultorioId;

  const bloqueos = await prisma.bloqueoAgenda.findMany({
    where: whereBloq,
    select: { desde: true, hasta: true, motivo: true, tipo: true },
  });

  // 5) Conjunto ocupado
  const busy: Array<{ start: Date; end: Date }> = [
    ...citas.map((c) => ({ start: c.inicio, end: c.fin })),
    ...bloqueos.map((b) => ({ start: b.desde, end: b.hasta })),
  ];

  // 6) Grilla (intervalo) y exclusión por solapes
  const rawSlots = generateGridSlots(working, query.intervalo, query.duracionMinutos);
  const free = excludeOverlaps(rawSlots, busy);

  // 7) DTO
  const slots: SlotDTO[] = free.map((s) => ({
    slotStart: s.start.toISOString(),
    slotEnd: s.end.toISOString(),
    motivoBloqueo: null,
  }));

  return {
    slots,
    meta: {
      fecha: dayStartUtc.toISOString(),
      duracionMinutos: query.duracionMinutos,
      intervalo: query.intervalo,
    },
  };
}
