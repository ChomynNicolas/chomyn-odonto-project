// app/api/agenda/disponibilidad/_service.ts
import { PrismaClient, EstadoCita } from "@prisma/client";
import type { GetDisponibilidadQuery } from "./_schemas";
import type { SlotDTO } from "./_dto";

const prisma = new PrismaClient();

const ACTIVE_CITA_STATES: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

// Helpers de fechas
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
function maxDate(a: Date, b: Date) {
  return new Date(Math.max(a.getTime(), b.getTime()));
}
function minDate(a: Date, b: Date) {
  return new Date(Math.min(a.getTime(), b.getTime()));
}

/**
 * Devuelve ventanas de trabajo (working hours) para el día.
 * Fuente preferida: profesional.disponibilidad (JSON) si existe y está activa.
 * Fallback: 08:00–12:00 y 13:00–18:00 (clínica general).
 *
 * Nota: Para sencillez, operamos en UTC. Si tu frontend envía “fecha” en zona
 * America/Asuncion normaliza a UTC (ej. 2025-10-22T00:00:00-03:00 -> Z).
 * Si querés cálculo exacto por TZ local aquí, podemos integrar date-fns-tz.
 */
function buildWorkingWindows(
  dayUTC: Date,
  profesionalDisponibilidad: any | null
): Array<{ start: Date; end: Date }> {
  const start = atDayStart(dayUTC);
  const day = start; // 00:00Z

  // Fallback (08:00–12:00 y 13:00–18:00)
  const fallback = [
    { start: addMinutes(day, 8 * 60), end: addMinutes(day, 12 * 60) },
    { start: addMinutes(day, 13 * 60), end: addMinutes(day, 18 * 60) },
  ];

  // Si tenés una estructura concreta en JSON (ej. [{dow:1, from:"08:00", to:"12:00"}...]),
  // podés mapearla acá. Por ahora usamos fallback si no hay nada.
  if (!profesionalDisponibilidad) return fallback;

  try {
    // Ejemplo esperado: { dow: { "1":[["08:00","12:00"],["13:00","18:00"]], ... } }
    const dow = day.getUTCDay(); // 0..6
    const map = profesionalDisponibilidad?.dow as Record<string, [string, string][] | undefined>;
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

/**
 * Genera slots discretos de `intervalo` minutos *dentro* de las ventanas de trabajo.
 * Luego filtra aquellos que no admiten `duracionMinutos` completos.
 */
function generateGridSlots(
  working: Array<{ start: Date; end: Date }>,
  intervalo: number,
  duracionMinutos: number
): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  for (const win of working) {
    let t = new Date(win.start);
    const lastStart = addMinutes(win.end, -duracionMinutos);
    while (!isBefore(lastStart, t) === false) {
      // no-op; corregimos condición abajo
      break;
    }
    while (isBefore(t, addMinutes(win.end, -duracionMinutos)) || +t === +addMinutes(win.end, -duracionMinutos)) {
      const end = addMinutes(t, duracionMinutos);
      slots.push({ start: t, end });
      t = addMinutes(t, intervalo);
    }
  }
  return slots;
}

/**
 * Dado un conjunto de intervalos ocupados (citas y bloqueos),
 * filtra y devuelve sólo los slots "libres".
 */
function excludeOverlaps(
  slots: Array<{ start: Date; end: Date }>,
  busy: Array<{ start: Date; end: Date }>
) {
  function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
    return a.start < b.end && a.end > b.start;
  }
  return slots.filter((s) => !busy.some((b) => overlaps(s, b)));
}

export async function getDisponibilidad(query: GetDisponibilidadQuery): Promise<{
  slots: SlotDTO[];
  meta: { fecha: string; duracionMinutos: number; intervalo: number };
}> {
  const todayUTC = query.fecha ? new Date(query.fecha) : new Date();
  const dayUTC = atDayStart(todayUTC);
  const nextDayUTC = addMinutes(dayUTC, 24 * 60);

  // 1) Cargar disponibilidad del profesional (si aplica)
  const profesional =
    query.profesionalId
      ? await prisma.profesional.findUnique({
          where: { idProfesional: query.profesionalId },
          select: { idProfesional: true, estaActivo: true, disponibilidad: true },
        })
      : null;

  if (profesional && !profesional.estaActivo) {
    return { slots: [], meta: { fecha: dayUTC.toISOString(), duracionMinutos: query.duracionMinutos, intervalo: query.intervalo } };
  }

  // 2) Ventanas de trabajo base
  const working = buildWorkingWindows(dayUTC, profesional?.disponibilidad ?? null);

  // 3) Traer intervalos ocupados por Citas (estados activos)
  const whereCita: any = {
    estado: { in: ACTIVE_CITA_STATES },
    inicio: { lt: nextDayUTC },
    fin: { gt: dayUTC },
  };
  if (query.profesionalId) whereCita.profesionalId = query.pro fesionalId;
  if (query.consultorioId) whereCita.consultorioId = query.consultorioId;

  const citas = await prisma.cita.findMany({
    where: whereCita,
    select: { inicio: true, fin: true },
  });

  // 4) Traer bloqueos que intersecten el día
  const whereBloq: any = {
    activo: true,
    desde: { lt: nextDayUTC },
    hasta: { gt: dayUTC },
  };
  if (query.profesionalId) whereBloq.profesionalId = query.pro fesionalId;
  if (query.consultorioId) whereBloq.consultorioId = query.consultorioId;

  const bloqueos = await prisma.bloqueoAgenda.findMany({
    where: whereBloq,
    select: { desde: true, hasta: true, motivo: true, tipo: true },
  });

  // 5) Construir set de intervalos ocupados (citas + bloqueos)
  const busy: Array<{ start: Date; end: Date; reason?: string }> = [];
  for (const c of citas) busy.push({ start: c.inicio, end: c.fin });
  for (const b of bloqueos) busy.push({ start: b.desde, end: b.hasta, reason: b.motivo || b.tipo });

  // 6) Generar grilla y excluir solapes
  const rawSlots = generateGridSlots(working, query.intervalo, query.duracionMinutos);
  const free = excludeOverlaps(
    rawSlots,
    busy.map(({ start, end }) => ({ start, end }))
  );

  // 7) Map a DTO
  const slots: SlotDTO[] = free.map((s) => ({
    slotStart: s.start.toISOString(),
    slotEnd: s.end.toISOString(),
    motivoBloqueo: null,
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
