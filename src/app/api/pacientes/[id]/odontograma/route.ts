import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/auth"
import { DienteSuperficie, ToothCondition } from "@prisma/client"

const ToothRecordSchema = z.object({
  toothNumber: z.string(),
  condition: z.enum(["INTACT", "CARIES", "FILLED", "CROWN", "MISSING", "IMPLANT", "ROOT_CANAL", "BRIDGE", "EXTRACTION_NEEDED", "FRACTURED"]),
  surfaces: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const OdontogramSchema = z.object({
  teeth: z.array(ToothRecordSchema),
  notes: z.string().optional(),
  takenAt: z.string(),
})

/**
 * Mapea nombres de superficies del frontend a valores del enum DienteSuperficie
 */
function mapSurfaceNameToEnum(surfaceName: string): DienteSuperficie | null {
  const surfaceMap: Record<string, DienteSuperficie> = {
    Oclusal: DienteSuperficie.O,
    Mesial: DienteSuperficie.M,
    Distal: DienteSuperficie.D,
    Vestibular: DienteSuperficie.V,
    "Lingual/Palatino": DienteSuperficie.L,
  }
  return surfaceMap[surfaceName] ?? null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params
    const pacienteId = Number.parseInt(idParam)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 })
    }
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

    const body = await req.json()
    const validated = OdontogramSchema.parse(body)

    // Transform teeth array to entries array
    // Each tooth can have multiple surfaces, so we create one entry per surface
    // If no surfaces, create one entry with surface: null
    const entries: Array<{
      toothNumber: number
      surface: DienteSuperficie | null
      condition: ToothCondition
      notes: string | null
    }> = []

    for (const tooth of validated.teeth) {
      const toothNumber = Number.parseInt(tooth.toothNumber)
      const condition = tooth.condition as ToothCondition
      const notes = tooth.notes ?? null

      if (tooth.surfaces && tooth.surfaces.length > 0) {
        // Create one entry per surface
        for (const surfaceName of tooth.surfaces) {
          const surface = mapSurfaceNameToEnum(surfaceName)
          if (surface !== null) {
            entries.push({
              toothNumber,
              surface,
              condition,
              notes,
            })
          }
        }
      } else {
        // No surfaces, create one entry with surface: null
        entries.push({
          toothNumber,
          surface: null,
          condition,
          notes,
        })
      }
    }

    // Create snapshot
    const snapshot = await prisma.odontogramSnapshot.create({
      data: {
        pacienteId,
        takenAt: new Date(validated.takenAt),
        notes: validated.notes ?? null,
        createdByUserId: userId,
        entries: {
          create: entries,
        },
      },
      include: {
        entries: {
          orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
        },
      },
    })

    return NextResponse.json({ ok: true, data: snapshot })
  } catch (error: unknown) {
    console.error("[API] Error creating odontogram:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear odontograma"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}
