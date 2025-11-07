"use client"

import type { UseFormReturn } from "react-hook-form"
import ResponsablePagoSelector from "@/components/pacientes/ResponsablePagoSelector"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

interface Step4ResponsableProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step4Responsable({ form }: Step4ResponsableProps) {
  const responsable = form.watch("responsablePago")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Responsable de pago</h2>
        <p className="text-sm text-muted-foreground">Persona responsable de los pagos y facturación (opcional)</p>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Si el paciente es menor de edad o no es quien paga, podés asignar un responsable de pago. Buscá por CI/DNI/RUC
          o nombre, o creá uno nuevo.
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
        qForList=""
        soloActivos={true}
        limit={20}
        disabled={false}
        descriptionId="responsable-pago-description"
      />

      {responsable && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm">
            <div className="font-medium">Responsable seleccionado</div>
            <div className="mt-1 text-muted-foreground">
              Relación: {responsable.relacion.toLowerCase()} • {responsable.esPrincipal ? "Principal" : "Secundario"}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Podés continuar sin asignar un responsable y agregarlo más tarde desde la ficha del paciente.
      </div>
    </div>
  )
}
