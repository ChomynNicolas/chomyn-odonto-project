// src/app/api/pacientes/[id]/historia/route.ts
import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  // valida que el paciente existe (si no, 404 coherente)
  const exists = await db.paciente.findUnique({ where: { idPaciente: id }, select: { idPaciente: true } });
  if (!exists) {
    return NextResponse.json({ ok: false, error: "Paciente no encontrado" }, { status: 404 });
  }

  // TODO: remplazar por SELECTs reales de tus tablas
  const data = {
    antecedentesMedicos: null,
    alergias: null,
    medicacion: null,
    evoluciones: [] as unknown[],
  };

  return NextResponse.json({ ok: true, data });
}
