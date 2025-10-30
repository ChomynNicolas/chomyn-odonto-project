// src/app/api/pacientes/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { prisma as db } from "@/lib/prisma"
import { pacienteFullCreateSchema } from "@/lib/schema/paciente.full"
import { normalizeEmail, normalizePhonePY, splitNombreCompleto } from "@/lib/normalize"
import { auth } from "@/auth"

function mapGeneroToDB(g: string) {
  // Normaliza posibles valores del DTO a los del enum de tu DB
  if (g === "NO_ESPECIFICADO") return "NO_DECLARA"
  return g
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get("q")?.trim() || ""
  const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20"), 100)
  const cursor = searchParams.get("cursor")
  const soloActivos = searchParams.get("soloActivos") !== "false"

  const where: any = { AND: [soloActivos ? { estaActivo: true } : {}] }

  if (q) {
    where.AND.push({
      OR: [
        { persona: { nombres: { contains: q, mode: "insensitive" } } },
        { persona: { apellidos: { contains: q, mode: "insensitive" } } },
        { persona: { documento: { numero: { contains: q, mode: "insensitive" } } } },
        { persona: { contactos: { some: { valorNorm: { contains: q.toLowerCase() } } } } },
      ],
    })
  }

  const items = await db.paciente.findMany({
    where,
    include: {
      persona: {
        select: {
          idPersona: true,
          nombres: true,
          apellidos: true,
          genero: true,
          fechaNacimiento: true,
          documento: { select: { tipo: true, numero: true, ruc: true } },
          contactos: { select: { tipo: true, valorNorm: true, esPrincipal: true, activo: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { idPaciente: Number(cursor) } } : {}),
  })

  let nextCursor: string | null = null
  if (items.length > limit) {
    const next = items.pop()!
    nextCursor = String(next.idPaciente)
  }

  return NextResponse.json({ items, nextCursor })
}

export async function POST(request: NextRequest) {
  // RBAC básico (ADMIN/RECEP/ODONT)
  const session = await auth()
  const rol = (session?.user as any)?.role as string | undefined
  if (!rol || !["ADMIN", "RECEP", "ODONT"].includes(rol)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 })
  }

  try {
    const json = await request.json()
    const dto = pacienteFullCreateSchema.parse(json)

    const { nombres, apellidos } = splitNombreCompleto(dto.nombreCompleto)
    const generoDB = mapGeneroToDB(dto.genero)

    const createdId = await db.$transaction(async (tx) => {
      // Persona + Documento
      const persona = await tx.persona.create({
        data: {
          nombres,
          apellidos,
          genero: generoDB, // enum compatible con tu DB
          fechaNacimiento: dto.fechaNacimiento instanceof Date ? dto.fechaNacimiento : null,
          direccion: dto.domicilio && dto.domicilio !== "" ? dto.domicilio : null,
          estaActivo: true,
          documento: {
            create: {
              tipo: dto.tipoDocumento ?? "CI",
              numero: dto.dni.trim(),
              paisEmision: "PY",
              ruc: dto.ruc && dto.ruc !== "" ? dto.ruc : null,
            },
          },
        },
      })

      // Contacto teléfono (requerido)
      await tx.personaContacto.create({
        data: {
          personaId: persona.idPersona,
          tipo: "PHONE",
          valorRaw: dto.telefono,
          valorNorm: normalizePhonePY(dto.telefono),
          label: "Móvil",
          whatsappCapaz: true,
          smsCapaz: true,
          esPrincipal: true,
          esPreferidoRecordatorio:
            dto.preferenciasContacto?.whatsapp ||
            dto.preferenciasContacto?.sms ||
            dto.preferenciasContacto?.llamada ||
            false,
          esPreferidoCobranza: !(dto.email && dto.preferenciasContacto?.email),
          activo: true,
        },
      })

      // Contacto email (opcional)
      if (dto.email && dto.email !== "") {
        await tx.personaContacto.create({
          data: {
            personaId: persona.idPersona,
            tipo: "EMAIL",
            valorRaw: dto.email,
            valorNorm: normalizeEmail(dto.email)!,
            label: "Correo",
            esPrincipal: true,
            esPreferidoRecordatorio: dto.preferenciasContacto?.email === true,
            esPreferidoCobranza: true,
            activo: true,
          },
        })
      }

      // Paciente (clínicos/financieros simples en JSON o columnas reales si ya las tienes)
      const paciente = await tx.paciente.create({
        data: {
          personaId: persona.idPersona,
          notas: JSON.stringify({
            antecedentesMedicos: dto.antecedentesMedicos || null,
            alergias: dto.alergias || null,
            medicacion: dto.medicacion || null,
            responsablePago: dto.responsablePago || null,
            obraSocial: dto.obraSocial || null,
          }),
          estaActivo: true,
        },
      })

      // (Opcional) AuditLog
      // await tx.auditLog.create({
      //   data: {
      //     actorId: Number(session.user.idUsuario),
      //     action: "PACIENTE_CREATE",
      //     entity: "Paciente",
      //     entityId: String(paciente.idPaciente),
      //     meta: json,
      //   },
      // })

      return paciente.idPaciente
    })

    // Carga para UI
    const item = await db.paciente.findUnique({
      where: { idPaciente: createdId },
      include: {
        persona: {
          select: {
            idPersona: true,
            nombres: true,
            apellidos: true,
            genero: true,
            fechaNacimiento: true,
            documento: { select: { tipo: true, numero: true, ruc: true } },
            contactos: { select: { tipo: true, valorNorm: true, activo: true, esPrincipal: true } },
          },
        },
      },
    })

    // Respuesta plana (facilita tu router.push)
    return NextResponse.json({ idPaciente: createdId, item }, { status: 201 })
  } catch (e: any) {
    const isPrisma = typeof e?.code === "string"
    const msg =
      isPrisma && e.code === "P2002"
        ? "Conflicto de unicidad (documento o contacto ya existe)"
        : e?.errors?.[0]?.message || e?.message || "Error al crear paciente"
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
