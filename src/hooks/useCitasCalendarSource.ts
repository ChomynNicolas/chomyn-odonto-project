"use client";

import { useCallback, useRef } from "react";

/**
 * Event Source para FullCalendar SIN filtros (MVP).
 * Sólo usa start/end del calendario.
 */
export function useCitasCalendarSource() {
  const fetcherRef = useRef<{ abort?: AbortController }>({});

  return useCallback(
    async (fetchInfo: any, success: (evs: any[]) => void, failure: (err: any) => void) => {
      try {
        // Cancelar request anterior si aún está en vuelo
        fetcherRef.current.abort?.abort();

        const ac = new AbortController();
        fetcherRef.current.abort = ac;

        const sp = new URLSearchParams();
        sp.set("start", fetchInfo.startStr);
        sp.set("end", fetchInfo.endStr);

        const res = await fetch(`/api/agenda/citas/calendar?${sp.toString()}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("No se pudo cargar la agenda");
        const raw = await res.json();
        const data = raw?.data ?? raw; // soporta array “raw” o { ok, data }
        success(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        failure(e);
      }
    },
    []
  );
}
