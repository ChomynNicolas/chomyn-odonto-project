// app/api/agenda/disponibilidad/_service.ts
import { PrismaClient, type EstadoCita } from "@prisma/client";
import type { GetDisponibilidadQuery } from "./_schemas";
import type { SlotDTO } from "./_dto";

const prisma = new PrismaClient();

// Estados de cita que bloquean la agenda
const ACTIVE_CITA_STATES: EstadoCita[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
];

// ===================== Helpers de fechas =====================
function atDayStart(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
function isBefore(a: Date, b: Date) {
  return a.getTime() < b.getTime();
}

// ================== Working hours (ventanas base) ==================
/**
 * Devuelve ventanas de trabajo (working hours) para el día.
 * Preferencia: profesional.disponibilidad (JSON). Si no, fallback 08–12 y 13–18 (UTC).
 *
 * Estructura JSON esperada (ejemplo):
 * {
 *   "dow": {
 *     "1": [["08:00","12:00"],["13:00","18:00"]],
 *     "2": ...
 *   }
 * }
 */
function buildWorkingWindows(
  dayUTC: Date,
  profesionalDisponibilidad: any | null
): Array<{ start: Date; end: Date }> {
  const start = atDayStart(dayUTC);
  const day = start; // 00:00Z

  const fallback = [
    { start: addMinutes(day, 8 * 60), end: addMinutes(day, 12 * 60) },
    { start: addMinutes(day, 13 * 60), end: addMinutes(day, 18 * 60) },
  ];

  if (!profesionalDisponibilidad) return fallback;

  try {
    const dow = day.getUTCDay(); // 0..6
    const map = profesionalDisponibilidad?.dow as Record<
      string,
      [string, string][] | undefined
    >;
    const segments = map?.[String(dow)] || [];
    if (!segments.length) return fallback;

    const result: Array<{ start: Date; end: Date }> = [];
    for (const [from, to] of segments) {
      const [fh, fm] = from.split(":").map(Number);
      const [th, tm] = to.split(":").map(Number);
      const s = addMinutes(day, fh * 60 + (fm || 0));
      const e = addMinutes(day, th * 60 + (tm || 0));
      if (isBefore(s, e)) result.push({ start: s, end: e });
    }
    return result.length ? result : fallback;
  } catch {
    return fallback;
  }
}

// ================== Grilla de slots ==================
/**
 * Genera slots de `intervalo` minutos dentro de las ventanas de trabajo
 * y solo conserva aquellos que permitan la duración completa.
 */
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

// ================== Exclusión por solapes ==================
function excludeOverlaps(
  slots: Array<{ start: Date; end: Date }>,
  busy: Array<{ start: Date; end: Date }>
) {
  function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
    return a.start < b.end && a.end > b.start;
  }
  return slots.filter((s) => !busy.some((b) => overlaps(s, b)));
}

// ================== Servicio principal ==================
export async function getDisponibilidad(query: GetDisponibilidadQuery): Promise<{
  slots: SlotDTO[];
  meta: { fecha: string; duracionMinutos: number; intervalo: number };
}> {
  // Si llega "YYYY-MM-DD", lo interpretamos como medianoche UTC de ese día
  const dayUTC = query.fecha ? atDayStart(new Date(`${query.fecha}T00:00:00Z`)) : atDayStart(new Date());
  const nextDayUTC = addMinutes(dayUTC, 24 * 60);

  // 1) Cargar disponibilidad del profesional (si aplica)
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
        fecha: dayUTC.toISOString(),
        duracionMinutos: query.duracionMinutos,
        intervalo: query.intervalo,
      },
    };
    }

  // 2) Ventanas de trabajo base
  const working = buildWorkingWindows(dayUTC, profesional?.disponibilidad ?? null);

  // 3) Citas activas que intersecten el día
  const whereCita: any = {
    estado: { in: ACTIVE_CITA_STATES },
    inicio: { lt: nextDayUTC },
    fin: { gt: dayUTC },
  };
  if (query.profesionalId) whereCita.profesionalId = query.profesionalId;
  if (query.consultorioId) whereCita.consultorioId = query.consultorioId;

  const citas = await prisma.cita.findMany({
    where: whereCita,
    select: { inicio: true, fin: true },
  });

  // 4) Bloqueos que intersecten el día
  const whereBloq: any = {
    activo: true,
    desde: { lt: nextDayUTC },
    hasta: { gt: dayUTC },
  };
  if (query.profesionalId) whereBloq.profesionalId = query.profesionalId;
  if (query.consultorioId) whereBloq.consultorioId = query.consultorioId;

  const bloqueos = await prisma.bloqueoAgenda.findMany({
    where: whereBloq,
    select: { desde: true, hasta: true, motivo: true, tipo: true },
  });

  // 5) Construir conjunto ocupado (citas + bloqueos)
  const busy: Array<{ start: Date; end: Date }> = [];
  for (const c of citas) busy.push({ start: c.inicio, end: c.fin });
  for (const b of bloqueos) busy.push({ start: b.desde, end: b.hasta });

  // 6) Generar grilla y excluir solapes
  const rawSlots = generateGridSlots(working, query.intervalo, query.duracionMinutos);
  const free = excludeOverlaps(rawSlots, busy);

  // 7) Map a DTO
  const slots: SlotDTO[] = free.map((s) => ({
    slotStart: s.start.toISOString(),
    slotEnd: s.end.toISOString(),
    motivoBloqueo: null, // si querés indicar motivo cuando NO hay disponibilidad, extender lógica
  }));

  return {
    slots,
    meta: {
      fecha: dayUTC.toISOString(),
      duracionMinutos: query.duracionMinutos,
      intervalo: query.intervalo,
    },
  };
}
