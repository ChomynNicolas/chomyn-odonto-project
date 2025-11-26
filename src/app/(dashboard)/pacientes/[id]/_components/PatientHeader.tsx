// Patient header with identity and risk flags

"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, Phone, MapPin, FileText, Calendar, MoreVertical, AlertTriangle, Activity, Baby } from "lucide-react"
import type { PatientIdentityDTO, ContactInfoDTO, RiskFlagsDTO, RolNombre } from "@/types/patient"
import type { RBACPermissions } from "@/lib/utils/rbac"
import { PatientRiskBadges } from "./shared/PatientRiskBadges"
import { EditPatientSheet } from "@/components/pacientes/EditPatientSheet"
import { usePatientData } from "@/lib/hooks/use-patient-data"
// import { usePatientAnamnesis } from '@/lib/hooks/use-patient-anamnesis';

interface PatientHeaderProps {
  patient: PatientIdentityDTO
  contacts: ContactInfoDTO
  riskFlags: RiskFlagsDTO
  currentRole: RolNombre
  permissions: RBACPermissions | null
  patientId: number
}

export function PatientHeader({ patient, contacts, riskFlags, currentRole, permissions, patientId }: PatientHeaderProps) {
  // const { data: anamnesis, isLoading: isLoadingAnamnesis } = usePatientAnamnesis(patientId);
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const { patient: fullPatientRecord, mutate: refetchPatient } = usePatientData(String(patientId))

  const handleEditClick = () => {
    setEditSheetOpen(true)
  }

  const handleEditSuccess = () => {
    refetchPatient()
    setEditSheetOpen(false)
  }

  const canViewRiskFlags = permissions?.canViewRiskFlags ?? false;

  return (
    <div className="sticky top-0 z-10 bg-background pb-4">

      <Card className="p-6 shadow-sm">
        <div className="flex items-start justify-between">
          {/* Left: Identity */}
          <div className="flex items-start gap-4 flex-1">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>

            <div className="space-y-2 flex-1">
              <div>
                <h1 className="text-2xl font-bold text-balance">{patient.fullName}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  {patient.age && <span>{patient.age} años</span>}
                  {patient.gender && <span>{patient.gender}</span>}
                  {patient.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {patient.city}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                {patient.document && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {patient.document.type} {patient.document.number}
                  </span>
                )}
                {contacts.primaryPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contacts.primaryPhone}
                  </span>
                )}
              </div>

              {canViewRiskFlags && (
                <PatientRiskBadges riskFlags={riskFlags} />
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {permissions?.canEditDemographics && (
                <>
                  <DropdownMenuItem onClick={handleEditClick}>
                    <FileText className="h-4 w-4 mr-2" />
                    Editar Paciente
                  </DropdownMenuItem>
                </>
              )}
              {permissions?.canScheduleAppointments && (
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Cita
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Edit Patient Sheet */}
      {fullPatientRecord && (
        <EditPatientSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          patient={fullPatientRecord}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
