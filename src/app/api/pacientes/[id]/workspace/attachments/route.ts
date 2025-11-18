// GET /api/pacientes/[id]/workspace/attachments
// Returns clinical attachments for the patient

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRoles } from '@/app/api/_lib/auth';
import { patientIdSchema } from '@/lib/api/patients/validators';
import { prisma } from '@/lib/prisma';
import type { AttachmentDTO } from '@/types/patient';

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

  const tipo = req.nextUrl.searchParams.get('tipo');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  try {
    const attachments = await prisma.adjunto.findMany({
      where: {
        pacienteId: patientId,
        isActive: true,
        ...(tipo ? { tipo: tipo as any } : {}),
      },
      include: {
        uploadedBy: { select: { nombreApellido: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const response: AttachmentDTO[] = attachments.map((adj) => ({
      id: adj.idAdjunto,
      tipo: adj.tipo,
      descripcion: adj.descripcion,
      secureUrl: adj.secureUrl,
      thumbnailUrl: null, // Could be generated from Cloudinary if needed
      originalFilename: adj.originalFilename,
      format: adj.format,
      bytes: adj.bytes,
      width: adj.width,
      height: adj.height,
      createdAt: adj.createdAt.toISOString(),
      uploadedBy: adj.uploadedBy.nombreApellido,
      consultaId: adj.consultaId,
      procedimientoId: adj.procedimientoId,
    }));

    return NextResponse.json({ ok: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('[PatientWorkspace] Error fetching attachments:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

