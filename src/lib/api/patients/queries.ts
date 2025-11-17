// Patient data query builders

import { prisma } from '@/lib/prisma';
import type { RolNombre } from '@/types/patient';

export async function getPatientOverviewData(patientId: number, role: RolNombre) {
  const [patient, appointments, anamnesis, activePlans, consents, allergies, medications] = 
    await Promise.all([
      // Base patient data
      prisma.paciente.findUnique({
        where: { idPaciente: patientId },
        include: {
          persona: {
            include: {
              documento: true,
              contactos: {
                where: { activo: true },
                orderBy: [{ esPrincipal: 'desc' }, { createdAt: 'asc' }],
              },
            },
          },
        },
      }),
      
      // Appointments
      prisma.cita.findMany({
        where: { 
          pacienteId: patientId,
          estado: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
        },
        include: {
          profesional: {
            include: {
              persona: { select: { nombres: true, apellidos: true } },
            },
          },
          consultorio: { select: { nombre: true } },
        },
        orderBy: { inicio: 'desc' },
        take: 100,
      }),
      
      // Latest anamnesis (only for clinical roles)
      role === 'RECEP' ? null : prisma.patientAnamnesis.findFirst({
        where: { pacienteId: patientId },
        orderBy: { updatedAt: 'desc' },
      }),
      
      // Active treatment plans (only for clinical roles)
      role === 'RECEP' ? null : prisma.treatmentPlan.findMany({
        where: { pacienteId: patientId, isActive: true },
        include: {
          steps: true,
        },
      }),
      
      // Consents
      prisma.consentimiento.findMany({
        where: { Paciente_idPaciente: patientId, activo: true },
      }),
      
      // Allergies (only for clinical roles)
      role === 'RECEP' ? [] : prisma.patientAllergy.findMany({
        where: { pacienteId: patientId, isActive: true },
      }),
      
      // Current medications (only for clinical roles)
      role === 'RECEP' ? [] : prisma.patientMedication.findMany({
        where: { 
          pacienteId: patientId, 
          isActive: true,
          OR: [
            { endAt: null },
            { endAt: { gte: new Date() } },
          ],
        },
      }),
    ]);
  
  return {
    patient,
    appointments,
    anamnesis,
    activePlans,
    consents,
    allergies,
    medications,
  };
}

export async function getClinicalHistoryData(
  patientId: number,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;
  
  const [consultations, total] = await Promise.all([
    prisma.consulta.findMany({
      where: { cita: { pacienteId: patientId } },
      include: {
        cita: {
          include: {
            profesional: {
              include: {
                persona: { select: { nombres: true, apellidos: true } },
              },
            },
          },
        },
        procedimientos: {
          include: {
            procedimientoCatalogo: { select: { nombre: true } },
          },
        },
        vitals: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.consulta.count({
      where: { cita: { pacienteId: patientId } },
    }),
  ]);
  
  return { consultations, total };
}
