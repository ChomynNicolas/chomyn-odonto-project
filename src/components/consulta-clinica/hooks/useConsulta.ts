// src/components/consulta-clinica/hooks/useConsulta.ts
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

export function useConsulta(citaId: number, canView: boolean, canEdit: boolean) {
  const [consulta, setConsulta] = useState<ConsultaClinicaDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchConsulta = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`)
      if (!res.ok) {
        const errorData = await res.json()
        // Si es 404 y tenemos permisos de edición, intentar crear la consulta
        if (res.status === 404 && canEdit) {
          const createRes = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
            method: "POST",
          })
          if (createRes.ok) {
            // Recargar después de crear
            await fetchConsulta()
            return
          }
        }
        throw new Error(errorData.error || "Error al cargar consulta")
      }
      const data = await res.json()
      if (data.ok) {
        setConsulta(data.data)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido")
      setError(error)
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [citaId, canEdit])

  useEffect(() => {
    if (canView) {
      fetchConsulta()
    }
  }, [citaId, canView, fetchConsulta])

  return {
    consulta,
    isLoading,
    error,
    refetch: fetchConsulta,
  }
}

