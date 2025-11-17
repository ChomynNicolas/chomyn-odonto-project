// GET /api/pacientes/[id]/workspace/vitals
// Returns patient vitals history

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { ok, errors } from '@/app/api/_http';
import { patientIdSchema, paginationQuerySchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { RolNombre, PaginatedResponse } from '@/types/patient';

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
  const idValidation = patientIdSchema.safeParse({ id });
  if (!idValidation.success) {
    return NextResponse.json(
      { ok: false, error: 'BAD_REQUEST', details: idValidation.error.flatten() },
      { status: 400 }
    );
  }
  const patientId = idValidation.data.id;

  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  
  const queryValidation = paginationQuerySchema.safeParse(queryParams);

  if (!queryValidation.success) {
    return NextResponse.json(
      { ok: false, error: 'BAD_REQUEST', details: queryValidation.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit } = queryValidation.data;
  const skip = (page - 1) * limit;

  try {
    const [records, total] = await Promise.all([
      prisma.patientVitals.findMany({
        where: { pacienteId: patientId },
        include: {
          consulta: {
            select: { idConsulta: true },
          },
          recordedByUser: {
            select: { nombreApellido: true },
          },
        },
        orderBy: { measuredAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patientVitals.count({
        where: { pacienteId: patientId },
      }),
    ]);

    const response = records.map(vital => {
      let bmi = null;
      if (vital.heightCm && vital.weightKg) {
        const heightM = vital.heightCm / 100;
        bmi = Math.round((vital.weightKg / (heightM * heightM)) * 10) / 10;
      }

      return {
        id: vital.idPatientVitals,
        measuredAt: vital.measuredAt.toISOString(),
        consultaId: vital.consultaId,
        heightCm: vital.heightCm,
        weightKg: vital.weightKg,
        bmi,
        bloodPressure: vital.bloodPressure,
        heartRate: vital.heartRate,
        notes: vital.notes,
        recordedBy: vital.recordedByUser?.nombreApellido || 'Desconocido',
      };
    });

    const result: PaginatedResponse<typeof response[0]> = {
      data: response,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching vitals:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
