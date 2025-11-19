"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Play, Ban } from "lucide-react"
import type { CitaConsentimientoStatus } from "@/app/api/agenda/citas/[id]/_dto"
import { handleApiError, showSuccessToast, showErrorToast } from "@/lib/messages/agenda-toast-helpers"
import { getErrorMessage } from "@/lib/messages/agenda-messages"

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
      const errorMsg = getErrorMessage("CONSENT_REQUIRED_FOR_MINOR")
      showErrorToast("CONSENT_REQUIRED_FOR_MINOR", undefined, consentimientoStatus.mensajeBloqueo || errorMsg.userMessage)
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
        handleApiError(error)
        return
      }

      // Mostrar mensaje de éxito profesional
      showSuccessToast("CONSULTA_INICIADA")
      onSuccess?.()
    } catch (error: unknown) {
      console.error("[v0] Error starting consultation:", error)
      handleApiError(error)
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
