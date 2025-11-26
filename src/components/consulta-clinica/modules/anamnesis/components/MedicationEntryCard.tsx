// src/components/consulta-clinica/modules/anamnesis/components/MedicationEntryCard.tsx
// Reusable card component for displaying medication entries in anamnesis

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Edit, Trash2, Pill } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog"

export interface MedicationEntry {
  id?: number
  medicationId?: number
  catalogId?: number
  customLabel?: string
  customDose?: string
  customFreq?: string
  customRoute?: string
  notes?: string
  isActive: boolean
  // Display fields (from medication relation)
  label?: string
  dose?: string | null
  freq?: string | null
  route?: string | null
}

interface MedicationEntryCardProps {
  entry: MedicationEntry
  onUpdate: (entry: MedicationEntry) => void
  onRemove: () => void
  disabled?: boolean
}

export function MedicationEntryCard({
  entry,
  onUpdate,
  onRemove,
  disabled = false,
}: MedicationEntryCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editedNotes, setEditedNotes] = useState(entry.notes || "")
  const [editedIsActive, setEditedIsActive] = useState(entry.isActive)

  const displayName = entry.label || entry.customLabel || "Medicación sin nombre"
  const displayDose = entry.dose || entry.customDose
  const displayFreq = entry.freq || entry.customFreq
  const displayRoute = entry.route || entry.customRoute

  const handleSave = () => {
    onUpdate({
      ...entry,
      notes: editedNotes,
      isActive: editedIsActive,
    })
    setIsEditDialogOpen(false)
  }

  const handleToggleActive = (checked: boolean) => {
    setEditedIsActive(checked)
    onUpdate({
      ...entry,
      isActive: checked,
    })
  }

  return (
    <>
      <Card
        className={cn(
          "transition-colors",
          entry.isActive
            ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
            : "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/20 opacity-60"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{displayName}</span>
                {!entry.isActive && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs cursor-help">
                          Inactiva
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Esta medicación está marcada como inactiva (descontinuada o suspendida)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {(displayDose || displayFreq || displayRoute) && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {displayDose && <p>Dosis: {displayDose}</p>}
                  {displayFreq && <p>Frecuencia: {displayFreq}</p>}
                  {displayRoute && <p>Vía: {displayRoute}</p>}
                </div>
              )}
              {entry.notes && (
                <p className="text-sm text-muted-foreground italic">{entry.notes}</p>
              )}
            </div>
            {!disabled && (
              <TooltipProvider>
                <div className="flex items-center gap-2 ml-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          checked={entry.isActive}
                          onCheckedChange={handleToggleActive}
                          aria-label="Activar/desactivar medicación"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{entry.isActive ? "Marcar como descontinuada" : "Marcar como activa"}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditDialogOpen(true)}
                        aria-label="Editar medicación"
                        className="hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar medicación</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                        aria-label="Eliminar medicación"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eliminar medicación</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Medicación</DialogTitle>
            <DialogDescription>
              Modifique los detalles de esta medicación en la anamnesis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="medication-name">Medicación</Label>
              <p className="text-sm font-medium" id="medication-name">
                {displayName}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="medication-notes">Notas</Label>
              <Textarea
                id="medication-notes"
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Notas adicionales sobre esta medicación..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {editedNotes.length}/500 caracteres
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="medication-active">Activa</Label>
              <Switch
                id="medication-active"
                checked={editedIsActive}
                onCheckedChange={setEditedIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={onRemove}
        itemName={displayName}
        itemType="medicación"
        severity="warning"
        warningMessage="Considere marcar la medicación como inactiva en lugar de eliminarla si el paciente la tomó anteriormente. Esto preserva el historial clínico."
      />
    </>
  )
}

