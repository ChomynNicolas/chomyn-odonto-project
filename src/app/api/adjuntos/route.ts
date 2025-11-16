// src/app/api/adjuntos/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma as db } from "@/lib/prisma";
import { auth } from "@/auth";
import type { AdjuntoTipo, AccessMode } from "@prisma/client";

const CreateAdjunto = z.object({
  pacienteId: z.number().int().positive().optional(),
  procedimientoId: z.number().int().positive().optional(),
  tipo: z.enum(["XRAY", "INTRAORAL_PHOTO", "EXTRAORAL_PHOTO", "IMAGE", "DOCUMENT", "PDF", "LAB_REPORT", "OTHER"]),
  descripcion: z.string().max(500).optional(),
  // Cloudinary info
  publicId: z.string(),
  folder: z.string(),
  resourceType: z.string().optional(),
  format: z.string().optional(),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().int().optional(),
  secureUrl: z.string().url(),
  originalFilename: z.string().optional(),
  accessMode: z.enum(["PUBLIC", "AUTHENTICATED"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // RBAC...

  const json = await req.json();
  const parsed = CreateAdjunto.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 1
  const created = await db.adjunto.create({
    data: {
      pacienteId: data.pacienteId,
      tipo: data.tipo as AdjuntoTipo,
      descripcion: data.descripcion,
      publicId: data.publicId,
      folder: data.folder,
      resourceType: data.resourceType || "auto",
      format: data.format,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
      duration: data.duration,
      secureUrl: data.secureUrl,
      originalFilename: data.originalFilename,
      accessMode: (data.accessMode || "AUTHENTICATED") as AccessMode,
      uploadedByUserId: userId,
    },
  });

  // AuditLog.create("ADJUNTO_CREATE", session.user.id, created.id)
  return NextResponse.json({ ok: true, adjunto: created });
}
