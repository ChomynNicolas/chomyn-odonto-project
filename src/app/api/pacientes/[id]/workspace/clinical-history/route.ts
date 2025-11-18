// GET /api/pacientes/[id]/workspace/clinical-history
// Returns paginated clinical history

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { patientIdSchema, clinicalHistoryQuerySchema } from '@/lib/api/patients/validators';
import { getClinicalHistoryData } from '@/lib/api/patients/queries';
import type { ClinicalHistoryEntryDTO, PaginatedResponse } from '@/types/patient';
import { formatShortDate } from '@/lib/utils/date-formatters';
import type { PatientVitals } from '@prisma/client';

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

    // Map consultations to DTO format
    const entries: ClinicalHistoryEntryDTO[] = consultations.map(consulta => {
      const professional = consulta.cita.profesional;
      // PatientVitals is an array, get the first element (most recent due to orderBy)
      // Type assertion needed because Prisma's type inference for nested arrays with take can be imprecise
      const vitalsArray = consulta.PatientVitals as PatientVitals[];
      const vital = vitalsArray && vitalsArray.length > 0 ? vitalsArray[0] : null;
      
      // Format blood pressure as "syst/diast" string or null
      const bpString = vital && vital.bpSyst != null && vital.bpDiast != null
        ? `${vital.bpSyst}/${vital.bpDiast}`
        : null;
      
      return {
        id: consulta.citaId, // Use citaId as the unique identifier (it's the PK)
        date: formatShortDate(consulta.createdAt),
        type: 'CONSULTA' as const,
        consultation: {
          id: consulta.citaId,
          citaId: consulta.citaId,
          status: consulta.status, // ConsultaEstado enum: 'DRAFT' | 'FINAL'
          startedAt: consulta.startedAt?.toISOString() || null,
          finishedAt: consulta.finishedAt?.toISOString() || null,
          diagnosis: consulta.diagnosis || null,
          clinicalNotes: consulta.clinicalNotes || null,
        },
        professional: {
          id: professional.idProfesional,
          name: `${professional.persona.nombres} ${professional.persona.apellidos}`,
        },
        procedures: consulta.procedimientos.map(proc => ({
          id: proc.idConsultaProcedimiento,
          // Use catalog name if available, otherwise fallback to serviceType or default
          procedure: proc.catalogo?.nombre || proc.serviceType || 'Procedimiento',
          toothNumber: proc.toothNumber,
          notes: proc.resultNotes || null,
        })),
        diagnoses: [], // Would need additional query to fetch diagnoses
        vitals: vital ? {
          bp: bpString,
          heartRate: vital.heartRate || null,
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
