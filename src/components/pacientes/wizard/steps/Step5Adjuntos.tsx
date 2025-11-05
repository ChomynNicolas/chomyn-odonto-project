"use client"

import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import AdjuntosDropzone from "@/components/pacientes/AdjuntosDropzone"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

interface Step5AdjuntosProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step5Adjuntos({ form }: Step5AdjuntosProps) {
  const adjuntos = form.watch("adjuntos") || []
  const [uploading, setUploading] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Documentos y archivos adjuntos</h2>
        <p className="text-sm text-muted-foreground">
          Subí fotos, radiografías, documentos u otros archivos (opcional)
        </p>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Podés subir fotos intraorales/extraorales, radiografías, documentos de laboratorio, consentimientos firmados,
          etc. Los archivos se guardarán de forma segura y estarán disponibles en la ficha del paciente.
        </AlertDescription>
      </Alert>

      <AdjuntosDropzone
        files={adjuntos}
        onChange={(files) => {
          form.setValue("adjuntos", files, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }}
        pacienteId={undefined}
        onBusyChange={setUploading}
      />

      {adjuntos.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm">
            <div className="font-medium">
              {adjuntos.length} archivo{adjuntos.length !== 1 ? "s" : ""} listo
              {adjuntos.length !== 1 ? "s" : ""} para subir
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Los archivos se asociarán al paciente al finalizar el registro
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <Alert>
          <AlertDescription>Subiendo archivos... Por favor esperá a que termine antes de continuar.</AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-muted-foreground">
        Formatos permitidos: JPG, PNG, WEBP, GIF, PDF. Tamaño máximo: 25MB por archivo.
      </div>
    </div>
  )
}
