"use client"

import { AgendaFilters } from "@/types/agenda"
import { useCallback, useRef } from "react"
import type { EventInput } from "@fullcalendar/core"

type EventSourceFuncArg = {
  startStr: string
  endStr: string
  start: Date
  end: Date
  timeZone: string
}

export function useCitasCalendarSource(filters?: AgendaFilters) {
  const fetcherRef = useRef<{ abort?: AbortController }>({})

  return useCallback(
    (
      fetchInfo: EventSourceFuncArg,
      success: (evs: EventInput[]) => void,
      failure: (err: Error) => void
    ) => {
      // Ejecutar async pero no retornar Promise (FullCalendar espera función void)
      ;(async () => {
        try {
          // Cancelar request anterior si aún está en vuelo
          fetcherRef.current.abort?.abort()

          const ac = new AbortController()
          fetcherRef.current.abort = ac

          const sp = new URLSearchParams()
          sp.set("start", fetchInfo.startStr)
          sp.set("end", fetchInfo.endStr)

          if (filters?.profesionalId) sp.set("profesionalId", String(filters.profesionalId))
          if (filters?.consultorioId) sp.set("consultorioId", String(filters.consultorioId))
          if (filters?.estado && filters.estado.length > 0) {
            sp.set("estado", filters.estado.join(","))
          }
          if (filters?.tipo && filters.tipo.length > 0) {
            sp.set("tipo", filters.tipo.join(","))
          }
          if (filters?.soloUrgencias) sp.set("soloUrgencias", "true")
          if (filters?.soloPrimeraVez) sp.set("soloPrimeraVez", "true")
          if (filters?.soloPlanActivo) sp.set("soloPlanActivo", "true")
          if (filters?.busquedaPaciente) sp.set("busquedaPaciente", filters.busquedaPaciente)

          const res = await fetch(`/api/agenda/citas/calendar?${sp.toString()}`, {
            cache: "no-store",
            signal: ac.signal,
          })

          if (!res.ok) throw new Error("No se pudo cargar la agenda")

          const raw = await res.json()
          const data = raw?.data ?? raw
          success(Array.isArray(data) ? data : [])
        } catch (e: unknown) {
          if (e instanceof Error && e.name === "AbortError") return
          failure(e instanceof Error ? e : new Error(String(e)))
        }
      })()
    },
    [filters],
  )
}
