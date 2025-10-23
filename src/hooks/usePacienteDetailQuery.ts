import { useQuery } from "@tanstack/react-query"
import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types"

async function fetchPacienteDetail(id: string | number): Promise<PacienteDetailDTO> {
  const res = await fetch(`/api/pacientes/${id}`, { cache: "no-store" })
  const body = await res.json()
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Error al obtener el paciente")
  return body.data as PacienteDetailDTO
}

export function usePacienteDetail(id?: string | number) {
  return useQuery({
    queryKey: ["paciente", String(id)],
    queryFn: () => fetchPacienteDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  })
}
