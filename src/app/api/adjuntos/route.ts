// src/app/api/adjuntos/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma as db } from "@/lib/prisma";
import { auth } from "@/auth";

const CreateAdjunto = z.object({
  pacienteId: z.number().int().positive().optional(),
  procedimientoId: z.number().int().positive().optional(),
  tipo: z.enum(["FOTO","RX","LAB","OTRO"]),
  descripcion: z.string().max(500).optional(),
  // Cloudinary info
  publicId: z.string(),
  folder: z.string(),
  resourceType: z.string(),
  format: z.string().optional(),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().optional(),
  secureUrl: z.string().url(),
  originalFilename: z.string().optional(),
  accessMode: z.enum(["PUBLIC","AUTHENTICATED"]).default("AUTHENTICATED"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // RBAC...

  const json = await req.json();
  const parsed = CreateAdjunto.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const created = await db.adjunto.create({
    data: {
      ...data,
      createdById: /* session.user.id */ 1,
    },
  });

  // AuditLog.create("ADJUNTO_CREATE", session.user.id, created.id)
  return NextResponse.json({ ok: true, adjunto: created });
}
