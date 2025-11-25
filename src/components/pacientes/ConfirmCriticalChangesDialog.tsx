"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"
import type { PatientChangeRecord } from "@/types/patient-edit.types"
import { formatDisplayValue, getFieldLabel } from "@/lib/audit/diff-utils"

interface ConfirmCriticalChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  criticalChanges: PatientChangeRecord[]
  onConfirm: (motivo: string) => void
  isLoading?: boolean
}

export function ConfirmCriticalChangesDialog({
  open,
  onOpenChange,
  criticalChanges,
  onConfirm,
  isLoading = false,
}: ConfirmCriticalChangesDialogProps) {
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState("")

  // Reset motivo and error when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setMotivo("")
      setError("")
    }
  }, [open])

  const handleConfirm = () => {
    const trimmedMotivo = motivo.trim()

    // Validate motivo length
    if (trimmedMotivo.length < 10) {
      setError("El motivo debe tener al menos 10 caracteres")
      return
    }

    if (trimmedMotivo.length > 500) {
      setError("El motivo no puede exceder 500 caracteres")
      return
    }

    // Clear error and confirm
    setError("")
    onConfirm(trimmedMotivo)
  }

  const handleCancel = () => {
    setMotivo("")
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning-foreground">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirmar Cambios Críticos
          </DialogTitle>
          <DialogDescription>
            Has realizado cambios en campos críticos del paciente. Por seguridad y trazabilidad, es necesario que
            proporciones un motivo para estos cambios.
          </DialogDescription>
        </DialogHeader>

        {/* Changes Section */}
        <div className="space-y-3 rounded-lg border-2 border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-950">
          <h4 className="font-semibold text-warning-foreground">Cambios detectados:</h4>
          <div className="space-y-2 text-sm">
            {criticalChanges.map((change, index) => (
              <div key={index} className="rounded border border-warning-200 bg-background p-3 dark:border-warning-800">
                <div className="font-medium text-warning-foreground">{getFieldLabel(change.field)}</div>
                <div className="mt-1 space-y-1 text-muted-foreground">
                  <div>
                    <span className="font-medium">Antes:</span>{" "}
                    <span className="font-mono">{formatDisplayValue(change.oldValue)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-warning">Ahora:</span>{" "}
                    <span className="font-mono font-semibold text-warning-foreground">
                      {formatDisplayValue(change.newValue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivo Field */}
        <div className="space-y-2">
          <Label htmlFor="motivo">
            Motivo del cambio <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="motivo"
            placeholder="Describe el motivo de estos cambios críticos (mínimo 10 caracteres, máximo 500)"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value)
              setError("") // Clear error on input
            }}
            rows={4}
            className={error ? "border-destructive" : ""}
            disabled={isLoading}
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {motivo.length}/500 caracteres {motivo.trim().length < 10 && "(mínimo 10 caracteres)"}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || motivo.trim().length < 10 || motivo.length > 500}
            className="bg-warning-600 hover:bg-warning-700 text-white"
          >
            {isLoading ? "Guardando..." : "Confirmar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
