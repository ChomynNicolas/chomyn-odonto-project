// GET /api/pacientes/[id]/workspace/overview
// Returns complete patient overview for the workspace

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { ok, errors } from '@/app/api/_http';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { getPatientOverviewData } from '@/lib/api/patients/queries';
import { 
  mapPatientIdentity, 
  mapContactInfo, 
  mapRiskFlags 
} from '@/lib/api/patients/mappers';
import type { RolNombre, PatientOverviewDTO } from '@/types/patient';
import { formatAppointmentDate, formatShortDate } from '@/lib/utils/date-formatters';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSessionWithRoles(req, ['ADMIN', 'ODONT', 'RECEP']);
  if (!authResult.authorized) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  const role = authResult.role;

  const { id } = await params;
  const validation = patientIdSchema.safeParse({ id });
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: 'BAD_REQUEST', details: validation.error.flatten() },
      { status: 400 }
    );
  }
  const patientId = validation.data.id;

  try {
    const data = await getPatientOverviewData(patientId, role);

    if (!data.patient) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const patient = mapPatientIdentity(data.patient);
    const contacts = mapContactInfo(data.patient.persona);
    const riskFlags = mapRiskFlags({
      allergies: data.allergies,
      medications: data.medications,
      anamnesis: data.anamnesis,
    }, role);

    const now = new Date();
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    // Next appointment
    const nextAppt = data.appointments.find(
      a => ['SCHEDULED', 'CONFIRMED'].includes(a.estado) && new Date(a.inicio) > now
    );

    const nextAppointment = nextAppt ? {
      id: nextAppt.idCita,
      date: formatShortDate(nextAppt.inicio),
      time: new Date(nextAppt.inicio).toLocaleTimeString('es-PY', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      professional: `${nextAppt.profesional.persona.nombres} ${nextAppt.profesional.persona.apellidos}`,
      type: nextAppt.tipo,
      consultorio: nextAppt.consultorio?.nombre || null,
    } : null;

    // Last visit
    const lastVisit = data.appointments.find(a => a.estado === 'COMPLETED');
    const lastVisitData = lastVisit ? {
      date: formatShortDate(lastVisit.completedAt || lastVisit.inicio),
      professional: `${lastVisit.profesional.persona.nombres} ${lastVisit.profesional.persona.apellidos}`,
      type: lastVisit.tipo,
    } : null;

    // Statistics
    const totalVisits = data.appointments.filter(a => a.estado === 'COMPLETED').length;
    const noShows = data.appointments.filter(a => a.estado === 'NO_SHOW').length;
    const completedThisYear = data.appointments.filter(
      a => a.estado === 'COMPLETED' && 
           a.completedAt && 
           new Date(a.completedAt) >= thisYearStart
    ).length;

    // Active treatment plans (only for clinical roles)
    let activeTreatmentPlans = null;
    if (role !== 'RECEP' && data.activePlans) {
      const totalSteps = data.activePlans.reduce((sum, plan) => sum + plan.steps.length, 0);
      const completedSteps = data.activePlans.reduce(
        (sum, plan) => sum + plan.steps.filter(s => s.status === 'COMPLETED').length,
        0
      );
      activeTreatmentPlans = {
        count: data.activePlans.length,
        totalSteps,
        completedSteps,
      };
    }

    // Consent status
    const activeConsents = data.consents.filter(c => {
      if (!c.vigenteHasta) return true;
      return new Date(c.vigenteHasta) > now;
    });
    const expiringSoon = activeConsents.filter(c => {
      if (!c.vigenteHasta) return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(c.vigenteHasta).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    });

    const response: PatientOverviewDTO = {
      patient,
      contacts,
      riskFlags,
      summaryCards: {
        nextAppointment,
        lastVisit: lastVisitData,
        statistics: {
          totalVisits,
          noShows,
          completedThisYear,
        },
        activeTreatmentPlans,
        consentStatus: {
          activeCount: activeConsents.length,
          expiringSoonCount: expiringSoon.length,
        },
      },
    };

    return NextResponse.json({ ok: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching overview:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
