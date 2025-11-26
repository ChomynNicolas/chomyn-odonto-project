// src/app/api/pacientes/[id]/anamnesis/versions/compare/route.ts
// Endpoint para comparar dos versiones de anamnesis

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canViewAnamnesisAudit } from "@/lib/audit/anamnesis-rbac"
import { calculateAnamnesisDiff, type AnamnesisState } from "@/lib/services/anamnesis-audit-complete.service"
import { z } from "zod"

const compareParamsSchema = z.object({
  versionA: z.coerce.number().int().positive(),
  versionB: z.coerce.number().int().positive(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id } = await params
    const pacienteId = parseInt(id, 10)

    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const { versionA, versionB } = compareParamsSchema.parse(searchParams)

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Check permissions
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const userId = parseInt(session.user.id, 10)

    if (!canViewAnamnesisAudit(userRole, pacienteId, userId, userId)) {
      return NextResponse.json({ error: "No tiene permisos para comparar versiones" }, { status: 403 })
    }

    // Fetch both versions
    const [versionA_data, versionB_data] = await Promise.all([
      prisma.patientAnamnesisVersion.findUnique({
        where: { idPatientAnamnesisVersion: versionA },
      }),
      prisma.patientAnamnesisVersion.findUnique({
        where: { idPatientAnamnesisVersion: versionB },
      }),
    ])

    if (!versionA_data || !versionB_data) {
      return NextResponse.json({ error: "Una o ambas versiones no encontradas" }, { status: 404 })
    }

    // Verify both versions belong to this patient
    if (versionA_data.pacienteId !== pacienteId || versionB_data.pacienteId !== pacienteId) {
      return NextResponse.json({ error: "Las versiones no pertenecen a este paciente" }, { status: 403 })
    }

    // Convert to AnamnesisState for diff calculation
    const stateA: AnamnesisState = {
      idPatientAnamnesis: versionA_data.anamnesisId,
      pacienteId: versionA_data.pacienteId,
      tipo: versionA_data.tipo,
      motivoConsulta: versionA_data.motivoConsulta,
      tieneDolorActual: versionA_data.tieneDolorActual,
      dolorIntensidad: versionA_data.dolorIntensidad,
      urgenciaPercibida: versionA_data.urgenciaPercibida,
      tieneEnfermedadesCronicas: versionA_data.tieneEnfermedadesCronicas,
      tieneAlergias: versionA_data.tieneAlergias,
      tieneMedicacionActual: versionA_data.tieneMedicacionActual,
      embarazada: versionA_data.embarazada,
      expuestoHumoTabaco: versionA_data.expuestoHumoTabaco,
      bruxismo: versionA_data.bruxismo,
      higieneCepilladosDia: versionA_data.higieneCepilladosDia,
      usaHiloDental: versionA_data.usaHiloDental,
      ultimaVisitaDental: versionA_data.ultimaVisitaDental?.toISOString() || null,
      tieneHabitosSuccion: versionA_data.tieneHabitosSuccion,
      lactanciaRegistrada: versionA_data.lactanciaRegistrada,
      payload: versionA_data.payload as Record<string, unknown> | null,
    }

    const stateB: AnamnesisState = {
      idPatientAnamnesis: versionB_data.anamnesisId,
      pacienteId: versionB_data.pacienteId,
      tipo: versionB_data.tipo,
      motivoConsulta: versionB_data.motivoConsulta,
      tieneDolorActual: versionB_data.tieneDolorActual,
      dolorIntensidad: versionB_data.dolorIntensidad,
      urgenciaPercibida: versionB_data.urgenciaPercibida,
      tieneEnfermedadesCronicas: versionB_data.tieneEnfermedadesCronicas,
      tieneAlergias: versionB_data.tieneAlergias,
      tieneMedicacionActual: versionB_data.tieneMedicacionActual,
      embarazada: versionB_data.embarazada,
      expuestoHumoTabaco: versionB_data.expuestoHumoTabaco,
      bruxismo: versionB_data.bruxismo,
      higieneCepilladosDia: versionB_data.higieneCepilladosDia,
      usaHiloDental: versionB_data.usaHiloDental,
      ultimaVisitaDental: versionB_data.ultimaVisitaDental?.toISOString() || null,
      tieneHabitosSuccion: versionB_data.tieneHabitosSuccion,
      lactanciaRegistrada: versionB_data.lactanciaRegistrada,
      payload: versionB_data.payload as Record<string, unknown> | null,
    }

    // Calculate diff (A is previous, B is new)
    const diffs = calculateAnamnesisDiff(stateA, stateB)

    return NextResponse.json({
      data: {
        versionA: {
          id: versionA_data.idPatientAnamnesisVersion,
          versionNumber: versionA_data.versionNumber,
          createdAt: versionA_data.createdAt.toISOString(),
        },
        versionB: {
          id: versionB_data.idPatientAnamnesisVersion,
          versionNumber: versionB_data.versionNumber,
          createdAt: versionB_data.createdAt.toISOString(),
        },
        diffs,
        summary: {
          totalChanges: diffs.length,
          added: diffs.filter((d) => d.changeType === "ADDED").length,
          removed: diffs.filter((d) => d.changeType === "REMOVED").length,
          modified: diffs.filter((d) => d.changeType === "MODIFIED").length,
          criticalChanges: diffs.filter((d) => d.isCritical).length,
        },
      },
    })
  } catch (error) {
    console.error("Error comparing versions:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parámetros inválidos", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al comparar versiones" },
      { status: 500 }
    )
  }
}

