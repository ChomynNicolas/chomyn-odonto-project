// src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  FileText,
  Stethoscope,
  Pill,
  Image,
  Activity,
  ClipboardList,
  Save,
  AlertCircle,
  AlertTriangle,
} from "lucide-react"
import { AnamnesisModule } from "./modules/AnamnesisModule"
import { DiagnosticosModule } from "./modules/DiagnosticosModule"
import { ProcedimientosModule } from "./modules/ProcedimientosModule"
import { MedicacionesModule } from "./modules/MedicacionesModule"
import { AdjuntosModule } from "./modules/AdjuntosModule"
import { OdontogramaModule } from "./modules/OdontogramaModule"
import { PeriodontogramaModule } from "./modules/PeriodontogramaModule"
import { VitalesModule } from "./modules/VitalesModule"
import { AlergiasModule } from "./modules/AlergiasModule"
import { CitaStatusBadge } from "./CitaStatusBadge"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface ConsultaClinicaWorkspaceProps {
  citaId: number
  userRole: "ADMIN" | "ODONT" | "RECEP"
}

export function ConsultaClinicaWorkspace({ citaId, userRole }: ConsultaClinicaWorkspaceProps) {
  const [consulta, setConsulta] = useState<ConsultaClinicaDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("anamnesis")

  const canEdit = userRole === "ADMIN" || userRole === "ODONT"
  const canView = canEdit || userRole === "RECEP"

  const fetchConsulta = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`)
      if (!res.ok) {
        const error = await res.json()
        // Si es 404 y tenemos permisos de edición, intentar crear la consulta
        if (res.status === 404 && canEdit) {
          const createRes = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
            method: "POST",
          })
          if (createRes.ok) {
            // Recargar después de crear
            await fetchConsulta()
            return
          }
        }
        throw new Error(error.error || "Error al cargar consulta")
      }
      const data = await res.json()
      if (data.ok) {
        // El endpoint ahora siempre retorna datos (incluso si no existe consulta, retorna estructura inicial)
        setConsulta(data.data)
      }
    } catch (error) {
      console.error("Error fetching consulta:", error)
      toast.error(error instanceof Error ? error.message : "Error al cargar consulta")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (canView) {
      fetchConsulta()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citaId, canView])

  const handleFinalize = async () => {
    if (!consulta) return
    try {
      setIsSaving(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FINAL",
          finishedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error("Error al finalizar consulta")
      toast.success("Consulta finalizada correctamente")
      await fetchConsulta()
    } catch (error) {
      console.error("Error finalizing consulta:", error)
      toast.error("Error al finalizar consulta")
    } finally {
      setIsSaving(false)
    }
  }

  if (!canView) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>No tiene permisos para ver esta consulta clínica.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <ConsultaClinicaSkeleton />
  }

  if (!consulta) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No se pudo cargar la consulta.</p>
            <Button onClick={fetchConsulta} className="mt-4" variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isFinalized = consulta.status === "FINAL"
  const hasConsulta = consulta.createdAt !== null // Si createdAt es null, la consulta no existe aún
  // Solo permitir edición si el usuario tiene permisos Y la consulta no está finalizada
  // ✅ MEJORADO: Validación más explícita - solo verificar estado, no hasConsulta
  const canEditModules = canEdit && consulta.status !== "FINAL"

  // Debug: verificar datos recibidos
  console.log("[ConsultaClinicaWorkspace] Debug consulta:", {
    citaId,
    userRole,
    consulta,
    hasConsulta,
    canEdit,
    canEditModules,
    isFinalized,
    status: consulta.status,
    createdAt: consulta.createdAt,
    anamnesis: consulta?.anamnesis?.length || 0,
    diagnosticos: consulta?.diagnosticos?.length || 0,
    procedimientos: consulta?.procedimientos?.length || 0,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Consulta Clínica
              </CardTitle>
              <CardDescription className="mt-1">
                {consulta.performedBy?.nombre && `Profesional: ${consulta.performedBy.nombre}`}
                {consulta.createdAt && ` • Creada: ${new Date(consulta.createdAt).toLocaleString()}`}
                {consulta.citaEstado && (
                  <span className="ml-2">
                    <CitaStatusBadge estado={consulta.citaEstado} />
                  </span>
                )}
                {!hasConsulta && canEdit && (
                  <span className="text-amber-600 dark:text-amber-400"> • Consulta no iniciada</span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isFinalized ? "default" : "secondary"}>
                {isFinalized ? "Finalizada" : hasConsulta ? "Borrador" : "No iniciada"}
              </Badge>
              {canEdit && !isFinalized && hasConsulta && (
                <Button onClick={handleFinalize} disabled={isSaving} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Finalizar Consulta
                </Button>
              )}
              {canEdit && !hasConsulta && (
                <Button
                  onClick={async () => {
                    try {
                      setIsSaving(true)
                      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
                        method: "POST",
                      })
                      if (!res.ok) throw new Error("Error al crear consulta")
                      toast.success("Consulta iniciada")
                      await fetchConsulta()
                    } catch (error) {
                      console.error("Error creating consulta:", error)
                      toast.error("Error al iniciar consulta")
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  size="sm"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Iniciar Consulta
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs con módulos */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
              <TabsTrigger value="anamnesis" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Anamnesis</span>
              </TabsTrigger>
              <TabsTrigger value="diagnosticos" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Diagnósticos</span>
              </TabsTrigger>
              <TabsTrigger value="procedimientos" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Procedimientos</span>
              </TabsTrigger>
              <TabsTrigger value="medicaciones" className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline">Indicaciones</span>
              </TabsTrigger>
              <TabsTrigger value="alergias" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Alergias</span>
              </TabsTrigger>
              <TabsTrigger value="vitales" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Vitales</span>
              </TabsTrigger>
              <TabsTrigger value="adjuntos" className="flex items-center gap-2">
                <Image className="h-4 w-4" aria-label="Adjuntos" />
                <span className="hidden sm:inline">Adjuntos</span>
              </TabsTrigger>
              <TabsTrigger value="odontograma" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Odontograma</span>
              </TabsTrigger>
              <TabsTrigger value="periodontograma" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Periodontograma</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="anamnesis" className="mt-6">
              <AnamnesisModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="diagnosticos" className="mt-6">
              <DiagnosticosModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="procedimientos" className="mt-6">
              <ProcedimientosModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="medicaciones" className="mt-6">
              <MedicacionesModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="alergias" className="mt-6">
              <AlergiasModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="vitales" className="mt-6">
              <VitalesModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="adjuntos" className="mt-6">
              <AdjuntosModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="odontograma" className="mt-6">
              <OdontogramaModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="periodontograma" className="mt-6">
              <PeriodontogramaModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function ConsultaClinicaSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-10 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

