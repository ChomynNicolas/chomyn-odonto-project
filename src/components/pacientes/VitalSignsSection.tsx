"use client"

import type { VitalSigns, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate, calculateBMI } from "@/lib/utils/patient-helpers"
import { Plus, Activity } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface VitalSignsSectionProps {
  vitalSigns: VitalSigns[]
  userRole: UserRole
  onAddVitalSigns?: () => void
}

export function VitalSignsSection({ vitalSigns, userRole, onAddVitalSigns }: VitalSignsSectionProps) {
  const permissions = getPermissions(userRole)

  // Get most recent vital signs
  const latestVitalSigns = [...vitalSigns].sort(
  (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
)[0];

const recordedByName = latestVitalSigns?.recordedBy
  ? `${latestVitalSigns.recordedBy.firstName} ${latestVitalSigns.recordedBy.lastName ?? ""}`.trim()
  : "Personal clínico";

  if (!latestVitalSigns) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Signos Vitales</CardTitle>
          {permissions.canEditClinicalData && (
            <Button onClick={onAddVitalSigns} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Registrar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay signos vitales registrados</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const vitalSignsData = [
    {
      label: "Altura",
      value: latestVitalSigns.height ? `${latestVitalSigns.height} cm` : "-",
      show: !!latestVitalSigns.height,
    },
    {
      label: "Peso",
      value: latestVitalSigns.weight ? `${latestVitalSigns.weight} kg` : "-",
      show: !!latestVitalSigns.weight,
    },
    {
      label: "IMC",
      value: latestVitalSigns.bmi
        ? latestVitalSigns.bmi.toString()
        : latestVitalSigns.weight && latestVitalSigns.height
          ? calculateBMI(latestVitalSigns.weight, latestVitalSigns.height).toString()
          : "-",
      show: !!(latestVitalSigns.bmi || (latestVitalSigns.weight && latestVitalSigns.height)),
    },
    {
      label: "TA Sistólica",
      value: latestVitalSigns.systolicBP ? `${latestVitalSigns.systolicBP} mmHg` : "-",
      show: !!latestVitalSigns.systolicBP,
    },
    {
      label: "TA Diastólica",
      value: latestVitalSigns.diastolicBP ? `${latestVitalSigns.diastolicBP} mmHg` : "-",
      show: !!latestVitalSigns.diastolicBP,
    },
    {
      label: "FC",
      value: latestVitalSigns.heartRate ? `${latestVitalSigns.heartRate} lpm` : "-",
      show: !!latestVitalSigns.heartRate,
    },
    {
      label: "Temperatura",
      value: latestVitalSigns.temperature ? `${latestVitalSigns.temperature}°C` : "-",
      show: !!latestVitalSigns.temperature,
    },
  ].filter((item) => item.show)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Signos Vitales</CardTitle>
        {permissions.canEditClinicalData && (
          <Button onClick={onAddVitalSigns} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Registrar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
  Último registro: {formatDate(latestVitalSigns.recordedAt, true)} por {recordedByName}
</div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {vitalSignsData.map((item) => (
            <div key={item.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        {latestVitalSigns.notes && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Notas</p>
            <p className="mt-1 text-sm text-muted-foreground">{latestVitalSigns.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
