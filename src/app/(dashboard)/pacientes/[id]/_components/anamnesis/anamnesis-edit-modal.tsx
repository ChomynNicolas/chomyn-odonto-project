"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnamnesisQuickEditForm } from "./AnamnesisQuickEditForm"

interface AnamnesisEditModalProps {
  patientId: number
  initialData: PatientAnamnesisDTO | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function AnamnesisEditModal({ patientId, initialData, isOpen, onClose, onSave }: AnamnesisEditModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Anamnesis" : "Crear Anamnesis"}</DialogTitle>
          <DialogDescription>
            Edición rápida de los campos más frecuentemente modificados. Use "Edición Completa" para acceder a todos
            los campos.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="p-6">
            <AnamnesisQuickEditForm
              patientId={patientId}
              initialData={initialData}
              onSave={() => {
                onSave()
                onClose()
              }}
              onCancel={onClose}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
