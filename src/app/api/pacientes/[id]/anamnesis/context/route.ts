// API endpoint for anamnesis context (first-time vs follow-up detection)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAnamnesisContext } from '@/lib/services/anamnesis-context.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const pacienteId = parseInt(id, 10);

    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: 'ID de paciente inválido' }, { status: 400 });
    }

    // Verify patient exists
    const { prisma } = await import('@/lib/prisma');
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    });

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Get anamnesis context
    const context = await getAnamnesisContext(pacienteId);

    return NextResponse.json({ data: context }, { status: 200 });
  } catch (error) {
    console.error('Error fetching anamnesis context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al cargar contexto de anamnesis' },
      { status: 500 }
    );
  }
}

