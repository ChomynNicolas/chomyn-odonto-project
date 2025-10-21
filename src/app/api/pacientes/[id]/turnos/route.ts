// src/app/api/pacientes/[id]/turnos/route.ts
import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

// Estados de tu enum:
// SCHEDULED | CONFIRMED | CHECKED_IN | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW
const FUTURE_STATES = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const exists = await db.paciente.findUnique({
    where: { idPaciente: id },
    select: { idPaciente: true },
  });
  if (!exists) {
    return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 });
  }

  const now = new Date();

  // Próximos (futuros / en curso)
  const proximos = await db.cita.findMany({
    where: {
      pacienteId: id,
      OR: [
        { inicio: { gte: now }, estado: { in: FUTURE_STATES as any } },
        { inicio: { lte: now }, fin: { gte: now }, estado: { in: FUTURE_STATES as any } }, // en curso
      ],
    },
    include: {
      profesional: { include: { persona: true } },
      consultorio: true,
    },
    orderBy: [{ inicio: "asc" }],
    take: 50,
  });

  // Pasados (completados)
  const pasados = await db.cita.findMany({
    where: {
      pacienteId: id,
      fin: { lt: now },
      estado: "COMPLETED",
    },
    include: {
      profesional: { include: { persona: true } },
      consultorio: true,
    },
    orderBy: [{ inicio: "desc" }],
    take: 50,
  });

  // No show
  const noShow = await db.cita.findMany({
    where: { pacienteId: id, estado: "NO_SHOW" },
    include: {
      profesional: { include: { persona: true } },
      consultorio: true,
    },
    orderBy: [{ inicio: "desc" }],
    take: 50,
  });

  const mapTurno = (c: any) => {
    const inicio = new Date(c.inicio);
    const fin = new Date(c.fin);
    const profesionalNombre = [c.profesional?.persona?.nombres, c.profesional?.persona?.apellidos].filter(Boolean).join(" ").trim();
    return {
      id: c.idCita,
      fecha: inicio.toISOString(),
      fin: fin.toISOString(),
      motivo: c.motivo,
      tipo: c.tipo,
      estado: c.estado,
      profesional: profesionalNombre || "—",
      consultorio: c.consultorio?.nombre ?? null,
      duracionMin: Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 60000)),
    };
  };

  const data = {
    proximos: proximos.map(mapTurno),
    pasados: pasados.map(mapTurno),
    noShow: noShow.map(mapTurno),
  };

  return NextResponse.json({ ok: true, data });
}
