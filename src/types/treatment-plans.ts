// Type definitions for treatment plans with multi-session support

export type TreatmentStepStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DEFERRED'

export type TreatmentPlanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface TreatmentStepSessionInfo {
  completedSessions: number
  totalSessions: number
  isCompleted: boolean
  currentSession: number | null
}

export interface TreatmentPlanStep {
  id: number
  order: number
  procedure: string
  toothNumber: number | null
  surface: string | null
  status: TreatmentStepStatus
  estimatedCostCents: number | null
  notes: string | null
  executedCount: number
  // Multi-session fields
  requiresMultipleSessions: boolean
  totalSessions: number | null
  currentSession: number | null
  completedAt: string | null
  // Session progress (derived)
  sessionProgress?: TreatmentStepSessionInfo
}

export interface TreatmentPlanProgress {
  total: number
  completed: number
  inProgress: number
  pending: number
  // Session-aware metrics
  completedSessions?: number
  totalSessions?: number
}

export interface TreatmentPlan {
  id: number
  titulo: string
  descripcion: string | null
  status: TreatmentPlanStatus
  createdAt: string
  createdBy: string
  steps: TreatmentPlanStep[]
  progress: TreatmentPlanProgress
}

export interface TreatmentPlansResponse {
  plans: TreatmentPlan[]
}

