import type { EventInput } from "@fullcalendar/core";
import type { CitaItem } from "@/lib/schema/cita.calendar";

export function citaToEvent(c: CitaItem): EventInput {
  const level = estadoToCalendarLevel(c.estado);
  const bg = c.consultorioColorHex; // si quieres colorear por consultorio
  return {
    id: String(c.idCita),
    title: buildTitle(c),
    start: c.inicio,
    end: c.fin,
    allDay: false,
    backgroundColor: bg, // FullCalendar usará este color
    borderColor: bg,
    extendedProps: {
      calendar: level,
      estado: c.estado,
      pacienteId: c.pacienteId,
      profesionalId: c.profesionalId,
      pacienteNombre: c.pacienteNombre,
      profesionalNombre: c.profesionalNombre,
      consultorioNombre: c.consultorioNombre,
    },
  };
}

function buildTitle(c: CitaItem) {
  // título útil: Paciente — Motivo
  const p = c.pacienteNombre ? `${c.pacienteNombre}` : `Paciente ${c.pacienteId}`;
  const m = c.motivo?.trim() ? ` — ${c.motivo}` : "";
  return `${p}${m}`;
}

export function estadoToCalendarLevel(estado: CitaItem["estado"]) {
  switch (estado) {
    case "CONFIRMED":
    case "SCHEDULED":
      return "Primary";
    case "IN_PROGRESS":
    case "CHECKED_IN":
      return "Warning";
    case "COMPLETED":
      return "Success";
    case "CANCELLED":
    case "NO_SHOW":
      return "Danger";
    default:
      return "Primary";
  }
}
