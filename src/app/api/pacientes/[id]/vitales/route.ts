import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const VitalSignsSchema = z.object({
  heightCm: z.number().nullable(),
  weightKg: z.number().nullable(),
  bpSyst: z.number().nullable(),
  bpDiast: z.number().nullable(),
  heartRate: z.number().nullable(),
  temperature: z.number().nullable(),
  notes: z.string().nullable(),
  measuredAt: z.string(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const validated = VitalSignsSchema.parse(body)

    // Calculate BMI if height and weight are provided
    let bmi = null
    if (validated.heightCm && validated.weightKg) {
      const heightM = validated.heightCm / 100
      bmi = validated.weightKg / (heightM * heightM)
    }

    const vitals = await prisma.patientVitals.create({
      data: {
        pacienteId,
        heightCm: validated.heightCm,
        weightKg: validated.weightKg,
        bmi,
        bpSyst: validated.bpSyst,
        bpDiast: validated.bpDiast,
        heartRate: validated.heartRate,
        notes: validated.notes,
        measuredAt: new Date(validated.measuredAt),
        createdByUserId: 1, // TODO: Get from session
      },
    })

    return NextResponse.json({ ok: true, data: vitals })
  } catch (error: unknown) {
    console.error("[API] Error creating vital signs:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al registrar signos vitales"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}
