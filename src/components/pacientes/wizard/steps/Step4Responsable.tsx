"use client"

import type { UseFormReturn } from "react-hook-form"
import ResponsablePagoSelector from "@/components/pacientes/ResponsablePagoSelector"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { InfoIcon, Shield, ShieldCheck } from "lucide-react"
import type { PacienteCreateFormInput } from "@/lib/schema/paciente.schema"

interface Step4ResponsableProps {
  form: UseFormReturn<PacienteCreateFormInput>
}

/**
 * Determina si una relación tiene autoridad legal para firmar consentimientos
 * Esta función debe coincidir con la lógica del servidor en _repo.ts
 */
function tieneAutoridadLegal(relacion: string): boolean {
  const relacionesConAutoridadLegal = ["PADRE", "MADRE", "TUTOR"]
  return relacionesConAutoridadLegal.includes(relacion)
}

function getRelacionLabel(relacion: string): string {
  const labels: Record<string, string> = {
    PADRE: "Padre",
    MADRE: "Madre",
    TUTOR: "Tutor",
    CONYUGE: "Cónyuge",
    HIJO: "Hijo/a",
    FAMILIAR: "Familiar",
    EMPRESA: "Empresa",
    OTRO: "Otro",
  }
  return labels[relacion] || relacion
}

export function Step4Responsable({ form }: Step4ResponsableProps) {
  const responsable = form.watch("responsablePago")
  const tieneAutoridad = responsable ? tieneAutoridadLegal(responsable.relacion) : false

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Responsable de pago</h2>
        <p className="text-sm text-muted-foreground">
          Persona responsable de los pagos y facturación (opcional)
        </p>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Si el paciente es menor de edad o no es quien paga, podés asignar un responsable de pago. Buscá por CI/DNI/RUC
          o nombre, o creá uno nuevo. Solo se pueden seleccionar personas mayores de 18 años como responsables.
        </AlertDescription>
      </Alert>

      <ResponsablePagoSelector
        value={responsable || null}
        onChange={(value) => {
          form.setValue("responsablePago", value || undefined, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }}
        descriptionId="responsable-pago-description"
      />

      {responsable && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="text-sm">
            <div className="font-medium">Responsable seleccionado</div>
            <div className="mt-1 text-muted-foreground space-y-1">
              <div>
                Relación: <span className="font-medium">{getRelacionLabel(responsable.relacion)}</span> •{" "}
                {responsable.esPrincipal ? "Principal" : "Secundario"}
              </div>
              {tieneAutoridad && (
                <div className="flex items-center gap-2 mt-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <Badge variant="outline" className="border-green-600 text-green-600">
                    Autoridad legal para firmar consentimientos
                  </Badge>
                </div>
              )}
              {!tieneAutoridad && (
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-amber-600">
                    Esta relación no tiene autoridad legal automática. Se requerirá autorización específica para
                    firmar consentimientos.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Podés continuar sin asignar un responsable y agregarlo más tarde desde la ficha del paciente.</p>
        <p className="font-medium text-foreground">
          Nota: Los responsables con relación Padre, Madre o Tutor tienen autoridad legal automática para firmar
          consentimientos de menores de edad.
        </p>
        <p className="font-medium text-foreground">
          Requisito: El responsable debe ser mayor de 18 años. Solo se mostrarán personas elegibles en la búsqueda.
        </p>
      </div>
    </div>
  )
}
