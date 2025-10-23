import { NextResponse } from "next/server"
import { prisma as db } from "@/lib/prisma"
import { normalizeEmail, normalizePhonePY, splitNombreCompleto } from "@/lib/normalize"
import { pacienteQuickCreateSchema } from "@/lib/schema"

/**
 * POST /api/pacientes/quick
 * Quick patient creation endpoint with minimal required fields
 */
export async function POST(req: Request) {
  try {
    const json = await req.json()

    // Validate input with Zod schema
    const parsed = pacienteQuickCreateSchema.parse(json)

    const {nombres,apellidos} = splitNombreCompleto(parsed.nombreCompleto)

    // Create patient with transaction for data consistency
    const result = await db.$transaction(async (tx) => {
      // Create Persona with embedded Documento
      const persona = await tx.persona.create({
        data: {
          nombres: nombres,
          apellidos: apellidos,
          genero: parsed.genero as any,
          fechaNacimiento: parsed.fechaNacimiento ? new Date(parsed.fechaNacimiento) : null,
          estaActivo: true,
          documento: {
            create: {
              tipo: parsed.tipoDocumento,
              numero: parsed.dni.trim(),
              paisEmision: "PY",
            },
          },
        },
      })

      // Create primary phone contact (required)
      await tx.personaContacto.create({
        data: {
          personaId: persona.idPersona,
          tipo: "PHONE",
          valorRaw: parsed.telefono,
          valorNorm: normalizePhonePY(parsed.telefono),
          label: "Móvil",
          whatsappCapaz: true,
          smsCapaz: true,
          esPrincipal: true,
          esPreferidoRecordatorio: true,
          activo: true,
        },
      })

      // Create email contact if provided (optional)
      if (parsed.email) {
        await tx.personaContacto.create({
          data: {
            personaId: persona.idPersona,
            tipo: "EMAIL",
            valorRaw: parsed.email,
            valorNorm: normalizeEmail(parsed.email),
            label: "Trabajo",
            esPrincipal: true,
            esPreferidoCobranza: true,
            activo: true,
          },
        })
      }

      // Create Paciente record
      const paciente = await tx.paciente.create({
        data: {
          personaId: persona.idPersona,
          estaActivo: true,
        },
      })

      return paciente.idPaciente
    })

    // Fetch complete patient data for UI (matches PacienteItem type)
    const item = await db.paciente.findUnique({
      where: { idPaciente: result },
      include: {
        persona: {
          select: {
            idPersona: true,
            nombres: true,
            apellidos: true,
            genero: true,
            documento: {
              select: {
                tipo: true,
                numero: true,
                ruc: true,
              },
            },
            contactos: {
              select: {
                tipo: true,
                valorNorm: true,
                activo: true,
                esPrincipal: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      ok: true,
      data: {
        idPaciente: result,
        item,
      },
    })
  } catch (e: any) {
    // Handle Zod validation errors
    if (e.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          error: "Datos inválidos",
          details: e.errors,
        },
        { status: 400 },
      )
    }

    // Handle Prisma unique constraint violations
    if (e.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          error: "Ya existe un paciente con ese documento o contacto",
        },
        { status: 409 },
      )
    }

    // Generic error handler
    console.error("[API] Error creating patient:", e)
    return NextResponse.json(
      {
        ok: false,
        error: e.message ?? "Error al crear paciente",
      },
      { status: 500 },
    )
  }
}
