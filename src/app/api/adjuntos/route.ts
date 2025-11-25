// src/app/api/adjuntos/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma as db } from "@/lib/prisma";
import { auth } from "@/auth";
import type { AdjuntoTipo, AccessMode } from "@prisma/client";
import {
  MAX_FILE_SIZE_BYTES,
  validateFileSize,
  validateFileExtension,
  ALLOWED_MIME_TYPES,
} from "@/lib/validation/file-validation";
import { auditAttachmentCreate } from "@/lib/audit/attachments";

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

  // Validate file metadata before creating database record
  // 1. Validate file size
  if (data.bytes > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // 2. Validate format (if provided)
  if (data.format) {
    const allowedFormats = ["jpg", "jpeg", "png", "gif", "webp", "dcm", "pdf"];
    if (!allowedFormats.includes(data.format.toLowerCase())) {
      return NextResponse.json(
        { error: `Formato de archivo no permitido: ${data.format}` },
        { status: 400 }
      );
    }
  }

  // 3. Validate filename extension (if provided)
  if (data.originalFilename) {
    const extValidation = validateFileExtension(data.originalFilename);
    if (!extValidation.valid) {
      return NextResponse.json(
        { error: extValidation.error },
        { status: 400 }
      );
    }
  }

  // 4. Cross-validate format and resourceType consistency
  if (data.format && data.resourceType) {
    const formatLower = data.format.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "dcm"].includes(formatLower);
    const isPDF = formatLower === "pdf";
    
    if (isPDF && data.resourceType !== "raw" && data.resourceType !== "auto") {
      return NextResponse.json(
        { error: "Los archivos PDF deben tener resourceType 'raw' o 'auto'" },
        { status: 400 }
      );
    }
    if (isImage && data.resourceType === "raw" && data.resourceType !== "auto") {
      // Allow auto, but warn if it's explicitly raw for an image
      console.warn(`[API] Image file with resourceType 'raw': ${data.originalFilename}`);
    }
  }

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

  // Audit logging - AFTER successful creation
  try {
    await auditAttachmentCreate({
      actorId: userId,
      entityId: created.idAdjunto,
      metadata: {
        pacienteId: data.pacienteId ?? 0,
        consultaId: null,
        procedimientoId: data.procedimientoId ?? null,
        tipo: created.tipo,
        format: created.format ?? null,
        bytes: created.bytes,
        originalFilename: created.originalFilename ?? null,
        publicId: created.publicId,
        accessMode: created.accessMode,
        descripcion: created.descripcion ?? null,
        source: data.procedimientoId ? "procedure" : data.pacienteId ? "patient" : "general",
        path: req.url,
      },
      headers: req.headers,
      path: req.url,
    })
  } catch (auditError) {
    console.error("[audit] Failed to log attachment creation:", auditError)
  }

  return NextResponse.json({ ok: true, adjunto: created });
}
