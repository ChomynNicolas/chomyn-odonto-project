// src/app/api/pacientes/[id]/anamnesis/versions/[versionId]/route.ts
// Endpoint para obtener snapshot completo de una versión específica

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canViewAnamnesisAudit } from "@/lib/audit/anamnesis-rbac"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id, versionId } = await params
    const pacienteId = parseInt(id, 10)
    const versionIdNum = parseInt(versionId, 10)

    if (isNaN(pacienteId) || isNaN(versionIdNum)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
    }

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

    if (!canViewAnamnesisAudit(userRole)) {
      return NextResponse.json({ error: "No tiene permisos para ver versiones" }, { status: 403 })
    }

    // Fetch version
    const version = await prisma.patientAnamnesisVersion.findUnique({
      where: { idPatientAnamnesisVersion: versionIdNum },
      include: {
        creadoPor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            email: true,
          },
        },
        consulta: {
          select: {
            citaId: true,
            diagnosis: true,
            clinicalNotes: true,
          },
        },
        restoredFromVersion: {
          select: {
            idPatientAnamnesisVersion: true,
            versionNumber: true,
            createdAt: true,
          },
        },
      },
    })

    if (!version) {
      return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 })
    }

    // Verify version belongs to this patient
    if (version.pacienteId !== pacienteId) {
      return NextResponse.json({ error: "La versión no pertenece a este paciente" }, { status: 403 })
    }

    // Format response
    return NextResponse.json({
      data: {
        id: version.idPatientAnamnesisVersion,
        versionNumber: version.versionNumber,
        pacienteId: version.pacienteId,
        anamnesisId: version.anamnesisId,
        consultaId: version.consultaId,
        tipo: version.tipo,
        motivoConsulta: version.motivoConsulta,
        tieneDolorActual: version.tieneDolorActual,
        dolorIntensidad: version.dolorIntensidad,
        urgenciaPercibida: version.urgenciaPercibida,
        tieneEnfermedadesCronicas: version.tieneEnfermedadesCronicas,
        tieneAlergias: version.tieneAlergias,
        tieneMedicacionActual: version.tieneMedicacionActual,
        embarazada: version.embarazada,
        expuestoHumoTabaco: version.expuestoHumoTabaco,
        bruxismo: version.bruxismo,
        higieneCepilladosDia: version.higieneCepilladosDia,
        usaHiloDental: version.usaHiloDental,
        ultimaVisitaDental: version.ultimaVisitaDental?.toISOString() || null,
        tieneHabitosSuccion: version.tieneHabitosSuccion,
        lactanciaRegistrada: version.lactanciaRegistrada,
        payload: version.payload,
        motivoCambio: version.motivoCambio,
        reason: version.reason,
        restoredFromVersionId: version.restoredFromVersionId,
        restoredFromVersion: version.restoredFromVersion,
        changeSummary: version.changeSummary,
        ipAddress: version.ipAddress,
        userAgent: version.userAgent,
        createdAt: version.createdAt.toISOString(),
        createdBy: {
          id: version.creadoPor.idUsuario,
          nombre: version.creadoPor.nombreApellido,
          email: version.creadoPor.email,
        },
        consulta: version.consulta,
      },
    })
  } catch (error) {
    console.error("Error fetching version detail:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener versión" },
      { status: 500 }
    )
  }
}

