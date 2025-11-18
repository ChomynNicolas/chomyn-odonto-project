// src/components/consulta-clinica/modules/anamnesis/components/AllergyEntryCard.tsx
// Reusable card component for displaying allergy entries in anamnesis

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Edit, Trash2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AllergyEntry {
  id?: number
  allergyId?: number
  catalogId?: number
  customLabel?: string
  severity?: "MILD" | "MODERATE" | "SEVERE"
  reaction?: string
  notes?: string
  isActive: boolean
  // Display fields (from allergy relation)
  label?: string
}

const SEVERITY_COLORS = {
  MILD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  MODERATE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  SEVERE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

interface AllergyEntryCardProps {
  entry: AllergyEntry
  onUpdate: (entry: AllergyEntry) => void
  onRemove: () => void
  disabled?: boolean
}

export function AllergyEntryCard({
  entry,
  onUpdate,
  onRemove,
  disabled = false,
}: AllergyEntryCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editedNotes, setEditedNotes] = useState(entry.notes || "")
  const [editedSeverity, setEditedSeverity] = useState<"MILD" | "MODERATE" | "SEVERE">(
    entry.severity || "MODERATE"
  )
  const [editedReaction, setEditedReaction] = useState(entry.reaction || "")
  const [editedIsActive, setEditedIsActive] = useState(entry.isActive)

  const displayName = entry.label || entry.customLabel || "Alergia sin especificar"
  const severity = entry.severity || "MODERATE"

  const handleSave = () => {
    onUpdate({
      ...entry,
      notes: editedNotes,
      severity: editedSeverity,
      reaction: editedReaction,
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
            ? severity === "SEVERE"
              ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
              : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
            : "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/20 opacity-60"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{displayName}</span>
                <Badge
                  variant="secondary"
                  className={cn("text-xs", SEVERITY_COLORS[severity])}
                >
                  {severity === "MILD" && "Leve"}
                  {severity === "MODERATE" && "Moderada"}
                  {severity === "SEVERE" && "Severa"}
                </Badge>
                {!entry.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    Inactiva
                  </Badge>
                )}
              </div>
              {entry.reaction && (
                <p className="text-sm text-muted-foreground">Reacción: {entry.reaction}</p>
              )}
              {entry.notes && (
                <p className="text-sm text-muted-foreground italic">{entry.notes}</p>
              )}
            </div>
            {!disabled && (
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  checked={entry.isActive}
                  onCheckedChange={handleToggleActive}
                  aria-label="Activar/desactivar alergia"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  aria-label="Editar alergia"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="text-destructive hover:text-destructive"
                  aria-label="Eliminar alergia"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Alergia</DialogTitle>
            <DialogDescription>
              Modifique los detalles de esta alergia en la anamnesis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="allergy-name">Alergia</Label>
              <p className="text-sm font-medium" id="allergy-name">
                {displayName}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergy-severity">Severidad</Label>
              <Select
                value={editedSeverity}
                onValueChange={(value) =>
                  setEditedSeverity(value as "MILD" | "MODERATE" | "SEVERE")
                }
              >
                <SelectTrigger id="allergy-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Leve</SelectItem>
                  <SelectItem value="MODERATE">Moderada</SelectItem>
                  <SelectItem value="SEVERE">Severa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergy-reaction">Reacción</Label>
              <Textarea
                id="allergy-reaction"
                value={editedReaction}
                onChange={(e) => setEditedReaction(e.target.value)}
                placeholder="Describa la reacción alérgica..."
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergy-notes">Notas</Label>
              <Textarea
                id="allergy-notes"
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Notas adicionales sobre esta alergia..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {editedNotes.length}/500 caracteres
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allergy-active">Activa</Label>
              <Switch
                id="allergy-active"
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
    </>
  )
}

