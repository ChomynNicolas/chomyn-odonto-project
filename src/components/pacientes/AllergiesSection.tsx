"use client"

import type { Allergy, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, getSeverityColor } from "@/lib/utils/patient-helpers"
import { Plus, AlertTriangle } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface AllergiesSectionProps {
  allergies: Allergy[]
  userRole: UserRole
  onAddAllergy?: () => void
}

export function AllergiesSection({ allergies, userRole, onAddAllergy }: AllergiesSectionProps) {
  const permissions = getPermissions(userRole)

  const getSeverityLabel = (severity: Allergy["severity"]) => {
    const labels = {
      MILD: "Leve",
      MODERATE: "Moderada",
      SEVERE: "Severa",
    }
    return labels[severity] || severity
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Alergias</CardTitle>
        {permissions.canEditClinicalData && (
          <Button onClick={onAddAllergy} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {allergies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay alergias registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allergies.map((allergy) => (
              <div
                key={allergy.id}
                className={`rounded-lg border p-4 ${
                  allergy.severity === "SEVERE" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {allergy.severity === "SEVERE" && <AlertTriangle className="h-5 w-5 text-red-600" />}
                      <h4 className="font-semibold">{allergy.allergen}</h4>
                      <Badge className={getSeverityColor(allergy.severity)}>{getSeverityLabel(allergy.severity)}</Badge>
                    </div>
                    {allergy.reaction && (
                      <p className="mt-1 text-sm text-muted-foreground">Reacción: {allergy.reaction}</p>
                    )}
                    {allergy.notes && <p className="mt-2 text-sm">{allergy.notes}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Diagnosticado: {formatDate(allergy.diagnosedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
