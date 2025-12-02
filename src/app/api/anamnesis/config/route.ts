// src/app/api/anamnesis/config/route.ts
// Anamnesis configuration endpoints

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AnamnesisConfigValueSchema } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

/**
 * GET /api/anamnesis/config
 * 
 * Returns global anamnesis configuration.
 * 
 * @returns { data: AnamnesisConfigResponse }
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Get all config entries
    const configs = await prisma.anamnesisConfig.findMany({
      include: {
        updatedBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
      },
      orderBy: {
        key: "asc",
      },
    })

    // Transform to response format
    const response = configs.map((config) => ({
      key: config.key,
      value: config.value as z.infer<typeof AnamnesisConfigValueSchema>,
      description: config.description,
      updatedAt: config.updatedAt.toISOString(),
      updatedBy: {
        idUsuario: config.updatedBy.idUsuario,
        nombreApellido: config.updatedBy.nombreApellido,
      },
    }))

    return NextResponse.json({ data: response }, { status: 200 })
  } catch (error) {
    console.error("Error fetching anamnesis config:", error)
    return NextResponse.json(
      { error: "Error al cargar configuración de anamnesis" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/anamnesis/config
 * 
 * Updates global anamnesis configuration (admin only).
 * 
 * Body: { key: string, value: AnamnesisConfigValue, description?: string }
 * 
 * @returns { data: AnamnesisConfigResponse }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Check if user is admin
    const userId = parseInt(session.user.id, 10)
    const user = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      include: { rol: true },
    })

    if (!user || user.rol.nombreRol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para modificar la configuración" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { key, value, description } = body

    if (!key || !value) {
      return NextResponse.json(
        { error: "key y value son requeridos" },
        { status: 400 }
      )
    }

    // Validate value structure
    const validatedValue = AnamnesisConfigValueSchema.parse(value)

    // Upsert config
    const config = await prisma.anamnesisConfig.upsert({
      where: { key },
      create: {
        key,
        value: validatedValue as Prisma.InputJsonValue,
        description: description || null,
        updatedByUserId: userId,
      },
      update: {
        value: validatedValue as Prisma.InputJsonValue,
        description: description || null,
        updatedByUserId: userId,
      },
      include: {
        updatedBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
      },
    })

    const response = {
      key: config.key,
      value: config.value as z.infer<typeof AnamnesisConfigValueSchema>,
      description: config.description,
      updatedAt: config.updatedAt.toISOString(),
      updatedBy: {
        idUsuario: config.updatedBy.idUsuario,
        nombreApellido: config.updatedBy.nombreApellido,
      },
    }

    return NextResponse.json({ data: response }, { status: 200 })
  } catch (error) {
    console.error("Error updating anamnesis config:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al actualizar configuración de anamnesis" },
      { status: 500 }
    )
  }
}

