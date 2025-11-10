"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Play, Ban } from "lucide-react"
import { toast } from "sonner"
import type { CitaConsentimientoStatus } from "@/app/api/agenda/citas/[id]/_dto"

interface CitaActionButtonProps {
  citaId: number
  estadoActual: string
  consentimientoStatus?: CitaConsentimientoStatus
  onSuccess?: () => void
}

export function CitaActionButton({ citaId, estadoActual, consentimientoStatus, onSuccess }: CitaActionButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleIniciarConsulta = async () => {
    // Validar consentimiento antes de iniciar
    if (consentimientoStatus?.bloqueaInicio) {
      toast.error("No se puede iniciar la consulta", {
        description: consentimientoStatus.mensajeBloqueo,
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/agenda/citas/${citaId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START",
        }),
      })

      if (!response.ok) {
        const error = await response.json()

        // Manejar error específico de consentimiento
        if (error.code === "CONSENT_REQUIRED_FOR_MINOR") {
          toast.error("Consentimiento requerido", {
            description: error.error,
          })
          return
        }

        throw new Error(error.error || "Error al iniciar consulta")
      }

      toast.success("Consulta iniciada", {
        description: "La consulta ha comenzado correctamente",
      })

      onSuccess?.()
    } catch (error: any) {
      console.error("[v0] Error starting consultation:", error)
      toast.error("Error", {
        description: error.message || "No se pudo iniciar la consulta",
      })
    } finally {
      setLoading(false)
    }
  }

  // Solo mostrar botón para CHECKED_IN
  if (estadoActual !== "CHECKED_IN") {
    return null
  }

  const bloqueado = consentimientoStatus?.bloqueaInicio ?? false

  return (
    <Button
      onClick={handleIniciarConsulta}
      disabled={loading || bloqueado}
      className="gap-2"
      title={bloqueado ? consentimientoStatus?.mensajeBloqueo : undefined}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Iniciando...
        </>
      ) : bloqueado ? (
        <>
          <Ban className="h-4 w-4" />
          Bloqueado
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Iniciar consulta
        </>
      )}
    </Button>
  )
}
