import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const AllergySchema = z.object({
  label: z.string().min(1),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]),
  reaction: z.string().optional(),
  isActive: z.boolean(),
  notedAt: z.string(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const validated = AllergySchema.parse(body)

    const allergy = await prisma.patientAllergy.create({
      data: {
        pacienteId,
        label: validated.label,
        severity: validated.severity,
        reaction: validated.reaction,
        isActive: validated.isActive,
        notedAt: new Date(validated.notedAt),
        createdByUserId: 1, // TODO: Get from session
      },
    })

    return NextResponse.json({ ok: true, data: allergy })
  } catch (error: unknown) {
    console.error("[API] Error creating allergy:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear alergia"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}
