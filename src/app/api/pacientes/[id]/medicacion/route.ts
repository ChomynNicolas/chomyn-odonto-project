import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const MedicationSchema = z.object({
  label: z.string().min(1),
  dose: z.string().optional(),
  freq: z.string().optional(),
  route: z.string().optional(),
  isActive: z.boolean(),
  startAt: z.string(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const validated = MedicationSchema.parse(body)

    const medication = await prisma.patientMedication.create({
      data: {
        pacienteId,
        label: validated.label,
        dose: validated.dose,
        freq: validated.freq,
        route: validated.route,
        isActive: validated.isActive,
        startAt: new Date(validated.startAt),
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
