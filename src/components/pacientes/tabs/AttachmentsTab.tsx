"use client"

import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { AttachmentsGallery } from "@/components/pacientes/AttachmentsGallery"
import { toast } from "sonner"

interface AttachmentsTabProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate?: () => void
}

export function AttachmentsTab({ patient, userRole, onUpdate }: AttachmentsTabProps) {
  const handleUpload = () => {
    toast("Subir adjunto")
    onUpdate?.()
  }

  return (
    <div className="space-y-6">
      <AttachmentsGallery attachments={patient.attachments || []} userRole={userRole} onUpload={handleUpload} />
    </div>
  )
}
