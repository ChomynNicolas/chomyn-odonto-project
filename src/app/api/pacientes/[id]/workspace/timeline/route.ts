// GET /api/pacientes/[id]/workspace/timeline
// Returns combined timeline of patient events

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { TimelineEntryDTO } from '@/types/patient';

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

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');

  try {
    const timeline: TimelineEntryDTO[] = [];

    // Appointments
    const appointments = await prisma.cita.findMany({
      where: { pacienteId: patientId },
      include: {
        profesional: {
          include: {
            persona: { select: { nombres: true, apellidos: true } },
          },
        },
        consultorio: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { inicio: 'desc' },
      take: limit,
    });

    appointments.forEach((appt) => {
      timeline.push({
        id: `appointment-${appt.idCita}`,
        type: 'APPOINTMENT',
        date: appt.inicio.toISOString(),
        title: `Cita: ${appt.tipo}`,
        description: `Estado: ${appt.estado}${appt.consultorio ? ` - ${appt.consultorio.nombre}` : ''}`,
        professional: {
          id: appt.profesionalId,
          name: `${appt.profesional.persona.nombres} ${appt.profesional.persona.apellidos}`,
        },
        metadata: {
          citaId: appt.idCita,
          estado: appt.estado,
          tipo: appt.tipo,
        },
      });
    });

    // Consultations
    const consultations = await prisma.consulta.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    consultations.forEach((consulta) => {
      timeline.push({
        id: `consultation-${consulta.citaId}`,
        type: 'CONSULTATION',
        date: consulta.createdAt.toISOString(),
        title: 'Consulta Clínica',
        description: consulta.diagnosis || consulta.clinicalNotes || null,
        professional: {
          id: consulta.performedById,
          name: `${consulta.cita.profesional.persona.nombres} ${consulta.cita.profesional.persona.apellidos}`,
        },
        metadata: {
          citaId: consulta.citaId,
          status: consulta.status,
        },
      });
    });

    // Notes can be added from consultations' clinicalNotes field
    // Additional notes would come from other sources if available

    // Sort by date (most recent first)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limit to requested number
    const limitedTimeline = timeline.slice(0, limit);

    return NextResponse.json({ ok: true, data: limitedTimeline }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching timeline:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

