// src/app/api/agenda/citas/calendar/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma as db } from "@/lib/prisma";

export const revalidate = 0;

const qSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  prof: z.string().optional(),
  cons: z.string().optional(),
  est: z.string().optional(),
  tip: z.string().optional(),
});

function toInts(csv?: string | null) {
  if (!csv) return undefined;
  const arr = csv.split(",").map(Number).filter((n) => !Number.isNaN(n));
  return arr.length ? arr : undefined;
}
const fn = (p?: { nombres?: string | null; apellidos?: string | null }) =>
  [p?.nombres, p?.apellidos].filter(Boolean).join(" ");

export async function GET(req: NextRequest) {
  const parsed = qSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
  if (!parsed.success) return NextResponse.json([], { status: 400 });

  const { start, end, prof, cons, est, tip } = parsed.data;
  const startDt = new Date(start); const endDt = new Date(end);
  if (Number.isNaN(+startDt) || Number.isNaN(+endDt)) return NextResponse.json([], { status: 400 });

  const where: any = { inicio: { gte: startDt, lt: endDt } };
  const profIds = toInts(prof); if (profIds) where.profesionalId = { in: profIds };
  const consIds = toInts(cons); if (consIds) where.consultorioId = { in: consIds };
  if (est) where.estado = { in: est.split(",") as any };
  if (tip) where.tipo = { in: tip.split(",") as any };

  const citas = await db.cita.findMany({
    where,
    include: {
      paciente: { include: { persona: { select: { nombres: true, apellidos: true } } } },
      profesional: { include: { persona: { select: { nombres: true, apellidos: true } } } },
      consultorio: { select: { idConsultorio: true, nombre: true, colorHex: true } },
    },
    orderBy: [{ inicio: "asc" }],
  });

  const events = citas.map((c) => ({
    id: c.idCita,
    title: `${fn(c.paciente.persona)} — ${c.motivo ?? c.tipo}`,
    start: c.inicio.toISOString(),
    end: c.fin.toISOString(),
    backgroundColor: c.consultorio?.colorHex ?? undefined,
    borderColor: c.consultorio?.colorHex ?? undefined,
    extendedProps: {
      estado: c.estado,
      profesionalId: c.profesionalId,
      profesionalNombre: fn(c.profesional.persona),
      consultorioId: c.consultorioId,
      consultorioNombre: c.consultorio?.nombre ?? null,
      consultorioColorHex: c.consultorio?.colorHex ?? null,
      urgencia: c.tipo === "URGENCIA",
      primeraVez: false,
      planActivo: false,
    },
  }));

  return NextResponse.json(events, { headers: { "Cache-Control": "no-store" } });
}
