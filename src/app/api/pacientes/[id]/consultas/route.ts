import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CreateConsultaSchema = z.object({
  reason: z.string().optional(),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
  status: z.enum(["DRAFT", "FINAL"]).default("DRAFT"),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const consultas = await prisma.consulta.findMany({
      where: {
        cita: {
          pacienteId,
        },
      },
      include: {
        cita: {
          select: {
            inicio: true,
            tipo: true,
            profesional: {
              select: {
                usuario: {
                  select: {
                    nombreApellido: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            procedimientos: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ success: true, data: consultas })
  } catch (error) {
    console.error("Error fetching consultas:", error)
    return NextResponse.json({ error: "Error al cargar consultas" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const pacienteId = Number.parseInt(params.id)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const data = CreateConsultaSchema.parse(body)

    // Crear una cita primero (simplificado para MVP)
    // En producción, esto debería venir de una cita existente
    const profesional = await prisma.profesional.findFirst({
      where: { estaActivo: true },
    })

    if (!profesional) {
      return NextResponse.json({ error: "No hay profesionales disponibles" }, { status: 400 })
    }

    const consultorio = await prisma.consultorio.findFirst({
      where: { activo: true },
    })

    // Crear cita y consulta en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const cita = await tx.cita.create({
        data: {
          pacienteId,
          profesionalId: profesional.idProfesional,
          consultorioId: consultorio?.idConsultorio,
          createdByUserId: Number.parseInt(session.user!.id!),
          inicio: new Date(),
          fin: new Date(Date.now() + 60 * 60 * 1000), // 1 hora después
          tipo: "CONSULTA",
          estado: "COMPLETED",
          motivo: data.reason || "Consulta general",
        },
      })

      const consulta = await tx.consulta.create({
        data: {
          citaId: cita.idCita,
          performedById: profesional.idProfesional,
          createdByUserId: Number.parseInt(session.user!.id!),
          status: data.status,
          reason: data.reason,
          diagnosis: data.diagnosis,
          clinicalNotes: data.clinicalNotes,
          startedAt: new Date(),
          finishedAt: data.status === "FINAL" ? new Date() : null,
        },
      })

      return consulta
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error("Error creating consulta:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Error al crear consulta" }, { status: 500 })
  }
}
