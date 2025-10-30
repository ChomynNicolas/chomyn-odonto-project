// src/app/api/uploads/sign/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { cloudinary } from "@/lib/cloudinary";
import { auth } from "@/auth";
// TODO: integra NextAuth y RBAC reales

const SignBody = z.object({
  pacienteId: z.number().int().positive().optional(),
  procedimientoId: z.number().int().positive().optional(),
  tipo: z.enum(["FOTO", "RX", "LAB", "OTRO"]),
  accessMode: z.enum(["PUBLIC","AUTHENTICATED"]).default(
    (process.env.CLOUDINARY_DEFAULT_ACCESS_MODE?.toUpperCase() as "PUBLIC"|"AUTHENTICATED") ?? "AUTHENTICATED"
  ),
  // Opcional: para idempotencia/nombre controlado
  publicId: z.string().min(3).max(120).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // TODO: verifica rol (ADMIN|ODONT|RECEP) y permisos por paciente

  const json = await req.json();
  const parsed = SignBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { pacienteId, procedimientoId, tipo, accessMode, publicId } = parsed.data;

  const ts = Math.floor(Date.now() / 1000);

  const folderBase = process.env.CLOUDINARY_BASE_FOLDER || "chomyn/dev";
  const folderParts = [
    folderBase,
    pacienteId ? `pacientes/${pacienteId}` : "otros",
    procedimientoId ? `procedimientos/${procedimientoId}` : "sin-procedimiento",
    tipo.toLowerCase(),
  ];
  const folder = folderParts.join("/");

  // Parâmetros de subida fija: recurso tipo image por defecto (el widget detecta)
  const paramsToSign: Record<string, string> = {
    timestamp: String(ts),
    folder,
    access_mode: accessMode.toLowerCase(), // "authenticated" | "public"
    // eager transform opcional (thumbnails)
    // eager: "c_fill,w_640,h_480/q_auto:eco",
    ...(publicId ? { public_id: publicId } : {}),
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string
  );

  return NextResponse.json({
    ok: true,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp: ts,
    signature,
    folder,
    accessMode,
    publicId: publicId || null,
  });
}
