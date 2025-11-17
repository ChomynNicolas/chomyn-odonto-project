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
