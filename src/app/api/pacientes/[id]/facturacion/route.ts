// src/app/api/pacientes/[id]/facturacion/route.ts
import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

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

  // TODO: Reemplazar cuando tengas tablas de facturación/pagos
  const facturas: unknown[] = [];
  const pagos: unknown[] = [];
  const deudas: unknown[] = [];
  const saldo = 0;

  return NextResponse.json({ ok: true, data: { facturas, pagos, deudas, saldo } });
}
