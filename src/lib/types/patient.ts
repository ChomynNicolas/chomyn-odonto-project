// Core patient types and DTOs for the dental clinic system

export type UserRole = "ADMIN" | "ODONT" | "RECEP"

export type PatientStatus = "ACTIVE" | "INACTIVE"
export type Gender = "MALE" | "FEMALE" | "OTHER"
export type DocumentType = "CI" | "PASSPORT" | "RUC" | "OTHER"
export type Country = "PY" | "AR" | "BR" | "OTHER"

export type ContactType = "PHONE" | "EMAIL" | "MOBILE" | "WHATSAPP"
export type RelationType = "PADRE" | "MADRE" | "TUTOR" | "CONYUGE" | "HIJO" | "HERMANO" | "OTRO"

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
export type DiagnosisStatus = "ACTIVE" | "RESOLVED" | "CHRONIC" | "MONITORING" | "RULED_OUT"
export type AllergySeverity = "MILD" | "MODERATE" | "SEVERE"
export type MedicationStatus = "ACTIVE" | "SUSPENDED" | "COMPLETED"
export type TreatmentPlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED"
export type TreatmentStepStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
// Attachment types matching Prisma schema
export type AttachmentType =
  | "XRAY"
  | "INTRAORAL_PHOTO"
  | "EXTRAORAL_PHOTO"
  | "IMAGE"
  | "DOCUMENT"
  | "PDF"
  | "LAB_REPORT"
  | "OTHER"

// Legacy type mapping for backward compatibility
export type LegacyAttachmentType = "XRAY" | "PHOTO" | "DOCUMENT" | "CONSENT" | "LAB_RESULT" | "OTHER"
export type ToothCondition =
  | "INTACT"
  | "CARIES"
  | "FILLED"
  | "CROWN"
  | "MISSING"
  | "IMPLANT"
  | "ROOT_CANAL"
  | "BRIDGE"
  | "EXTRACTION_NEEDED"
  | "FRACTURED" // Legacy support - not in Prisma enum but used in frontend

// Patient identification
export interface PatientIdentification {
  id: string
  firstName: string
  lastName: string
  secondLastName?: string
  dateOfBirth: string
  gender: Gender
  status: PatientStatus
  documentType?: DocumentType
  documentNumber?: string
  documentCountry?: Country
  documentIssueDate?: string // ⭐ Added
  documentExpiryDate?: string // ⭐ Added
  ruc?: string
  address?: string
  city?: string
  country?: Country
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string // ⭐ Added
  createdAt: string
  updatedAt: string
}

// Contact information
export interface PatientContact {
  id: string
  type: ContactType
  value: string
  isPrimary: boolean
  isWhatsAppCapable?: boolean
  isSmsCapable?: boolean
  notes?: string
}

// Responsible party (tutor/financial)
export interface ResponsibleParty {
  id: string
  relation: RelationType
  isPrimary: boolean
  hasLegalAuthority: boolean
  validFrom?: string // ⭐ Added
  validUntil?: string // ⭐ Added
  notes?: string // ⭐ Added
  person: {
    firstName: string
    lastName: string
    documentType?: DocumentType
    documentNumber?: string
    contacts: PatientContact[]
  }
}

// Appointment
export interface Appointment {
  id: string
  scheduledAt: string
  duration: number
  status: AppointmentStatus
  notes?: string
  professional: {
    id: string
    firstName: string
    lastName: string
  }
  office?: {
    id: string
    name: string
  }
  procedures?: {
    code: string
    name: string
  }[]
}

// Diagnosis
export type Diagnosis = {
  id: number
  code?: string
  label: string
  status: DiagnosisStatus
  diagnosedAt: string // <- usamos diagnosedAt
  resolvedAt?: string
  notes?: string
  professional?: {
    // <- opcional
    id?: number
    firstName: string
    lastName?: string
  }
}

// Allergy
export interface Allergy {
  id: string | number
  allergen?: string
  label?: string
  severity: AllergySeverity
  reaction?: string
  notes?: string
  diagnosedAt?: string
  notedAt?: string
  isActive?: boolean
}

// Medication
export interface Medication {
  id: string | number
  name?: string
  label?: string
  dosage?: string
  dose?: string
  frequency?: string
  freq?: string
  route?: string
  status: MedicationStatus | "ACTIVE" | "INACTIVE"
  startedAt?: string
  startAt?: string
  endedAt?: string
  endAt?: string
  prescribedBy?: {
    firstName: string
    lastName: string
  }
}

// Vital signs
export type VitalSigns = {
  id: number
  recordedAt: string // <- renombramos measuredAt -> recordedAt
  height?: number | null
  weight?: number | null
  bmi?: number | null
  systolicBP?: number | null
  diastolicBP?: number | null
  heartRate?: number | null
  temperature?: number | null
  notes?: string | null
  recordedBy?: {
    // <- opcional
    id?: number
    firstName: string
    lastName?: string
  }
}

// Treatment plan
export interface TreatmentPlan {
  id: string
  title: string
  status: TreatmentPlanStatus
  startDate: string
  endDate?: string
  estimatedCost?: number
  steps: TreatmentStep[]
}

export interface TreatmentStep {
  id: string
  order: number
  status: TreatmentStepStatus
  procedure: {
    code: string
    name: string
  }
  tooth?: string
  surface?: string
  notes?: string
  estimatedCost?: number
}

// Odontogram
export interface OdontogramSnapshot {
  id: string
  recordedAt: string
  teeth: ToothRecord[]
  notes?: string
  createdBy?: {
    id: number
    name: string
  }
  consultaId?: number | null
}

export interface ToothRecord {
  toothNumber: string
  condition: ToothCondition
  surfaces?: string[]
  notes?: string
}

// API Response Types for Odontogram History
export interface OdontogramEntryAPI {
  id: number
  toothNumber: number
  surface: string | null
  condition: ToothCondition
  notes: string | null
}

export interface OdontogramSnapshotAPI {
  id: number
  takenAt: string // ISO 8601
  notes: string | null
  consultaId: number | null
  createdBy: {
    id: number
    name: string
  }
  entries: OdontogramEntryAPI[]
}

export interface OdontogramHistoryResponse {
  patientId: number
  snapshots: OdontogramSnapshotAPI[]
  total: number
  limit: number
  offset: number
}

// Periodontogram
export interface PeriodontogramSnapshot {
  id: string
  recordedAt: string
  measurements: PeriodontogramMeasurement[]
  notes?: string
}

export interface PeriodontogramMeasurement {
  toothNumber: string
  site: string // 'mesial' | 'distal' | 'buccal' | 'lingual'
  probingDepth?: number
  recession?: number
  bleeding?: boolean
  plaque?: boolean
}

// Attachment context information
export interface AttachmentContext {
  type: "patient" | "consultation" | "procedure"
  id: number | null
  info?: {
    consultaId?: number
    consultaFecha?: string
    consultaTipo?: string
  }
}

// Attachment
export interface Attachment {
  id: string
  type: AttachmentType
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  description?: string
  thumbnailUrl?: string
  secureUrl?: string
  uploadedBy: {
    id?: string
    firstName: string
    lastName: string
    fullName?: string
  }
  // Additional metadata
  width?: number
  height?: number
  format?: string
  publicId?: string
  resourceType?: string
  // Context information (where the attachment is linked)
  context?: AttachmentContext
  // Source: whether this is from Adjunto table or Consentimiento table
  source?: "adjunto" | "consentimiento"
  // Additional metadata for consentimientos
  consentimientoMetadata?: {
    idConsentimiento: number
    tipo: string
    firmadoEn: string
    vigenteHasta: string
    vigente: boolean
  }
}

// Complete patient record
export interface PatientRecord extends PatientIdentification {
  contacts: PatientContact[]
  responsibleParties: ResponsibleParty[]
  appointments: Appointment[]
  diagnoses: Diagnosis[]
  allergies: Allergy[]
  medications: Medication[]
  vitalSigns: VitalSigns[]
  treatmentPlans: TreatmentPlan[]
  odontogramSnapshots: OdontogramSnapshot[]
  periodontogramSnapshots: PeriodontogramSnapshot[]
  attachments: Attachment[]
  etag?: string
}

// KPIs for dashboard
export interface PatientKPIs {
  totalAppointments: number
  totalAttachments: number
  activeDiagnoses: number
  activeAllergies: number
  activeMedications: number
  nextAppointment?: Appointment
  lastAppointment?: Appointment
  recentEvents: RecentEvent[]
}

export interface RecentEvent {
  id: string
  type: "appointment" | "attachment" | "diagnosis" | "vital_signs"
  date: string
  description: string
}

// Audit log
export interface AuditEntry {
  id: string
  action: string
  performedBy: {
    firstName: string
    lastName: string
    role: UserRole
  }
  performedAt: string
  changes?: Record<string, unknown>
}
