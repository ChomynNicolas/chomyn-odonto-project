import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { cloudinary } from "@/lib/cloudinary"
import { requireRole } from "@/app/api/pacientes/_rbac"

function jsonError(status: number, code: string, error: string, details?: unknown) {
  return NextResponse.json({ ok: false, code, error, ...(details ? { details } : {}) }, { status })
}
function jsonOk<T>(data: T, status = 200) {
  const res = NextResponse.json({ ok: true, data }, { status })
  res.headers.set("Cache-Control", "no-store")
  return res
}

const AdjuntoTipoEnum = z.enum([
  "XRAY",
  "INTRAORAL_PHOTO",
  "EXTRAORAL_PHOTO",
  "IMAGE",
  "DOCUMENT",
  "PDF",
  "LAB_REPORT",
  "OTHER",
])

const Body = z.object({
  pacienteId: z.number().int().positive().optional(),
  procedimientoId: z.number().int().positive().optional(),
  tipo: AdjuntoTipoEnum, // carpeta según tipo
  accessMode: z.enum(["PUBLIC", "AUTHENTICATED"]).optional(),
  publicId: z.string().min(3).max(180).regex(/^[a-zA-Z0-9/_-]+$/).optional(),
})

export async function POST(req: NextRequest) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  let raw: unknown
  try { raw = await req.json() } catch { return jsonError(400, "VALIDATION_ERROR", "JSON inválido") }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Body inválido", parsed.error.issues)

  const { pacienteId, procedimientoId, tipo, publicId } = parsed.data
  const accessMode = parsed.data.accessMode ?? ((process.env.CLOUDINARY_DEFAULT_ACCESS_MODE?.toUpperCase() as "PUBLIC"|"AUTHENTICATED") || "AUTHENTICATED")

  const ts = Math.floor(Date.now() / 1000)
  const folderBase = process.env.CLOUDINARY_BASE_FOLDER || "chomyn/dev"
  const folder = [
    folderBase,
    pacienteId ? `pacientes/${pacienteId}` : "otros",
    procedimientoId ? `procedimientos/${procedimientoId}` : "sin-procedimiento",
    tipo.toLowerCase(), // p.ej. "xray", "pdf", "image"
  ].join("/")

  const params: Record<string, string> = {
    timestamp: String(ts),
    folder,
    access_mode: accessMode.toLowerCase(),
    ...(publicId ? { public_id: publicId } : {}),
  }

  const secret = process.env.CLOUDINARY_API_SECRET
  if (!secret) return jsonError(500, "CONFIG_ERROR", "Falta CLOUDINARY_API_SECRET")

  const signature = cloudinary.utils.api_sign_request(params, secret)

  return jsonOk({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp: ts,
    signature,
    folder,
    accessMode,
    publicId: publicId ?? null,
  })
}
