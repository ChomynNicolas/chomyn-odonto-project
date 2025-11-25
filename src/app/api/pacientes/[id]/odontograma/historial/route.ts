// src/app/api/pacientes/[id]/odontograma/historial/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSessionWithRoles } from "@/app/api/_lib/auth"
import { pathParamsSchema } from "../../_schemas"
import { z } from "zod"

/**
 * Query parameters schema for pagination
 */
const historialQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0),
})

/**
 * GET /api/pacientes/[id]/odontograma/historial
 * Obtiene el historial completo de odontogramas del paciente
 * 
 * Query parameters:
 * - limit: number (1-100, default: 50) - Maximum number of snapshots to return
 * - offset: number (>=0, default: 0) - Number of snapshots to skip
 * 
 * Response:
 * {
 *   ok: true,
 *   data: {
 *     patientId: number,
 *     snapshots: Array<{
 *       id: number,
 *       takenAt: string (ISO 8601),
 *       notes: string | null,
 *       consultaId: number | null,
 *       createdBy: {
 *         id: number,
 *         name: string
 *       },
 *       entries: Array<{
 *         id: number,
 *         toothNumber: number,
 *         surface: string | null,
 *         condition: string,
 *         notes: string | null
 *       }>
 *     }>
 *   }
 * }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authentication & Authorization
    const authResult = await requireSessionWithRoles(req, ["ADMIN", "ODONT", "RECEP"])
    if (!authResult.authorized) {
      return NextResponse.json(
        { ok: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    // Validate path parameters
    const pathParams = pathParamsSchema.safeParse(await params)
    if (!pathParams.success) {
      return NextResponse.json(
        { ok: false, error: "ID inválido", details: pathParams.error.flatten() },
        { status: 400 }
      )
    }
    const pacienteId = pathParams.data.id

    // Validate query parameters
    const query = Object.fromEntries(req.nextUrl.searchParams.entries())
    const queryParams = historialQuerySchema.safeParse(query)
    if (!queryParams.success) {
      return NextResponse.json(
        { ok: false, error: "Parámetros de consulta inválidos", details: queryParams.error.flatten() },
        { status: 400 }
      )
    }
    const { limit, offset } = queryParams.data

    // Verify patient exists
    const patient = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })
    if (!patient) {
      return NextResponse.json(
        { ok: false, error: "Paciente no encontrado" },
        { status: 404 }
      )
    }

    // Fetch odontogram snapshots for this patient
    const [snapshots, totalCount] = await Promise.all([
      prisma.odontogramSnapshot.findMany({
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
        take: limit,
        skip: offset,
      }),
      prisma.odontogramSnapshot.count({
        where: { pacienteId },
      }),
    ])

    // Format snapshots with audit info
    const formattedSnapshots = snapshots.map((snapshot) => ({
      id: snapshot.idOdontogramSnapshot,
      takenAt: snapshot.takenAt.toISOString(),
      notes: snapshot.notes,
      consultaId: snapshot.consultaId,
      createdBy: {
        id: snapshot.createdBy.idUsuario,
        name:
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

    return NextResponse.json(
      {
        ok: true,
        data: {
          patientId: pacienteId,
          snapshots: formattedSnapshots,
          total: totalCount,
          limit,
          offset,
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("[API] Error fetching odontogram history:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al obtener historial de odontograma"
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    )
  }
}

