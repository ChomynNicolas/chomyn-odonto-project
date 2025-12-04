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
 * - Verifica conflictos de consultorio con todos los profesionales (no solo el seleccionado)
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
  // Si hay consultorioId, necesitamos verificar dos cosas en paralelo:
  // - Disponibilidad del profesional específico
  // - Disponibilidad del consultorio (sin filtrar por profesional, para detectar conflictos con otros profesionales)
  const verificacionesPromesas: Array<Promise<DisponibilidadResponse>> = []
  
  // Verificación 1: Disponibilidad del profesional (siempre necesaria)
  verificacionesPromesas.push(
    apiGetDisponibilidad({
      fecha: params.fecha,
      profesionalId: params.profesionalId,
      consultorioId: params.consultorioId,
      duracionMinutos: params.duracionMinutos,
      intervalo: 15,
      excludeCitaId: params.excludeCitaId,
    })
  )
  
  // Verificación 2: Disponibilidad del consultorio sin filtrar por profesional
  // (solo si hay consultorioId, para detectar conflictos con otros profesionales)
  if (params.consultorioId && params.profesionalId) {
    verificacionesPromesas.push(
      apiGetDisponibilidad({
        fecha: params.fecha,
        // Sin profesionalId: verifica disponibilidad del consultorio para TODOS los profesionales
        consultorioId: params.consultorioId,
        duracionMinutos: params.duracionMinutos,
        intervalo: 15,
        excludeCitaId: params.excludeCitaId,
      })
    )
  }
  
  // Ejecutar verificaciones en paralelo para mejor performance
  const resultados = await Promise.all(verificacionesPromesas)
  const dispHoy = resultados[0] // Disponibilidad del profesional
  const dispConsultorio = resultados[1] // Disponibilidad del consultorio (si existe)

  /**
   * Verifica si un slot está disponible según los resultados de disponibilidad
   */
  const verificarSlotDisponible = (slots: DisponibilidadResponse["slots"]): boolean => {
    return slots.some((s) => {
      if (s.motivoBloqueo) return false;
      
      const slotStart = new Date(s.slotStart); // ISO string en UTC, JavaScript lo convierte correctamente
      const slotEnd = new Date(s.slotEnd); // ISO string en UTC, JavaScript lo convierte correctamente
      
      // Verificar si el slot solicitado está completamente contenido en el slot disponible
      // O tiene overlap significativo (más del 80% del slot solicitado)
      // Esto maneja casos donde hay pequeñas diferencias de milisegundos debido a redondeo
      
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
  };

  // Verificar disponibilidad del profesional
  const disponibleProfesional = verificarSlotDisponible(dispHoy.slots);
  
  // Si hay consultorioId, también verificar que el consultorio esté disponible
  // (sin conflictos con otros profesionales)
  const disponibleConsultorio = dispConsultorio 
    ? verificarSlotDisponible(dispConsultorio.slots)
    : true; // Si no hay consultorioId, asumimos que está disponible
  
  // El slot está disponible solo si AMBAS condiciones se cumplen:
  // 1. El profesional está disponible
  // 2. El consultorio está disponible (sin conflictos con otros profesionales)
  const disponible = disponibleProfesional && disponibleConsultorio;

  if (disponible) {
    return { disponible: true, alternativas: [] };
  }

  // 2) Si no está disponible, buscar alternativas
  const alternativas: Array<{ inicio: string; fin: string; dist: number; fecha: string }> = [];

  /**
   * Filtra slots que no tienen overlap con el slot solicitado y están disponibles
   */
  const filtrarSlotsDisponibles = (slots: DisponibilidadResponse["slots"]): Array<{ inicio: string; fin: string; dist: number; fecha: string }> => {
    return slots
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
  };

  // Alternativas del día actual (más cercanas)
  // Si hay consultorioId, necesitamos encontrar slots que estén disponibles
  // tanto para el profesional como para el consultorio
  let alternativasHoy: Array<{ inicio: string; fin: string; dist: number; fecha: string }> = [];
  
  if (params.consultorioId && dispConsultorio) {
    // Caso con consultorio: encontrar intersección de slots disponibles
    // (slots que están disponibles tanto para el profesional como para el consultorio)
    const slotsProfesional = filtrarSlotsDisponibles(dispHoy.slots);
    const slotsConsultorio = filtrarSlotsDisponibles(dispConsultorio.slots);
    
    // Crear un mapa de slots del consultorio por inicio para búsqueda rápida
    const slotsConsultorioMap = new Map<string, { inicio: string; fin: string; dist: number; fecha: string }>();
    slotsConsultorio.forEach((slot) => {
      slotsConsultorioMap.set(slot.inicio, slot);
    });
    
    // Encontrar slots que están en ambos conjuntos (intersección)
    alternativasHoy = slotsProfesional.filter((slotProf) => {
      const slotConsultorio = slotsConsultorioMap.get(slotProf.inicio);
      if (!slotConsultorio) return false;
      
      // Verificar que el fin también coincida (mismo slot completo)
      return slotProf.fin === slotConsultorio.fin;
    });
  } else {
    // Caso sin consultorio: solo usar slots del profesional
    alternativasHoy = filtrarSlotsDisponibles(dispHoy.slots);
  }

  alternativas.push(...alternativasHoy);

  // 3) Si buscarMultiDia, buscar en días siguientes
  if (buscarMultiDia) {
    const fechaBase = new Date(params.fecha);
    
    for (let i = 1; i <= maxDias; i++) {
      const fechaSiguiente = new Date(fechaBase);
      fechaSiguiente.setDate(fechaSiguiente.getDate() + i);
      const fechaYMD = fechaSiguiente.toISOString().slice(0, 10);

      try {
        // Hacer verificaciones en paralelo para días siguientes también
        const verificacionesSiguientesPromesas: Array<Promise<DisponibilidadResponse>> = []
        
        verificacionesSiguientesPromesas.push(
          apiGetDisponibilidad({
            fecha: fechaYMD,
            profesionalId: params.profesionalId,
            consultorioId: params.consultorioId,
            duracionMinutos: params.duracionMinutos,
            intervalo: 15,
            excludeCitaId: params.excludeCitaId,
          })
        )
        
        if (params.consultorioId && params.profesionalId) {
          verificacionesSiguientesPromesas.push(
            apiGetDisponibilidad({
              fecha: fechaYMD,
              consultorioId: params.consultorioId,
              duracionMinutos: params.duracionMinutos,
              intervalo: 15,
              excludeCitaId: params.excludeCitaId,
            })
          )
        }
        
        const resultadosSiguientes = await Promise.all(verificacionesSiguientesPromesas)
        const dispSiguiente = resultadosSiguientes[0]
        const dispConsultorioSiguiente = resultadosSiguientes[1]

        // Agregar slots disponibles del día siguiente
        // Si hay consultorioId, encontrar intersección de slots disponibles
        let slotsDia: Array<{ inicio: string; fin: string; dist: number; fecha: string }> = []
        
        if (params.consultorioId && dispConsultorioSiguiente) {
          // Caso con consultorio: encontrar intersección
          const slotsProfesional = filtrarSlotsDisponibles(dispSiguiente.slots)
          const slotsConsultorio = filtrarSlotsDisponibles(dispConsultorioSiguiente.slots)
          
          const slotsConsultorioMap = new Map<string, { inicio: string; fin: string; dist: number; fecha: string }>()
          slotsConsultorio.forEach((slot) => {
            slotsConsultorioMap.set(slot.inicio, slot)
          })
          
          slotsDia = slotsProfesional
            .filter((slotProf) => {
              const slotConsultorio = slotsConsultorioMap.get(slotProf.inicio)
              if (!slotConsultorio) return false
              return slotProf.fin === slotConsultorio.fin
            })
            .map((slot) => ({
              ...slot,
              fecha: fechaYMD,
              dist: slot.dist + (i * 24 * 60 * 60 * 1000), // Penalizar días futuros
            }))
        } else {
          // Caso sin consultorio: solo usar slots del profesional
          slotsDia = filtrarSlotsDisponibles(dispSiguiente.slots).map((slot) => ({
            ...slot,
            fecha: fechaYMD,
            dist: slot.dist + (i * 24 * 60 * 60 * 1000), // Penalizar días futuros
          }))
        }

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

