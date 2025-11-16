// src/app/api/adjuntos/[id]/signed-url/route.ts
import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { prisma as db } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // RBAC: validar acceso al paciente/procedimiento del adjunto

  const { id: idParam } = await params;
  const id = Number(idParam);
  const adj = await db.adjunto.findUnique({ where: { idAdjunto: id } });
  if (!adj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Para AUTHENTICATED: firmar delivery con expiración
  const isAuthenticated = adj.accessMode === "AUTHENTICATED";

  // Ejemplo: transformación de preview (thumbnail)
  const url = cloudinary.url(adj.publicId, {
    sign_url: isAuthenticated,
    type: "authenticated",        // delivery type
    secure: true,
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    // expiración en segundos (query param `exp` lo maneja cloudinary.url con sign_url)
    // Nota: en SDK v2, sign_url crea token con tiempo actual (no custom exp). Alternativa: use cookies o proxy.
  });

  return NextResponse.json({ ok: true, url });
}
