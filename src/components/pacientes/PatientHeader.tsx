"use client"

import { useState } from "react"
import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { calculateAge, formatFullName, formatGender, getSeverityColor } from "@/lib/utils/patient-helpers"
import { getPermissions } from "@/lib/utils/rbac"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Calendar,
  Upload,
  Edit,
  MoreVertical,
  Printer,
  FileDown,
  History,
  MapPin,
  AlertTriangle,
  Stethoscope,
  Clock,
} from "lucide-react"
import { EditPatientSheet } from "./EditPatientSheet"

interface PatientHeaderProps {
  patient: PatientRecord
  userRole: UserRole
  onNewAppointment?: () => void
  onUploadAttachment?: () => void
  onEditPatient?: () => void
  onPrint?: () => void
  onExportPDF?: () => void
  onViewAudit?: () => void
}

export function PatientHeader({
  patient,
  userRole,
  onNewAppointment,
  onUploadAttachment,
  onEditPatient,
  onPrint,
  onExportPDF,
  onViewAudit,
}: PatientHeaderProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  const permissions = getPermissions(userRole)
  const age = calculateAge(patient.dateOfBirth)
  const fullName = formatFullName(patient.firstName, patient.lastName, patient.secondLastName)
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase()

  const activeAllergies = patient.allergies || []
  const severeAllergies = activeAllergies.filter((a) => a.severity === "SEVERE")

  const activeDiagnoses = patient.diagnoses?.filter((d) => d.status === "ACTIVE") || []
  const primaryDiagnosis = activeDiagnoses[0]

  const now = new Date()
  const nextAppointment = patient.appointments
    ?.filter((apt) => new Date(apt.scheduledAt) > now && apt.status !== "CANCELLED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  const handleEditClick = () => {
    setEditSheetOpen(true)
    onEditPatient?.()
  }

  const handlePrintClick = () => {
    // In a real implementation, get userId from auth context
    // For now, we'll call the onPrint callback which should handle navigation
    onPrint?.()
  }

  return (
    <>
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Left section: Patient info */}
            <div className="flex gap-4">
              <Avatar className="h-16 w-16 lg:h-20 lg:w-20">
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold lg:text-3xl">{fullName}</h1>
                  <Badge variant={patient.status === "ACTIVE" ? "default" : "secondary"}>
                    {patient.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    {age} años • {formatGender(patient.gender)}
                  </span>
                  {patient.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {patient.address}
                      {patient.city && `, ${patient.city}`}
                    </span>
                  )}
                </div>

                {/* Clinical alerts */}
                <div className="flex flex-wrap gap-2">
                  {severeAllergies.length > 0 && (
                    <Badge className={getSeverityColor("SEVERE")} variant="outline">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {severeAllergies.length} Alergia{severeAllergies.length > 1 ? "s" : ""} Severa
                      {severeAllergies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {activeAllergies.length > severeAllergies.length && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-200"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {activeAllergies.length - severeAllergies.length} Alergia
                      {activeAllergies.length - severeAllergies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {primaryDiagnosis && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                      <Stethoscope className="mr-1 h-3 w-3" />
                      {primaryDiagnosis.label}
                    </Badge>
                  )}
                  {nextAppointment && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200"
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      Próxima cita:{" "}
                      {new Date(nextAppointment.scheduledAt).toLocaleDateString("es-PY", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(nextAppointment.scheduledAt).toLocaleTimeString("es-PY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right section: Actions */}
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              {permissions.canScheduleAppointments && (
                <Button onClick={onNewAppointment} className="flex-1 lg:flex-none">
                  <Calendar className="mr-2 h-4 w-4" />
                  Nueva Cita
                </Button>
              )}
              {permissions.canUploadAttachments && (
                <Button onClick={onUploadAttachment} variant="outline" className="flex-1 lg:flex-none bg-transparent">
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Adjunto
                </Button>
              )}
              {permissions.canEditDemographics && (
                <Button onClick={handleEditClick} variant="outline" className="flex-1 lg:flex-none bg-transparent">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Más opciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {permissions.canPrint && (
                    <DropdownMenuItem onClick={handlePrintClick}>
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir Ficha
                    </DropdownMenuItem>
                  )}
                  {permissions.canExport && (
                    <DropdownMenuItem onClick={onExportPDF}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </DropdownMenuItem>
                  )}
                  {permissions.canViewAudit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onViewAudit}>
                        <History className="mr-2 h-4 w-4" />
                        Ver Auditoría
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <EditPatientSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        patient={patient}
        onSuccess={() => {
          // Additional success handling if needed
        }}
      />
    </>
  )
}
