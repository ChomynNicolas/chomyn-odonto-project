// src/components/pacientes/ficha/components/ClinicalAlertBadge.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Pill, Heart } from "lucide-react"

interface ClinicalAlertBadgeProps {
  type: "allergy" | "medication" | "diagnosis"
  severity?: "MILD" | "MODERATE" | "SEVERE"
  count?: number
  className?: string
}

export function ClinicalAlertBadge({ type, severity, count, className = "" }: ClinicalAlertBadgeProps) {
  const getVariant = () => {
    if (type === "allergy" && severity === "SEVERE") return "destructive"
    if (type === "allergy" && severity === "MODERATE") return "default"
    if (type === "medication") return "secondary"
    return "outline"
  }

  const getIcon = () => {
    switch (type) {
      case "allergy":
        return <AlertTriangle className="h-3 w-3 mr-1" />
      case "medication":
        return <Pill className="h-3 w-3 mr-1" />
      case "diagnosis":
        return <Heart className="h-3 w-3 mr-1" />
    }
  }

  const getLabel = () => {
    switch (type) {
      case "allergy":
        return severity === "SEVERE" ? "Alergia Severa" : "Alergia"
      case "medication":
        return count ? `${count} ${count === 1 ? "Medicamento" : "Medicamentos"}` : "Medicación"
      case "diagnosis":
        return count ? `${count} ${count === 1 ? "Diagnóstico" : "Diagnósticos"}` : "Diagnóstico"
    }
  }

  return (
    <Badge variant={getVariant()} className={`flex items-center gap-1 ${className}`}>
      {getIcon()}
      {getLabel()}
    </Badge>
  )
}

