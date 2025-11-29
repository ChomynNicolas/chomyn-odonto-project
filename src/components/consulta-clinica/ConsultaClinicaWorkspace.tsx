"use client"

import { useState, useCallback, useMemo } from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useConsulta } from "./hooks/useConsulta"
import { useConsultaPermissions } from "./hooks/useConsultaPermissions"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { MobileBottomNav } from "./MobileBottomNav"
import { ResumenDialog } from "./ResumenDialog"
import { SafetyAlertsBar } from "./SafetyAlertsBar"
import { SkipLinks } from "./SkipLinks"
import { WorkspaceContent } from "./WorkspaceContent"
import { WorkspaceFooter } from "./WorkspaceFooter"
import { WorkspaceHeader } from "./WorkspaceHeader"
import { WorkspaceSidebar } from "./WorkspaceSidebar"
import { useAnamnesisContext } from "./modules/anamnesis/hooks/useAnamnesisContext"

export type ConsultaStatus = "NOT_STARTED" | "DRAFT" | "FINAL"
export type ModuleId =
  | "anamnesis"
  | "odontograma"
  | "diagnosticos"
  | "procedimientos"
  | "medicacion"
  | "plan-tratamiento"
  | "adjuntos"

export interface ConsultaClinicaWorkspaceProps {
  citaId: number
  userRole: "ADMIN" | "ODONT" | "RECEP"
}

export function ConsultaClinicaWorkspace({ citaId, userRole }: ConsultaClinicaWorkspaceProps) {
  const [activeModule, setActiveModule] = useState<ModuleId>("anamnesis")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isResumenDialogOpen, setIsResumenDialogOpen] = useState(false)
  const [resumenForm, setResumenForm] = useState({ diagnosis: "", clinicalNotes: "" })
  const [isSavingResumen, setIsSavingResumen] = useState(false)
  const isMobile = useIsMobile()

  const { canEdit, canView } = useConsultaPermissions(userRole, null)
  const { consulta, isLoading, refetch: fetchConsulta } = useConsulta(citaId, canView, canEdit)
  const { isFinalized, hasConsulta, canEditModules, canViewResumen } = useConsultaPermissions(userRole, consulta)

  // Hook para anamnesis context
  const {
    anamnesis,
    context: anamnesisContext,
    isLoading: isLoadingAnamnesis,
    refetch: refetchAnamnesis,
  } = useAnamnesisContext(consulta?.pacienteId)

  // Module counts for badges - derived from real data
  const moduleCounts = useMemo(
    () => ({
      diagnosticos: consulta?.diagnosticos?.filter((d) => d.status === "ACTIVE").length || 0,
      procedimientos: consulta?.procedimientos?.length || 0,
      medicacion: consulta?.medicaciones?.filter((m) => m.isActive).length || 0,
      adjuntos: consulta?.adjuntos?.length || 0,
    }),
    [consulta],
  )

  // Module completion status - derived from real data
  const moduleStatus = useMemo(
    () => ({
      anamnesis: anamnesis ? ("complete" as const) : ("empty" as const),
      odontograma: "empty" as const, // Odontograma status would need separate check
      diagnosticos: moduleCounts.diagnosticos > 0 ? ("complete" as const) : ("empty" as const),
      procedimientos: moduleCounts.procedimientos > 0 ? ("complete" as const) : ("empty" as const),
      medicacion: moduleCounts.medicacion > 0 ? ("complete" as const) : ("empty" as const),
      "plan-tratamiento": consulta?.planTratamiento ? ("complete" as const) : ("empty" as const),
      adjuntos: moduleCounts.adjuntos > 0 ? ("complete" as const) : ("empty" as const),
    }),
    [moduleCounts, anamnesis, consulta?.planTratamiento],
  )

  const handleModuleChange = useCallback(
    (moduleId: ModuleId) => {
      setActiveModule(moduleId)
      if (isMobile) {
        setIsSidebarCollapsed(true)
      }
    },
    [isMobile],
  )

  const handleIniciarConsulta = useCallback(async () => {
    if (!consulta) return

    try {
      setIsActionLoading(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
        method: "POST",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al iniciar consulta")
      }
      toast.success("Consulta iniciada correctamente")
      await fetchConsulta()
    } catch (error) {
      console.error("[ConsultaClinicaWorkspace] Error iniciando consulta:", error)
      toast.error(error instanceof Error ? error.message : "Error al iniciar consulta")
    } finally {
      setIsActionLoading(false)
    }
  }, [citaId, consulta, fetchConsulta])

  const handleFinalizarConsulta = useCallback(async () => {
    if (!consulta) return

    // Validate anamnesis if required
    try {
      const configRes = await fetch("/api/anamnesis/config")
      const configData = await configRes.json()
      const mandatoryFirstConsultation = configData.data?.[0]?.value?.MANDATORY_FIRST_CONSULTATION === true

      if (mandatoryFirstConsultation && !anamnesis) {
        toast.error(
          "No se puede finalizar la consulta sin completar la anamnesis. Complete la anamnesis en la pestaña correspondiente.",
        )
        return
      }
    } catch (err) {
      console.error("[ConsultaClinicaWorkspace] Error verificando configuración de anamnesis:", err)
    }

    try {
      setIsActionLoading(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FINAL",
          finishedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al finalizar consulta")
      }
      toast.success("Consulta finalizada correctamente")
      await fetchConsulta()
    } catch (error) {
      console.error("[ConsultaClinicaWorkspace] Error finalizando consulta:", error)
      toast.error(error instanceof Error ? error.message : "Error al finalizar consulta")
    } finally {
      setIsActionLoading(false)
    }
  }, [citaId, consulta, anamnesis, fetchConsulta])

  const handleEditarResumen = useCallback(() => {
    if (!consulta) return
    setResumenForm({
      diagnosis: consulta.diagnosis ?? "",
      clinicalNotes: consulta.clinicalNotes ?? "",
    })
    setIsResumenDialogOpen(true)
  }, [consulta])

  const handleSaveResumen = useCallback(async () => {
    if (!consulta) return
    try {
      setIsSavingResumen(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: resumenForm.diagnosis.trim() || null,
          clinicalNotes: resumenForm.clinicalNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar resumen")
      }
      toast.success("Resumen de consulta actualizado correctamente")
      setIsResumenDialogOpen(false)
      await fetchConsulta()
    } catch (error) {
      console.error("[ConsultaClinicaWorkspace] Error guardando resumen:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar resumen")
    } finally {
      setIsSavingResumen(false)
    }
  }, [citaId, consulta, resumenForm, fetchConsulta])

  const handleSave = useCallback(() => {
    // Auto-save is handled by individual modules
    console.log("[ConsultaClinicaWorkspace] Auto-save triggered")
  }, [])

  useKeyboardShortcuts({
    onModuleChange: handleModuleChange,
    onSave: handleSave,
    onFinalize: handleFinalizarConsulta,
    isEnabled: canEdit && !isFinalized,
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="p-4 border-b">
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex flex-1">
          <div className="hidden lg:block w-64 border-r p-4">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // No consulta found
  if (!consulta) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No se pudo cargar la información de la consulta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <SkipLinks />

      {/* ZONA A: Alertas de Seguridad - Sticky top */}
      <SafetyAlertsBar alergias={consulta.alergias} medicaciones={consulta.medicaciones} />

      {/* ZONA A: Header con contexto del paciente */}
      <WorkspaceHeader
        paciente={consulta.paciente}
        status={consulta.status}
        createdAt={consulta.createdAt}
        finishedAt={consulta.finishedAt}
      />

      {/* Layout principal: Sidebar + Contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* ZONA B: Sidebar de navegación - Hidden on mobile */}
        <div className="hidden lg:block">
          <WorkspaceSidebar
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            moduleCounts={moduleCounts}
            moduleStatus={moduleStatus}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            canEdit={canEdit}
            isFinalized={isFinalized}
          />
        </div>

        {/* ZONA C: Área de trabajo principal */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <WorkspaceContent
            activeModule={activeModule}
            citaId={citaId}
            consulta={consulta}
            canEdit={canEditModules}
            hasConsulta={hasConsulta}
            isFinalized={isFinalized}
            userRole={userRole}
            anamnesis={anamnesis}
            anamnesisContext={anamnesisContext}
            isLoadingAnamnesis={isLoadingAnamnesis}
            onUpdate={fetchConsulta}
            onAnamnesisUpdate={() => {
              fetchConsulta()
              refetchAnamnesis()
            }}
          />

          {/* ZONA D: Acciones globales - Desktop */}
          <div className="hidden lg:block">
            <WorkspaceFooter
              hasConsulta={hasConsulta}
              isFinalized={isFinalized}
              canEdit={canEdit}
              isLoading={isActionLoading}
              onIniciar={handleIniciarConsulta}
              onFinalizar={handleFinalizarConsulta}
              onEditarResumen={handleEditarResumen}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        moduleCounts={moduleCounts}
        canEdit={canEdit}
      />

      {/* Mobile footer actions */}
      {isMobile && canEdit && !isFinalized && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40">
          <WorkspaceFooter
            hasConsulta={hasConsulta}
            isFinalized={isFinalized}
            canEdit={canEdit}
            isLoading={isActionLoading}
            onIniciar={handleIniciarConsulta}
            onFinalizar={handleFinalizarConsulta}
            onEditarResumen={handleEditarResumen}
          />
        </div>
      )}

      {/* Dialog para editar resumen */}
      <ResumenDialog
        open={isResumenDialogOpen}
        onOpenChange={setIsResumenDialogOpen}
        diagnosis={resumenForm.diagnosis}
        clinicalNotes={resumenForm.clinicalNotes}
        onDiagnosisChange={(value) => setResumenForm((prev) => ({ ...prev, diagnosis: value }))}
        onClinicalNotesChange={(value) => setResumenForm((prev) => ({ ...prev, clinicalNotes: value }))}
        onSave={handleSaveResumen}
        isSaving={isSavingResumen}
        isFinalized={isFinalized}
      />
    </div>
  )
}
