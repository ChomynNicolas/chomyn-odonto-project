// src/components/pacientes/wizard/steps/Step5Adjuntos.tsx
"use client"

import { useEffect, useRef } from "react"
import type { UseFormReturn } from "react-hook-form"
import AdjuntosDropzone from "@/components/pacientes/AdjuntosDropzone"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import type { PacienteCreateFormInput } from "@/lib/schema/paciente.schema"
import type { AdjuntoUI } from "@/lib/schema/paciente.schema"

interface Step5AdjuntosProps {
  form: UseFormReturn<PacienteCreateFormInput>
  onAdjuntosFilesChange: (files: Map<string, File>) => void
}

export function Step5Adjuntos({ form, onAdjuntosFilesChange }: Step5AdjuntosProps) {
  const adjuntosValue = form.watch("adjuntos")
  const adjuntos: AdjuntoUI[] = adjuntosValue ? [...adjuntosValue] : []
  const filesMapRef = useRef<Map<string, File>>(new Map())

  // Sincronizar filesMap con el padre cuando cambia
  useEffect(() => {
    onAdjuntosFilesChange(filesMapRef.current)
  }, [onAdjuntosFilesChange])

  const handleChangeAdjuntos = (nuevosAdjuntos: AdjuntoUI[], files: Map<string, File>) => {
    form.setValue("adjuntos", nuevosAdjuntos, {
      shouldValidate: true,
      shouldDirty: true,
    })

    // Actualizar el map de files
    filesMapRef.current = files
    onAdjuntosFilesChange(files)
  }

  const haySubiendo = adjuntos.some((a) => a.estado === "subiendo")
  const hayErrores = adjuntos.some((a) => a.estado === "error")

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
          Podés subir fotos intraorales/extraorales, radiografías, documentos de laboratorio,
          consentimientos firmados, etc. Los archivos se guardarán de forma segura y estarán
          disponibles en la ficha del paciente.
        </AlertDescription>
      </Alert>

      <AdjuntosDropzone
        adjuntos={adjuntos}
        onChangeAdjuntos={handleChangeAdjuntos}
        disabled={haySubiendo}
      />

      {haySubiendo && (
        <Alert>
          <AlertDescription>
            Subiendo archivos... Por favor esperá a que termine antes de continuar.
          </AlertDescription>
        </Alert>
      )}

      {hayErrores && (
        <Alert variant="destructive">
          <AlertDescription>
            Algunos archivos tuvieron errores. Revisá la lista y eliminá los que fallaron si es
            necesario.
          </AlertDescription>
        </Alert>
      )}

      {adjuntos.length > 0 && !haySubiendo && !hayErrores && (
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

      <div className="text-xs text-muted-foreground">
        Formatos permitidos: JPG, PNG, WEBP, GIF, PDF. Tamaño máximo: 25MB por archivo.
      </div>
    </div>
  )
}
