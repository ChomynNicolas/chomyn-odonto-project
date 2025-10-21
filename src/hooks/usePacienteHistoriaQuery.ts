// src/hooks/usePacienteHistoriaQuery.ts
import { useQuery } from "@tanstack/react-query";
import type { HistoriaClinicaDTO } from "@/lib/api/pacientes.detail.types";

async function fetchHistoria(id: string | number): Promise<HistoriaClinicaDTO> {
  const res = await fetch(`/api/pacientes/${id}/historia`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Error al obtener historia clínica");
  return body.data as HistoriaClinicaDTO;
}

export function usePacienteHistoria(id?: string | number) {
  return useQuery({
    queryKey: ["paciente", String(id), "historia"],
    queryFn: () => fetchHistoria(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}
