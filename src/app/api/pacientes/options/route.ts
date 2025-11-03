import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma as db } from "@/lib/prisma";
import { requireRole } from "../_rbac";
import {  TipoContacto } from '@prisma/client';

export const revalidate = 0;

const querySchema = z.object({
  q: z.string().trim().min(0).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export async function GET(req: NextRequest) {
  // RBAC
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  // Parseo query
  const sp = req.nextUrl.searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(sp.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Parámetros inválidos" }, { status: 400 });
  }
  const { q, limit } = parsed.data;

  // Heurística: si q = solo dígitos (>=4), prioriza documento
  const qIsDoc = !!q && /^\d{4,}$/.test(q);

  const where = q
    ? {
        AND: [
          { estaActivo: true },
          {
            OR: [
              ...(qIsDoc
                ? [{ persona: { documento: { numero: { contains: q, mode: "insensitive" } } } }]
                : []),
              { persona: { nombres: { contains: q, mode: "insensitive" } } },
              { persona: { apellidos: { contains: q, mode: "insensitive" } } },
            ],
          },
        ],
      }
    : { estaActivo: true };

  const rows = await db.paciente.findMany({
    where,
    take: limit,
    orderBy: [{ idPaciente: "desc" }],
    select: {
      idPaciente: true,
      estaActivo: true,
      persona: {
        select: {
          nombres: true,
          apellidos: true,
          fechaNacimiento: true, // existe en tu schema
          documento: { select: { numero: true } },
          // Sólo contacto PHONE, activo, y ordenado por preferencia
          contactos: {
            where: { activo: true, tipo: TipoContacto.PHONE },
            take: 1,
            orderBy: [
              { esPreferidoRecordatorio: "desc" },
              { esPrincipal: "desc" },
              { createdAt: "asc" },
            ],
            select: {
              // OJO: 'valor' NO existe en tu modelo
              valorNorm: true,
              valorRaw: true,
              label: true,
            },
          },
        },
      },
    },
  });

  const data = rows.map((r) => {
    const nombre =
      [r.persona?.nombres, r.persona?.apellidos].filter(Boolean).join(" ").trim() ||
      `Paciente #${r.idPaciente}`;

    const doc = r.persona?.documento?.numero ?? null;

    // Edad (si hay fechaNacimiento)
    let edad: number | null = null;
    const fn = r.persona?.fechaNacimiento ?? null;
    if (fn) {
      const now = new Date();
      edad =
        now.getFullYear() -
        fn.getFullYear() -
        (now < new Date(now.getFullYear(), fn.getMonth(), fn.getDate()) ? 1 : 0);
    }

    // Contacto: prioriza label -> valorRaw -> valorNorm (sólo PHONE)
    const c = r.persona?.contactos?.[0];
    const contacto = c?.label ?? c?.valorRaw ?? c?.valorNorm ?? null;

    return {
      id: r.idPaciente,
      label: nombre,
      doc,
      edad,
      contacto,
      activo: r.estaActivo,
    };
  });

  return NextResponse.json({ ok: true, items: data }, { headers: { "Cache-Control": "no-store" } });
}
