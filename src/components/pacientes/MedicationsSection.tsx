"use client"

import type { Medication, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/patient-helpers"
import { Plus, Pill } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface MedicationsSectionProps {
  medications: Medication[]
  userRole: UserRole
  onAddMedication?: () => void
  onSuspendMedication?: (medicationId: string) => void
}

export function MedicationsSection({
  medications,
  userRole,
  onAddMedication,
  onSuspendMedication,
}: MedicationsSectionProps) {
  const permissions = getPermissions(userRole)

  const activeMedications = medications.filter((m) => m.status === "ACTIVE")

  const getStatusLabel = (status: Medication["status"]) => {
    const labels = {
      ACTIVE: "Activa",
      SUSPENDED: "Suspendida",
      COMPLETED: "Completada",
    }
    return labels[status] || status
  }

  const getStatusVariant = (status: Medication["status"]) => {
    const variants = {
      ACTIVE: "default" as const,
      SUSPENDED: "secondary" as const,
      COMPLETED: "outline" as const,
    }
    return variants[status] || "secondary"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medicación</CardTitle>
        {permissions.canEditClinicalData && (
          <Button onClick={onAddMedication} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {activeMedications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Pill className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay medicación activa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMedications.map((medication) => (
              <div key={medication.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{medication.name}</h4>
                      <Badge variant={getStatusVariant(medication.status)}>{getStatusLabel(medication.status)}</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {medication.dosage && <p>Dosis: {medication.dosage}</p>}
                      {medication.frequency && <p>Frecuencia: {medication.frequency}</p>}
                      {medication.route && <p>Vía: {medication.route}</p>}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Inicio: {formatDate(medication.startedAt)}
                      {medication.prescribedBy &&
                        ` • Prescrito por: ${medication.prescribedBy.firstName} ${medication.prescribedBy.lastName}`}
                    </p>
                    {medication.endedAt && (
                      <p className="text-xs text-muted-foreground">Fin: {formatDate(medication.endedAt)}</p>
                    )}
                  </div>
                  {permissions.canEditClinicalData && medication.status === "ACTIVE" && (
                    <Button size="sm" variant="outline" onClick={() => onSuspendMedication?.(medication.id)}>
                      Suspender
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
