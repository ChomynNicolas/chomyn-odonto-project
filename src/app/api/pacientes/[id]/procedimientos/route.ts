import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id: idParam } = await params;
    const pacienteId = Number.parseInt(idParam)
    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const procedimientos = await prisma.consultaProcedimiento.findMany({
      where: {
        consulta: {
          cita: {
            pacienteId,
          },
        },
      },
      include: {
        catalogo: {
          select: {
            idProcedimiento: true,
            code: true,
            nombre: true,
          },
        },
        _count: {
          select: {
            ConsultaAdjunto: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const mapped = procedimientos.map((p) => ({
      idConsultaProcedimiento: p.idConsultaProcedimiento,
      consultaId: p.consultaId,
      procedureId: p.procedureId,
      serviceType: p.serviceType,
      toothNumber: p.toothNumber,
      toothSurface: p.toothSurface,
      quantity: p.quantity,
      unitPriceCents: p.unitPriceCents,
      totalCents: p.totalCents,
      resultNotes: p.resultNotes,
      createdAt: p.createdAt.toISOString(),
      catalogo: p.catalogo
        ? {
            id: p.catalogo.idProcedimiento,
            code: p.catalogo.code,
            nombre: p.catalogo.nombre,
          }
        : null,
      adjuntosCount: p._count.ConsultaAdjunto,
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error("Error fetching procedimientos:", error)
    return NextResponse.json({ error: "Error al cargar procedimientos" }, { status: 500 })
  }
}
