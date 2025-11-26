"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { History, Clock, User, ChevronRight, AlertCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"
interface AnamnesisVersion {
  id: number
  versionNumber: number
  createdAt: string
  createdBy: {
    id: number
    nombre: string
  }
  consultaId: number | null
  consulta: {
    citaId: number
    diagnosis: string | null
  } | null
  motivoCambio: string | null
  reason: string | null
  restoredFromVersionId: number | null
  changeSummary: Record<string, unknown> | null
  tipo: "ADULTO" | "PEDIATRICO"
  motivoConsulta: string | null
  tieneDolorActual: boolean
  dolorIntensidad: number | null
  urgenciaPercibida: string | null
}

interface AnamnesisHistoryViewProps {
  patientId: number
  currentAnamnesis?: unknown
}

export function AnamnesisHistoryView({ patientId }: AnamnesisHistoryViewProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)

  const {
    data: versionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["patient", "anamnesis", "versions", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}/anamnesis/versions`)
      if (!res.ok) {
        throw new Error("Error al cargar historial")
      }
      const response = await res.json()
      return response as { data: AnamnesisVersion[]; pagination: unknown }
    },
    enabled: !!patientId,
  })

  const versions = versionsData?.data || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar historial: {(error as Error).message}</AlertDescription>
      </Alert>
    )
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Anamnesis
          </CardTitle>
          <CardDescription>No hay versiones previas disponibles</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Anamnesis
          </CardTitle>
          <CardDescription>
            {versions.length} versión{versions.length > 1 ? "es" : ""} disponible{versions.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div key={version.id} className="relative">
                {/* Timeline connector */}
                {index < versions.length - 1 && <div className="absolute left-[19px] top-12 bottom-0 w-px bg-border" />}

                <div
                  className={`
                    relative flex items-start gap-4 p-4 rounded-lg border transition-colors
                    ${selectedVersion === version.id ? "bg-primary/5 border-primary" : "bg-muted/30 hover:bg-muted/50"}
                    cursor-pointer
                  `}
                  onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
                >
                  {/* Timeline dot */}
                  <div className="shrink-0 mt-1">
                    <div
                      className={`
                      h-10 w-10 rounded-full flex items-center justify-center
                      ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                    `}
                    >
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Versión {version.versionNumber}</h3>
                        {index === 0 && <Badge>Actual</Badge>}
                        {version.restoredFromVersionId && (
                          <Badge variant="secondary" className="text-xs">
                            Restaurada
                          </Badge>
                        )}
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 transition-transform ${selectedVersion === version.id ? "rotate-90" : ""}`}
                      />
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(new Date(version.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{version.createdBy.nombre}</span>
                      </div>
                      {version.reason && <p className="mt-2 text-xs italic">{version.reason}</p>}
                      {version.changeSummary && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Resumen: {JSON.stringify(version.changeSummary)}
                        </p>
                      )}
                    </div>

                    {/* Expanded content */}
                    {selectedVersion === version.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium">Dolor actual:</span>{" "}
                            {version.tieneDolorActual ? "Sí" : "No"}
                          </div>
                          <div>
                            <span className="font-medium">Urgencia:</span>{" "}
                            {version.urgenciaPercibida || "No especificada"}
                          </div>
                          <div>
                            <span className="font-medium">Tipo:</span> {version.tipo}
                          </div>
                          {version.dolorIntensidad !== null && (
                            <div>
                              <span className="font-medium">Intensidad dolor:</span> {version.dolorIntensidad}/10
                            </div>
                          )}
                        </div>
                        {version.motivoConsulta && (
                          <div className="text-sm">
                            <span className="font-medium">Motivo:</span>{" "}
                            <span className="text-muted-foreground">{version.motivoConsulta}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
