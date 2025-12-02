// GET /api/pacientes/[id]/workspace/administrative
// Returns comprehensive administrative data

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { AdministrativeDTO } from '@/types/patient';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSessionWithRoles(req, ['ADMIN', 'RECEP', 'ODONT']);
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
    // Fetch all data in parallel for performance
    const [patient, responsibles, citas, treatmentPlans, consents] = await Promise.all([
      // Patient basic info
      prisma.paciente.findUnique({
        where: { idPaciente: patientId },
        select: {
          estaActivo: true,
          notasAdministrativas: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Active responsible persons
      prisma.pacienteResponsable.findMany({
        where: {
          pacienteId: patientId,
          OR: [
            { vigenteHasta: null },
            { vigenteHasta: { gte: new Date() } },
          ],
        },
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
        orderBy: [{ esPrincipal: 'desc' }, { createdAt: 'asc' }],
      }),

      // Appointments for summary
      prisma.cita.findMany({
        where: { pacienteId: patientId },
        select: {
          idCita: true,
          inicio: true,
          fin: true,
          tipo: true,
          estado: true,
          profesional: {
            select: {
              persona: {
                select: {
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
        orderBy: { inicio: 'desc' },
      }),

      // Active treatment plans with steps
      prisma.treatmentPlan.findMany({
        where: {
          pacienteId: patientId,
          status: "ACTIVE",
        },
        include: {
          steps: {
            select: {
              idTreatmentStep: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Active consents (only for completed appointments)
      prisma.consentimiento.findMany({
        where: {
          Paciente_idPaciente: patientId,
          activo: true,
        },
        include: {
          responsable: {
            select: {
              idPersona: true,
              nombres: true,
              apellidos: true,
            },
          },
          cita: {
            select: {
              idCita: true,
              inicio: true,
              estado: true,
            },
          },
          registradoPor: {
            select: {
              idUsuario: true,
              nombreApellido: true,
            },
          },
        },
        orderBy: { firmado_en: 'desc' },
        take: 50, // Limit for performance
      }),
    ]);

    if (!patient) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Calculate appointments summary
    const now = new Date();
    const completedCitas = citas.filter(c => c.estado === 'COMPLETED');
    const cancelledCitas = citas.filter(c => c.estado === 'CANCELLED');
    const noShowCitas = citas.filter(c => c.estado === 'NO_SHOW');
    const scheduledCitas = citas.filter(c => c.estado === 'SCHEDULED' && c.inicio > now);

    // Next appointment
    const nextCita = citas
      .filter(c => c.estado === 'SCHEDULED' && c.inicio > now)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];

    // Last completed appointment
    const lastCita = completedCitas[0];

    // Calculate attendance rate
    const totalAttendable = completedCitas.length + noShowCitas.length;
    const attendanceRate = totalAttendable > 0
      ? Math.round((completedCitas.length / totalAttendable) * 100)
      : 100;

    const appointmentsSummary = {
      total: citas.length,
      completed: completedCitas.length,
      cancelled: cancelledCitas.length,
      noShow: noShowCitas.length,
      scheduled: scheduledCitas.length,
      nextAppointment: nextCita
        ? {
            id: nextCita.idCita,
            date: nextCita.inicio.toISOString(),
            tipo: nextCita.tipo,
            profesional: `${nextCita.profesional.persona.nombres} ${nextCita.profesional.persona.apellidos}`,
          }
        : null,
      lastAppointment: lastCita
        ? {
            id: lastCita.idCita,
            date: lastCita.inicio.toISOString(),
            tipo: lastCita.tipo,
          }
        : null,
      attendanceRate,
    };

    // Format treatment plans with progress
    const treatmentPlansFormatted = treatmentPlans.map(plan => {
      const totalSteps = plan.steps.length;
      const completedSteps = plan.steps.filter(s => s.status === 'COMPLETED').length;
      const pendingSteps = plan.steps.filter(s => s.status === 'PENDING').length;
      const progressPercentage = totalSteps > 0
        ? Math.round((completedSteps / totalSteps) * 100)
        : 0;

      return {
        id: plan.idTreatmentPlan,
        titulo: plan.titulo,
        descripcion: plan.descripcion,
        isActive: plan.status === "ACTIVE",
        createdAt: plan.createdAt.toISOString(),
        totalSteps,
        completedSteps,
        pendingSteps,
        progressPercentage,
      };
    });

    // Format consents - only show relevant info per appointment
    const consentsFormatted = consents.map(consent => ({
      id: consent.idConsentimiento,
      tipo: consent.tipo,
      firmadoEn: consent.firmado_en.toISOString(),
      responsable: {
        id: consent.responsable.idPersona,
        fullName: `${consent.responsable.nombres} ${consent.responsable.apellidos}`,
      },
      cita: consent.cita
        ? {
            id: consent.cita.idCita,
            fecha: consent.cita.inicio.toISOString(),
          }
        : null,
      registradoPor: consent.registradoPor.nombreApellido,
      observaciones: consent.observaciones,
    }));

    // Build final response
    const response: AdministrativeDTO = {
      status: {
        estaActivo: patient.estaActivo,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      },
      responsibles: responsibles.map(resp => ({
        id: resp.idPacienteResponsable,
        persona: {
          id: resp.persona.idPersona,
          fullName: `${resp.persona.nombres} ${resp.persona.apellidos}`,
          document: resp.persona.documento
            ? {
                type: resp.persona.documento.tipo,
                number: resp.persona.documento.numero,
              }
            : null,
          contacts: resp.persona.contactos.map(c => ({
            tipo: c.tipo,
            valor: c.valorNorm,
            esPrincipal: c.esPrincipal,
          })),
        },
        relacion: resp.relacion,
        esPrincipal: resp.esPrincipal,
        autoridadLegal: resp.autoridadLegal,
        vigenteDesde: resp.vigenteDesde.toISOString(),
        vigenteHasta: resp.vigenteHasta?.toISOString() || null,
        notas: resp.notas,
      })),
      administrativeNotes: patient.notasAdministrativas,
      appointmentsSummary,
      treatmentPlans: treatmentPlansFormatted,
      consents: consentsFormatted,
    };

    return NextResponse.json({ ok: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching administrative data:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
