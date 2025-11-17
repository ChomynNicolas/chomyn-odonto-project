// GET /api/pacientes/[id]/workspace/clinical-history
// Returns paginated clinical history

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { ok, errors } from '@/app/api/_http';
import { patientIdSchema, clinicalHistoryQuerySchema } from '@/lib/api/patients/validators';
import { getClinicalHistoryData } from '@/lib/api/patients/queries';
import type { RolNombre, ClinicalHistoryEntryDTO, PaginatedResponse } from '@/types/patient';
import { formatShortDate } from '@/lib/utils/date-formatters';

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

  // This automatically filters out null values and provides consistent validation
  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  
  const queryValidation = clinicalHistoryQuerySchema.safeParse(queryParams);

  if (!queryValidation.success) {
    return NextResponse.json(
      { ok: false, error: 'BAD_REQUEST', details: queryValidation.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit } = queryValidation.data;

  try {
    const { consultations, total } = await getClinicalHistoryData(patientId, page, limit);

    const entries: ClinicalHistoryEntryDTO[] = consultations.map(consulta => {
      const professional = consulta.cita.profesional;
      
      return {
        id: consulta.idConsulta,
        date: formatShortDate(consulta.createdAt),
        type: 'CONSULTA' as const,
        consultation: {
          id: consulta.idConsulta,
          citaId: consulta.citaId,
          status: consulta.status,
          startedAt: consulta.startedAt?.toISOString() || null,
          finishedAt: consulta.finishedAt?.toISOString() || null,
          diagnosis: consulta.diagnosticoResumido,
          clinicalNotes: consulta.notasClinicas,
        },
        professional: {
          id: professional.idProfesional,
          name: `${professional.persona.nombres} ${professional.persona.apellidos}`,
        },
        procedures: consulta.procedimientos.map(proc => ({
          id: proc.idConsultaProcedimiento,
          procedure: proc.procedimientoCatalogo?.nombre || 'Procedimiento',
          toothNumber: proc.toothNumber,
          notes: proc.notes,
        })),
        diagnoses: [], // Would need additional query to fetch diagnoses
        vitals: consulta.vitals[0] ? {
          bp: consulta.vitals[0].bloodPressure,
          heartRate: consulta.vitals[0].heartRate,
        } : null,
        attachmentCount: 0, // Would need additional query
      };
    });

    const response: PaginatedResponse<ClinicalHistoryEntryDTO> = {
      data: entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({ ok: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching clinical history:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
