"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import PacienteForm from "@/components/pacientes/PacienteForm"
import { useCreatePacienteFull } from "@/hooks/useCreatePacienteFull"
import type { PacienteCreateDTO } from "@/lib/schema/paciente"
import { toast } from "sonner"

type Intent = "open" | "schedule"

export default function PageNuevoPaciente() {
  const router = useRouter()
  const sp = useSearchParams()

  // Filtros de lista para invalidación correcta
  const qForList = sp.get("q") ?? ""
  const soloActivos = sp.get("soloActivos") !== "false"
  const limit = Number(sp.get("limit") ?? 20) || 20

  const createMutation = useCreatePacienteFull({ qForList, soloActivos, limit })
  const [apiError, setApiError] = useState<string | null>(null)

  const onSubmit = async (values: PacienteCreateDTO, intent: Intent) => {
    setApiError(null)

    // 1) Separar el draft de responsable del payload de creación
    const { responsablePago: responsableDraft, ...payload } = values

    try {
      // 2) Crear paciente (sin linkear responsable en esta transacción)
      const data = await createMutation.mutateAsync(payload)

      toast("Paciente creado", {
        description: `${values.nombreCompleto} (ID ${data.idPaciente})`,
      })

      // 3) Linkeo en background si hay responsable seleccionado
      if (responsableDraft) {
        ;(async () => {
          try {
            const idem = (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}-fallback`

            const res = await fetch(`/api/pacientes/${data.idPaciente}/responsables`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-Idempotency-Key": idem,     // ⬅️ NUEVO
              },
              body: JSON.stringify({
                personaId: responsableDraft.personaId,
                relacion: responsableDraft.relacion,
                esPrincipal: responsableDraft.esPrincipal ?? true,
              }),
            })

            const body = await res.json()
            if (!res.ok || !body?.ok) {
              throw new Error(body?.error ?? "No se pudo vincular el responsable")
            }

            // Mensaje estándar
            const linked = body.data as { personaId: number, idempotent?: boolean }
            toast(body?.data?.idempotent ? "Responsable ya estaba vinculado" : "Responsable vinculado", {
              description: `Persona ${linked.personaId} asociada`,
            })
          } catch (err: any) {
            toast.error("No se pudo vincular el responsable", {
              description: err?.message ?? "Intenta desde la ficha del paciente",
            })
          }
        })()
      }

      // 4) Redirección según intent
      if (intent === "open") {
        router.push(`/pacientes/${data.idPaciente}`)
      } else {
        router.push(`/agenda?pacienteId=${data.idPaciente}`)
      }
    } catch (e: any) {
      const message = e?.message ?? "Error al crear paciente"
      setApiError(message)
      toast.error("Error al crear paciente", { description: message })
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      {apiError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {apiError}
        </div>
      )}

      <PacienteForm busy={createMutation.isPending} onSubmit={onSubmit} />
    </main>
  )
}
