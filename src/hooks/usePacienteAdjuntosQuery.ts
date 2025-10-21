// src/hooks/usePacienteAdjuntosQuery.ts
import { useQuery } from "@tanstack/react-query";
import type { AdjuntosPacienteDTO } from "@/lib/api/pacientes.detail.types";

async function fetchAdjuntos(id: string | number): Promise<AdjuntosPacienteDTO> {
  const res = await fetch(`/api/pacientes/${id}/adjuntos`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Error al obtener adjuntos");
  return body.data as AdjuntosPacienteDTO;
}

export function usePacienteAdjuntos(id?: string | number) {
  return useQuery({
    queryKey: ["paciente", String(id), "adjuntos"],
    queryFn: () => fetchAdjuntos(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}
