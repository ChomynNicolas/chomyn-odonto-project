"use client"

import { useState } from "react"
import type { OdontogramSnapshot, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatDate, getToothConditionColor } from "@/lib/utils/patient-helpers"
import { Eye, Plus } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface OdontogramPreviewProps {
  snapshots: OdontogramSnapshot[]
  userRole: UserRole
  onAddSnapshot?: () => void
}

export function OdontogramPreview({ snapshots, userRole, onAddSnapshot }: OdontogramPreviewProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const permissions = getPermissions(userRole)

  // Get most recent snapshot
  const latestSnapshot = snapshots.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )[0]

  if (!latestSnapshot) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Odontograma</CardTitle>
          {permissions.canEditClinicalData && (
            <Button onClick={onAddSnapshot} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Registrar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay odontograma registrado</p>
        </CardContent>
      </Card>
    )
  }

  // Count teeth by condition (excluding INTACT)
  const conditionCounts = latestSnapshot.teeth.reduce(
    (acc, tooth) => {
      if (tooth.condition !== "INTACT") {
        acc[tooth.condition] = (acc[tooth.condition] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      CARIES: "Caries",
      FILLED: "Obturado",
      CROWN: "Corona",
      MISSING: "Ausente",
      IMPLANT: "Implante",
      ROOT_CANAL: "Endodoncia",
      FRACTURED: "Fracturado",
    }
    return labels[condition] || condition
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Odontograma</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setIsViewerOpen(true)} size="sm" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalle
            </Button>
            {permissions.canEditClinicalData && (
              <Button onClick={onAddSnapshot} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">Último registro: {formatDate(latestSnapshot.recordedAt)}</div>

          {/* Visual preview - simplified tooth chart */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-4 text-center text-sm font-medium">Vista Previa</div>
            <div className="space-y-2">
              {/* Upper teeth */}
              <div className="flex justify-center gap-1">
                {latestSnapshot.teeth
                  .filter((t) => Number.parseInt(t.toothNumber) >= 11 && Number.parseInt(t.toothNumber) <= 28)
                  .sort((a, b) => Number.parseInt(a.toothNumber) - Number.parseInt(b.toothNumber))
                  .map((tooth) => (
                    <div
                      key={tooth.toothNumber}
                      className={`h-8 w-6 rounded ${getToothConditionColor(
                        tooth.condition,
                      )} flex items-center justify-center text-xs text-white font-medium`}
                      title={`${tooth.toothNumber} - ${getConditionLabel(tooth.condition)}`}
                    >
                      {tooth.toothNumber}
                    </div>
                  ))}
              </div>
              {/* Lower teeth */}
              <div className="flex justify-center gap-1">
                {latestSnapshot.teeth
                  .filter((t) => Number.parseInt(t.toothNumber) >= 31 && Number.parseInt(t.toothNumber) <= 48)
                  .sort((a, b) => Number.parseInt(a.toothNumber) - Number.parseInt(b.toothNumber))
                  .map((tooth) => (
                    <div
                      key={tooth.toothNumber}
                      className={`h-8 w-6 rounded ${getToothConditionColor(
                        tooth.condition,
                      )} flex items-center justify-center text-xs text-white font-medium`}
                      title={`${tooth.toothNumber} - ${getConditionLabel(tooth.condition)}`}
                    >
                      {tooth.toothNumber}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Condition summary */}
          {Object.keys(conditionCounts).length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Resumen de Condiciones</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(conditionCounts).map(([condition, count]) => (
                  <Badge key={condition} variant="outline">
                    {getConditionLabel(condition)}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {latestSnapshot.notes && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Notas</p>
              <p className="mt-1 text-sm text-muted-foreground">{latestSnapshot.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full viewer dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Odontograma Completo</DialogTitle>
          </DialogHeader>
          <OdontogramViewer snapshot={latestSnapshot} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function OdontogramViewer({ snapshot }: { snapshot: OdontogramSnapshot }) {
  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      INTACT: "Sano",
      CARIES: "Caries",
      FILLED: "Obturado",
      CROWN: "Corona",
      MISSING: "Ausente",
      IMPLANT: "Implante",
      ROOT_CANAL: "Endodoncia",
      FRACTURED: "Fracturado",
    }
    return labels[condition] || condition
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">Registrado: {formatDate(snapshot.recordedAt)}</div>

      {/* Detailed tooth chart */}
      <div className="space-y-6">
        {/* Upper arch */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Arcada Superior</h3>
          <div className="grid grid-cols-8 gap-2">
            {snapshot.teeth
              .filter((t) => Number.parseInt(t.toothNumber) >= 11 && Number.parseInt(t.toothNumber) <= 28)
              .sort((a, b) => Number.parseInt(a.toothNumber) - Number.parseInt(b.toothNumber))
              .map((tooth) => (
                <div key={tooth.toothNumber} className="rounded-lg border p-2">
                  <div className={`mb-2 h-12 w-full rounded ${getToothConditionColor(tooth.condition)}`} />
                  <p className="text-center text-xs font-medium">{tooth.toothNumber}</p>
                  <p className="text-center text-xs text-muted-foreground">{getConditionLabel(tooth.condition)}</p>
                  {tooth.surfaces && tooth.surfaces.length > 0 && (
                    <p className="mt-1 text-center text-xs text-muted-foreground">{tooth.surfaces.join(", ")}</p>
                  )}
                  {tooth.notes && <p className="mt-1 text-xs text-muted-foreground">{tooth.notes}</p>}
                </div>
              ))}
          </div>
        </div>

        {/* Lower arch */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Arcada Inferior</h3>
          <div className="grid grid-cols-8 gap-2">
            {snapshot.teeth
              .filter((t) => Number.parseInt(t.toothNumber) >= 31 && Number.parseInt(t.toothNumber) <= 48)
              .sort((a, b) => Number.parseInt(a.toothNumber) - Number.parseInt(b.toothNumber))
              .map((tooth) => (
                <div key={tooth.toothNumber} className="rounded-lg border p-2">
                  <div className={`mb-2 h-12 w-full rounded ${getToothConditionColor(tooth.condition)}`} />
                  <p className="text-center text-xs font-medium">{tooth.toothNumber}</p>
                  <p className="text-center text-xs text-muted-foreground">{getConditionLabel(tooth.condition)}</p>
                  {tooth.surfaces && tooth.surfaces.length > 0 && (
                    <p className="mt-1 text-center text-xs text-muted-foreground">{tooth.surfaces.join(", ")}</p>
                  )}
                  {tooth.notes && <p className="mt-1 text-xs text-muted-foreground">{tooth.notes}</p>}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Leyenda</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["INTACT", "CARIES", "FILLED", "CROWN", "MISSING", "IMPLANT", "ROOT_CANAL", "FRACTURED"].map((condition) => (
            <div key={condition} className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded ${getToothConditionColor(condition as any)}`} />
              <span className="text-xs">{getConditionLabel(condition)}</span>
            </div>
          ))}
        </div>
      </div>

      {snapshot.notes && (
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium">Notas Generales</p>
          <p className="mt-2 text-sm text-muted-foreground">{snapshot.notes}</p>
        </div>
      )}
    </div>
  )
}
