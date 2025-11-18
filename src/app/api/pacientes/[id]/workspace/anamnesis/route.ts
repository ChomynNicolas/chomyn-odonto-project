// GET /api/pacientes/[id]/workspace/anamnesis
// Returns patient anamnesis details

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { PatientAnamnesisDTO } from '@/types/patient';

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

  try {
    const anamnesis = await prisma.patientAnamnesis.findFirst({
      where: { pacienteId: patientId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!anamnesis) {
      return NextResponse.json({ ok: true, data: null }, { status: 200 });
    }

    const response: PatientAnamnesisDTO = {
      id: anamnesis.idPatientAnamnesis,
      tipo: anamnesis.tipo,
      motivoConsulta: anamnesis.motivoConsulta,
      tieneDolorActual: anamnesis.tieneDolorActual,
      dolorIntensidad: anamnesis.dolorIntensidad,
      urgenciaPercibida: anamnesis.urgenciaPercibida,
      tieneEnfermedadesCronicas: anamnesis.tieneEnfermedadesCronicas,
      tieneAlergias: anamnesis.tieneAlergias,
      tieneMedicacionActual: anamnesis.tieneMedicacionActual,
      embarazada: anamnesis.embarazada,
      expuestoHumoTabaco: anamnesis.expuestoHumoTabaco,
      bruxismo: anamnesis.bruxismo,
      higieneCepilladosDia: anamnesis.higieneCepilladosDia,
      usaHiloDental: anamnesis.usaHiloDental,
      ultimaVisitaDental: anamnesis.ultimaVisitaDental?.toISOString() || null,
      tieneHabitosSuccion: anamnesis.tieneHabitosSuccion,
      lactanciaRegistrada: anamnesis.lactanciaRegistrada,
      updatedAt: anamnesis.updatedAt.toISOString(),
    };

    return NextResponse.json({ ok: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching anamnesis:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

