import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const ToothRecordSchema = z.object({
  toothNumber: z.string(),
  condition: z.enum(["INTACT", "CARIES", "FILLED", "CROWN", "MISSING", "IMPLANT", "ROOT_CANAL", "FRACTURED"]),
  surfaces: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const OdontogramSchema = z.object({
  teeth: z.array(ToothRecordSchema),
  notes: z.string().optional(),
  takenAt: z.string(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const validated = OdontogramSchema.parse(body)

    // Create snapshot
    const snapshot = await prisma.odontogramSnapshot.create({
      data: {
        pacienteId,
        takenAt: new Date(validated.takenAt),
        notes: validated.notes,
        createdByUserId: 1, // TODO: Get from session
        entries: {
          create: validated.teeth.map((tooth) => ({
            toothNumber: Number.parseInt(tooth.toothNumber),
            surface: tooth.surfaces?.join(","),
            condition: tooth.condition,
            notes: tooth.notes,
          })),
        },
      },
      include: {
        entries: true,
      },
    })

    return NextResponse.json({ ok: true, data: snapshot })
  } catch (error: any) {
    console.error("[API] Error creating odontogram:", error)
    return NextResponse.json({ ok: false, error: "Error al crear odontograma" }, { status: 500 })
  }
}
