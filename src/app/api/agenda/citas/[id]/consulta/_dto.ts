// src/app/api/agenda/citas/[id]/consulta/_dto.ts
import type {
  ConsultaEstado,
  DiagnosisStatus,
  TreatmentStepStatus,
  ToothCondition,
  DienteSuperficie,
  PerioSite,
  PerioBleeding,
  AdjuntoTipo,
} from "@prisma/client"

// ============================================================================
// CONSULTA COMPLETA DTO
// ============================================================================
export interface ConsultaClinicaDTO {
  citaId: number
  status: ConsultaEstado
  startedAt: string | null
  finishedAt: string | null
  reason: string | null
  diagnosis: string | null
  clinicalNotes: string | null
  performedBy: {
    id: number
    nombre: string
  }
  createdAt: string
  updatedAt: string

  // Módulos
  anamnesis: AnamnesisDTO[]
  diagnosticos: DiagnosticoDTO[]
  procedimientos: ProcedimientoDTO[]
  medicaciones: MedicacionDTO[]
  adjuntos: AdjuntoDTO[]
  odontograma: OdontogramaDTO | null
  periodontograma: PeriodontogramaDTO | null
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

