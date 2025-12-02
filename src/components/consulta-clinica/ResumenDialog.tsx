"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, Loader2 } from "lucide-react"

interface ResumenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  diagnosis: string
  clinicalNotes: string
  onDiagnosisChange: (value: string) => void
  onClinicalNotesChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  isFinalized: boolean
}

export function ResumenDialog({
  open,
  onOpenChange,
  diagnosis,
  clinicalNotes,
  onDiagnosisChange,
  onClinicalNotesChange,
  onSave,
  isSaving,
  isFinalized,
}: ResumenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Resumen Clínico</DialogTitle>
          <DialogDescription>
            Complete el diagnóstico general y notas clínicas de la consulta. El motivo de consulta se registra en la
            pestaña Anamnesis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnóstico general</Label>
            <Textarea
              id="diagnosis"
              placeholder="Ingrese el diagnóstico general..."
              value={diagnosis}
              onChange={(e) => onDiagnosisChange(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={isFinalized}
            />
            <p className="text-xs text-muted-foreground">{diagnosis.length}/2000 caracteres</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicalNotes">Notas clínicas generales</Label>
            <Textarea
              id="clinicalNotes"
              placeholder="Ingrese las notas clínicas generales..."
              value={clinicalNotes}
              onChange={(e) => onClinicalNotesChange(e.target.value)}
              rows={4}
              maxLength={5000}
              disabled={isFinalized}
            />
            <p className="text-xs text-muted-foreground">{clinicalNotes.length}/5000 caracteres</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isSaving || isFinalized}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Resumen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
