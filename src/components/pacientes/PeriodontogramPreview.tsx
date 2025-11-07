"use client"

import { useState } from "react"
import type { PeriodontogramSnapshot, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/patient-helpers"
import { Eye, Plus } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface PeriodontogramPreviewProps {
  snapshots: PeriodontogramSnapshot[]
  userRole: UserRole
  onAddSnapshot?: () => void
}

export function PeriodontogramPreview({ snapshots, userRole, onAddSnapshot }: PeriodontogramPreviewProps) {
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
          <CardTitle>Periodontograma</CardTitle>
          {permissions.canEditClinicalData && (
            <Button onClick={onAddSnapshot} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Registrar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay periodontograma registrado</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate statistics
  const totalMeasurements = latestSnapshot.measurements.length
  const bleedingSites = latestSnapshot.measurements.filter((m) => m.bleeding).length
  const plaqueSites = latestSnapshot.measurements.filter((m) => m.plaque).length
  const avgProbingDepth =
    latestSnapshot.measurements.reduce((sum, m) => sum + (m.probingDepth || 0), 0) / totalMeasurements

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Periodontograma</CardTitle>
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

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Mediciones</p>
              <p className="mt-1 text-2xl font-bold">{totalMeasurements}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Prof. Promedio</p>
              <p className="mt-1 text-2xl font-bold">{avgProbingDepth.toFixed(1)} mm</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Sangrado</p>
              <p className="mt-1 text-2xl font-bold">
                {bleedingSites} <span className="text-sm font-normal">sitios</span>
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Placa</p>
              <p className="mt-1 text-2xl font-bold">
                {plaqueSites} <span className="text-sm font-normal">sitios</span>
              </p>
            </div>
          </div>

          {/* Health indicators */}
          <div className="flex flex-wrap gap-2">
            {bleedingSites > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200">
                Sangrado presente
              </Badge>
            )}
            {plaqueSites > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
                Placa presente
              </Badge>
            )}
            {avgProbingDepth > 4 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200">
                Profundidad elevada
              </Badge>
            )}
          </div>

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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Periodontograma Completo</DialogTitle>
          </DialogHeader>
          <PeriodontogramViewer snapshot={latestSnapshot} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function PeriodontogramViewer({ snapshot }: { snapshot: PeriodontogramSnapshot }) {
  // Group measurements by tooth
  const measurementsByTooth = snapshot.measurements.reduce(
    (acc, measurement) => {
      if (!acc[measurement.toothNumber]) {
        acc[measurement.toothNumber] = []
      }
      acc[measurement.toothNumber].push(measurement)
      return acc
    },
    {} as Record<string, typeof snapshot.measurements>,
  )

  const getSiteColor = (depth?: number) => {
    if (!depth) return "bg-gray-200"
    if (depth <= 3) return "bg-green-500"
    if (depth <= 5) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">Registrado: {formatDate(snapshot.recordedAt)}</div>

      {/* Detailed measurements table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Diente</th>
              <th className="p-2 text-center">Sitio</th>
              <th className="p-2 text-center">Prof. (mm)</th>
              <th className="p-2 text-center">Recesión (mm)</th>
              <th className="p-2 text-center">Sangrado</th>
              <th className="p-2 text-center">Placa</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(measurementsByTooth)
              .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
              .map(([toothNumber, measurements]) =>
                measurements.map((measurement, index) => (
                  <tr key={`${toothNumber}-${measurement.site}`} className="border-b">
                    {index === 0 && (
                      <td className="p-2 font-medium" rowSpan={measurements.length}>
                        {toothNumber}
                      </td>
                    )}
                    <td className="p-2 text-center capitalize">{measurement.site}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-block rounded px-2 py-1 text-white ${getSiteColor(
                          measurement.probingDepth,
                        )}`}
                      >
                        {measurement.probingDepth || "-"}
                      </span>
                    </td>
                    <td className="p-2 text-center">{measurement.recession || "-"}</td>
                    <td className="p-2 text-center">
                      {measurement.bleeding ? (
                        <span className="text-red-600">Sí</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {measurement.plaque ? (
                        <span className="text-yellow-600">Sí</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                )),
              )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Leyenda - Profundidad de Sondaje</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-500" />
            <span className="text-xs">Saludable (&lt;=3mm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-yellow-500" />
            <span className="text-xs">Moderado (4-5mm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-500" />
            <span className="text-xs">Severo (&gt;5mm)</span>
          </div>
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
