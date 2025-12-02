// src/app/api/pacientes/[id]/plan-tratamiento/_dto.ts
import type { DienteSuperficie, TreatmentStepStatus } from "@prisma/client"
import type { PlanTratamientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

export interface CreatePlanBody {
  titulo: string
  descripcion?: string | null
  steps: Array<{
    order: number
    procedureId?: number | null
    serviceType?: string | null
    toothNumber?: number | null
    toothSurface?: DienteSuperficie | null
    estimatedDurationMin?: number | null
    estimatedCostCents?: number | null
    priority?: number | null
    notes?: string | null
    requiresMultipleSessions?: boolean
    totalSessions?: number | null
    currentSession?: number | null
  }>
}

export interface UpdatePlanBody {
  titulo?: string
  descripcion?: string | null
  steps?: Array<{
    id?: number // if updating existing step
    order: number
    procedureId?: number | null
    serviceType?: string | null
    toothNumber?: number | null
    toothSurface?: DienteSuperficie | null
    estimatedDurationMin?: number | null
    estimatedCostCents?: number | null
    priority?: number | null
    notes?: string | null
    requiresMultipleSessions?: boolean
    totalSessions?: number | null
    currentSession?: number | null
  }>
}

export interface UpdateStepStatusBody {
  status: TreatmentStepStatus
}

export type PlanResponse = PlanTratamientoDTO

