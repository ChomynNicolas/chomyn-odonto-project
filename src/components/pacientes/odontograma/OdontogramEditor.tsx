"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ToothEditor } from "./ToothEditor"
import { ProceduresSidebar } from "@/components/consulta-clinica/modules/odontograma/ProceduresSidebar"
import type { ToothRecord, ToothCondition } from "@/lib/types/patient"
import type { ProcedimientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { getToothConditionColor } from "@/lib/utils/patient-helpers"
import { hasProceduresForTooth } from "@/lib/utils/procedure-to-odontogram-mapper"
import { ChevronDown, ClipboardList } from "lucide-react"

interface OdontogramEditorProps {
  teeth: ToothRecord[]
  notes: string
  onToothUpdate: (toothNumber: string, condition: ToothCondition, surfaces?: string[], notes?: string) => void
  onNotesChange: (notes: string) => void
  procedures?: ProcedimientoDTO[]
  onApplySuggestion?: (
    toothNumber: string,
    condition: ToothCondition,
    surfaces?: string[],
    notes?: string,
  ) => void
}

export function OdontogramEditor({
  teeth,
  notes,
  onToothUpdate,
  onNotesChange,
  procedures = [],
  onApplySuggestion,
}: OdontogramEditorProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null)
  const [isProceduresOpen, setIsProceduresOpen] = useState(false)

  // Filtrar procedimientos que tienen diente asociado
  const proceduresWithTeeth = useMemo(() => {
    return (procedures || []).filter(
      (proc) => proc.toothNumber !== null && proc.toothNumber !== undefined,
    )
  }, [procedures])

  const getToothData = (toothNumber: string): ToothRecord | undefined => {
    return teeth.find((t) => t.toothNumber === toothNumber)
  }

  // Memoizar procedimientos por diente para performance
  const proceduresByTooth = useMemo(() => {
    const map = new Map<string, ProcedimientoDTO[]>()
    procedures.forEach((proc) => {
      if (proc.toothNumber !== null && proc.toothNumber !== undefined) {
        const key = String(proc.toothNumber)
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(proc)
      }
    })
    return map
  }, [procedures])

  const getToothProcedures = (toothNumber: string): ProcedimientoDTO[] => {
    return proceduresByTooth.get(toothNumber) || []
  }

  const hasProcedures = (toothNumber: string): boolean => {
    return hasProceduresForTooth(toothNumber, procedures)
  }

  const getConditionLabel = (condition: ToothCondition) => {
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

  // Count teeth by condition
  const conditionCounts = teeth.reduce(
    (acc, tooth) => {
      if (tooth.condition !== "INTACT") {
        acc[tooth.condition] = (acc[tooth.condition] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main Editor */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Editor de Odontograma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upper Arch */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Arcada Superior</h3>
              <div className="grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(11 + i)
                  const tooth = getToothData(toothNumber)
                  const toothProcedures = getToothProcedures(toothNumber)
                  const hasProc = hasProcedures(toothNumber)

                  return (
                    <Tooltip key={toothNumber}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedTooth(toothNumber)}
                          className={`relative rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                            selectedTooth === toothNumber
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border"
                          }`}
                        >
                          <div
                            className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                          />
                          <p className="text-center text-xs font-medium">{toothNumber}</p>
                          {hasProc && (
                            <div className="absolute top-1 right-1">
                              <Badge
                                variant="default"
                                className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-blue-600 hover:bg-blue-700"
                                title={`${toothProcedures.length} procedimiento(s)`}
                              >
                                {toothProcedures.length}
                              </Badge>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {hasProc && (
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-semibold">Diente {toothNumber}</p>
                            <p className="text-xs">
                              {toothProcedures.length}{" "}
                              {toothProcedures.length === 1 ? "procedimiento" : "procedimientos"}
                            </p>
                            <div className="mt-2 space-y-1">
                              {toothProcedures.slice(0, 3).map((proc) => (
                                <p key={proc.id} className="text-xs">
                                  • {proc.serviceType || "Sin especificar"}
                                </p>
                              ))}
                              {toothProcedures.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{toothProcedures.length - 3} más
                                </p>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
              <div className="mt-2 grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(21 + i)
                  const tooth = getToothData(toothNumber)
                  const toothProcedures = getToothProcedures(toothNumber)
                  const hasProc = hasProcedures(toothNumber)

                  return (
                    <Tooltip key={toothNumber}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedTooth(toothNumber)}
                          className={`relative rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                            selectedTooth === toothNumber
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border"
                          }`}
                        >
                          <div
                            className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                          />
                          <p className="text-center text-xs font-medium">{toothNumber}</p>
                          {hasProc && (
                            <div className="absolute top-1 right-1">
                              <Badge
                                variant="default"
                                className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-blue-600 hover:bg-blue-700"
                                title={`${toothProcedures.length} procedimiento(s)`}
                              >
                                {toothProcedures.length}
                              </Badge>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {hasProc && (
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-semibold">Diente {toothNumber}</p>
                            <p className="text-xs">
                              {toothProcedures.length}{" "}
                              {toothProcedures.length === 1 ? "procedimiento" : "procedimientos"}
                            </p>
                            <div className="mt-2 space-y-1">
                              {toothProcedures.slice(0, 3).map((proc) => (
                                <p key={proc.id} className="text-xs">
                                  • {proc.serviceType || "Sin especificar"}
                                </p>
                              ))}
                              {toothProcedures.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{toothProcedures.length - 3} más
                                </p>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {/* Lower Arch */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Arcada Inferior</h3>
              <div className="grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(41 + i)
                  const tooth = getToothData(toothNumber)
                  const toothProcedures = getToothProcedures(toothNumber)
                  const hasProc = hasProcedures(toothNumber)

                  return (
                    <Tooltip key={toothNumber}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedTooth(toothNumber)}
                          className={`relative rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                            selectedTooth === toothNumber
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border"
                          }`}
                        >
                          <div
                            className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                          />
                          <p className="text-center text-xs font-medium">{toothNumber}</p>
                          {hasProc && (
                            <div className="absolute top-1 right-1">
                              <Badge
                                variant="default"
                                className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-blue-600 hover:bg-blue-700"
                                title={`${toothProcedures.length} procedimiento(s)`}
                              >
                                {toothProcedures.length}
                              </Badge>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {hasProc && (
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-semibold">Diente {toothNumber}</p>
                            <p className="text-xs">
                              {toothProcedures.length}{" "}
                              {toothProcedures.length === 1 ? "procedimiento" : "procedimientos"}
                            </p>
                            <div className="mt-2 space-y-1">
                              {toothProcedures.slice(0, 3).map((proc) => (
                                <p key={proc.id} className="text-xs">
                                  • {proc.serviceType || "Sin especificar"}
                                </p>
                              ))}
                              {toothProcedures.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{toothProcedures.length - 3} más
                                </p>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
              <div className="mt-2 grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(31 + i)
                  const tooth = getToothData(toothNumber)
                  const toothProcedures = getToothProcedures(toothNumber)
                  const hasProc = hasProcedures(toothNumber)

                  return (
                    <Tooltip key={toothNumber}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedTooth(toothNumber)}
                          className={`relative rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                            selectedTooth === toothNumber
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border"
                          }`}
                        >
                          <div
                            className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                          />
                          <p className="text-center text-xs font-medium">{toothNumber}</p>
                          {hasProc && (
                            <div className="absolute top-1 right-1">
                              <Badge
                                variant="default"
                                className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-blue-600 hover:bg-blue-700"
                                title={`${toothProcedures.length} procedimiento(s)`}
                              >
                                {toothProcedures.length}
                              </Badge>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {hasProc && (
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-semibold">Diente {toothNumber}</p>
                            <p className="text-xs">
                              {toothProcedures.length}{" "}
                              {toothProcedures.length === 1 ? "procedimiento" : "procedimientos"}
                            </p>
                            <div className="mt-2 space-y-1">
                              {toothProcedures.slice(0, 3).map((proc) => (
                                <p key={proc.id} className="text-xs">
                                  • {proc.serviceType || "Sin especificar"}
                                </p>
                              ))}
                              {toothProcedures.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{toothProcedures.length - 3} más
                                </p>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Leyenda</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    "INTACT",
                    "CARIES",
                    "FILLED",
                    "CROWN",
                    "MISSING",
                    "IMPLANT",
                    "ROOT_CANAL",
                    "BRIDGE",
                    "EXTRACTION_NEEDED",
                    "FRACTURED",
                  ] as ToothCondition[]
                ).map((condition) => (
                  <div key={condition} className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded ${getToothConditionColor(condition)}`} />
                    <span className="text-xs">{getConditionLabel(condition)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* General Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas Generales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Observaciones generales del odontograma..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Tooth Editor */}
        {selectedTooth && (
          <ToothEditor
            tooth={getToothData(selectedTooth)}
            toothNumber={selectedTooth}
            onUpdate={onToothUpdate}
            onClose={() => setSelectedTooth(null)}
          />
        )}

        {/* Procedimientos Sugeridos - Collapsible */}
        {proceduresWithTeeth.length > 0 && onApplySuggestion && (
          <Collapsible open={isProceduresOpen} onOpenChange={setIsProceduresOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Procedimientos por Diente
                      <Badge variant="secondary" className="ml-2">
                        {proceduresWithTeeth.length}
                      </Badge>
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isProceduresOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <ProceduresSidebar
                    procedures={proceduresWithTeeth}
                    teeth={teeth}
                    onApplySuggestion={onApplySuggestion}
                    compact={true}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Total de dientes</p>
              <p className="text-2xl font-bold">{teeth.length}</p>
            </div>
            {Object.keys(conditionCounts).length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Condiciones</p>
                <div className="space-y-2">
                  {Object.entries(conditionCounts).map(([condition, count]) => (
                    <div key={condition} className="flex items-center justify-between">
                      <span className="text-sm">{getConditionLabel(condition as ToothCondition)}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
