// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/OutsideConsultationBanner.tsx
// Prominent warning banner indicating editing outside consultation context

"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AlertTriangle, Info, FileWarning, Clock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface OutsideConsultationBannerProps {
  /** Variant of the banner - default shows full info, compact is smaller */
  variant?: "default" | "compact"
  /** Whether changes include critical fields (allergies/medications) */
  hasCriticalChanges?: boolean
  /** Name of the user making the edit */
  userName?: string
  /** Additional class names */
  className?: string
}

export function OutsideConsultationBanner({
  variant = "default",
  hasCriticalChanges = false,
  userName,
  className,
}: OutsideConsultationBannerProps) {
  const currentDate = format(new Date(), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2 rounded-lg",
          "bg-amber-50 border border-amber-200",
          "dark:bg-amber-950/50 dark:border-amber-800",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Edición fuera de consulta
          </span>
          {hasCriticalChanges && (
            <Badge variant="destructive" className="text-xs">
              Cambios críticos
            </Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm">
                Los cambios realizados fuera de una consulta activa se registran
                en el historial de auditoría y pueden requerir revisión posterior.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <Alert
      className={cn(
        "border-2",
        hasCriticalChanges
          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
        className
      )}
    >
      <FileWarning
        className={cn(
          "h-5 w-5",
          hasCriticalChanges
            ? "text-red-600 dark:text-red-400"
            : "text-amber-600 dark:text-amber-400"
        )}
      />
      <AlertTitle
        className={cn(
          "text-base font-semibold",
          hasCriticalChanges
            ? "text-red-900 dark:text-red-100"
            : "text-amber-900 dark:text-amber-100"
        )}
      >
        <div className="flex items-center gap-2">
          Edición de Anamnesis Fuera de Consulta
          {hasCriticalChanges && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Cambios Críticos
            </Badge>
          )}
        </div>
      </AlertTitle>
      <AlertDescription>
        <div
          className={cn(
            "space-y-3 text-sm",
            hasCriticalChanges
              ? "text-red-800 dark:text-red-200"
              : "text-amber-800 dark:text-amber-200"
          )}
        >
          <p>
            Está editando la anamnesis del paciente fuera de una consulta activa.
            Tenga en cuenta lo siguiente:
          </p>

          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>Todos los cambios quedarán registrados en el historial de auditoría</li>
            <li>Se le pedirá indicar la razón y fuente de la información</li>
            <li>
              {hasCriticalChanges
                ? "Los cambios en alergias y medicaciones requieren justificación obligatoria"
                : "Cambios en campos críticos (alergias, medicaciones) requerirán justificación"}
            </li>
            <li>El odontólogo revisará los cambios críticos en la próxima consulta</li>
          </ul>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs opacity-80">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{currentDate}</span>
            </div>
            {userName && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{userName}</span>
              </div>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

