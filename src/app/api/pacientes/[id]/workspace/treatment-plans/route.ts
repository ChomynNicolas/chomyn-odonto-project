// GET /api/pacientes/[id]/workspace/treatment-plans
// Returns treatment plans with steps

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { ok, errors } from '@/app/api/_http';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { RolNombre } from '@/types/patient';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSessionWithRoles(req, ['ADMIN', 'ODONT']);
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

  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true';

  try {
    const plans = await prisma.treatmentPlan.findMany({
      where: {
        pacienteId: patientId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        steps: {
          include: {
            procedimientoCatalogo: {
              select: { nombre: true },
            },
            _count: {
              select: {
                executedProcedures: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        createdByUser: {
          select: { nombreApellido: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = plans.map(plan => ({
      id: plan.idTreatmentPlan,
      titulo: plan.titulo,
      descripcion: plan.descripcion,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      createdBy: plan.createdByUser?.nombreApellido || 'Desconocido',
      steps: plan.steps.map(step => ({
        id: step.idTreatmentStep,
        order: step.order,
        procedure: step.procedimientoCatalogo?.nombre || 'Procedimiento',
        toothNumber: step.toothNumber,
        surface: step.surface,
        status: step.status,
        estimatedCostCents: step.estimatedCostCents,
        notes: step.notes,
        executedCount: step._count.executedProcedures,
      })),
      progress: {
        total: plan.steps.length,
        completed: plan.steps.filter(s => s.status === 'COMPLETED').length,
        inProgress: plan.steps.filter(s => s.status === 'IN_PROGRESS').length,
        pending: plan.steps.filter(s => s.status === 'PENDING').length,
      },
    }));

    return NextResponse.json({ ok: true, data: { plans: response } }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching treatment plans:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
