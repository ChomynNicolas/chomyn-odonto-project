import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { DiagnosisStatus } from "@prisma/client"

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
        createdByUserId: 1, // TODO: Get from session
      },
    })

    return NextResponse.json({ ok: true, data: diagnosis })
  } catch (error: unknown) {
    console.error("[API] Error creating diagnosis:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear diagnóstico"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}
