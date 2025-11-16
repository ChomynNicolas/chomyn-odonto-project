// src/app/api/pacientes/[id]/odontograma/historial/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/**
 * GET /api/pacientes/[id]/odontograma/historial
 * Obtiene el historial completo de odontogramas del paciente
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fetch all odontogram snapshots for this patient
    const snapshots = await prisma.odontogramSnapshot.findMany({
      where: { pacienteId },
      include: {
        entries: {
          orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
        },
        createdBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            profesional: {
              select: {
                persona: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { takenAt: "desc" },
      take: 50, // Limit to last 50 snapshots
    })

    const formattedSnapshots = snapshots.map((snapshot) => ({
      id: snapshot.idOdontogramSnapshot,
      takenAt: snapshot.takenAt.toISOString(),
      notes: snapshot.notes,
      consultaId: snapshot.consultaId,
      createdBy: {
        id: snapshot.createdBy.idUsuario,
        nombre:
          snapshot.createdBy.profesional?.persona?.nombres && snapshot.createdBy.profesional?.persona?.apellidos
            ? `${snapshot.createdBy.profesional.persona.nombres} ${snapshot.createdBy.profesional.persona.apellidos}`.trim()
            : snapshot.createdBy.nombreApellido ?? "Usuario",
      },
      entries: snapshot.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    }))

    return NextResponse.json({ ok: true, data: formattedSnapshots })
  } catch (error: unknown) {
    console.error("[API] Error fetching odontogram history:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al obtener historial de odontograma"
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}

