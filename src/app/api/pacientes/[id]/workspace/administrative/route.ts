// GET /api/pacientes/[id]/workspace/administrative
// Returns administrative data (responsible persons, notes)

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { ok, errors } from '@/app/api/_http';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { RolNombre, AdministrativeDTO } from '@/types/patient';

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
    const [patient, responsibles] = await Promise.all([
      prisma.paciente.findUnique({
        where: { idPaciente: patientId },
        select: {
          notasAdministrativas: true,
        },
      }),
      prisma.pacienteResponsable.findMany({
        where: { 
          pacienteId: patientId,
          vigenteHasta: null, // Only active responsibles
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
    ]);

    if (!patient) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const response: AdministrativeDTO = {
      responsibles: responsibles.map(resp => ({
        id: resp.idPacienteResponsable,
        persona: {
          id: resp.persona.idPersona,
          fullName: `${resp.persona.nombres} ${resp.persona.apellidos}`,
          document: resp.persona.documento ? {
            type: resp.persona.documento.tipo,
            number: resp.persona.documento.numero,
          } : null,
          contacts: resp.persona.contactos.map(c => ({
            tipo: c.tipo,
            valor: c.valorNorm,
          })),
        },
        relacion: resp.relacion,
        esPrincipal: resp.esPrincipal,
        autoridadLegal: resp.autoridadLegal,
        vigenteDesde: resp.vigenteDesde.toISOString(),
        vigenteHasta: resp.vigenteHasta?.toISOString() || null,
      })),
      administrativeNotes: patient.notasAdministrativas,
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
