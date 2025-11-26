// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/ConfirmChangesDialog.tsx
// Dialog for confirming anamnesis changes with review summary

"use client"

import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react"
import { ChangesSummaryPanel, type FieldChange } from "./ChangesSummaryPanel"
import { cn } from "@/lib/utils"

export type InformationSource = 
  | "IN_PERSON" 
  | "PHONE" 
  | "EMAIL" 
  | "DOCUMENT" 
  | "PATIENT_PORTAL" 
  | "OTHER"

export interface EditContext {
  reason: string
  informationSource: InformationSource
  verifiedWithPatient: boolean
}

interface ConfirmChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (context: EditContext) => Promise<void>
  changes: FieldChange[]
  isSubmitting?: boolean
}

const INFORMATION_SOURCES: { value: InformationSource; label: string }[] = [
  { value: "IN_PERSON", label: "En persona (no consulta)" },
  { value: "PHONE", label: "Llamada telefónica" },
  { value: "EMAIL", label: "Correo electrónico" },
  { value: "DOCUMENT", label: "Documento médico" },
  { value: "PATIENT_PORTAL", label: "Portal del paciente" },
  { value: "OTHER", label: "Otro" },
]

export function ConfirmChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  changes,
  isSubmitting = false,
}: ConfirmChangesDialogProps) {
  const [reason, setReason] = useState("")
  const [informationSource, setInformationSource] = useState<InformationSource>("IN_PERSON")
  const [verifiedWithPatient, setVerifiedWithPatient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if there are critical changes (allergies or medications)
  const hasCriticalChanges = changes.some((c) => c.severity === "critical")
  const reasonRequired = hasCriticalChanges

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReason("")
      setInformationSource("IN_PERSON")
      setVerifiedWithPatient(false)
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    // Validate reason for critical changes
    if (reasonRequired && !reason.trim()) {
      setError("Se requiere una razón para los cambios críticos (alergias/medicaciones)")
      return
    }

    setError(null)

    try {
      await onConfirm({
        reason: reason.trim(),
        informationSource,
        verifiedWithPatient,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios")
    }
  }

  const totalChanges = changes.length

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Confirmar Cambios en Anamnesis
          </AlertDialogTitle>
          <AlertDialogDescription>
            Está a punto de guardar cambios en la anamnesis del paciente fuera de una consulta activa.
            Por favor revise los cambios y complete la información requerida.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Warning Alert */}
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                Edición Fuera de Consulta
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Los cambios realizados fuera de una consulta activa quedan registrados en el historial 
                de auditoría y pueden requerir verificación posterior por parte del odontólogo.
              </AlertDescription>
            </Alert>

            {/* Changes Summary */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Cambios a aplicar ({totalChanges})
              </Label>
              <ChangesSummaryPanel 
                changes={changes} 
                maxHeight="200px"
                compact
              />
            </div>

            {/* Edit Context Form */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Información del Cambio</h4>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="change-reason" className="flex items-center gap-1">
                  Razón del cambio
                  {reasonRequired && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="change-reason"
                  placeholder="Describa la razón del cambio (ej: paciente reportó nueva alergia por teléfono)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className={cn(
                    "resize-none",
                    reasonRequired && !reason.trim() && error && "border-destructive"
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {reasonRequired 
                    ? "Requerido para cambios en campos críticos (alergias, medicaciones)"
                    : "Opcional pero recomendado para mantener un historial claro"
                  }
                </p>
              </div>

              {/* Information Source */}
              <div className="space-y-2">
                <Label htmlFor="info-source">Fuente de información</Label>
                <Select
                  value={informationSource}
                  onValueChange={(value) => setInformationSource(value as InformationSource)}
                >
                  <SelectTrigger id="info-source">
                    <SelectValue placeholder="Seleccione la fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    {INFORMATION_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Verified with Patient */}
              <div className="flex items-start space-x-3 rounded-md border p-4">
                <Checkbox
                  id="verified-patient"
                  checked={verifiedWithPatient}
                  onCheckedChange={(checked) => setVerifiedWithPatient(checked === true)}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="verified-patient" className="cursor-pointer">
                    He verificado esta información directamente con el paciente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marque esta casilla si ha confirmado los datos directamente con el paciente
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Verification Warning */}
            {hasCriticalChanges && !verifiedWithPatient && (
              <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  Cambios críticos sin verificación directa con el paciente serán marcados para 
                  revisión obligatoria en la próxima consulta.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || (reasonRequired && !reason.trim())}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar y Guardar
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

