"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarFilters } from "@/components/agenda/CitasCalendar";

// ===== Event Source para FullCalendar (estable por identidad) =====
export function useCitasCalendarSource(filters: CalendarFilters) {
  // serialize para dependencia estable
  const key = useMemo(() => JSON.stringify(filters), [filters]);

  const fetcherRef = useRef<{ abort?: AbortController }>({});

  return useCallback(async (fetchInfo: any, success: (evs: any[]) => void, failure: (err: any) => void) => {
    try {
      // Cancelar anterior si sigue en vuelo
      fetcherRef.current.abort?.abort();

      const ac = new AbortController();
      fetcherRef.current.abort = ac;

      const sp = new URLSearchParams();
      sp.set("start", fetchInfo.startStr);
      sp.set("end", fetchInfo.endStr);
      if (filters.profesionalIds.length) sp.set("prof", filters.profesionalIds.join(","));
      if (filters.consultorioIds.length) sp.set("cons", filters.consultorioIds.join(","));
      if (filters.estados.length) sp.set("est", filters.estados.join(","));
      if (filters.tipos.length) sp.set("tip", filters.tipos.join(","));

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // identidad estable, refresca solo cuando cambian filtros
}

// ===== Opciones de combos (muy liviano; evita rerender con memo) =====
type Option = { id: number; nombre: string };

export function useProfesionalesOptions() {
  const cache = useRef<Option[] | null>(null);
  const [data, setData] = useState<Option[] | null>(cache.current);
  useEffect(() => {
    if (cache.current) return;
    let alive = true;
    fetch("/api/profesionales/options", { cache: "no-store" })
      .then(r => r.json())
      .then((j) => { if (alive) { cache.current = j; setData(j); }});
    return () => { alive = false; };
  }, []);
  return { data: data ?? [] };
}

export function useConsultoriosOptions() {
  const cache = useRef<Option[] | null>(null);
  const [data, setData] = useState<Option[] | null>(cache.current);
  useEffect(() => {
    if (cache.current) return;
    let alive = true;
    fetch("/api/consultorios/options", { cache: "no-store" })
      .then(r => r.json())
      .then((j) => { if (alive) { cache.current = j; setData(j); }});
    return () => { alive = false; };
  }, []);
  return { data: data ?? [] };
}
