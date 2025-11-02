// ============================================================================
// API CLIENT - Disponibilidad de Agenda
// ============================================================================

import type { DisponibilidadResponse } from "@/types/agenda"

export interface GetDisponibilidadParams {
  fecha: string // YYYY-MM-DD
  profesionalId?: number
  consultorioId?: number
  duracionMinutos?: number
  intervalo?: number
}

export async function apiGetDisponibilidad(params: GetDisponibilidadParams): Promise<DisponibilidadResponse> {
  const sp = new URLSearchParams()
  sp.set("fecha", params.fecha)
  if (params.profesionalId) sp.set("profesionalId", String(params.profesionalId))
  if (params.consultorioId) sp.set("consultorioId", String(params.consultorioId))
  if (params.duracionMinutos) sp.set("duracionMinutos", String(params.duracionMinutos))
  if (params.intervalo) sp.set("intervalo", String(params.intervalo))

  const res = await fetch(`/api/agenda/disponibilidad?${sp.toString()}`, {
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error ?? "Error obteniendo disponibilidad")
  }

  const json = await res.json()
  return {
    slots: json.data ?? json.slots ?? [],
    meta: json.meta ?? { fecha: params.fecha, duracionMinutos: 30, intervalo: 15 },
  }
}

/**
 * Verifica si un slot está disponible y sugiere alternativas si no lo está
 */
export async function apiCheckSlotDisponible(params: {
  fecha: string
  inicio: string // HH:mm local
  duracionMinutos: number
  profesionalId?: number
  consultorioId?: number
}): Promise<{
  disponible: boolean
  alternativas: Array<{ inicio: string; fin: string }>
}> {
  const disp = await apiGetDisponibilidad({
    fecha: params.fecha,
    profesionalId: params.profesionalId,
    consultorioId: params.consultorioId,
    duracionMinutos: params.duracionMinutos,
    intervalo: 15,
  });

  // Slot solicitado en local -> Date (local) -> epoch
  const solicitadoStart = new Date(`${params.fecha}T${params.inicio}:00`);
  const solicitadoEnd = new Date(solicitadoStart.getTime() + params.duracionMinutos * 60000);

  // ¿Existe exactamente ese slot en los libres?
  const disponible = disp.slots.some((s) => {
    const slotStart = new Date(s.slotStart);
    const slotEnd = new Date(s.slotEnd);
    return slotStart.getTime() === solicitadoStart.getTime() &&
           slotEnd.getTime() === solicitadoEnd.getTime() &&
           !s.motivoBloqueo;
  });

  // Alternativas: por cercanía al solicitado
  const alternativas = disp.slots
    .filter((s) => !s.motivoBloqueo)
    .map((s) => ({
      inicio: s.slotStart,
      fin: s.slotEnd,
      dist: Math.abs(new Date(s.slotStart).getTime() - solicitadoStart.getTime()),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map(({ inicio, fin }) => ({ inicio, fin }));

  return { disponible, alternativas };
}

