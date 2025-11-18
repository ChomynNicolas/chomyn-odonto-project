// GET /api/pacientes/[id]/workspace/odontogram
// Returns odontogram snapshots for the patient

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

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');

  try {
    const snapshots = await prisma.odontogramSnapshot.findMany({
      where: { pacienteId: patientId },
      include: {
        entries: {
          orderBy: [{ toothNumber: 'asc' }, { surface: 'asc' }],
        },
        createdBy: { select: { nombreApellido: true } },
        consulta: {
          select: {
            citaId: true,
            cita: {
              select: {
                inicio: true,
              },
            },
          },
        },
      },
      orderBy: { takenAt: 'desc' },
      take: limit,
    });

    const response = snapshots.map((snapshot) => ({
      id: snapshot.idOdontogramSnapshot,
      takenAt: snapshot.takenAt.toISOString(),
      notes: snapshot.notes,
      createdBy: snapshot.createdBy.nombreApellido,
      consultaId: snapshot.consultaId,
      consultaDate: snapshot.consulta?.cita.inicio.toISOString() || null,
      entries: snapshot.entries.map((entry) => ({
        id: entry.idOdontogramEntry,
        toothNumber: entry.toothNumber,
        surface: entry.surface,
        condition: entry.condition,
        notes: entry.notes,
      })),
    }));

    return NextResponse.json({ ok: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching odontogram:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

