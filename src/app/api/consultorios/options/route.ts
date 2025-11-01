import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export const revalidate = 0; // no cache

export async function GET() {
  const rows = await db.consultorio.findMany({
    where: { activo: true },
    select: { idConsultorio: true, nombre: true },
    orderBy: [{ idConsultorio: "asc" }],
  });

  const data = rows.map((c) => ({ id: c.idConsultorio, nombre: c.nombre }));

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
