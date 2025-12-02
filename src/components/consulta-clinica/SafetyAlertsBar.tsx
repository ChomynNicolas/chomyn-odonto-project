"use client"

import { useMemo } from "react"
import { useState } from "react"
import { AlertTriangle, Pill, ChevronDown, ChevronUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AlergiasDTO, MedicacionDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface SafetyAlertsBarProps {
  alergias: AlergiasDTO[]
  medicaciones: MedicacionDTO[]
}

export function SafetyAlertsBar({ alergias, medicaciones }: SafetyAlertsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Organizar alergias activas por severidad
  const { severeAllergies, moderateAllergies, mildAllergies, allActiveAllergies } = useMemo(() => {
    const active = alergias?.filter((a) => a.isActive) || []
    return {
      severeAllergies: active.filter((a) => a.severity === "SEVERE"),
      moderateAllergies: active.filter((a) => a.severity === "MODERATE"),
      mildAllergies: active.filter((a) => a.severity === "MILD"),
      allActiveAllergies: active,
    }
  }, [alergias])

  const activeMedications = medicaciones?.filter((m) => m.isActive) || []

  // Contar todas las alertas (todas las alergias activas + medicaciones)
  const totalAlerts = allActiveAllergies.length + activeMedications.length

  if (totalAlerts === 0 || isDismissed) return null

  // Determinar el color del borde y fondo según si hay alergias severas
  const hasSevereAllergies = severeAllergies.length > 0
  const borderColor = hasSevereAllergies
    ? "border-destructive/30 bg-destructive/10"
    : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn("border-b-2 transition-all duration-200", borderColor)}
    >
      {/* Collapsed State - Always visible */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
          aria-expanded={isExpanded}
          aria-controls="safety-alerts-content"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-5 w-5",
                hasSevereAllergies ? "text-destructive" : "text-amber-600 dark:text-amber-400"
              )}
            />
            <span
              className={cn(
                "font-semibold",
                hasSevereAllergies ? "text-destructive" : "text-amber-700 dark:text-amber-300"
              )}
            >
              {totalAlerts} {totalAlerts === 1 ? "alerta" : "alertas"} de seguridad
            </span>
          </div>

          {/* Quick preview when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-2 ml-4 flex-wrap">
              {allActiveAllergies.length > 0 && (
                <div className="flex items-center gap-1">
                  {severeAllergies.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {severeAllergies.length} severa{severeAllergies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {moderateAllergies.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                    >
                      {moderateAllergies.length} moderada{moderateAllergies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {mildAllergies.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                    >
                      {mildAllergies.length} leve{mildAllergies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              )}
              {activeMedications.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                >
                  {activeMedications.length} medicación{activeMedications.length > 1 ? "es" : ""} activa
                  {activeMedications.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 text-muted-foreground">
            <span className="text-sm hidden sm:inline">{isExpanded ? "Ocultar detalles" : "Ver detalles"}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="ml-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar alertas"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div id="safety-alerts-content" className="px-4 pb-3 space-y-4">
          {/* Alergias - Organizadas por severidad */}
          {allActiveAllergies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alergias Activas ({allActiveAllergies.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Alergias Severas */}
                {severeAllergies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Severas ({severeAllergies.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {severeAllergies.map((alergia) => (
                        <li
                          key={alergia.id}
                          className="text-sm text-destructive/95 bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5"
                        >
                          <div className="font-medium">{alergia.label}</div>
                          {alergia.reaction && (
                            <div className="text-xs text-destructive/70 mt-0.5 italic">
                              Reacción: {alergia.reaction}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alergias Moderadas */}
                {moderateAllergies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Moderadas ({moderateAllergies.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {moderateAllergies.map((alergia) => (
                        <li
                          key={alergia.id}
                          className="text-sm text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md px-2.5 py-1.5"
                        >
                          <div className="font-medium">{alergia.label}</div>
                          {alergia.reaction && (
                            <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5 italic">
                              Reacción: {alergia.reaction}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alergias Leves */}
                {mildAllergies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Leves ({mildAllergies.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {mildAllergies.map((alergia) => (
                        <li
                          key={alergia.id}
                          className="text-sm text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-2.5 py-1.5"
                        >
                          <div className="font-medium">{alergia.label}</div>
                          {alergia.reaction && (
                            <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 italic">
                              Reacción: {alergia.reaction}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medicaciones Activas */}
          {activeMedications.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medicación Activa ({activeMedications.length})
              </h3>
              <ul className="space-y-1.5">
                {activeMedications.map((med) => (
                  <li
                    key={med.id}
                    className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-1.5"
                  >
                    <div className="font-medium">{med.label || "Medicación sin nombre"}</div>
                    {(med.dose || med.freq) && (
                      <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        {[med.dose, med.freq].filter(Boolean).join(" • ")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
