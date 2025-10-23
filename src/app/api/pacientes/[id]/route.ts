import { type NextRequest, NextResponse } from "next/server"
import { prisma as db } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const patientId = Number.parseInt(params.id)

    if (!Number.isFinite(patientId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const paciente = await db.paciente.findUnique({
      where: { idPaciente: patientId },
      include: {
        persona: {
          select: {
            idPersona: true,
            nombres: true,
            apellidos: true,
            genero: true,
            fechaNacimiento: true,
            direccion: true,
            documento: { select: { tipo: true, numero: true, ruc: true } },
            contactos: {
              select: { tipo: true, valorNorm: true, label: true, esPrincipal: true, activo: true },
              orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
            },
          },
        },
        citas: {
          where: {
            estado: {
              in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
            },
          },
          include: {
            profesional: {
              include: { persona: { select: { nombres: true, apellidos: true } } },
            },
            consultorio: true,
          },
          orderBy: { inicio: "asc" },
          take: 50,
        },
      },
    })

    if (!paciente) {
      return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    const now = new Date()
    const citasFuturas = paciente.citas.filter((c) => new Date(c.inicio) >= now)
    const citasPasadas = paciente.citas.filter((c) => new Date(c.inicio) < now)

    const nombreCompletoPersona = (p?: { nombres: string | null; apellidos: string | null }) =>
      [p?.nombres ?? "", p?.apellidos ?? ""].join(" ").trim()

    const toCitaLite = (c: any) => ({
      idCita: c.idCita,
      inicio: c.inicio.toISOString(),
      fin: c.fin.toISOString(),
      tipo: c.tipo,
      estado: c.estado,
      profesional: {
        idProfesional: c.profesionalId,
        nombre: nombreCompletoPersona(c.profesional.persona),
      },
      consultorio: c.consultorio ? { idConsultorio: c.consultorio.idConsultorio, nombre: c.consultorio.nombre } : null,
    })

    const proxima = citasFuturas[0]?.inicio ? citasFuturas[0].inicio.toISOString() : null
    const en90dias = citasFuturas.filter((c) => {
      const d = new Date(c.inicio).getTime()
      return d <= now.getTime() + 90 * 24 * 60 * 60 * 1000
    }).length

    const dto = {
      idPaciente: paciente.idPaciente,
      estaActivo: paciente.estaActivo,
      createdAt: paciente.createdAt.toISOString(),
      updatedAt: paciente.updatedAt.toISOString(),
      persona: {
        idPersona: paciente.persona.idPersona,
        nombres: paciente.persona.nombres,
        apellidos: paciente.persona.apellidos,
        genero: paciente.persona.genero,
        fechaNacimiento: paciente.persona.fechaNacimiento?.toISOString() ?? null,
        direccion: paciente.persona.direccion,
        documento: paciente.persona.documento
          ? {
              tipo: paciente.persona.documento.tipo,
              numero: paciente.persona.documento.numero,
              ruc: paciente.persona.documento.ruc,
            }
          : null,
        contactos: paciente.persona.contactos.map((c) => ({
          tipo: c.tipo,
          valorNorm: c.valorNorm,
          label: c.label,
          esPrincipal: c.esPrincipal,
          activo: c.activo,
        })),
      },
      kpis: {
        proximoTurno: proxima,
        turnos90dias: en90dias,
        saldo: 0,
        noShow: 0,
      },
      proximasCitas: citasFuturas.slice(0, 5).map(toCitaLite),
      ultimasCitas: citasPasadas.slice(-5).map(toCitaLite),
    }

    return NextResponse.json({ ok: true, data: dto })
  } catch (error) {
    console.error("[API] Error fetching patient:", error)
    return NextResponse.json({ ok: false, error: "Error al obtener paciente" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const patientId = Number.parseInt(params.id)
    const body = await request.json()

    // Update patient data in transaction
    await db.$transaction(async (tx) => {
      const patient = await tx.paciente.findUnique({
        where: { idPaciente: patientId },
        include: { persona: true },
      })

      if (!patient) {
        throw new Error("Paciente no encontrado")
      }

      // Update persona
      await tx.persona.update({
        where: { idPersona: patient.personaId },
        data: {
          nombres: body.nombreCompleto?.split(" ")[0] || patient.persona.nombres,
          apellidos: body.nombreCompleto?.split(" ").slice(1).join(" ") || patient.persona.apellidos,
          genero: body.genero || patient.persona.genero,
          fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : patient.persona.fechaNacimiento,
          direccion: body.domicilio || patient.persona.direccion,
        },
      })

      // Update paciente notas
      await tx.paciente.update({
        where: { idPaciente: patientId },
        data: {
          notas: JSON.stringify({
            antecedentesMedicos: body.antecedentesMedicos,
            alergias: body.alergias,
            medicacion: body.medicacion,
            responsablePago: body.responsablePago,
            obraSocial: body.obraSocial,
          }),
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[API] Error updating patient:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 500 },
    )
  }
}
