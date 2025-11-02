"use client"

import { AgendaFilters } from "@/types/agenda"
import { useCallback, useRef } from "react"

export function useCitasCalendarSource(filters?: AgendaFilters) {
  const fetcherRef = useRef<{ abort?: AbortController }>({})

  return useCallback(
    async (fetchInfo: any, success: (evs: any[]) => void, failure: (err: any) => void) => {
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
      } catch (e: any) {
        if (e?.name === "AbortError") return
        failure(e)
      }
    },
    [filters],
  )
}
