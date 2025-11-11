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
  excludeCitaId?: number // Excluir esta cita del cálculo (útil para reschedule)
}

export async function apiGetDisponibilidad(params: GetDisponibilidadParams): Promise<DisponibilidadResponse> {
  const sp = new URLSearchParams()
  sp.set("fecha", params.fecha)
  if (params.profesionalId) sp.set("profesionalId", String(params.profesionalId))
  if (params.consultorioId) sp.set("consultorioId", String(params.consultorioId))
  if (params.duracionMinutos) sp.set("duracionMinutos", String(params.duracionMinutos))
  if (params.intervalo) sp.set("intervalo", String(params.intervalo))
  if (params.excludeCitaId) sp.set("excludeCitaId", String(params.excludeCitaId))

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
 * Verifica si un slot está disponible y sugiere alternativas si no lo está.
 * Busca en el día actual y hasta 7 días siguientes para recomendaciones.
 */
export async function apiCheckSlotDisponible(params: {
  fecha: string
  inicio: string // HH:mm local
  duracionMinutos: number
  profesionalId?: number
  consultorioId?: number
  buscarMultiDia?: boolean // Si true, busca en múltiples días
  maxDias?: number // Máximo de días a buscar (default: 7)
  excludeCitaId?: number // Excluir esta cita del cálculo (útil para reschedule)
}): Promise<{
  disponible: boolean
  alternativas: Array<{ inicio: string; fin: string }>
}> {
  const buscarMultiDia = params.buscarMultiDia ?? true
  const maxDias = params.maxDias ?? 7

  // Slot solicitado en local -> Date (local) -> epoch
  const solicitadoStart = new Date(`${params.fecha}T${params.inicio}:00`);
  const solicitadoEnd = new Date(solicitadoStart.getTime() + params.duracionMinutos * 60000);

  // 1) Verificar disponibilidad en el día solicitado
  const dispHoy = await apiGetDisponibilidad({
    fecha: params.fecha,
    profesionalId: params.profesionalId,
    consultorioId: params.consultorioId,
    duracionMinutos: params.duracionMinutos,
    intervalo: 15,
    excludeCitaId: params.excludeCitaId,
  });

  // ¿Existe exactamente ese slot en los libres?
  const disponible = dispHoy.slots.some((s) => {
    const slotStart = new Date(s.slotStart);
    const slotEnd = new Date(s.slotEnd);
    return slotStart.getTime() === solicitadoStart.getTime() &&
           slotEnd.getTime() === solicitadoEnd.getTime() &&
           !s.motivoBloqueo;
  });

  if (disponible) {
    return { disponible: true, alternativas: [] };
  }

  // 2) Si no está disponible, buscar alternativas
  const alternativas: Array<{ inicio: string; fin: string; dist: number; fecha: string }> = [];

  // Alternativas del día actual (más cercanas)
  const alternativasHoy = dispHoy.slots
    .filter((s) => !s.motivoBloqueo)
    .map((s) => ({
      inicio: s.slotStart,
      fin: s.slotEnd,
      dist: Math.abs(new Date(s.slotStart).getTime() - solicitadoStart.getTime()),
      fecha: params.fecha,
    }));

  alternativas.push(...alternativasHoy);

  // 3) Si buscarMultiDia, buscar en días siguientes
  if (buscarMultiDia) {
    const fechaBase = new Date(params.fecha);
    
    for (let i = 1; i <= maxDias; i++) {
      const fechaSiguiente = new Date(fechaBase);
      fechaSiguiente.setDate(fechaSiguiente.getDate() + i);
      const fechaYMD = fechaSiguiente.toISOString().slice(0, 10);

      try {
        const dispSiguiente = await apiGetDisponibilidad({
          fecha: fechaYMD,
          profesionalId: params.profesionalId,
          consultorioId: params.consultorioId,
          duracionMinutos: params.duracionMinutos,
          intervalo: 15,
          excludeCitaId: params.excludeCitaId,
        });

        // Agregar slots disponibles del día siguiente
        const slotsDia = dispSiguiente.slots
          .filter((s) => !s.motivoBloqueo)
          .map((s) => ({
            inicio: s.slotStart,
            fin: s.slotEnd,
            dist: Math.abs(new Date(s.slotStart).getTime() - solicitadoStart.getTime()) + (i * 24 * 60 * 60 * 1000), // Penalizar días futuros
            fecha: fechaYMD,
          }));

        alternativas.push(...slotsDia);

        // Limitar búsqueda si ya tenemos suficientes alternativas
        if (alternativas.length >= 20) break;
      } catch (e) {
        // Ignorar errores en días futuros
        console.warn(`[apiCheckSlotDisponible] Error buscando disponibilidad para ${fechaYMD}:`, e);
      }
    }
  }

  // Ordenar por distancia (cercanía al horario solicitado)
  alternativas.sort((a, b) => a.dist - b.dist);

  // Retornar top 10 alternativas
  return {
    disponible: false,
    alternativas: alternativas.slice(0, 10).map(({ inicio, fin }) => ({ inicio, fin })),
  };
}

