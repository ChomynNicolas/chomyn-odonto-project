import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { prisma as db } from "@/lib/prisma"
import { requireRole } from "@/app/api/pacientes/_rbac"

function jsonError(status: number, code: string, error: string, details?: any) {
  return NextResponse.json({ ok: false, code, error, ...(details ? { details } : {}) }, { status })
}
function jsonOk(data: any, status = 200) {
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

const AccessModeEnum = z.enum(["PUBLIC", "AUTHENTICATED"])

const PersistBody = z.object({
  // Cloudinary meta (obligatorios)
  publicId: z.string().min(3),
  secureUrl: z.string().url(),
  bytes: z.number().int().positive(),
  resourceType: z.string(),            // "image" | "video" | "raw" | "auto"
  folder: z.string(),
  // opcionales
  format: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(), // si subes videos
  originalFilename: z.string().optional(),
  etag: z.string().optional(),
  version: z.number().int().optional(),
  // Control
  accessMode: AccessModeEnum.optional(),   // default AUTHENTICATED
  tipo: AdjuntoTipoEnum,                   // tu enum clínico
  descripcion: z.string().max(500).optional(),
})

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  const pacienteId = Number(ctx.params.id)
  if (!Number.isFinite(pacienteId)) return jsonError(400, "VALIDATION_ERROR", "ID de paciente inválido")

  const exists = await db.paciente.findUnique({ where: { idPaciente: pacienteId }, select: { idPaciente: true } })
  if (!exists) return jsonError(404, "NOT_FOUND", "Paciente no encontrado")

  const items = await db.adjunto.findMany({
    where: { pacienteId },
    orderBy: { createdAt: "desc" },
    select: {
      idAdjunto: true,
      tipo: true,
      descripcion: true,
      publicId: true,
      folder: true,
      resourceType: true,
      format: true,
      bytes: true,
      width: true,
      height: true,
      duration: true,
      originalFilename: true,
      accessMode: true,
      secureUrl: true,
      createdAt: true,
      uploadedByUserId: true,
    },
  })

  return jsonOk({ items })
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  const pacienteId = Number(ctx.params.id)
  if (!Number.isFinite(pacienteId)) return jsonError(400, "VALIDATION_ERROR", "ID de paciente inválido")

  let raw: unknown
  try { raw = await req.json() } catch { return jsonError(400, "VALIDATION_ERROR", "JSON inválido") }
  const parsed = PersistBody.safeParse(raw)
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Body inválido", parsed.error.issues)
  const body = parsed.data

  // Validación defensiva de folder ↔ paciente
  if (!body.folder.includes(`/pacientes/${pacienteId}`)) {
    return jsonError(400, "VALIDATION_ERROR", "El folder no corresponde al paciente")
  }

  // AccessMode por default
  const accessMode = body.accessMode ?? "AUTHENTICATED"

  // Único global: publicId (tu modelo lo tiene unique)
  // Si ya existe, retornamos 200 idempotente
  const existing = await db.adjunto.findUnique({ where: { publicId: body.publicId }, select: { idAdjunto: true } })
  if (existing) {
    return jsonOk({ item: { idAdjunto: existing.idAdjunto, pacienteId } })
  }

  const created = await db.adjunto.create({
    data: {
      pacienteId,
      tipo: body.tipo as any,
      descripcion: body.descripcion,
      // cloudinary
      publicId: body.publicId,
      folder: body.folder,
      resourceType: body.resourceType,
      format: body.format,
      bytes: body.bytes,
      width: body.width,
      height: body.height,
      duration: body.duration,
      originalFilename: body.originalFilename,
      accessMode: accessMode as any,
      secureUrl: body.secureUrl,
      // auditoría
      uploadedByUserId: gate.userId!,
    },
    select: {
      idAdjunto: true, pacienteId: true, tipo: true, publicId: true, secureUrl: true, createdAt: true,
    },
  })

  return jsonOk({ item: created }, 201)
}
