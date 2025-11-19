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
 * Verifica si dos rangos de tiempo se solapan (overlap)
 * Usa la misma lógica que el backend para consistencia
 */
function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Verifica si un slot está disponible y sugiere alternativas si no lo está.
 * Busca en el día actual y hasta 7 días siguientes para recomendaciones.
 * 
 * MEJORAS IMPLEMENTADAS:
 * - Usa verificación de overlap en lugar de comparación exacta
 * - Normaliza tiempos a UTC antes de comparar
 * - Verifica explícitamente que las recomendaciones no tengan overlaps
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

  // Slot solicitado: crear fecha en zona horaria local del usuario
  // El backend devuelve slots en UTC (ISO strings), pero los compara correctamente
  // porque ambos representan el mismo momento en el tiempo, solo en diferentes zonas horarias
  const solicitadoStartLocal = new Date(`${params.fecha}T${params.inicio}:00`);
  const solicitadoEndLocal = new Date(solicitadoStartLocal.getTime() + params.duracionMinutos * 60000);
  
  // Usar directamente las fechas locales - JavaScript maneja la comparación correctamente
  // cuando comparamos Date objects que representan el mismo momento en diferentes zonas
  const solicitadoStart = solicitadoStartLocal;
  const solicitadoEnd = solicitadoEndLocal;

  // 1) Verificar disponibilidad en el día solicitado
  const dispHoy = await apiGetDisponibilidad({
    fecha: params.fecha,
    profesionalId: params.profesionalId,
    consultorioId: params.consultorioId,
    duracionMinutos: params.duracionMinutos,
    intervalo: 15,
    excludeCitaId: params.excludeCitaId,
  });

  // Verificar si el slot solicitado tiene overlap con algún slot disponible
  // Usamos overlap en lugar de comparación exacta para manejar problemas de timezone y milisegundos
  const disponible = dispHoy.slots.some((s) => {
    if (s.motivoBloqueo) return false;
    
    const slotStart = new Date(s.slotStart); // ISO string en UTC, JavaScript lo convierte correctamente
    const slotEnd = new Date(s.slotEnd); // ISO string en UTC, JavaScript lo convierte correctamente
    
    // Verificar si el slot solicitado está completamente contenido en el slot disponible
    // O tiene overlap significativo (más del 80% del slot solicitado)
    // Esto maneja casos donde hay pequeñas diferencias de milisegundos debido a redondeo
    const slotDuration = slotEnd.getTime() - slotStart.getTime();
    const solicitadoDuration = solicitadoEnd.getTime() - solicitadoStart.getTime();
    
    // Verificar si hay overlap básico
    const hasOverlap = overlaps(
      { start: solicitadoStart, end: solicitadoEnd },
      { start: slotStart, end: slotEnd }
    );
    
    if (!hasOverlap) return false;
    
    // Calcular el overlap real
    const overlapStart = Math.max(solicitadoStart.getTime(), slotStart.getTime());
    const overlapEnd = Math.min(solicitadoEnd.getTime(), slotEnd.getTime());
    const overlapDuration = overlapEnd - overlapStart;
    
    // Requerir que al menos el 80% del slot solicitado esté disponible
    // Esto permite pequeñas diferencias de milisegundos pero rechaza slots que están mayormente ocupados
    const minOverlapRequired = solicitadoDuration * 0.8;
    
    return overlapDuration >= minOverlapRequired;
  });

  if (disponible) {
    return { disponible: true, alternativas: [] };
  }

  // 2) Si no está disponible, buscar alternativas
  const alternativas: Array<{ inicio: string; fin: string; dist: number; fecha: string }> = [];

  // Alternativas del día actual (más cercanas)
  // IMPORTANTE: Los slots ya vienen filtrados del backend (sin overlaps), pero verificamos explícitamente
  const alternativasHoy = dispHoy.slots
    .filter((s) => {
      if (s.motivoBloqueo) return false;
      
      // Verificar explícitamente que el slot no tenga overlap con el solicitado
      // (aunque debería estar filtrado, esto es una verificación de seguridad)
      const slotStart = new Date(s.slotStart);
      const slotEnd = new Date(s.slotEnd);
      
      // Si el slot tiene overlap con el solicitado, no lo incluimos en recomendaciones
      // porque significa que está ocupado o muy cerca del solicitado
      return !overlaps(
        { start: solicitadoStart, end: solicitadoEnd },
        { start: slotStart, end: slotEnd }
      );
    })
    .map((s) => {
      const slotStart = new Date(s.slotStart);
      return {
        inicio: s.slotStart,
        fin: s.slotEnd,
        dist: Math.abs(slotStart.getTime() - solicitadoStart.getTime()),
        fecha: params.fecha,
      };
    });

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
        // IMPORTANTE: Verificar explícitamente que no tengan overlaps
        const slotsDia = dispSiguiente.slots
          .filter((s) => {
            if (s.motivoBloqueo) return false;
            
            // Verificar que el slot no tenga overlap con el solicitado
            const slotStart = new Date(s.slotStart);
            const slotEnd = new Date(s.slotEnd);
            
            return !overlaps(
              { start: solicitadoStart, end: solicitadoEnd },
              { start: slotStart, end: slotEnd }
            );
          })
          .map((s) => {
            const slotStart = new Date(s.slotStart);
            return {
              inicio: s.slotStart,
              fin: s.slotEnd,
              dist: Math.abs(slotStart.getTime() - solicitadoStart.getTime()) + (i * 24 * 60 * 60 * 1000), // Penalizar días futuros
              fecha: fechaYMD,
            };
          });

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

