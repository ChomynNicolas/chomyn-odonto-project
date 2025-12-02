// Entity to DTO mappers

import type { 
  PatientIdentityDTO, 
  ContactInfoDTO, 
  RiskFlagsDTO,
  RolNombre 
} from '@/types/patient';
import { formatAge } from '@/lib/utils/date-formatters';
import type { Prisma } from '@prisma/client';

// Type for patient data with persona, documento, and contactos
type PatientWithPersona = Prisma.PacienteGetPayload<{
  include: {
    persona: {
      include: {
        documento: true;
        contactos: true;
      };
    };
  };
}>;

// Type for persona with contactos
type PersonaWithContactos = Prisma.PersonaGetPayload<{
  include: {
    contactos: true;
  };
}>;

// Type for contact item
type Contacto = Prisma.PersonaContactoGetPayload<Record<string, never>>;

// Type for allergy with severity
type AllergyWithSeverity = {
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'HIGH';
};

// Type for anamnesis with risk flags
type AnamnesisWithRiskFlags = {
  tieneEnfermedadesCronicas?: boolean | null;
  urgenciaPercibida?: 'RUTINA' | 'PRIORITARIO' | 'URGENCIA' | null;
  embarazada?: boolean | null;
  tieneDolorActual?: boolean | null;
} | null;

export function mapPatientIdentity(data: PatientWithPersona): PatientIdentityDTO {
  const persona = data.persona;
  
  return {
    id: data.idPaciente,
    fullName: `${persona.nombres} ${persona.apellidos}${persona.segundoApellido ? ' ' + persona.segundoApellido : ''}`,
    firstName: persona.nombres,
    lastName: persona.apellidos,
    secondLastName: persona.segundoApellido,
    age: formatAge(persona.fechaNacimiento),
    gender: persona.genero,
    document: persona.documento ? {
      type: persona.documento.tipo,
      number: persona.documento.numero,
    } : null,
    city: persona.ciudad,
    country: persona.pais || 'Paraguay',
    isActive: data.estaActivo,
  };
}

export function mapContactInfo(persona: PersonaWithContactos): ContactInfoDTO {
  const primaryPhone = persona.contactos.find(
    (c: Contacto) => c.tipo === 'PHONE' && c.esPrincipal
  ) || persona.contactos.find((c: Contacto) => c.tipo === 'PHONE');
  
  const primaryEmail = persona.contactos.find(
    (c: Contacto) => c.tipo === 'EMAIL' && c.esPrincipal
  ) || persona.contactos.find((c: Contacto) => c.tipo === 'EMAIL');
  
  return {
    primaryPhone: primaryPhone?.valorNorm || null,
    primaryEmail: primaryEmail?.valorNorm || null,
    emergencyContact: {
      name: persona.contactoEmergenciaNombre || null,
      phone: persona.contactoEmergenciaTelefono || null,
      relation: persona.contactoEmergenciaRelacion || null,
    },
  };
}

export function mapRiskFlags(data: {
  allergies: AllergyWithSeverity[];
  medications: unknown[];
  anamnesis: AnamnesisWithRiskFlags;
}, role: RolNombre): RiskFlagsDTO {
  // For RECEP, return limited info
  if (role === 'RECEP') {
    return {
      hasAllergies: data.allergies.length > 0,
      allergyCount: data.allergies.length,
      highSeverityAllergies: 0,
      hasChronicDiseases: false,
      currentMedicationsCount: 0,
      urgencyLevel: null,
      isPregnant: null,
      hasCurrentPain: false,
    };
  }
  
  // Full data for ADMIN/ODONT
  const highSeverityAllergies = data.allergies.filter(
    a => a.severity === 'HIGH' || a.severity === 'SEVERE'
  ).length;
  
  return {
    hasAllergies: data.allergies.length > 0,
    allergyCount: data.allergies.length,
    highSeverityAllergies,
    hasChronicDiseases: data.anamnesis?.tieneEnfermedadesCronicas || false,
    currentMedicationsCount: data.medications.length,
    urgencyLevel: data.anamnesis?.urgenciaPercibida || null,
    isPregnant: data.anamnesis?.embarazada || null,
    hasCurrentPain: data.anamnesis?.tieneDolorActual || false,
  };
}
