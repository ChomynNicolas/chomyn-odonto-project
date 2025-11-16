// src/components/consulta-clinica/CitaStatusBadge.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EstadoCita } from "@prisma/client"

interface CitaStatusBadgeProps {
  estado: EstadoCita
  className?: string
}

/**
 * Componente para mostrar el estado de la cita con colores y iconos consistentes
 * con el sistema de agenda
 */
export function CitaStatusBadge({ estado, className }: CitaStatusBadgeProps) {
  const estadoConfig = getEstadoConfig(estado)

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-0 font-semibold shadow-sm px-2 py-0.5 text-xs",
        estadoConfig.className,
        className
      )}
    >
      {estadoConfig.icon && <span className="mr-1 text-xs">{estadoConfig.icon}</span>}
      {estadoConfig.label}
    </Badge>
  )
}

function getEstadoConfig(estado: EstadoCita): {
  label: string
  className: string
  icon?: string
} {
  switch (estado) {
    case "SCHEDULED":
      return {
        label: "Agendada",
        className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        icon: "○",
      }
    case "CONFIRMED":
      return {
        label: "Confirmada",
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        icon: "✓",
      }
    case "CHECKED_IN":
      return {
        label: "Check-in",
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        icon: "◐",
      }
    case "IN_PROGRESS":
      return {
        label: "En curso",
        className: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
        icon: "●",
      }
    case "COMPLETED":
      return {
        label: "Completada",
        className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
        icon: "✓✓",
      }
    case "CANCELLED":
      return {
        label: "Cancelada",
        className: "bg-red-500/15 text-red-600 dark:text-red-400",
        icon: "✕",
      }
    case "NO_SHOW":
      return {
        label: "No asistió",
        className: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        icon: "⊘",
      }
    default:
      return {
        label: String(estado),
        className: "bg-muted text-foreground/70",
      }
  }
}

