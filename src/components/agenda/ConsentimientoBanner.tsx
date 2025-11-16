"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Upload } from "lucide-react"
import { formatDate } from "@/lib/utils/patient-helpers"
import type { CitaConsentimientoStatus } from "@/app/api/agenda/citas/[id]/_dto"

interface ConsentimientoBannerProps {
  status: CitaConsentimientoStatus
  onUploadConsent?: () => void
  canUpload: boolean
}

export function ConsentimientoBanner({ status, onUploadConsent, canUpload }: ConsentimientoBannerProps) {
  // No mostrar nada si no es menor o no requiere consentimiento
  if (!status.esMenorAlInicio || !status.requiereConsentimiento) {
    return null
  }

  // Consentimiento vigente - mostrar confirmación
  if (status.consentimientoVigente && status.consentimientoResumen) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900 dark:text-green-100">Consentimiento informado vigente</span>
            <Badge variant="outline" className="border-green-600 text-green-600">
              Válido
            </Badge>
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">
            Firmado por {status.consentimientoResumen.responsableNombre} (
            {status.consentimientoResumen.responsableTipoVinculo}) • Válido hasta{" "}
            {formatDate(status.consentimientoResumen.vigenteHasta)}
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Falta consentimiento - mostrar alerta
  return (
    <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-medium text-amber-900 dark:text-amber-100">Consentimiento informado requerido</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {status.mensajeBloqueo || "El paciente es menor de edad y requiere consentimiento firmado del responsable."}
          </p>
        </div>
        {canUpload && onUploadConsent && (
          <Button size="sm" variant="outline" onClick={onUploadConsent} className="gap-2 bg-transparent">
            <Upload className="h-4 w-4" />
            Subir consentimiento
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
