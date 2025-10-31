"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { PacienteCreateDTO } from "@/lib/schema/paciente" // 🔄 fuente única
import type { PacienteListItemDTO } from "@/lib/api/pacientes.types"

const KEY = (q: string, soloActivos: boolean, limit: number) => ["pacientes", { q, soloActivos, limit }]

type CreateResult = { idPaciente: number; item: PacienteListItemDTO }

export function useCreatePacienteFull(params: { qForList?: string; soloActivos?: boolean; limit?: number } = {}) {
  const qc = useQueryClient()
  const { qForList = "", soloActivos = true, limit = 20 } = params

  return useMutation({
    mutationFn: async (payload: PacienteCreateDTO): Promise<CreateResult> => {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      // el backend responde con el sobre estándar
      let body: any = null
      try {
        body = await res.json()
      } catch {
        /* body queda null si la API no devolvió JSON */
      }

      if (!res.ok || !body?.ok) {
        const msg = body?.error ?? `No se pudo crear el paciente (HTTP ${res.status})`
        throw new Error(msg)
      }

      return body.data as CreateResult
    },

    onSuccess: () => {
      // Invalidar el listado visible para que el nuevo paciente aparezca al volver
      qc.invalidateQueries({ queryKey: KEY(qForList, soloActivos, limit) })
      // Opcional (si usas un detalle cacheado): pre-hidratar aquí
      // qc.setQueryData(["paciente", data.idPaciente], data.item)
    },
  })
}
