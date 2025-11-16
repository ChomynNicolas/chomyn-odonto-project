// src/app/api/pacientes/[id]/anamnesis/route.ts
// MVP: Anamnesis API endpoints
// Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 54-173

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AnamnesisMVPBodySchema } from "./_schemas.mvp"
import { z } from "zod"

/**
 * GET /api/pacientes/[id]/anamnesis
 * 
 * Retrieves the current anamnesis for a patient.
 * Returns null if no anamnesis exists yet.
 * 
 * Satisfies requirement: "GET /api/pacientes/[id]/anamnesis" (line 181)
 * 
 * @returns { data: PatientAnamnesis | null }
 */
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

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Fetch anamnesis with user information
    const anamnesis = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
      include: {
        creadoPor: { select: { idUsuario: true, nombreApellido: true } },
        actualizadoPor: { select: { idUsuario: true, nombreApellido: true } },
      },
    })

    if (!anamnesis) {
      return NextResponse.json({ data: null }, { status: 200 })
    }

    // Transform to response format
    return NextResponse.json({
      data: {
        idPatientAnamnesis: anamnesis.idPatientAnamnesis,
        pacienteId: anamnesis.pacienteId,
        tipo: anamnesis.tipo,
        motivoConsulta: anamnesis.motivoConsulta,
        payload: anamnesis.payload as Record<string, any>,
        creadoPor: {
          idUsuario: anamnesis.creadoPor.idUsuario,
          nombreApellido: anamnesis.creadoPor.nombreApellido,
        },
        actualizadoPor: anamnesis.actualizadoPor
          ? {
              idUsuario: anamnesis.actualizadoPor.idUsuario,
              nombreApellido: anamnesis.actualizadoPor.nombreApellido,
            }
          : null,
        createdAt: anamnesis.createdAt.toISOString(),
        updatedAt: anamnesis.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching anamnesis:", error)
    return NextResponse.json({ error: "Error al cargar anamnesis" }, { status: 500 })
  }
}

/**
 * POST /api/pacientes/[id]/anamnesis
 * 
 * Creates or updates anamnesis for a patient.
 * Automatically determines tipo (ADULTO vs PEDIATRICO) based on patient age.
 * Creates version history when updating existing anamnesis.
 * 
 * Satisfies requirement: "POST /api/pacientes/[id]/anamnesis" (line 185)
 * 
 * @returns { data: PatientAnamnesis }
 */
export async function POST(
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
    const userId = parseInt(session.user.id, 10)

    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
    }

    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    // Parse and validate request body
    const body = await req.json()
    const data = AnamnesisMVPBodySchema.parse(body)

    // Verify patient exists and get age for tipo determination
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      include: { persona: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Determine tipo (ADULTO vs PEDIATRICO) based on age
    // Reference: ANAMNESIS_MVP_IMPLEMENTATION.md line 127
    let tipo: "ADULTO" | "PEDIATRICO" = "ADULTO"
    if (paciente.persona.fechaNacimiento) {
      const fechaNacimiento = new Date(paciente.persona.fechaNacimiento)
      const hoy = new Date()
      const edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
      const mesDiff = hoy.getMonth() - fechaNacimiento.getMonth()
      const diaDiff = hoy.getDate() - fechaNacimiento.getDate()
      const edadExacta = edad - (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0) ? 1 : 0)
      tipo = edadExacta < 18 ? "PEDIATRICO" : "ADULTO"
    }

    // Build payload JSON from optional fields
    // Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 109-116
    const payload = {
      historyOfPresentIllness: data.historyOfPresentIllness || "",
      pastMedicalHistory: data.pastMedicalHistory || "",
      currentMedications: data.currentMedications || "",
      allergies: data.allergies || "",
      noKnownAllergies: data.noKnownAllergies || false,
      doctorNotes: data.doctorNotes || "",
    }

    // Check if anamnesis already exists for versioning
    const existing = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
    })

    // Upsert anamnesis (create or update)
    // Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 134-153
    const anamnesis = await prisma.$transaction(async (tx) => {
      const result = await tx.patientAnamnesis.upsert({
        where: { pacienteId },
        create: {
          pacienteId,
          tipo,
          motivoConsulta: data.motivoConsulta,
          payload,
          creadoPorUserId: userId,
        },
        update: {
          motivoConsulta: data.motivoConsulta,
          payload,
          actualizadoPorUserId: userId,
          updatedAt: new Date(),
        },
        include: {
          creadoPor: { select: { idUsuario: true, nombreApellido: true } },
          actualizadoPor: { select: { idUsuario: true, nombreApellido: true } },
        },
      })

      // Create version history if updating existing anamnesis
      // Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 155-169
      if (existing) {
        await tx.patientAnamnesisVersion.create({
          data: {
            pacienteId,
            anamnesisId: result.idPatientAnamnesis,
            consultaId: data.consultaId || null,
            tipo: existing.tipo,
            motivoConsulta: existing.motivoConsulta,
            dolorIntensidad: existing.dolorIntensidad,
            tieneDolorActual: existing.tieneDolorActual,
            urgenciaPercibida: existing.urgenciaPercibida,
            tieneEnfermedadesCronicas: existing.tieneEnfermedadesCronicas,
            tieneAlergias: existing.tieneAlergias,
            tieneMedicacionActual: existing.tieneMedicacionActual,
            embarazada: existing.embarazada,
            expuestoHumoTabaco: existing.expuestoHumoTabaco,
            bruxismo: existing.bruxismo,
            higieneCepilladosDia: existing.higieneCepilladosDia,
            usaHiloDental: existing.usaHiloDental,
            ultimaVisitaDental: existing.ultimaVisitaDental,
            tieneHabitosSuccion: existing.tieneHabitosSuccion,
            lactanciaRegistrada: existing.lactanciaRegistrada,
            payload: existing.payload as object,
            motivoCambio: "Actualización desde consulta",
            creadoPorUserId: userId,
          },
        })
      }

      return result
    })

    // Transform to response format
    return NextResponse.json(
      {
        data: {
          idPatientAnamnesis: anamnesis.idPatientAnamnesis,
          pacienteId: anamnesis.pacienteId,
          tipo: anamnesis.tipo,
          motivoConsulta: anamnesis.motivoConsulta,
          payload: anamnesis.payload as Record<string, any>,
          creadoPor: {
            idUsuario: anamnesis.creadoPor.idUsuario,
            nombreApellido: anamnesis.creadoPor.nombreApellido,
          },
          actualizadoPor: anamnesis.actualizadoPor
            ? {
                idUsuario: anamnesis.actualizadoPor.idUsuario,
                nombreApellido: anamnesis.actualizadoPor.nombreApellido,
              }
            : null,
          createdAt: anamnesis.createdAt.toISOString(),
          updatedAt: anamnesis.updatedAt.toISOString(),
        },
      },
      { status: existing ? 200 : 201 }
    )
  } catch (error) {
    console.error("Error saving anamnesis:", error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      )
    }

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: any }
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una anamnesis para este paciente" },
          { status: 409 }
        )
      }
    }

    return NextResponse.json({ error: "Error al guardar anamnesis" }, { status: 500 })
  }
}

