"use client"

import { useState } from "react"
import type { Diagnosis, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, getDiagnosisStatusColor } from "@/lib/utils/patient-helpers"
import { Plus, Stethoscope } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface DiagnosesSectionProps {
  diagnoses: Diagnosis[]
  userRole: UserRole
  onAddDiagnosis?: () => void
}

export function DiagnosesSection({ diagnoses, userRole, onAddDiagnosis }: DiagnosesSectionProps) {
  const permissions = getPermissions(userRole)
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active")

  const filteredDiagnoses = diagnoses.filter((d) => {
    if (filter === "all") return true
    if (filter === "active") return d.status === "ACTIVE" || d.status === "CHRONIC" || d.status === "MONITORING"
    if (filter === "resolved") return d.status === "RESOLVED" || d.status === "RULED_OUT"
    return true
  })

  const getStatusLabel = (status: Diagnosis["status"]) => {
    const labels: Record<Diagnosis["status"], string> = {
      ACTIVE: "Activo",
      RESOLVED: "Resuelto",
      CHRONIC: "Crónico",
      MONITORING: "Monitoreo",
      RULED_OUT: "Descartado",
    }
    return labels[status] || status
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Diagnósticos</CardTitle>
        {permissions.canEditClinicalData && (
          <Button onClick={onAddDiagnosis} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="resolved">Resueltos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredDiagnoses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Stethoscope className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay diagnósticos {filter !== "all" && filter}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDiagnoses.map((diagnosis) => (
              <div key={diagnosis.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{diagnosis.label}</h4>
                      <Badge className={getDiagnosisStatusColor(diagnosis.status)}>
                        {getStatusLabel(diagnosis.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Código: {diagnosis.code}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
  Diagnosticado: {formatDate(diagnosis.diagnosedAt)}
  {diagnosis.professional && (
    <>
      {" "}por {diagnosis.professional.firstName} {diagnosis.professional.lastName ?? ""}
    </>
  )}
</p>
                    {diagnosis.resolvedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">Resuelto: {formatDate(diagnosis.resolvedAt)}</p>
                    )}
                    {diagnosis.notes && <p className="mt-2 text-sm">{diagnosis.notes}</p>}
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
