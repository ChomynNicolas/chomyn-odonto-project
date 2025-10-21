// src/hooks/usePacienteTurnosQuery.ts
import { useQuery } from "@tanstack/react-query";
import type { TurnosPacienteDTO } from "@/lib/api/pacientes.detail.types";

async function fetchTurnos(id: string | number): Promise<TurnosPacienteDTO> {
  const res = await fetch(`/api/pacientes/${id}/turnos`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Error al obtener turnos");
  return body.data as TurnosPacienteDTO;
}

export function usePacienteTurnos(id?: string | number) {
  return useQuery({
    queryKey: ["paciente", String(id), "turnos"],
    queryFn: () => fetchTurnos(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}
