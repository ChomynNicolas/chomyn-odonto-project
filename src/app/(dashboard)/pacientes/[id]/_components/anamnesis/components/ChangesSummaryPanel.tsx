// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/ChangesSummaryPanel.tsx
// Component for displaying aggregated change summary grouped by section

"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, FileText, Pill, AlertCircle, Heart, Activity } from "lucide-react"
import { ChangeSummaryItem, type FieldChange, type ChangeSeverity } from "./ChangeSummaryItem"
import { cn } from "@/lib/utils"

interface ChangesSummaryPanelProps {
  changes: FieldChange[]
  showEmptyState?: boolean
  maxHeight?: string
  compact?: boolean
}

// Section configuration with icons and display names
const SECTION_CONFIG: Record<string, { icon: typeof FileText; label: string; order: number }> = {
  general: { icon: FileText, label: "Información General", order: 1 },
  allergies: { icon: AlertTriangle, label: "Alergias", order: 2 },
  medications: { icon: Pill, label: "Medicaciones", order: 3 },
  medical_history: { icon: Heart, label: "Antecedentes Médicos", order: 4 },
  habits: { icon: Activity, label: "Hábitos", order: 5 },
  women_specific: { icon: AlertCircle, label: "Información para Mujeres", order: 6 },
  pediatric: { icon: AlertCircle, label: "Información Pediátrica", order: 7 },
  other: { icon: FileText, label: "Otros", order: 99 },
}

function getSectionConfig(section: string) {
  return SECTION_CONFIG[section.toLowerCase()] || SECTION_CONFIG.other
}

export function ChangesSummaryPanel({
  changes,
  showEmptyState = true,
  maxHeight = "400px",
  compact = false,
}: ChangesSummaryPanelProps) {
  // Group changes by section
  const groupedChanges = useMemo(() => {
    const groups: Record<string, FieldChange[]> = {}
    
    changes.forEach((change) => {
      const section = change.section.toLowerCase()
      if (!groups[section]) {
        groups[section] = []
      }
      groups[section].push(change)
    })

    // Sort sections by order
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const orderA = getSectionConfig(a).order
        const orderB = getSectionConfig(b).order
        return orderA - orderB
      })
      .map(([section, sectionChanges]) => ({
        section,
        config: getSectionConfig(section),
        changes: sectionChanges,
      }))
  }, [changes])

  // Count changes by severity
  const severityCounts = useMemo(() => {
    const counts: Record<ChangeSeverity, number> = { critical: 0, medium: 0, low: 0 }
    changes.forEach((change) => {
      counts[change.severity]++
    })
    return counts
  }, [changes])

  const hasCriticalChanges = severityCounts.critical > 0
  const totalChanges = changes.length

  if (totalChanges === 0 && showEmptyState) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay cambios para mostrar</p>
        </CardContent>
      </Card>
    )
  }

  if (totalChanges === 0) {
    return null
  }

  return (
    <Card className={cn(hasCriticalChanges && "border-red-200 dark:border-red-800")}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Resumen de Cambios
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalChanges} cambio{totalChanges > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        
        {/* Severity Summary */}
        <div className="flex items-center gap-3 mt-2">
          {severityCounts.critical > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              {severityCounts.critical} crítico{severityCounts.critical > 1 ? "s" : ""}
            </Badge>
          )}
          {severityCounts.medium > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {severityCounts.medium} medio{severityCounts.medium > 1 ? "s" : ""}
            </Badge>
          )}
          {severityCounts.low > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {severityCounts.low} bajo{severityCounts.low > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Critical Warning */}
        {hasCriticalChanges && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cambios Críticos Detectados</AlertTitle>
            <AlertDescription>
              Esta actualización incluye cambios en campos críticos (alergias o medicaciones) que 
              afectan la seguridad clínica. Se requiere una razón para estos cambios.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className={`pr-4`} style={{ maxHeight }}>
          <Accordion type="multiple" defaultValue={groupedChanges.map((g) => g.section)} className="space-y-2">
            {groupedChanges.map(({ section, config, changes: sectionChanges }) => {
              const SectionIcon = config.icon
              const hasSectionCritical = sectionChanges.some((c) => c.severity === "critical")
              
              return (
                <AccordionItem
                  key={section}
                  value={section}
                  className={cn(
                    "border rounded-lg px-4",
                    hasSectionCritical && "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20"
                  )}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <SectionIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {sectionChanges.length}
                      </Badge>
                      {hasSectionCritical && (
                        <Badge variant="destructive" className="text-xs">
                          Crítico
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-3">
                      {sectionChanges.map((change, index) => (
                        <ChangeSummaryItem
                          key={`${change.fieldPath}-${index}`}
                          change={change}
                          compact={compact}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Export types for use in other components
export type { FieldChange, ChangeSeverity }

