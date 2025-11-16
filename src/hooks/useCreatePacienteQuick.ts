// src/hooks/useCreatePacienteQuick.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PacienteQuickCreateDTO } from "@/lib/schema/paciente.quick";
import type { pacienteRepo } from "@/app/api/pacientes/_repo";

// Tipo del item devuelto por getPacienteUI (estructura Prisma con persona.documento.ruc)
type PacienteUIItem = NonNullable<Awaited<ReturnType<typeof pacienteRepo.getPacienteUI>>>;

type CreateResp = { ok: true; data: { item: PacienteUIItem } } | { ok: false; error: string };

const KEY = (q: string, soloActivos: boolean, limit: number) => ["pacientes", { q, soloActivos, limit }];

export function useCreatePacienteQuick(params: { qForList: string; soloActivos: boolean; limit: number }) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PacienteQuickCreateDTO): Promise<CreateResp> => {
      const res = await fetch("/api/pacientes/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? "No se pudo crear el paciente");
      return body as CreateResp;
    },
    onSuccess: (resp) => {
      if (!resp.ok) return;
      
      // Invalidar la query para refetchear y mostrar el nuevo paciente
      // Nota: No hacemos update optimista porque el tipo del item devuelto por quick
      // (PacienteUIItem) tiene una estructura diferente al PacienteListItemDTO usado en la lista
      qc.invalidateQueries({ queryKey: KEY(params.qForList, params.soloActivos, params.limit) });
    },
  });
}
