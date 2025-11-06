"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/patient-helpers"
import { RotateCcw, X } from "lucide-react"
import type { OdontogramSnapshot } from "@/lib/types/patient"

interface OdontogramHistoryProps {
  snapshots: OdontogramSnapshot[]
  onClose: () => void
  onRestore: (snapshot: OdontogramSnapshot) => void
}

export function OdontogramHistory({ snapshots, onClose, onRestore }: OdontogramHistoryProps) {
  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historial de Odontogramas</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay registros anteriores</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Historial de Odontogramas</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {snapshots.map((snapshot, index) => {
            const conditionCounts = snapshot.teeth.reduce(
              (acc, tooth) => {
                if (tooth.condition !== "INTACT") {
                  acc[tooth.condition] = (acc[tooth.condition] || 0) + 1
                }
                return acc
              },
              {} as Record<string, number>,
            )

            return (
              <div key={snapshot.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{formatDate(snapshot.recordedAt)}</p>
                      {index === 0 && <Badge variant="default">Actual</Badge>}
                    </div>
                    {Object.keys(conditionCounts).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(conditionCounts).map(([condition, count]) => (
                          <Badge key={condition} variant="outline" className="text-xs">
                            {condition}: {count}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {snapshot.notes && <p className="mt-2 text-sm text-muted-foreground">{snapshot.notes}</p>}
                  </div>
                  {index !== 0 && (
                    <Button size="sm" variant="outline" onClick={() => onRestore(snapshot)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurar
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
