// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/anamnesis-edit-modal.tsx
// Modal for editing anamnesis outside of a consultation

"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileEdit, Zap, Loader2 } from "lucide-react"
import type { PatientAnamnesisDTO } from "@/types/patient"
import type { AnamnesisResponse } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { AnamnesisQuickEditForm } from "./AnamnesisQuickEditForm"
import { OutsideConsultationAnamnesisForm } from "./OutsideConsultationAnamnesisForm"
import { usePatientOverview } from "@/lib/hooks/use-patient-overview"

type EditMode = "quick" | "full"

interface AnamnesisEditModalProps {
  patientId: number
  initialData: PatientAnamnesisDTO | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function AnamnesisEditModal({
  patientId,
  initialData,
  isOpen,
  onClose,
  onSave,
}: AnamnesisEditModalProps) {
  const [editMode, setEditMode] = useState<EditMode>("quick")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Get patient info for full form
  const { data: patientOverview } = usePatientOverview(patientId)

  // Fetch full patient data to get birthdate (needed for age-based conditional sections)
  const { data: patientData } = useQuery({
    queryKey: ["patient", "full", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}`)
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error("Error al cargar datos del paciente")
      }
      const response = await res.json()
      return response.data
    },
    enabled: isOpen && editMode === "full",
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch full anamnesis data for full edit mode
  const { data: fullAnamnesisData, isLoading: isLoadingFull } = useQuery({
    queryKey: ["patient", "anamnesis", "full", patientId],
    queryFn: async (): Promise<AnamnesisResponse | null> => {
      const res = await fetch(`/api/pacientes/${patientId}/anamnesis`)
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error("Error al cargar anamnesis completa")
      }
      const response = await res.json()
      return response.data
    },
    enabled: isOpen && editMode === "full",
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const patientGender = patientOverview?.patient.gender as
    | "MASCULINO"
    | "FEMENINO"
    | "OTRO"
    | "NO_ESPECIFICADO"
    | undefined

  // Extract birthdate from patient data (persona.fechaNacimiento)
  const patientBirthDate = patientData?.persona?.fechaNacimiento 
    ? (typeof patientData.persona.fechaNacimiento === "string" 
        ? patientData.persona.fechaNacimiento 
        : patientData.persona.fechaNacimiento)
    : null

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false)
    setHasUnsavedChanges(false)
    onClose()
  }, [onClose])

  const handleSave = useCallback(() => {
    setHasUnsavedChanges(false)
    onSave()
    onClose()
  }, [onSave, onClose])

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditMode("quick")
    }
  }, [isOpen])

  // Dynamic width based on edit mode - using sm: prefix to override default sm:max-w-lg
  const modalWidth = editMode === "full" 
    ? "sm:max-w-6xl md:max-w-6xl lg:max-w-6xl" 
    : "sm:max-w-3xl md:max-w-3xl"

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent 
          className={`${modalWidth} h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden`}
        >
          {/* Fixed Header */}
          <div className="shrink-0 border-b">
            <DialogHeader className="px-6 py-4">
              <DialogTitle className="flex items-center gap-2">
                {initialData ? "Editar Anamnesis" : "Crear Anamnesis"}
                <Badge variant="secondary" className="ml-2 text-xs">
                  Fuera de consulta
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editMode === "quick"
                  ? "Edición rápida de campos frecuentes."
                  : "Edición completa con todos los campos."}
          </DialogDescription>
        </DialogHeader>

            {/* Mode Selector - Compact */}
            <div className="px-6 pb-3">
              <Tabs
                value={editMode}
                onValueChange={(v) => setEditMode(v as EditMode)}
                className="w-full"
              >
                <TabsList className="h-9">
                  <TabsTrigger value="quick" className="gap-1.5 text-xs px-3">
                    <Zap className="h-3.5 w-3.5" />
                    Rápida
                  </TabsTrigger>
                  <TabsTrigger value="full" className="gap-1.5 text-xs px-3">
                    <FileEdit className="h-3.5 w-3.5" />
                    Completa
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
          <div className="p-6">
              {editMode === "quick" ? (
            <AnamnesisQuickEditForm
              patientId={patientId}
              initialData={initialData}
                  onSave={handleSave}
                  onCancel={handleClose}
                />
              ) : isLoadingFull ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cargando datos completos...</p>
                </div>
              ) : (
                <OutsideConsultationAnamnesisForm
                  patientId={patientId}
                  initialData={fullAnamnesisData ?? null}
                  patientGender={patientGender}
                  patientBirthDate={patientBirthDate}
                  onSave={handleSave}
                  onCancel={handleClose}
                  isInModal
            />
              )}
            </div>
          </div>
      </DialogContent>
    </Dialog>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiene cambios sin guardar en la anamnesis. Si cierra esta ventana, se perderán
              todas las modificaciones realizadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar y cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
