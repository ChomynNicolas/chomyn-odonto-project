import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const MedicationSchema = z.object({
  label: z.string().min(1),
  description: z.string().max(1000).optional().nullable(),
  dose: z.string().optional(),
  freq: z.string().optional(),
  route: z.string().optional(),
  isActive: z.boolean(),
  startAt: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const pacienteId = Number.parseInt(idParam)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const validated = MedicationSchema.parse(body)

    const medication = await prisma.patientMedication.create({
      data: {
        pacienteId,
        label: validated.label,
        description: validated.description ?? null,
        dose: validated.dose ?? null,
        freq: validated.freq ?? null,
        route: validated.route ?? null,
        isActive: validated.isActive,
        startAt: validated.startAt ? new Date(validated.startAt) : null,
        createdByUserId: 1, // TODO: Get from session
      },
    })

    return NextResponse.json({ ok: true, data: medication })
  } catch (error: unknown) {
    console.error("[API] Error creating medication:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear medicación"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}
