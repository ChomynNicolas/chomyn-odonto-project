// src/hooks/useCreatePacienteQuick.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PacienteQuickCreateDTO } from "@/lib/schema/paciente.quick";
import type { PacienteItem } from "@/lib/api/pacientes.types";

type CreateResp = { ok: true; data: { item: PacienteItem } } | { ok: false; error: string };

const KEY = (q: string, soloActivos: boolean, limit: number) => ["pacientes", { q, soloActivos, limit }];

function incluyeEnFiltro(p: PacienteItem, q: string) {
  if (!q) return true;
  const texto = [
    p.persona.nombres,
    p.persona.apellidos,
    p.persona.documento?.numero,
    p.persona.documento?.ruc,
    ...(p.persona.contactos?.map(c => c.valorNorm) ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
  return texto.includes(q.toLowerCase());
}

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
      const nuevo = resp.data.item;

      // 1) Optimista: prepend en la primera página si matchea el filtro
      qc.setQueriesData<{ pages: { items: PacienteItem[]; nextCursor: string | null }[]; pageParams: any[] }>(
        { queryKey: KEY(params.qForList, params.soloActivos, params.limit), exact: false },
        (old) => {
          if (!old) return old;
          if (!incluyeEnFiltro(nuevo, params.qForList)) return old;

          const firstPage = old.pages[0];
          const yaExiste = old.pages.some(pg => pg.items.some(i => i.idPaciente === nuevo.idPaciente));
          if (yaExiste) return old;

          const updatedFirst = { ...firstPage, items: [nuevo, ...firstPage.items] };
          return { ...old, pages: [updatedFirst, ...old.pages.slice(1)] };
        }
      );

      // 2) Garantía de consistencia: invalidar y refetchear en background
      qc.invalidateQueries({ queryKey: KEY(params.qForList, params.soloActivos, params.limit) });
    },
  });
}
