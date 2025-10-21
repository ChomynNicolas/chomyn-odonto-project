// src/hooks/usePacientePlanesQuery.ts
import { useQuery } from "@tanstack/react-query";
import type { PlanesPacienteDTO } from "@/lib/api/pacientes.detail.types";

async function fetchPlanes(id: string | number): Promise<PlanesPacienteDTO> {
  const res = await fetch(`/api/pacientes/${id}/planes`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Error al obtener planes");
  return body.data as PlanesPacienteDTO;
}

export function usePacientePlanes(id?: string | number) {
  return useQuery({
    queryKey: ["paciente", String(id), "planes"],
    queryFn: () => fetchPlanes(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}
