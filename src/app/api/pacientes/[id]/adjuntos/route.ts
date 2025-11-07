import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const CreateAdjuntoSchema = z.object({
  publicId: z.string(),
  secureUrl: z.string().url(),
  bytes: z.number().int().nonnegative(),
  format: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().optional(),
  resourceType: z.string().optional(),
  folder: z.string().optional(),
  originalFilename: z.string().optional(),
  version: z.number().optional(),
  accessMode: z.enum(["PUBLIC", "AUTHENTICATED"]).optional(),
  tipo: z.enum(["XRAY", "INTRAORAL_PHOTO", "EXTRAORAL_PHOTO", "IMAGE", "DOCUMENT", "PDF", "LAB_REPORT", "OTHER"]),
  descripcion: z.string().max(500).optional(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ ok: false, error: "ID de paciente inválido" }, { status: 400 })
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
    })

    if (!paciente) {
      return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = CreateAdjuntoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data

    // Create adjunto record
    const adjunto = await prisma.adjunto.create({
      data: {
        pacienteId,
        tipo: data.tipo as any,
        descripcion: data.descripcion,
        publicId: data.publicId,
        folder: data.folder,
        resourceType: data.resourceType || "auto",
        format: data.format,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        duration: data.duration,
        secureUrl: data.secureUrl,
        originalFilename: data.originalFilename,
        accessMode: (data.accessMode || "AUTHENTICATED") as any,
        createdById: 1, // TODO: Get from session
      },
    })

    return NextResponse.json({
      ok: true,
      data: adjunto,
    })
  } catch (error: any) {
    console.error("[API] Error creating adjunto:", error)
    return NextResponse.json({ ok: false, error: "Error al crear adjunto" }, { status: 500 })
  }
}
