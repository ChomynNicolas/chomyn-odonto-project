"use client"
import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { calculateAge, formatGender, formatDate } from "@/lib/utils/patient-helpers"
import { Edit, User, Calendar, MapPin, FileText } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface PersonalDataSectionProps {
  patient: PatientRecord
  userRole: UserRole
  onEdit?: () => void
}

export function PersonalDataSection({ patient, userRole, onEdit }: PersonalDataSectionProps) {
  const permissions = getPermissions(userRole)
  const age = calculateAge(patient.dateOfBirth)

  const getDocumentTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      CI: "Cédula",
      PASSPORT: "Pasaporte",
      RUC: "RUC",
      OTHER: "Otro",
    }
    return type ? labels[type] || type : "-"
  }

  const getCountryLabel = (country?: string) => {
    const labels: Record<string, string> = {
      PY: "Paraguay",
      AR: "Argentina",
      BR: "Brasil",
      OTHER: "Otro",
    }
    return country ? labels[country] || country : "-"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Datos Personales</CardTitle>
        {permissions.canEditDemographics && (
          <Button onClick={onEdit} size="sm" variant="ghost">
            <Edit className="h-4 w-4" />
            <span className="sr-only">Editar datos personales</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Nombre Completo</p>
              <p className="font-medium">
                {patient.firstName} {patient.lastName}
                {patient.secondLastName && ` ${patient.secondLastName}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Fecha de Nacimiento</p>
              <p className="font-medium">
                {formatDate(patient.dateOfBirth)} ({age} años)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Género</p>
              <p className="font-medium">{formatGender(patient.gender)}</p>
            </div>
          </div>

          {(patient.documentType || patient.documentNumber) && (
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Documento</p>
                <p className="font-medium">
                  {getDocumentTypeLabel(patient.documentType)}: {patient.documentNumber || "-"}
                  {patient.documentCountry && ` (${getCountryLabel(patient.documentCountry)})`}
                </p>
              </div>
            </div>
          )}

          {patient.ruc && (
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">RUC</p>
                <p className="font-medium">{patient.ruc}</p>
              </div>
            </div>
          )}

          {patient.address && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="font-medium">
                  {patient.address}
                  {patient.city && `, ${patient.city}`}
                  {patient.country && ` - ${getCountryLabel(patient.country)}`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Badge variant={patient.status === "ACTIVE" ? "default" : "secondary"}>
            {patient.status === "ACTIVE" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
