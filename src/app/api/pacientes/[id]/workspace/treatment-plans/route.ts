// GET /api/pacientes/[id]/workspace/treatment-plans
// Returns treatment plans with steps

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';

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
        ...(includeInactive ? {} : { status: 'ACTIVE' }),
      },
      include: {
        steps: {
          include: {
            procedimientoCatalogo: {
              select: { nombre: true },
            },
            _count: {
              select: {
                consultaProcedimientos: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        creadoPor: {
          select: { nombreApellido: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = plans.map(plan => {
      // Calculate session-level progress for multi-session steps
      let totalSessions = 0
      let completedSessions = 0

      const steps = plan.steps.map(step => {
        const isMultiSession = step.requiresMultipleSessions && step.totalSessions && step.totalSessions >= 2
        const currentSession = step.currentSession ?? (isMultiSession ? 1 : null)
        const totalSessionsForStep = isMultiSession ? step.totalSessions! : 1
        
        // Calculate completed sessions for this step
        let completedSessionsForStep = 0
        if (isMultiSession) {
          // If step is COMPLETED, all sessions are done
          if (step.status === 'COMPLETED') {
            completedSessionsForStep = totalSessionsForStep
          } else if (currentSession && currentSession > 1) {
            // currentSession represents the next session to work on
            // So completed sessions = currentSession - 1
            completedSessionsForStep = currentSession - 1
          }
        } else {
          // Single session step
          completedSessionsForStep = step.status === 'COMPLETED' ? 1 : 0
        }

        // Accumulate for plan-level metrics
        totalSessions += totalSessionsForStep
        completedSessions += completedSessionsForStep

        // Calculate session progress
        const sessionProgress = isMultiSession ? {
          completedSessions: completedSessionsForStep,
          totalSessions: totalSessionsForStep,
          isCompleted: step.status === 'COMPLETED',
          currentSession: currentSession,
        } : undefined

        return {
          id: step.idTreatmentStep,
          order: step.order,
          // Use catalog name if available, otherwise fallback to serviceType or default
          procedure: step.procedimientoCatalogo?.nombre || step.serviceType || 'Procedimiento',
          toothNumber: step.toothNumber,
          surface: step.toothSurface || null, // Map toothSurface to surface for frontend compatibility
          status: step.status,
          estimatedCostCents: step.estimatedCostCents,
          notes: step.notes,
          executedCount: step._count.consultaProcedimientos,
          // Multi-session fields
          requiresMultipleSessions: step.requiresMultipleSessions,
          totalSessions: step.totalSessions,
          currentSession: currentSession,
          completedAt: step.completedAt?.toISOString() || null,
          // Session progress (derived)
          sessionProgress,
        }
      })

      return {
        id: plan.idTreatmentPlan,
        titulo: plan.titulo,
        descripcion: plan.descripcion,
        status: plan.status,
        createdAt: plan.createdAt.toISOString(),
        createdBy: plan.creadoPor?.nombreApellido || 'Desconocido',
        steps,
        progress: {
          total: plan.steps.length,
          completed: plan.steps.filter(s => s.status === 'COMPLETED').length,
          inProgress: plan.steps.filter(s => s.status === 'IN_PROGRESS').length,
          pending: plan.steps.filter(s => s.status === 'PENDING').length,
          // Session-aware metrics
          completedSessions: totalSessions > 0 ? completedSessions : undefined,
          totalSessions: totalSessions > 0 ? totalSessions : undefined,
        },
      }
    });

    return NextResponse.json({ ok: true, data: { plans: response } }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching treatment plans:', error);
    
    // Provide more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        ok: false, 
        error: 'INTERNAL_ERROR',
        ...(isDevelopment && { details: errorMessage })
      },
      { status: 500 }
    );
  }
}
