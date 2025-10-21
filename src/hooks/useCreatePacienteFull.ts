// src/hooks/useCreatePacienteFull.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PacienteFullCreateDTO } from "@/lib/schema/paciente.full";
import type { PacienteItem } from "@/lib/api/pacientes.types";

const KEY = (q: string, soloActivos: boolean, limit: number) => ["pacientes", { q, soloActivos, limit }];

export function useCreatePacienteFull(params: { qForList?: string; soloActivos?: boolean; limit?: number } = {}) {
  const qc = useQueryClient();
  const { qForList = "", soloActivos = true, limit = 20 } = params;

  return useMutation({
    mutationFn: async (payload: PacienteFullCreateDTO) => {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? "No se pudo crear el paciente");
      return body.data as { idPaciente: number; item: PacienteItem };
    },
    onSuccess: () => {
      // invalidamos listado para que aparezca al volver
      qc.invalidateQueries({ queryKey: KEY(qForList, soloActivos, limit) });
    },
  });
}
