"use client"

import { useState } from "react"
import { User, Calendar, Phone, Mail, MapPin, ChevronDown, ChevronUp, Clock, FileEdit, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Paciente {
  id: number
  nombre: string
  apellido: string
  fechaNacimiento: string
  genero: "M" | "F" | "O"
  telefono?: string
  email?: string
  direccion?: string
}

interface WorkspaceHeaderProps {
  paciente: Paciente
  status: "NOT_STARTED" | "DRAFT" | "FINAL"
  createdAt: string | null
  finishedAt: string | null
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getGenderLabel(gender: "M" | "F" | "O"): string {
  const labels = { M: "Masculino", F: "Femenino", O: "Otro" }
  return labels[gender] || gender
}

export function WorkspaceHeader({ paciente, status, createdAt, finishedAt }: WorkspaceHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const age = calculateAge(paciente.fechaNacimiento)
  const hasConsulta = createdAt !== null

  const statusConfig = {
    NOT_STARTED: {
      label: "No iniciada",
      icon: Clock,
      variant: "secondary" as const,
      className: "bg-muted text-muted-foreground",
    },
    DRAFT: {
      label: "Borrador",
      icon: FileEdit,
      variant: "secondary" as const,
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    },
    FINAL: {
      label: "Finalizada",
      icon: Lock,
      variant: "secondary" as const,
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    },
  }

  const currentStatus = !hasConsulta ? "NOT_STARTED" : status
  const StatusIcon = statusConfig[currentStatus].icon

  return (
    <header className="bg-card border-b sticky top-0 z-40">
      {/* Main Header Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Patient Avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>

          {/* Patient Basic Info */}
          <div>
            <h1 className="font-semibold text-lg leading-tight">
              {paciente.nombre} {paciente.apellido}
            </h1>
            <p className="text-sm text-muted-foreground">
              {age} años · {getGenderLabel(paciente.genero)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <Badge className={cn("gap-1.5", statusConfig[currentStatus].className)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig[currentStatus].label}
          </Badge>

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1 text-muted-foreground"
            aria-expanded={isExpanded}
            aria-controls="patient-details"
          >
            <span className="hidden sm:inline text-sm">{isExpanded ? "Menos" : "Más"}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          id="patient-details"
          className="px-4 pb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t pt-3 bg-muted/30"
        >
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Nacimiento:</span>
            <span>{new Date(paciente.fechaNacimiento).toLocaleDateString("es-ES")}</span>
          </div>

          {paciente.telefono && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tel:</span>
              <a href={`tel:${paciente.telefono}`} className="text-primary hover:underline">
                {paciente.telefono}
              </a>
            </div>
          )}

          {paciente.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <a href={`mailto:${paciente.email}`} className="text-primary hover:underline truncate">
                {paciente.email}
              </a>
            </div>
          )}

          {paciente.direccion && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Dir:</span>
              <span className="truncate">{paciente.direccion}</span>
            </div>
          )}

          {/* Consultation Timestamps */}
          {hasConsulta && (
            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-4 pt-2 border-t mt-2">
              {createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Iniciada:</span>
                  <span>
                    {new Date(createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {finishedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Finalizada:</span>
                  <span>
                    {new Date(finishedAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
