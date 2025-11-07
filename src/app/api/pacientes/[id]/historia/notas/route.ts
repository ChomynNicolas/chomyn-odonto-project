import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const ClinicalNoteSchema = z.object({
  title: z.string().min(1),
  notes: z.string().min(1),
  fecha: z.string(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const notes = await prisma.clinicalHistoryEntry.findMany({
      where: { pacienteId },
      include: {
        createdBy: {
          select: {
            nombreApellido: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
      take: 20,
    })

    const formatted = notes.map((note) => ({
      id: note.idClinicalHistoryEntry,
      title: note.title,
      notes: note.notes,
      fecha: note.fecha.toISOString(),
      createdBy: {
        firstName: note.createdBy.nombreApellido.split(" ")[0] || "",
        lastName: note.createdBy.nombreApellido.split(" ").slice(1).join(" ") || "",
      },
    }))

    return NextResponse.json({ ok: true, data: formatted })
  } catch (error: any) {
    console.error("[API] Error fetching clinical notes:", error)
    return NextResponse.json({ ok: false, error: "Error al obtener notas clínicas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const validated = ClinicalNoteSchema.parse(body)

    const note = await prisma.clinicalHistoryEntry.create({
      data: {
        pacienteId,
        title: validated.title,
        notes: validated.notes,
        fecha: new Date(validated.fecha),
        createdByUserId: 1, // TODO: Get from session
      },
    })

    return NextResponse.json({ ok: true, data: note })
  } catch (error: any) {
    console.error("[API] Error creating clinical note:", error)
    return NextResponse.json({ ok: false, error: "Error al crear nota clínica" }, { status: 500 })
  }
}
