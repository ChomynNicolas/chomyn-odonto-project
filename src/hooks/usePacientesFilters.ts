// hooks/usePacientesFilters.ts
"use client";

import { useDeferredValue, useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FiltersState = {
  q: string;
  status: "Todos" | "Activos" | "Inactivos";
};

export function usePacientesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [state, setState] = useState<FiltersState>({
    q: sp.get("q") ?? "",
    status: (sp.get("status") as FiltersState["status"]) ?? "Todos",
  });

  // diferimos para UX suave
  const deferredQ = useDeferredValue(state.q);

  // push/replace para no generar historial al tipear
  useEffect(() => {
    const params = new URLSearchParams(sp.toString());
    state.q ? params.set("q", state.q) : params.delete("q");
    state.status !== "Todos" ? params.set("status", state.status) : params.delete("status");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.q, state.status]);

  const setQ = (q: string) => setState((s) => ({ ...s, q }));
  const setStatus = (status: FiltersState["status"]) => setState((s) => ({ ...s, status }));

  // atajo teclado: `/` enfoca búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea")) {
        e.preventDefault();
        const el = document.getElementById("pacientes-search") as HTMLInputElement | null;
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { state, setQ, setStatus, deferredQ };
}
