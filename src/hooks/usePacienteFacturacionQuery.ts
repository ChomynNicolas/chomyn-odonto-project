// src/hooks/usePacienteFacturacionQuery.ts
import { useQuery } from "@tanstack/react-query";
import type { FacturacionPacienteDTO } from "@/lib/api/pacientes.detail.types";

async function fetchFacturacion(id: string | number): Promise<FacturacionPacienteDTO> {
  const res = await fetch(`/api/pacientes/${id}/facturacion`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Error al obtener facturación");
  return body.data as FacturacionPacienteDTO;
}

export function usePacienteFacturacion(id?: string | number) {
  return useQuery({
    queryKey: ["paciente", String(id), "facturacion"],
    queryFn: () => fetchFacturacion(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}
