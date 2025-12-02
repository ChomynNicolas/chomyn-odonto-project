// src/components/consulta-clinica/modules/planes-tratamiento/CompletarSesionDialog.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import type { TreatmentStepDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface CompletarSesionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  step: TreatmentStepDTO
  patientId: number
  onSessionCompleted: () => Promise<void>
}

export function CompletarSesionDialog({
  isOpen,
  onOpenChange,
  step,
  patientId,
  onSessionCompleted,
}: CompletarSesionDialogProps) {
  const [sessionNotes, setSessionNotes] = useState("")
  const [scheduleNext, setScheduleNext] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Derived values
  const currentSession = step.currentSession ?? 1
  const totalSessions = step.totalSessions ?? 1
  const isLastSession = currentSession === totalSessions
  const progressPercent = (currentSession / totalSessions) * 100
  const remainingSessions = totalSessions - currentSession

  // Get procedure name
  const procedureName = step.procedimientoCatalogo?.nombre || step.serviceType || "Procedimiento"

  const handleConfirm = async () => {
    try {
      setIsSaving(true)

      const response = await fetch(
        `/api/pacientes/${patientId}/plan-tratamiento/steps/${step.id}/complete-session`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentSession,
            sessionNotes: sessionNotes.trim() || undefined,
            scheduleNextSession: !isLastSession ? scheduleNext : false,
            // nextSessionData can be added in Phase 9 for full scheduling
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || error?.message || "Error al completar sesión de tratamiento")
      }

      const result = await response.json()
      toast.success(result.message || "Sesión completada exitosamente")

      // Reset form
      setSessionNotes("")
      setScheduleNext(false)

      // Refresh parent
      await onSessionCompleted()

      // Close dialog
      onOpenChange(false)
    } catch (error: unknown) {
      console.error("Error completing session:", error)
      const errorMessage = error instanceof Error ? error.message : "Error inesperado al completar sesión"
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSaving) {
      // Reset form when closing
      setSessionNotes("")
      setScheduleNext(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Completar Sesión del Procedimiento</DialogTitle>
          <DialogDescription>
            {procedureName}
            {step.toothNumber && ` - Diente ${step.toothNumber}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Sesión {currentSession} de {totalSessions}</span>
              <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            {isLastSession ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Esta es la última sesión. El procedimiento será marcado como completado.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Quedan {remainingSessions} sesión(es) restante(s).
              </p>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="sessionNotes">
              Notas de esta sesión <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Textarea
              id="sessionNotes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Agregar notas clínicas sobre esta sesión..."
              rows={4}
              maxLength={1000}
              disabled={isSaving}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Máximo 1000 caracteres</span>
              <span>{sessionNotes.length}/1000</span>
            </div>
          </div>

          {/* Schedule Next Session (conditional) */}
          {!isLastSession && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="scheduleNext"
                  checked={scheduleNext}
                  onCheckedChange={(checked) => setScheduleNext(checked === true)}
                  disabled={isSaving}
                />
                <Label htmlFor="scheduleNext" className="font-medium cursor-pointer">
                  Recordar programar la próxima sesión
                </Label>
              </div>
              {scheduleNext && (
                <div className="flex items-start gap-2 pl-6 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Después de completar esta sesión, puedes programar la siguiente desde el módulo de agenda.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLastSession ? "Finalizar Procedimiento" : "Completar Sesión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

