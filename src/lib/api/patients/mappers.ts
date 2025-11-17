// Entity to DTO mappers

import type { 
  PatientIdentityDTO, 
  ContactInfoDTO, 
  RiskFlagsDTO,
  RolNombre 
} from '@/types/patient';
import { formatAge } from '@/lib/utils/date-formatters';

export function mapPatientIdentity(data: any): PatientIdentityDTO {
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

export function mapContactInfo(persona: any): ContactInfoDTO {
  const primaryPhone = persona.contactos.find(
    (c: any) => c.tipo === 'PHONE' && c.esPrincipal
  ) || persona.contactos.find((c: any) => c.tipo === 'PHONE');
  
  const primaryEmail = persona.contactos.find(
    (c: any) => c.tipo === 'EMAIL' && c.esPrincipal
  ) || persona.contactos.find((c: any) => c.tipo === 'EMAIL');
  
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
  allergies: any[];
  medications: any[];
  anamnesis: any | null;
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
