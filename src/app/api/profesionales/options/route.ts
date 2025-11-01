// src/app/api/profesionales/options/route.ts
import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
export const revalidate = 0;
export async function GET() {
  const rows = await db.profesional.findMany({
    where: { estaActivo: true },
    include: { persona: { select: { nombres: true, apellidos: true } } },
    orderBy: [{ idProfesional: "asc" }],
  });
  const data = rows.map((r) => ({ id: r.idProfesional, nombre: [r.persona?.nombres, r.persona?.apellidos].filter(Boolean).join(" ") }));
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
