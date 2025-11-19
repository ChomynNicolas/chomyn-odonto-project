import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { DiagnosisStatus } from "@prisma/client"
import { auth } from "@/auth"
import { auditDiagnosisCreate } from "@/lib/audit/diagnosis"

const DiagnosisSchema = z.object({
  code: z.string().optional(),
  label: z.string().min(1),
  status: z.enum(["ACTIVE", "RESOLVED", "RULED_OUT"]),
  notes: z.string().optional(),
  notedAt: z.string(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const pacienteId = Number.parseInt(idParam)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 })
    }
    const userId = Number.parseInt(String(session.user.id))
    if (isNaN(userId)) {
      return NextResponse.json({ ok: false, error: "ID de usuario inválido" }, { status: 401 })
    }

    const body = await req.json()
    const validated = DiagnosisSchema.parse(body)

    const diagnosis = await prisma.patientDiagnosis.create({
      data: {
        pacienteId,
        code: validated.code,
        label: validated.label,
        status: validated.status as DiagnosisStatus,
        notes: validated.notes,
        notedAt: new Date(validated.notedAt),
        createdByUserId: userId,
      },
    })

    // Audit: Log diagnosis creation
    await auditDiagnosisCreate({
      actorId: userId,
      diagnosisId: diagnosis.idPatientDiagnosis,
      pacienteId,
      consultaId: null,
      diagnosisCatalogId: null,
      code: validated.code ?? null,
      label: validated.label,
      status: validated.status as DiagnosisStatus,
      notes: validated.notes ?? null,
      headers: req.headers,
      path: `/api/pacientes/${pacienteId}/diagnosticos`,
    })

    return NextResponse.json({ ok: true, data: diagnosis })
  } catch (error: unknown) {
    console.error("[API] Error creating diagnosis:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear diagnóstico"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}
