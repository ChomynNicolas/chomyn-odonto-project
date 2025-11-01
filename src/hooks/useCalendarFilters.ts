"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CalendarFilters, CalendarRange } from "@/components/agenda/CitasCalendar";

type UseCalendarFiltersParams = {
  currentUser?: { rol: "ADMIN" | "ODONT" | "RECEP"; profesionalId?: number | null };
  clinicAllowsCrossView?: boolean;
};

const LS_KEY = "calendar:filters:v1";

function parseCsvInts(s: string | null): number[] {
  if (!s) return [];
  return s.split(",").map((v) => Number(v)).filter((n) => !Number.isNaN(n));
}
function parseCsvStr<T extends string>(s: string | null): T[] {
  if (!s) return [];
  return s.split(",").filter(Boolean) as T[];
}

export function useCalendarFilters({ currentUser, clinicAllowsCrossView = true }: UseCalendarFiltersParams) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // 1) Inicial desde URL; fallback a localStorage; si rol=ODONT usar su propio id por defecto
  const initial = useMemo<CalendarFilters>(() => {
    const fromUrl: CalendarFilters | null = sp
      ? {
          profesionalIds: parseCsvInts(sp.get("prof")),
          consultorioIds: parseCsvInts(sp.get("cons")),
          estados: parseCsvStr(sp.get("est")),
          tipos: parseCsvStr(sp.get("tip")),
          range: (sp.get("range") as CalendarRange) || "SEMANA",
        }
      : null;

    if (fromUrl && fromUrl.range) return fromUrl;

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}

    // default por rol
    const odontDefault =
      currentUser?.rol === "ODONT" && currentUser?.profesionalId && clinicAllowsCrossView
        ? [currentUser.profesionalId]
        : [];

    return {
      profesionalIds: odontDefault as number[],
      consultorioIds: [],
      estados: [],
      tipos: [],
      range: "SEMANA",
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // se evalúa una sola vez

  const [filters, setFilters] = useState<CalendarFilters>(initial);

  // 2) Persistir en LS cuando cambien (pero no ensuciar la URL automáticamente)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);

  // 3) Aplicar a URL (querystring canónico)
  const applyFiltersToUrl = useCallback(() => {
    const qs = new URLSearchParams();
    if (filters.profesionalIds.length) qs.set("prof", filters.profesionalIds.join(","));
    if (filters.consultorioIds.length) qs.set("cons", filters.consultorioIds.join(","));
    if (filters.estados.length) qs.set("est", filters.estados.join(","));
    if (filters.tipos.length) qs.set("tip", filters.tipos.join(","));
    qs.set("range", filters.range);
    router.replace(`${pathname}?${qs.toString()}`);
  }, [filters, pathname, router]);

  // 4) Limpiar a defaults de rol
  const clearFilters = useCallback(() => {
    const odontDefault =
      currentUser?.rol === "ODONT" && currentUser?.profesionalId && clinicAllowsCrossView
        ? [currentUser.profesionalId]
        : [];
    setFilters({
      profesionalIds: odontDefault as number[],
      consultorioIds: [],
      estados: [],
      tipos: [],
      range: "SEMANA",
    });
    router.replace(pathname);
  }, [clinicAllowsCrossView, currentUser?.profesionalId, currentUser?.rol, pathname, router]);

  // 5) Navegación inicial según rango
  const initialRangeNavigation = useCallback((api: any, range: CalendarRange) => {
    if (range === "HOY") { api.changeView("timeGridDay"); api.today(); }
    else if (range === "SEMANA") { api.changeView("timeGridWeek"); api.today(); }
    else { api.changeView("dayGridMonth"); api.today(); }
  }, []);

  return { filters, setFilters, applyFiltersToUrl, clearFilters, initialRangeNavigation };
}
