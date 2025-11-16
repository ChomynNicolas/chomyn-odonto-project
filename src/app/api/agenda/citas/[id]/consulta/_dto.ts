// src/app/api/agenda/citas/[id]/consulta/_dto.ts
import type {
  ConsultaEstado,
  DiagnosisStatus,
  ToothCondition,
  DienteSuperficie,
  PerioSite,
  PerioBleeding,
  AdjuntoTipo,
  AllergySeverity,
  TreatmentStepStatus,
} from "@prisma/client"

// ============================================================================
// CONSULTA COMPLETA DTO
// ============================================================================
export interface ConsultaClinicaDTO {
  citaId: number
  pacienteId?: number // ID del paciente para navegación
  status: ConsultaEstado
  startedAt: string | null
  finishedAt: string | null
  /** @deprecated Use PatientAnamnesis.motivoConsulta instead. This field always returns null. */
  reason: string | null
  diagnosis: string | null
  clinicalNotes: string | null
  performedBy: {
    id: number
    nombre: string
  } | null
  createdAt: string | null // null si la consulta no existe aún
  updatedAt: string | null
  
  // Estado de la cita (para sincronización)
  citaEstado?: import("@prisma/client").EstadoCita
  citaInicio?: string
  citaFin?: string

  // Información del paciente (para anamnesis)
  paciente?: {
    id: number
    nombres: string
    apellidos: string
    fechaNacimiento: string | null
    genero: import("@prisma/client").Genero | null
    direccion: string | null
    telefono: string | null
    edad?: number | null // Calculada desde fechaNacimiento
  }

  // Módulos
  anamnesis: AnamnesisDTO[]
  diagnosticos: DiagnosticoDTO[]
  procedimientos: ProcedimientoDTO[]
  medicaciones: MedicacionDTO[]
  adjuntos: AdjuntoDTO[]
  odontograma: OdontogramaDTO | null
  periodontograma: PeriodontogramaDTO | null
  vitales: VitalesDTO[]
  alergias: AlergiasDTO[]
  planTratamiento: PlanTratamientoDTO | null
}

// ============================================================================
// ANAMNESIS
// ============================================================================
export interface AnamnesisDTO {
  id: number
  title: string | null
  notes: string
  fecha: string
  createdBy: {
    id: number
    nombre: string
  }
  createdAt: string
}

// ============================================================================
// DIAGNÓSTICOS
// ============================================================================
export interface DiagnosticoDTO {
  id: number
  diagnosisId: number | null
  code: string | null
  label: string
  status: DiagnosisStatus
  notedAt: string
  resolvedAt: string | null
  notes: string | null
  createdBy: {
    id: number
    nombre: string
  }
}

// ============================================================================
// PROCEDIMIENTOS
// ============================================================================
export interface ProcedimientoDTO {
  id: number
  procedureId: number | null
  serviceType: string | null
  toothNumber: number | null
  toothSurface: DienteSuperficie | null
  quantity: number
  unitPriceCents: number | null
  totalCents: number | null
  resultNotes: string | null
  treatmentStepId: number | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// MEDICACIONES / INDICACIONES
// ============================================================================
export interface MedicacionDTO {
  id: number
  medicationId: number | null
  label: string | null
  dose: string | null
  freq: string | null
  route: string | null
  startAt: string | null
  endAt: string | null
  isActive: boolean
  createdBy: {
    id: number
    nombre: string
  }
}

// ============================================================================
// ADJUNTOS
// ============================================================================
export interface AdjuntoDTO {
  id: number
  tipo: AdjuntoTipo
  descripcion: string | null
  secureUrl: string
  publicId: string
  format: string | null
  bytes: number
  width: number | null
  height: number | null
  originalFilename: string | null
  uploadedBy: {
    id: number
    nombre: string
  }
  createdAt: string
}

// ============================================================================
// ODONTOGRAMA
// ============================================================================
export interface OdontogramaDTO {
  id: number
  takenAt: string
  notes: string | null
  createdBy: {
    id: number
    nombre: string
  }
  entries: OdontogramEntryDTO[]
}

export interface OdontogramEntryDTO {
  id: number
  toothNumber: number
  surface: DienteSuperficie | null
  condition: ToothCondition
  notes: string | null
}

// ============================================================================
// PERIODONTOGRAMA
// ============================================================================
export interface PeriodontogramaDTO {
  id: number
  takenAt: string
  notes: string | null
  createdBy: {
    id: number
    nombre: string
  }
  measures: PeriodontogramMeasureDTO[]
}

export interface PeriodontogramMeasureDTO {
  id: number
  toothNumber: number
  site: PerioSite
  probingDepthMm: number | null
  bleeding: PerioBleeding | null
  plaque: boolean | null
  mobility: number | null
  furcation: number | null
}

// ============================================================================
// SIGNOS VITALES
// ============================================================================
export interface VitalesDTO {
  id: number
  measuredAt: string
  heightCm: number | null
  weightKg: number | null
  bmi: number | null
  bpSyst: number | null
  bpDiast: number | null
  heartRate: number | null
  notes: string | null
  createdBy: {
    id: number
    nombre: string
  }
}

// ============================================================================
// ALERGIAS
// ============================================================================
export interface AlergiasDTO {
  id: number
  label: string
  severity: AllergySeverity
  reaction: string | null
  notedAt: string
  isActive: boolean
}

// ============================================================================
// PLAN DE TRATAMIENTO
// ============================================================================
export interface PlanTratamientoDTO {
  id: number
  titulo: string
  descripcion: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    id: number
    nombre: string
  }
  steps: TreatmentStepDTO[]
}

export interface TreatmentStepDTO {
  id: number
  order: number
  procedureId: number | null
  procedimientoCatalogo: {
    id: number
    code: string
    nombre: string
  } | null
  serviceType: string | null
  toothNumber: number | null
  toothSurface: DienteSuperficie | null
  estimatedDurationMin: number | null
  estimatedCostCents: number | null
  priority: number | null
  status: TreatmentStepStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// RESUMEN ADMINISTRATIVO (para RECEP)
// ============================================================================
export interface ConsultaAdminDTO {
  citaId: number
  fecha: string
  profesional: {
    id: number
    nombre: string
  }
  motivo: string | null
  estado: ConsultaEstado
  createdAt: string
}

