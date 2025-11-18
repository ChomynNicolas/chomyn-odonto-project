// GET /api/pacientes/[id]/workspace/alerts
// Returns aggregated alerts for the patient

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { PatientAlertDTO } from '@/types/patient';

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
    const now = new Date();
    const alerts: PatientAlertDTO[] = [];

    // High-severity allergies
    const highSeverityAllergies = await prisma.patientAllergy.findMany({
      where: {
        pacienteId: patientId,
        isActive: true,
        severity: 'SEVERE',
      },
    });

    highSeverityAllergies.forEach((allergy, idx) => {
      alerts.push({
        id: `allergy-${allergy.idPatientAllergy}`,
        type: 'ALLERGY',
        severity: 'HIGH',
        title: 'Alergia Severa',
        message: `Alergia severa a: ${allergy.label || allergy.allergyCatalog?.name || 'Sustancia desconocida'}`,
        actionable: true,
        actionUrl: `/pacientes/${patientId}?tab=overview`,
        actionLabel: 'Ver detalles',
      });
    });

    // Expiring consents (within 30 days)
    const expiringConsents = await prisma.consentimiento.findMany({
      where: {
        Paciente_idPaciente: patientId,
        activo: true,
        vigente_hasta: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    expiringConsents.forEach((consent) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(consent.vigente_hasta).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      alerts.push({
        id: `consent-${consent.idConsentimiento}`,
        type: 'CONSENT',
        severity: daysUntilExpiry <= 7 ? 'HIGH' : 'MEDIUM',
        title: 'Consentimiento por Vencer',
        message: `Consentimiento de tipo ${consent.tipo} vence en ${daysUntilExpiry} día${daysUntilExpiry > 1 ? 's' : ''}`,
        actionable: true,
        actionUrl: `/pacientes/${patientId}?tab=administrative`,
        actionLabel: 'Ver consentimientos',
      });
    });

    // Urgent anamnesis
    const urgentAnamnesis = await prisma.patientAnamnesis.findFirst({
      where: {
        pacienteId: patientId,
        urgenciaPercibida: 'URGENCIA',
      },
    });

    if (urgentAnamnesis) {
      alerts.push({
        id: 'urgency-anamnesis',
        type: 'URGENCY',
        severity: 'HIGH',
        title: 'Urgencia Clínica',
        message: 'El paciente tiene marcada urgencia clínica en su anamnesis',
        actionable: true,
        actionUrl: `/pacientes/${patientId}?tab=overview`,
        actionLabel: 'Ver anamnesis',
      });
    }

    // Current pain
    const currentPain = await prisma.patientAnamnesis.findFirst({
      where: {
        pacienteId: patientId,
        tieneDolorActual: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (currentPain && currentPain.dolorIntensidad && currentPain.dolorIntensidad >= 7) {
      alerts.push({
        id: 'high-pain',
        type: 'URGENCY',
        severity: 'HIGH',
        title: 'Dolor Intenso',
        message: `El paciente reporta dolor con intensidad ${currentPain.dolorIntensidad}/10`,
        actionable: true,
        actionUrl: `/pacientes/${patientId}?tab=overview`,
        actionLabel: 'Ver detalles',
      });
    }

    // Sort by severity (HIGH first)
    alerts.sort((a, b) => {
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return NextResponse.json({ ok: true, data: alerts }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching alerts:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

