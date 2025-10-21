// src/app/api/pacientes/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

// helper: render nombre profesional
function nombreCompletoPersona(p?: { nombres: string | null; apellidos: string | null }) {
  return [p?.nombres ?? "", p?.apellidos ?? ""].join(" ").trim();
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const paciente = await db.paciente.findUnique({
    where: { idPaciente: id },
    include: {
      persona: {
        select: {
          idPersona: true,
          nombres: true,
          apellidos: true,
          genero: true,
          direccion: true,
          documento: { select: { tipo: true, numero: true, ruc: true } },
          contactos: {
            select: { tipo: true, valorNorm: true, label: true, esPrincipal: true, activo: true },
            orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
          },
        },
      },
      // próximas/últimas citas para KPIs y Timeline
      citas: {
        where: { estado: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] } },
        include: {
          profesional: {
            include: { persona: { select: { nombres: true, apellidos: true } } },
          },
          consultorio: true,
        },
        orderBy: { inicio: "asc" },
      },
    },
  });

  if (!paciente) {
    return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 });
  }

  // transformar citas a DTO corto
  const now = new Date();
  const citasFuturas = paciente.citas.filter(c => new Date(c.inicio) >= now);
  const citasPasadas = paciente.citas.filter(c => new Date(c.inicio) < now);

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
    consultorio: c.consultorio
      ? { idConsultorio: c.consultorio.idConsultorio, nombre: c.consultorio.nombre }
      : null,
  });

  // KPIs
  const proxima = citasFuturas[0]?.inicio ? new Date(citasFuturas[0].inicio).toISOString() : null;
  const en90dias = citasFuturas.filter(c => {
    const d = new Date(c.inicio).getTime();
    return d <= now.getTime() + 90 * 24 * 60 * 60 * 1000;
  }).length;

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
      direccion: paciente.persona.direccion,
      documento: paciente.persona.documento
        ? {
            tipo: paciente.persona.documento.tipo,
            numero: paciente.persona.documento.numero,
            ruc: paciente.persona.documento.ruc,
          }
        : null,
      contactos: paciente.persona.contactos.map(c => ({
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
      saldo: 0, // integrar luego con módulo de cuentas
      noShow: 0, // integrar luego con analytics de turnos
    },
    proximasCitas: citasFuturas.slice(0, 5).map(toCitaLite),
    ultimasCitas: citasPasadas.slice(-5).map(toCitaLite),
  };

  return NextResponse.json({ ok: true, data: dto });
}
