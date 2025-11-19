// Patient Workspace DTOs

export type RolNombre = 'ADMIN' | 'ODONT' | 'RECEP';

export interface PatientIdentityDTO {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  age: number | null;
  gender: string | null;
  document: {
    type: string;
    number: string;
  } | null;
  city: string | null;
  country: string;
  isActive: boolean;
}

export interface ContactInfoDTO {
  primaryPhone: string | null;
  primaryEmail: string | null;
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relation: string | null;
  } | null;
}

export interface RiskFlagsDTO {
  hasAllergies: boolean;
  allergyCount: number;
  highSeverityAllergies: number;
  hasChronicDiseases: boolean;
  currentMedicationsCount: number;
  urgencyLevel: 'RUTINA' | 'PRIORITARIO' | 'URGENCIA' | null;
  isPregnant: boolean | null;
  hasCurrentPain: boolean;
}

export interface PatientOverviewDTO {
  patient: PatientIdentityDTO;
  contacts: ContactInfoDTO;
  riskFlags: RiskFlagsDTO;
  summaryCards: {
    nextAppointment: {
      id: number;
      date: string;
      time: string;
      professional: string;
      type: string;
      consultorio: string | null;
    } | null;
    lastVisit: {
      date: string;
      professional: string;
      type: string;
    } | null;
    statistics: {
      totalVisits: number;
      noShows: number;
      completedThisYear: number;
    };
    activeTreatmentPlans: {
      count: number;
      totalSteps: number;
      completedSteps: number;
    } | null;
    consentStatus: {
      activeCount: number;
      expiringSoonCount: number;
    };
  };
}

export interface ClinicalHistoryEntryDTO {
  id: number;
  date: string;
  type: 'CONSULTA' | 'DIAGNOSIS' | 'NOTE';
  consultation: {
    id: number;
    citaId: number;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    diagnosis: string | null;
    clinicalNotes: string | null;
  } | null;
  professional: {
    id: number;
    name: string;
  };
  procedures: Array<{
    id: number;
    procedure: string;
    toothNumber: number | null;
    notes: string | null;
  }>;
  diagnoses: Array<{
    id: number;
    label: string;
    code: string | null;
    status: string;
    notedAt: string;
    resolvedAt: string | null;
    notes: string | null;
    encounterNotes: string | null;
    wasEvaluated: boolean;
    wasManaged: boolean;
  }>;
  vitals: {
    bp: string | null;
    heartRate: number | null;
  } | null;
  attachmentCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ResponsiblePersonDTO {
  id: number;
  persona: {
    id: number;
    fullName: string;
    document: { type: string; number: string } | null;
    contacts: Array<{ tipo: string; valor: string }>;
  };
  relacion: string;
  esPrincipal: boolean;
  autoridadLegal: boolean;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export interface AdministrativeDTO {
  responsibles: ResponsiblePersonDTO[];
  administrativeNotes: string | null;
}

// New DTOs for enhanced workspace features
export interface PatientAnamnesisDTO {
  id: number;
  tipo: 'ADULTO' | 'PEDIATRICO';
  motivoConsulta: string | null;
  tieneDolorActual: boolean;
  dolorIntensidad: number | null;
  urgenciaPercibida: 'RUTINA' | 'PRIORITARIO' | 'URGENCIA' | null;
  tieneEnfermedadesCronicas: boolean;
  tieneAlergias: boolean;
  tieneMedicacionActual: boolean;
  embarazada: boolean | null;
  expuestoHumoTabaco: boolean | null;
  bruxismo: boolean | null;
  higieneCepilladosDia: number | null;
  usaHiloDental: boolean | null;
  ultimaVisitaDental: string | null;
  tieneHabitosSuccion: boolean | null;
  lactanciaRegistrada: boolean | null;
  updatedAt: string;
}

export interface PatientAlertDTO {
  id: string;
  type: 'ALLERGY' | 'MEDICATION' | 'URGENCY' | 'CONSENT' | 'TREATMENT' | 'APPOINTMENT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  actionable: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface TimelineEntryDTO {
  id: string;
  type: 'APPOINTMENT' | 'CONSULTATION' | 'NOTE' | 'DIAGNOSIS' | 'TREATMENT_STEP';
  date: string;
  title: string;
  description: string | null;
  professional: {
    id: number;
    name: string;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface AttachmentDTO {
  id: number;
  tipo: 'XRAY' | 'INTRAORAL_PHOTO' | 'EXTRAORAL_PHOTO' | 'IMAGE' | 'DOCUMENT' | 'PDF' | 'LAB_REPORT' | 'OTHER';
  descripcion: string | null;
  secureUrl: string;
  thumbnailUrl: string | null;
  originalFilename: string | null;
  format: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploadedBy: string;
  consultaId: number | null;
  procedimientoId: number | null;
}