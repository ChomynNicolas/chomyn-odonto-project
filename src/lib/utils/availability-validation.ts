// ============================================================================
// AVAILABILITY VALIDATION UTILITY
// ============================================================================
// Shared module for validating appointment times against professional working hours
// Used by both createCita and reprogramarCita services

import type { Prisma } from "@prisma/client";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Structure of Profesional.disponibilidad JSON field
 * 
 * FORMATO REAL (usado en producción):
 * {
 *   "lunes": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "martes": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "miercoles": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "jueves": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "viernes": [{"inicio":"09:00","fin":"13:00"}],
 *   "sabado": [],
 *   "domingo": []
 * }
 * 
 * FORMATO LEGACY (soportado para compatibilidad):
 * {
 *   "dow": {
 *     "0": [["08:00","12:00"],["13:00","16:00"]],  // Sunday (0-6 format)
 *     "1": [["08:00","12:00"],["13:00","16:00"]],  // Monday
 *     ...
 *   }
 * }
 * 
 * Each time range is [start, end] in "HH:mm" format (24-hour, local timezone)
 */
export type ProfesionalDisponibilidad = {
  dow?: {
    [key: string]: [string, string][]; // Array of [start, end] tuples
  };
} | null;

/**
 * Working window in UTC
 */
export interface WorkingWindow {
  start: Date;
  end: Date;
}

/**
 * Result of availability validation
 */
export interface AvailabilityValidationResult {
  isValid: boolean;
  error?: {
    code: "OUTSIDE_WORKING_HOURS" | "NO_WORKING_DAY" | "INVALID_DISPONIBILIDAD";
    message: string;
    details?: {
      requestedStart: string; // ISO
      requestedEnd: string; // ISO
      dayOfWeek: number; // 0-6 (Sunday-Saturday)
      workingWindows?: Array<{ start: string; end: string }>; // ISO strings
    };
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLINIC_TZ = process.env.CLINIC_TZ || "America/Asuncion";
const FALLBACK_START_HOUR = 8; // 08:00
const FALLBACK_END_HOUR = 16; // 16:00

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Adds minutes to a date
 */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Checks if date a is before date b
 */
function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

/**
 * Converts a UTC Date to local time components in the given timezone
 */
function getLocalParts(utcDate: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
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

/**
 * Gets timezone offset in milliseconds for a given UTC date and timezone
 */
function tzOffsetFor(utcDate: Date, timeZone: string): number {
  const lp = getLocalParts(utcDate, timeZone);
  const asUTC = Date.UTC(lp.year, lp.month - 1, lp.day, lp.hour, lp.minute, lp.second);
  return asUTC - utcDate.getTime();
}

/**
 * Converts a local date (YYYY-MM-DD) and time (HH:mm) to UTC Date
 * respecting the given timezone (handles DST correctly)
 */
function zonedYmdTimeToUtc(fechaYMD: string, hhmm: string, timeZone: string): Date {
  const [y, mo, d] = fechaYMD.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  // Start with UTC guess
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
  // Adjust by timezone offset (handles DST)
  const offset = tzOffsetFor(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

/**
 * Gets day of week (0-6, Sunday-Saturday) for a local date in the given timezone
 */
function localDow(fechaYMD: string, timeZone: string): number {
  // Use noon to avoid day boundary issues
  const noonUtc = zonedYmdTimeToUtc(fechaYMD, "12:00", timeZone);
  const lp = getLocalParts(noonUtc, timeZone);
  const midUtc = new Date(Date.UTC(lp.year, lp.month - 1, lp.day, 0, 0, 0));
  return midUtc.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
}

/**
 * Extracts YYYY-MM-DD from a Date in the given timezone
 */
function getLocalYMD(date: Date, timeZone: string): string {
  const lp = getLocalParts(date, timeZone);
  return `${lp.year}-${String(lp.month).padStart(2, "0")}-${String(lp.day).padStart(2, "0")}`;
}

/**
 * Dado YYYY-MM-DD (día local), devuelve [dayStartUtc, nextDayUtc]
 * EXPORTADO para uso en otros módulos (ej: disponibilidad/_service.ts)
 */
export function dayBoundsUtc(fechaYMD?: string): { dayStartUtc: Date; nextDayUtc: Date; ymd: string } {
  const ymd = fechaYMD ?? new Date().toISOString().slice(0, 10);
  const dayStartUtc = zonedYmdTimeToUtc(ymd, "00:00", CLINIC_TZ);
  const nextDayUtc = addMinutes(dayStartUtc, 24 * 60);
  return { dayStartUtc, nextDayUtc, ymd };
}

// ============================================================================
// PARSING & VALIDATION
// ============================================================================

/**
 * Mapeo de nombres de días en español a números de día de la semana (0-6)
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
 */
const DAY_NAME_TO_DOW: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  // Variantes con acentos
  miércoles: 3,
  sábado: 6,
};

/**
 * Convierte un objeto {inicio, fin} a tupla [inicio, fin]
 */
function normalizeTimeRange(seg: unknown): [string, string] | null {
  // Formato nuevo: {inicio: "09:00", fin: "13:00"}
  if (seg && typeof seg === "object" && !Array.isArray(seg)) {
    const obj = seg as Record<string, unknown>;
    const inicio = obj.inicio;
    const fin = obj.fin;
    if (
      typeof inicio === "string" &&
      typeof fin === "string" &&
      /^\d{2}:\d{2}$/.test(inicio) &&
      /^\d{2}:\d{2}$/.test(fin)
    ) {
      return [inicio, fin];
    }
  }
  
  // Formato legacy: ["09:00", "13:00"]
  if (Array.isArray(seg) && seg.length === 2) {
    const [inicio, fin] = seg;
    if (
      typeof inicio === "string" &&
      typeof fin === "string" &&
      /^\d{2}:\d{2}$/.test(inicio) &&
      /^\d{2}:\d{2}$/.test(fin)
    ) {
      return [inicio, fin];
    }
  }
  
  return null;
}

/**
 * Parses and validates Profesional.disponibilidad JSON
 * Supports both formats:
 * 1. New format: {lunes: [{inicio, fin}], martes: [...]}
 * 2. Legacy format: {dow: {"0": [["08:00","12:00"]], ...}}
 * 
 * Returns null if invalid or missing
 */
export function parseProfesionalDisponibilidad(
  json: Prisma.JsonValue | null | undefined
): ProfesionalDisponibilidad {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return null;
  }
  
  const obj = json as Record<string, unknown>;
  const parsedDow: Record<string, [string, string][]> = {};
  
  // FORMATO NUEVO: nombres de días en español directamente en el objeto raíz
  // Ejemplo: {lunes: [{inicio: "09:00", fin: "13:00"}], martes: [...]}
  let hasNewFormat = false;
  for (const [dayName, value] of Object.entries(obj)) {
    const dowNum = DAY_NAME_TO_DOW[dayName.toLowerCase()];
    if (dowNum !== undefined && Array.isArray(value)) {
      hasNewFormat = true;
      const segments: [string, string][] = [];
      for (const seg of value) {
        const normalized = normalizeTimeRange(seg);
        if (normalized) {
          segments.push(normalized);
        }
      }
      if (segments.length > 0) {
        // Convertir a formato numérico (0-6) para consistencia interna
        parsedDow[String(dowNum)] = segments;
      }
    }
  }
  
  // Si encontramos formato nuevo, retornar
  if (hasNewFormat && Object.keys(parsedDow).length > 0) {
    return { dow: parsedDow };
  }
  
  // FORMATO LEGACY: {dow: {"0": [["08:00","12:00"]], ...}}
  if (obj.dow && typeof obj.dow === "object" && !Array.isArray(obj.dow)) {
    const dow = obj.dow as Record<string, unknown>;
    for (const [key, value] of Object.entries(dow)) {
      if (Array.isArray(value)) {
        const segments: [string, string][] = [];
        for (const seg of value) {
          const normalized = normalizeTimeRange(seg);
          if (normalized) {
            segments.push(normalized);
          }
        }
        if (segments.length > 0) {
          parsedDow[key] = segments;
        }
      }
    }
  }
  
  return Object.keys(parsedDow).length > 0 ? { dow: parsedDow } : null;
}

/**
 * Builds fallback working windows (08:00-16:00) for a given date
 */
function buildFallbackWorkingWindows(fechaYMD: string): WorkingWindow[] {
  return [
    {
      start: zonedYmdTimeToUtc(fechaYMD, `${String(FALLBACK_START_HOUR).padStart(2, "0")}:00`, CLINIC_TZ),
      end: zonedYmdTimeToUtc(fechaYMD, `${String(FALLBACK_END_HOUR).padStart(2, "0")}:00`, CLINIC_TZ),
    },
  ];
}

/**
 * Builds working windows from disponibilidad JSON for a specific date
 * Falls back to 08:00-16:00 if no disponibilidad is configured
 */
export function buildWorkingWindows(
  fechaYMD: string,
  profesionalDisponibilidad: ProfesionalDisponibilidad
): WorkingWindow[] {
  if (!profesionalDisponibilidad?.dow) {
    return buildFallbackWorkingWindows(fechaYMD);
  }

  const dowNum = localDow(fechaYMD, CLINIC_TZ); // 0-6 (Sunday-Saturday)
  
  // Try both common formats: "0-6" and "1-7" (Monday=1, Sunday=7)
  const key0to6 = String(dowNum);
  const key1to7 = String(((dowNum + 6) % 7) + 1); // Convert 0-6 to 1-7 format
  
  const segments: [string, string][] =
    profesionalDisponibilidad.dow[key0to6] ??
    profesionalDisponibilidad.dow[key1to7] ??
    [];

  if (!segments.length) {
    return buildFallbackWorkingWindows(fechaYMD);
  }

  const result: WorkingWindow[] = [];
  for (const [from, to] of segments) {
    const start = zonedYmdTimeToUtc(fechaYMD, from, CLINIC_TZ);
    const end = zonedYmdTimeToUtc(fechaYMD, to, CLINIC_TZ);
    if (isBefore(start, end)) {
      result.push({ start, end });
    }
  }
  
  return result.length > 0 ? result : buildFallbackWorkingWindows(fechaYMD);
}

/**
 * Checks if a time range (start, end) overlaps with any working window
 * Returns true if the appointment is fully contained within working hours
 */
function isWithinWorkingHours(
  appointmentStart: Date,
  appointmentEnd: Date,
  workingWindows: WorkingWindow[]
): boolean {
  // Check if appointment is fully contained within any working window
  for (const window of workingWindows) {
    // Appointment must start >= window start AND end <= window end
    if (
      appointmentStart.getTime() >= window.start.getTime() &&
      appointmentEnd.getTime() <= window.end.getTime()
    ) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validates that an appointment time falls within the professional's working hours
 * 
 * @param appointmentStart - Start time of the appointment (UTC Date)
 * @param appointmentEnd - End time of the appointment (UTC Date)
 * @param profesionalDisponibilidad - Parsed disponibilidad JSON (can be null for fallback)
 * @returns Validation result with error details if invalid
 */
export function validateWorkingHours(
  appointmentStart: Date,
  appointmentEnd: Date,
  profesionalDisponibilidad: ProfesionalDisponibilidad
): AvailabilityValidationResult {
  // Validate inputs
  if (!(appointmentStart instanceof Date) || !(appointmentEnd instanceof Date)) {
    return {
      isValid: false,
      error: {
        code: "INVALID_DISPONIBILIDAD",
        message: "Invalid date objects provided",
      },
    };
  }

  if (isNaN(appointmentStart.getTime()) || isNaN(appointmentEnd.getTime())) {
    return {
      isValid: false,
      error: {
        code: "INVALID_DISPONIBILIDAD",
        message: "Invalid date values",
      },
    };
  }

  if (appointmentEnd <= appointmentStart) {
    return {
      isValid: false,
      error: {
        code: "INVALID_DISPONIBILIDAD",
        message: "Appointment end must be after start",
      },
    };
  }

  // Get local date (YYYY-MM-DD) for the appointment start
  const fechaYMD = getLocalYMD(appointmentStart, CLINIC_TZ);
  const dayOfWeek = localDow(fechaYMD, CLINIC_TZ);

  // Build working windows for this day
  const workingWindows = buildWorkingWindows(fechaYMD, profesionalDisponibilidad);

  // Check if appointment is within working hours
  if (isWithinWorkingHours(appointmentStart, appointmentEnd, workingWindows)) {
    return { isValid: true };
  }

  // Check if there are any working windows at all (if not, it's a non-working day)
  if (workingWindows.length === 0 || 
      (workingWindows.length === 1 && 
       workingWindows[0].start.getTime() === workingWindows[0].end.getTime())) {
    return {
      isValid: false,
      error: {
        code: "NO_WORKING_DAY",
        message: `El profesional no trabaja el ${getDayName(dayOfWeek)}.`,
        details: {
          requestedStart: appointmentStart.toISOString(),
          requestedEnd: appointmentEnd.toISOString(),
          dayOfWeek,
          workingWindows: [],
        },
      },
    };
  }

  // Appointment is outside working hours
  return {
    isValid: false,
    error: {
      code: "OUTSIDE_WORKING_HOURS",
      message: `La cita está fuera del horario de trabajo del profesional.`,
      details: {
        requestedStart: appointmentStart.toISOString(),
        requestedEnd: appointmentEnd.toISOString(),
        dayOfWeek,
        workingWindows: workingWindows.map((w) => ({
          start: w.start.toISOString(),
          end: w.end.toISOString(),
        })),
      },
    },
  };
}

/**
 * Helper to get day name in Spanish
 */
function getDayName(dow: number): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[dow] || `día ${dow}`;
}

