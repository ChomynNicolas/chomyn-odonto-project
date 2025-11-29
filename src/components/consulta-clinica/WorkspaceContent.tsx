"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, Activity, ClipboardList, Pill, ImageIcon } from "lucide-react"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

import { DiagnosticosModule } from "./modules/DiagnosticosModule"
import { ProcedimientosModule } from "./modules/ProcedimientosModule"
import { MedicacionModule } from "./modules/MedicacionModule"
import { PlanesTratamientoModule } from "./modules/PlanesTratamientoModule"
import { AdjuntosModule } from "./modules/AdjuntosModule"
import { AnamnesisFormSkeleton } from "./modules/anamnesis/components/AnamnesisFormSkeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { AnamnesisResponse } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { AnamnesisContext } from "@/lib/services/anamnesis-context.service"
import { ModuleId } from "./ConsultaClinicaWorkspace"
import { OdontogramaModule } from "./modules/OdontogramaModule"
import { AnamnesisForm } from "./modules/anamnesis/AnamnesisForm"

interface WorkspaceContentProps {
  activeModule: ModuleId
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta: boolean
  isFinalized: boolean
  userRole: "ADMIN" | "ODONT" | "RECEP"
  anamnesis: AnamnesisResponse | null
  anamnesisContext: AnamnesisContext | null
  isLoadingAnamnesis: boolean
  onUpdate: () => void
  onAnamnesisUpdate: () => void
}

// Module configurations for header display
const moduleConfig: Record<
  ModuleId,
  {
    title: string
    description: string
    icon: typeof FileText
  }
> = {
  anamnesis: {
    title: "Anamnesis",
    description: "Historia clínica y antecedentes del paciente",
    icon: FileText,
  },
  odontograma: {
    title: "Odontograma",
    description: "Diagrama dental interactivo",
    icon: Activity,
  },
  diagnosticos: {
    title: "Diagnósticos",
    description: "Diagnósticos clínicos del paciente",
    icon: ClipboardList,
  },
  procedimientos: {
    title: "Procedimientos",
    description: "Procedimientos realizados durante la consulta",
    icon: Activity,
  },
  "plan-tratamiento": {
    title: "Plan de Tratamiento",
    description: "Planificación de tratamientos futuros",
    icon: ClipboardList,
  },
  medicacion: {
    title: "Medicación",
    description: "Medicamentos prescritos y activos",
    icon: Pill,
  },
  adjuntos: {
    title: "Adjuntos",
    description: "Imágenes, radiografías y documentos",
    icon: ImageIcon,
  },
}

export function WorkspaceContent({
  activeModule,
  citaId,
  consulta,
  canEdit,
  hasConsulta,
  isFinalized,
  userRole,
  anamnesis,
  anamnesisContext,
  isLoadingAnamnesis,
  onUpdate,
  onAnamnesisUpdate,
}: WorkspaceContentProps) {
  const config = moduleConfig[activeModule]
  const Icon = config.icon

  const renderModuleContent = () => {
    // Show alert if consulta not started
    if (!hasConsulta && activeModule !== "anamnesis") {
      return (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Inicia la consulta para comenzar a registrar información en este módulo.</AlertDescription>
        </Alert>
      )
    }

    switch (activeModule) {
      case "anamnesis":
        if (!consulta.pacienteId) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              <p>Cargando información del paciente...</p>
            </div>
          )
        }
        if (isLoadingAnamnesis) {
          return <AnamnesisFormSkeleton />
        }
        return (
          <AnamnesisForm
            pacienteId={consulta.pacienteId}
            consultaId={consulta.citaId}
            initialData={anamnesis}
            onSave={onAnamnesisUpdate}
            anamnesisContext={anamnesisContext}
            canEdit={canEdit}
            patientGender={consulta.paciente?.genero}
            patientBirthDate={consulta.paciente?.fechaNacimiento}
            isLoadingAnamnesis={isLoadingAnamnesis}
          />
        )

      case "odontograma":
        return (
          <OdontogramaModule
            citaId={citaId}
            consulta={consulta}
            canEdit={canEdit}
            hasConsulta={hasConsulta}
            onUpdate={onUpdate}
          />
        )

      case "diagnosticos":
        return (
          <DiagnosticosModule
            citaId={citaId}
            consulta={consulta}
            canEdit={canEdit}
            hasConsulta={hasConsulta}
            onUpdate={onUpdate}
          />
        )

      case "procedimientos":
        return (
          <ProcedimientosModule
            citaId={citaId}
            consulta={consulta}
            canEdit={canEdit}
            hasConsulta={hasConsulta}
            onUpdate={onUpdate}
            userRole={userRole}
          />
        )

      case "medicacion":
        return (
          <MedicacionModule
            citaId={citaId}
            consulta={consulta}
            canEdit={canEdit}
            hasConsulta={hasConsulta}
            onUpdate={onUpdate}
          />
        )

      case "plan-tratamiento":
        return (
          <PlanesTratamientoModule
            citaId={citaId}
            consulta={consulta}
            canEdit={canEdit}
            hasConsulta={hasConsulta}
            onUpdate={onUpdate}
            isFinalized={isFinalized}
          />
        )

      case "adjuntos":
        return (
          <AdjuntosModule
            citaId={citaId}
            consulta={consulta}
            canEdit={canEdit}
            hasConsulta={hasConsulta}
            onUpdate={onUpdate}
          />
        )

      default:
        return null
    }
  }

  return (
    <main
      className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6"
      id="workspace-content"
      role="main"
      aria-label={`Módulo: ${config.title}`}
    >
      {activeModule === "anamnesis" ? (
        // Anamnesis has its own full layout
        renderModuleContent()
      ) : (
        <Card className="h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center" aria-hidden="true">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderModuleContent()}</CardContent>
        </Card>
      )}
    </main>
  )
}
