// Component for displaying anamnesis status badge

"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle, FileText } from "lucide-react"
import type { AnamnesisStatus } from "@/types/anamnesis-outside-consultation"

interface AnamnesisStatusBadgeProps {
  status: AnamnesisStatus
  className?: string
}

export function AnamnesisStatusBadge({ status, className }: AnamnesisStatusBadgeProps) {
  const statusConfig = {
    VALID: {
      label: "Válida",
      variant: "default" as const,
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    },
    EXPIRED: {
      label: "Expirada",
      variant: "secondary" as const,
      icon: Clock,
      className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    },
    PENDING_REVIEW: {
      label: "Pendiente de Revisión",
      variant: "destructive" as const,
      icon: AlertCircle,
      className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 animate-pulse",
    },
    NO_ANAMNESIS: {
      label: "Sin Anamnesis",
      variant: "outline" as const,
      icon: FileText,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={`gap-1.5 ${config.className} ${className || ""}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs">{config.label}</span>
    </Badge>
  )
}

