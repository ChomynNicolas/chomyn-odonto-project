"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

interface WizardFooterProps {
  currentStep: number
  totalSteps: number
  isSubmitting: boolean
  onPrevious: () => void
  onNext: () => void
  onSave: (intent: "continue" | "open") => void
  onCancel: () => void
}

export function WizardFooter({
  currentStep,
  totalSteps,
  isSubmitting,
  onPrevious,
  onNext,
  onSave,
  onCancel,
}: WizardFooterProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  return (
    <div className="sticky bottom-0 mt-8 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between gap-4 py-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button type="button" variant="outline" onClick={onPrevious} disabled={isSubmitting}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
          )}

          {!isLastStep && (
            <Button type="button" onClick={onNext} disabled={isSubmitting}>
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isSubmitting}>
                Guardar
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSave("continue")}>Guardar y Continuar Editando</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSave("open")}>Guardar y Abrir Ficha</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
