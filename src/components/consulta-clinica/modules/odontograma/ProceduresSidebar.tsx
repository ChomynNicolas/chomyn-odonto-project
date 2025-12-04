// src/components/consulta-clinica/modules/odontograma/ProceduresSidebar.tsx
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, CheckCircle2, ClipboardList } from "lucide-react"
import type { ProcedimientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import type { ToothRecord, ToothCondition } from "@/lib/types/patient"
import {
  groupProceduresByTooth,
  getProcedureSuggestions,
  getProcedureSurface,
} from "@/lib/utils/procedure-to-odontogram-mapper"

interface ProceduresSidebarProps {
  procedures: ProcedimientoDTO[]
  teeth: ToothRecord[]
  onApplySuggestion: (
    toothNumber: string,
    condition: ToothCondition,
    surface?: string[],
    notes?: string,
  ) => void
  compact?: boolean
}

const getConditionLabel = (condition: ToothCondition): string => {
  const labels: Record<ToothCondition, string> = {
    INTACT: "Sano",
    CARIES: "Caries",
    FILLED: "Obturado",
    CROWN: "Corona",
    MISSING: "Ausente",
    IMPLANT: "Implante",
    ROOT_CANAL: "Endodoncia",
    BRIDGE: "Puente",
    EXTRACTION_NEEDED: "Extracción necesaria",
    FRACTURED: "Fracturado",
  }
  return labels[condition]
}

export function ProceduresSidebar({
  procedures,
  teeth,
  onApplySuggestion,
  compact = false,
}: ProceduresSidebarProps) {
  // Filtrar procedimientos que tienen diente asociado
  const proceduresWithTeeth = useMemo(
    () => procedures.filter((p) => p.toothNumber !== null && p.toothNumber !== undefined),
    [procedures],
  )

  // Agrupar por diente
  const groupedProcedures = useMemo(
    () => groupProceduresByTooth(proceduresWithTeeth),
    [proceduresWithTeeth],
  )

  // Crear mapa de dientes para búsqueda rápida
  const teethMap = useMemo(() => {
    const map = new Map<string, ToothRecord>()
    teeth.forEach((tooth) => {
      map.set(tooth.toothNumber, tooth)
    })
    return map
  }, [teeth])

  // Verificar si un diente ya tiene la condición sugerida
  const hasSuggestedCondition = (
    toothNumber: number,
    suggestedCondition: ToothCondition,
  ): boolean => {
    const tooth = teethMap.get(String(toothNumber))
    if (!tooth) return false
    return tooth.condition === suggestedCondition
  }

  // Ordenar dientes numéricamente
  const sortedToothNumbers = useMemo(() => {
    return Array.from(groupedProcedures.keys()).sort((a, b) => a - b)
  }, [groupedProcedures])

  if (proceduresWithTeeth.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p className="text-xs">No hay procedimientos asociados a dientes</p>
      </div>
    )
  }

  const content = (
    <div className={`space-y-3 ${compact ? "max-h-[400px]" : "max-h-[600px]"} overflow-y-auto`}>
        {sortedToothNumbers.map((toothNumber) => {
          const toothProcedures = groupedProcedures.get(toothNumber) || []
          const tooth = teethMap.get(String(toothNumber))

          return (
            <div
              key={toothNumber}
              className={`rounded-lg border p-2 space-y-2 bg-card hover:bg-accent/50 transition-colors ${compact ? "p-2" : "p-3"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>
                    Diente {toothNumber}
                  </span>
                  {tooth && tooth.condition !== "INTACT" && (
                    <Badge variant="outline" className="text-xs">
                      {getConditionLabel(tooth.condition)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {toothProcedures.map((procedure) => {
                  const suggestion = getProcedureSuggestions(procedure)
                  const alreadyApplied = hasSuggestedCondition(
                    toothNumber,
                    suggestion.condition,
                  )
                  const surfaceStr = getProcedureSurface(procedure)

                  return (
                    <div
                      key={procedure.id}
                      className={`rounded-md border bg-muted/50 ${compact ? "p-1.5" : "p-2"} space-y-1.5`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>
                            {procedure.serviceType || "Procedimiento sin especificar"}
                          </p>
                          {!compact && procedure.resultNotes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {procedure.resultNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {getConditionLabel(suggestion.condition)}
                        </Badge>
                        {surfaceStr && (
                          <Badge variant="outline" className="text-[10px]">
                            {surfaceStr}
                          </Badge>
                        )}
                        {alreadyApplied && (
                          <Badge variant="default" className="text-[10px] bg-green-600 px-1.5 py-0">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                            Aplicado
                          </Badge>
                        )}
                      </div>

                      {!alreadyApplied && (
                        <Button
                          size={compact ? "sm" : "sm"}
                          variant="outline"
                          className={`w-full ${compact ? "h-7 text-xs" : ""}`}
                          onClick={() => {
                            const surfaces = suggestion.surface
                              ? [suggestion.surface]
                              : undefined
                            onApplySuggestion(
                              String(toothNumber),
                              suggestion.condition,
                              surfaces,
                              suggestion.notes,
                            )
                          }}
                        >
                          Aplicar
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )

  if (compact) {
    return content
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Procedimientos por Diente
          <Badge variant="secondary" className="ml-auto">
            {proceduresWithTeeth.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}

