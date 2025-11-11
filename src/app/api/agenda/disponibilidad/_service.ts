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

// Zona de la clínica
const CLINIC_TZ = process.env.CLINIC_TZ || "America/Asuncion";

// ----------------------- Utils básicos -----------------------
function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
function isBefore(a: Date, b: Date) {
  return a.getTime() < b.getTime();
}

// Convierte una Date (instante UTC) a componentes Y-M-D-H-M-S en zona dada
function getLocalParts(utcDate: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(utcDate);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = parseInt(p.value, 10);
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second ?? 0,
  };
}

// Offset (ms) de la zona en un instante dado
function tzOffsetFor(utcDate: Date, timeZone: string): number {
  const lp = getLocalParts(utcDate, timeZone);
  const asUTC = Date.UTC(lp.year, lp.month - 1, lp.day, lp.hour, lp.minute, lp.second);
  return asUTC - utcDate.getTime();
}

/**
 * Construye un instante UTC a partir de una fecha local (YYYY-MM-DD) y una hora local (HH:mm)
 * en la zona `timeZone`.
 */
function zonedYmdTimeToUtc(fechaYMD: string, hhmm: string, timeZone: string): Date {
  const [y, mo, d] = fechaYMD.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  // Partimos de una "Date UTC con esos mismos componentes"
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
  // Ajustamos por el offset de la zona en ese instante (maneja DST)
  const offset = tzOffsetFor(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

/**
 * Devuelve 0..6 (domingo..sábado) del día local (fecha YMD) en la zona dada.
 * (No dependemos del sistema local)
 */
function localDow(fechaYMD: string, timeZone: string): number {
  // Instante UTC que corresponde a las 12:00 locales (evita bordes de día)
  const noonUtc = zonedYmdTimeToUtc(fechaYMD, "12:00", timeZone);
  // Volvemos a extraer Y-M-D local para ese instante y reconstruimos un UTC puro a medianoche
  const lp = getLocalParts(noonUtc, timeZone);
  const midUtc = new Date(Date.UTC(lp.year, lp.month - 1, lp.day, 0, 0, 0));
  return midUtc.getUTCDay(); // 0=Dom, 1=Lun, ...
}

// Dado YYYY-MM-DD (día local), devuelve [dayStartUtc, nextDayUtc]
function dayBoundsUtc(fechaYMD?: string): { dayStartUtc: Date; nextDayUtc: Date; ymd: string } {
  const ymd = fechaYMD ?? new Date().toISOString().slice(0, 10);
  const dayStartUtc = zonedYmdTimeToUtc(ymd, "00:00", CLINIC_TZ);
  const nextDayUtc = addMinutes(dayStartUtc, 24 * 60);
  return { dayStartUtc, nextDayUtc, ymd };
}

// ---------------- Ventanas laborales 08:00–16:00 (fallback) ----------------
function fallbackWorkingWindowsUtc(fechaYMD: string) {
  return [
    {
      start: zonedYmdTimeToUtc(fechaYMD, "08:00", CLINIC_TZ),
      end: zonedYmdTimeToUtc(fechaYMD, "16:00", CLINIC_TZ),
    },
  ];
}

/**
 * Si existe `profesional.disponibilidad` (JSON) con estructura:
 * {
 *   "dow": {
 *     "1": [["08:00","12:00"],["13:00","16:00"]], // Lunes
 *     ...
 *   }
 * }
 * la usamos. Si no, caemos al fallback 08:00–16:00.
 */
function buildWorkingWindowsUtc(
  fechaYMD: string,
  profesionalDisponibilidad: any | null
): Array<{ start: Date; end: Date }> {
  if (!profesionalDisponibilidad?.dow) return fallbackWorkingWindowsUtc(fechaYMD);

  const dowNum = localDow(fechaYMD, CLINIC_TZ); // 0..6 (Dom..Sáb)
  // intentamos dos claves comunes: "0..6" y "1..7 (Lun=1, Dom=7)"
  const key0to6 = String(dowNum);
  const key1to7 = String(((dowNum + 6) % 7) + 1); // 1..7
  const segments: [string, string][] =
    profesionalDisponibilidad.dow[key0to6] ??
    profesionalDisponibilidad.dow[key1to7] ??
    [];

  if (!segments.length) return fallbackWorkingWindowsUtc(fechaYMD);

  const result: Array<{ start: Date; end: Date }> = [];
  for (const [from, to] of segments) {
    const s = zonedYmdTimeToUtc(fechaYMD, from, CLINIC_TZ);
    const e = zonedYmdTimeToUtc(fechaYMD, to, CLINIC_TZ);
    if (isBefore(s, e)) result.push({ start: s, end: e });
  }
  return result.length ? result : fallbackWorkingWindowsUtc(fechaYMD);
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
  const working = buildWorkingWindowsUtc(ymd, profesional?.disponibilidad ?? null);

  // 3) Citas activas que intersecten el día
  const whereCita: any = {
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
  const whereBloq: any = {
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
