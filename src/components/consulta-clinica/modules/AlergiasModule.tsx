// src/components/consulta-clinica/modules/AlergiasModule.tsx
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate } from "@/lib/utils/patient-helpers"
import { getSeverityColor } from "@/lib/utils/patient-helpers"
import type { AllergySeverity } from "@/lib/types/patient"

interface AlergiasModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta: boolean
  pacienteId?: number // Opcional: ID del paciente para navegación
  onUpdate: () => void
}

/**
 * Módulo de Alergias (Solo Lectura)
 *
 * Muestra las alergias activas del paciente durante la consulta clínica.
 * Este módulo es de solo lectura para garantizar la seguridad clínica y
 * acceso rápido a información crítica.
 *
 * Características:
 * - Visualización de alergias activas del paciente
 * - Badges de severidad (MILD, MODERATE, SEVERE)
 * - Mostrar reacciones documentadas
 * - Link a ficha completa del paciente
 * - Diseño claro y accesible para información crítica
 */
export function AlergiasModule({ consulta, pacienteId }: AlergiasModuleProps) {
  const router = useRouter()

  // Asegurar que alergias siempre sea un array
  const alergiasArray = useMemo(() => {
    return Array.isArray(consulta.alergias) ? consulta.alergias : []
  }, [consulta.alergias])

  // Filtrar solo alergias activas
  const alergiasActivas = useMemo(() => {
    return alergiasArray.filter((a) => a.isActive === true)
  }, [alergiasArray])

  // Obtener pacienteId desde la consulta o desde props
  const pacienteIdFinal = pacienteId ?? consulta.pacienteId

  const handleVerHistoria = () => {
    // Navegar a la ficha del paciente si tenemos el ID
    if (pacienteIdFinal) {
      router.push(`/pacientes/${pacienteIdFinal}`)
    } else {
      // Si no tenemos el ID, navegar a la lista de pacientes
      router.push("/pacientes")
    }
  }

  const getSeverityLabel = (severity: AllergySeverity): string => {
    const labels: Record<AllergySeverity, string> = {
      MILD: "Leve",
      MODERATE: "Moderada",
      SEVERE: "Severa",
    }
    return labels[severity] || severity
  }

  const hasAlergias = alergiasActivas.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Alergias del Paciente
          </h3>
          {hasAlergias && (
            <p className="text-sm text-muted-foreground mt-1">
              {alergiasActivas.length} {alergiasActivas.length === 1 ? "alergia activa" : "alergias activas"}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleVerHistoria}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver en Historia del Paciente
        </Button>
      </div>

      {/* Lista de alergias */}
      {!hasAlergias ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay alergias registradas</p>
            <p className="text-sm mt-1">
              El paciente no tiene alergias activas documentadas en su historial clínico.
            </p>
            <p className="text-xs mt-2 text-muted-foreground">
              Si necesita registrar o actualizar alergias, utilice la ficha completa del paciente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alergiasActivas.map((alergia) => (
            <Card key={alergia.id} className="hover:shadow-md transition-shadow border-l-4 border-l-destructive">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-base">{alergia.label}</CardTitle>
                      <Badge className={getSeverityColor(alergia.severity)}>
                        {getSeverityLabel(alergia.severity)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Registrada: {formatDate(alergia.notedAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              {alergia.reaction && (
                <CardContent>
                  <div className="rounded-lg bg-muted/50 p-3 border-l-2 border-l-amber-500">
                    <p className="text-sm font-medium mb-1">Reacción documentada:</p>
                    <p className="text-sm text-muted-foreground">{alergia.reaction}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Advertencia de seguridad */}
      {hasAlergias && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Información de Seguridad Clínica
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  Verifique estas alergias antes de prescribir medicamentos o realizar procedimientos que puedan
                  desencadenar reacciones alérgicas. En caso de duda, consulte la ficha completa del paciente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

