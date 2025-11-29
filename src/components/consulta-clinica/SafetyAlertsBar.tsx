"use client"

import { useState } from "react"
import { AlertTriangle, Pill, ChevronDown, ChevronUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Alergia {
  id: number
  name: string
  severity: "SEVERE" | "MODERATE" | "MILD"
  isActive: boolean
}

interface Medicacion {
  id: number
  name: string
  dose: string
  frequency: string
  isActive: boolean
}

interface SafetyAlertsBarProps {
  alergias: Alergia[]
  medicaciones: Medicacion[]
}

export function SafetyAlertsBar({ alergias, medicaciones }: SafetyAlertsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const severeAllergies = alergias?.filter((a) => a.severity === "SEVERE" && a.isActive) || []
  const activeMedications = medicaciones?.filter((m) => m.isActive) || []

  const totalAlerts = severeAllergies.length + activeMedications.length

  if (totalAlerts === 0 || isDismissed) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn("bg-destructive/10 border-b-2 border-destructive/30", "transition-all duration-200")}
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-destructive">
              {totalAlerts} {totalAlerts === 1 ? "alerta" : "alertas"} de seguridad
            </span>
          </div>

          {/* Quick preview when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-2 ml-4">
              {severeAllergies.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {severeAllergies.length} alergia{severeAllergies.length > 1 ? "s" : ""} severa
                  {severeAllergies.length > 1 ? "s" : ""}
                </Badge>
              )}
              {activeMedications.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                >
                  {activeMedications.length} medicación activa
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
        <div id="safety-alerts-content" className="px-4 pb-3 grid gap-4 sm:grid-cols-2">
          {/* Severe Allergies */}
          {severeAllergies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alergias Severas
              </h4>
              <ul className="space-y-1">
                {severeAllergies.map((alergia) => (
                  <li key={alergia.id} className="text-sm text-destructive/90 bg-destructive/10 rounded px-2 py-1">
                    {alergia.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Active Medications */}
          {activeMedications.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medicación Activa
              </h4>
              <ul className="space-y-1">
                {activeMedications.map((med) => (
                  <li
                    key={med.id}
                    className="text-sm text-amber-800 dark:text-amber-200 bg-amber-100/50 dark:bg-amber-900/20 rounded px-2 py-1"
                  >
                    <span className="font-medium">{med.name}</span>
                    <span className="text-muted-foreground ml-1">
                      - {med.dose}, {med.frequency}
                    </span>
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
