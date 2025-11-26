import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/auth"

const AllergySchema = z.object({
  label: z.string().min(1),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]),
  reaction: z.string().optional(),
  isActive: z.boolean(),
  notedAt: z.string(),
})

/**
 * GET /api/pacientes/[id]/alergias
 * Retrieves all allergies for a patient
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id: idParam } = await params
    const pacienteId = Number.parseInt(idParam)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    // Fetch all patient allergies with catalog information
    const allergies = await prisma.patientAllergy.findMany({
      where: { pacienteId },
      include: {
        allergyCatalog: {
          select: {
            idAllergyCatalog: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        idPatientAllergy: "desc", // Order by ID (most recent first)
      },
    })

    const data = allergies.map((all) => ({
      idPatientAllergy: all.idPatientAllergy,
      label: all.label,
      allergyCatalog: all.allergyCatalog
        ? {
            idAllergyCatalog: all.allergyCatalog.idAllergyCatalog,
            name: all.allergyCatalog.name,
            description: all.allergyCatalog.description,
          }
        : null,
      severity: all.severity,
      reaction: all.reaction,
      isActive: all.isActive,
      notedAt: all.notedAt.toISOString(),
    }))

    return NextResponse.json({ ok: true, data }, { status: 200 })
  } catch (error: unknown) {
    console.error("[API] Error fetching allergies:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al obtener alergias"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const pacienteId = Number.parseInt(idParam)
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
