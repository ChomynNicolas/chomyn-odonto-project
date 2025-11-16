// src/app/api/profesionales/options/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
export const revalidate = 0;

const qs = z.object({
  q: z.string().trim().min(0).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50), // por defecto conservamos tu comportamiento “todos”
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { q, limit } = qs.parse(Object.fromEntries(sp.entries()));

  // Construir where con tipos explícitos para Prisma
  const whereAND: Prisma.ProfesionalWhereInput[] = [{ estaActivo: true }];
  
  if (q) {
    const orConditions: Prisma.ProfesionalWhereInput[] = [
      { persona: { nombres: { contains: q, mode: "insensitive" } } },
      { persona: { apellidos: { contains: q, mode: "insensitive" } } },
    ];
    whereAND.push({ OR: orConditions });
  }

  const where: Prisma.ProfesionalWhereInput = { AND: whereAND };

  const rows = await db.profesional.findMany({
    where,
    take: limit,
    include: { persona: { select: { nombres: true, apellidos: true } } },
    orderBy: [{ idProfesional: "asc" }],
  });

  const data = rows.map((r) => ({
    id: r.idProfesional,
    nombre: [r.persona?.nombres, r.persona?.apellidos].filter(Boolean).join(" "),
  }));
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
