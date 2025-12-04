// src/hooks/useDisponibilidadValidator.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { apiCheckSlotDisponible } from "@/lib/api/agenda/disponibilidad"

/**
 * Redondea una fecha a intervalos de minutos (sincronizado con backend)
 */
export function roundToMinutes(date: Date, stepMinutes = 15): Date {
  const ms = stepMinutes * 60_000
  return new Date(Math.round(date.getTime() / ms) * ms)
}

export interface DisponibilidadValidationResult {
  isValid: boolean
  isChecking: boolean
  error: string | null
  recomendaciones: Array<{
    fecha: string // YYYY-MM-DD
    inicioISO: string
    finISO: string
    inicioLocal: string // HH:mm
    finLocal: string // HH:mm
    fechaDisplay: string // Formato legible
  }>
}

interface UseDisponibilidadValidatorParams {
  fecha: string | null // YYYY-MM-DD
  horaInicio: string | null // HH:mm
  duracionMinutos: number
  profesionalId?: number
  consultorioId?: number
  enabled?: boolean // Si false, no valida
  excludeCitaId?: number // ID de cita a excluir (modo reschedule)
}

/**
 * Hook para validar disponibilidad antes de permitir submit.
 * Sincronizado con backend: mismo rounding (15 min), misma lógica de overlap.
 */
export function useDisponibilidadValidator({
  fecha,
  horaInicio,
  duracionMinutos,
  profesionalId,
  consultorioId,
  enabled = true,
  excludeCitaId,
}: UseDisponibilidadValidatorParams): DisponibilidadValidationResult {
  const [isChecking, setIsChecking] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recomendaciones, setRecomendaciones] = useState<DisponibilidadValidationResult["recomendaciones"]>([])

  const validate = useCallback(async () => {
    // No validar si está deshabilitado o faltan datos esenciales
    // Requerimos: fecha, horaInicio, duracionMinutos y profesionalId
    if (!enabled || !fecha || !horaInicio || !duracionMinutos || !profesionalId) {
      setIsValid(false)
      setError(null)
      setRecomendaciones([])
      setIsChecking(false)
      return
    }

    // Validar disponibilidad tanto en create como en reschedule
    // En reschedule, el backend es la fuente de verdad final, pero validamos localmente para UX
    setIsChecking(true)
    setError(null)

    try {
      // Redondear hora de inicio a intervalos de 15 minutos (sincronizado con BE)
      const [h, m] = horaInicio.split(":").map(Number)
      
      // Validar que la fecha y hora sean válidas antes de continuar
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        setIsValid(false)
        setError("Hora inválida")
        setRecomendaciones([])
        setIsChecking(false)
        return
      }
      
      const fechaHoraLocal = new Date(`${fecha}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`)
      
      // Validar que la fecha sea válida
      if (isNaN(fechaHoraLocal.getTime())) {
        setIsValid(false)
        setError("Fecha u hora inválida")
        setRecomendaciones([])
        setIsChecking(false)
        return
      }
      
      const fechaHoraRedondeada = roundToMinutes(fechaHoraLocal, 15)
      
      // Convertir de vuelta a HH:mm para la validación
      const horaRedondeada = `${String(fechaHoraRedondeada.getHours()).padStart(2, "0")}:${String(fechaHoraRedondeada.getMinutes()).padStart(2, "0")}`

      const result = await apiCheckSlotDisponible({
        fecha,
        inicio: horaRedondeada,
        duracionMinutos,
        profesionalId,
        consultorioId,
        buscarMultiDia: true, // Buscar en múltiples días
        maxDias: 7, // Hasta 7 días siguientes
        excludeCitaId, // Excluir cita actual en modo reschedule
      })

      if (result.disponible) {
        setIsValid(true)
        setError(null)
        setRecomendaciones([])
      } else {
        setIsValid(false)
        // Mensaje de error mejorado que considera conflictos de profesional y consultorio
        const tieneConsultorio = !!consultorioId
        const mensajeError = tieneConsultorio
          ? "El horario seleccionado no está disponible. Puede estar ocupado por el profesional o por otro profesional en el mismo consultorio."
          : "El horario seleccionado no está disponible"
        setError(mensajeError)
        
        // Procesar recomendaciones: convertir a formato mejorado con soporte multi-día
        const recomendacionesMejoradas = result.alternativas.map((rec) => {
          const inicioDate = new Date(rec.inicio)
          const finDate = new Date(rec.fin)
          
          // Extraer fecha en zona horaria local (no UTC) para evitar problemas de zona horaria
          const year = inicioDate.getFullYear()
          const month = inicioDate.getMonth() + 1
          const day = inicioDate.getDate()
          const fechaYMD = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          
          // Formatear fecha de manera legible
          // Normalizar fechas a medianoche en zona horaria local para comparación correcta
          const hoy = new Date()
          hoy.setHours(0, 0, 0, 0)
          
          // Crear fecha de la recomendación en zona horaria local
          const fechaRec = new Date(year, month - 1, day)
          fechaRec.setHours(0, 0, 0, 0)
          
          // Calcular mañana
          const manana = new Date(hoy)
          manana.setDate(manana.getDate() + 1)
          
          // Comparar solo las partes de fecha (año, mes, día)
          const esHoy = fechaRec.getTime() === hoy.getTime()
          const esManana = fechaRec.getTime() === manana.getTime()
          
          let fechaDisplay: string
          if (esHoy) {
            fechaDisplay = "Hoy"
          } else if (esManana) {
            fechaDisplay = "Mañana"
          } else {
            // Usar la fecha normalizada para formatear
            fechaDisplay = fechaRec.toLocaleDateString("es", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })
          }
          
          return {
            fecha: fechaYMD,
            inicioISO: rec.inicio,
            finISO: rec.fin,
            inicioLocal: inicioDate.toLocaleTimeString("es", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            finLocal: finDate.toLocaleTimeString("es", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            fechaDisplay,
          }
        })
        
        setRecomendaciones(recomendacionesMejoradas)
      }
    } catch (e) {
      setIsValid(false)
      setError("Error verificando disponibilidad. Intente nuevamente.")
      setRecomendaciones([])
      console.error("[useDisponibilidadValidator] Error:", e)
    } finally {
      setIsChecking(false)
    }
  }, [fecha, horaInicio, duracionMinutos, profesionalId, consultorioId, enabled, excludeCitaId])

  useEffect(() => {
    const timer = setTimeout(() => {
      validate()
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timer)
  }, [validate])

  return {
    isValid,
    isChecking,
    error,
    recomendaciones,
  }
}

