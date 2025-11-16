import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import type { FieldErrors } from "react-hook-form"

interface Step {
  id: number
  name: string
  required: boolean
}

interface WizardHeaderProps {
  currentStep: number
  steps: readonly Step[]
  errors?: FieldErrors // Opcional por ahora, se usará cuando se implemente el mapeo de errores
}

export function WizardHeader({ currentStep, steps }: WizardHeaderProps) {
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return "completed"
    if (stepId === currentStep) return "current"
    return "pending"
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nuevo Paciente</h1>
        <p className="text-sm text-muted-foreground">Complete los datos para registrar al paciente</p>
      </div>

      <nav aria-label="Progreso del formulario">
        <ol role="list" className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id)
            // TODO: Mapear errores por paso usando errors prop cuando se implemente
            // Por ahora siempre retornamos 0, pero la estructura está lista para cuando se implemente
            const errorCount = 0 as number

            return (
              <li key={step.id} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                      status === "completed" && "border-primary bg-primary text-primary-foreground",
                      status === "current" && "border-primary bg-background text-primary animate-pulse",
                      status === "pending" && "border-muted bg-background text-muted-foreground",
                      errorCount > 0 && "border-destructive text-destructive",
                    )}
                    aria-current={status === "current" ? "step" : undefined}
                  >
                    {status === "completed" ? <Check className="h-5 w-5" /> : <span>{step.id}</span>}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-medium text-foreground">
                      {step.name}
                      {step.required && <span className="ml-1 text-destructive">*</span>}
                    </div>
                    {/* TODO: Mostrar errores cuando se implemente el mapeo de errores por paso */}
                    {errorCount > 0 && (
                      <div className="text-xs text-destructive">
                        {errorCount} {errorCount === 1 ? "error" : "errores"}
                      </div>
                    )}
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-8 md:w-16 transition-colors",
                      status === "completed" ? "bg-primary" : "bg-muted",
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
