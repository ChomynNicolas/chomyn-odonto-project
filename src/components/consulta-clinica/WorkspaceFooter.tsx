"use client"

import { Stethoscope, Edit, CheckCircle2, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WorkspaceFooterProps {
  hasConsulta: boolean
  isFinalized: boolean
  canEdit: boolean
  isLoading: boolean
  onIniciar: () => void
  onFinalizar: () => void
  onEditarResumen: () => void
}

export function WorkspaceFooter({
  hasConsulta,
  isFinalized,
  canEdit,
  isLoading,
  onIniciar,
  onFinalizar,
  onEditarResumen,
}: WorkspaceFooterProps) {
  // Don't show footer if user can't edit or consultation is finalized
  if (!canEdit || isFinalized) {
    return null
  }

  return (
    <footer className="bg-card border-t px-4 py-3 flex items-center justify-between gap-4">
      {/* Left side - Status info */}
      <div className="text-sm text-muted-foreground hidden sm:block">
        {hasConsulta ? (
          <span className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Guardado automático activado
          </span>
        ) : (
          <span>Inicia la consulta para comenzar</span>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-3 ml-auto">
        {!hasConsulta ? (
          // Start consultation button
          <Button onClick={onIniciar} disabled={isLoading} size="lg" className="gap-2" aria-label="Iniciar consulta">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Stethoscope className="h-4 w-4" />
                Iniciar Consulta
              </>
            )}
          </Button>
        ) : (
          // Edit and finalize buttons
          <>
            <Button
              onClick={onEditarResumen}
              disabled={isLoading}
              variant="outline"
              className="gap-2 bg-transparent"
              aria-label="Editar resumen clínico"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Editar Resumen</span>
              <span className="sm:hidden">Resumen</span>
            </Button>

            <Button
              onClick={onFinalizar}
              disabled={isLoading}
              className={cn("gap-2", "bg-emerald-600 hover:bg-emerald-700 text-white")}
              aria-label="Finalizar consulta"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Finalizar Consulta</span>
                  <span className="sm:hidden">Finalizar</span>
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </footer>
  )
}
