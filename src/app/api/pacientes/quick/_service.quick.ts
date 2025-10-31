// src/app/api/pacientes/quick/_service.quick.ts
import { prisma } from "@/lib/prisma"
import { pacienteRepo } from "@/app/api/pacientes/_repo"
import type { PacienteQuickCreateDTO } from "./_schemas"
import { splitNombreCompleto, mapGeneroToDB } from "./_dto"
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize"
import type { Prisma } from "@prisma/client"

export class QuickCreateError extends Error {
  code: "VALIDATION_ERROR" | "UNIQUE_CONFLICT" | "INTERNAL_ERROR"
  status: number
  constructor(code: QuickCreateError["code"], message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export type QuickCreateResult = {
  idPaciente: number
  idPersona: number
  item: Awaited<ReturnType<typeof pacienteRepo.getPacienteUI>>
}

/** Convierte YYYY-MM-DD a Date UTC 00:00:00; null si no aplica */
function toDateUTCFromYYYYMMDD(v?: string): Date | null {
  if (!v) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0))
}

function isPrismaUniqueError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return !!e && typeof e === "object" && (e as any).code === "P2002"
}

export async function quickCreatePaciente(
  input: PacienteQuickCreateDTO,
  actorUserId?: number
): Promise<QuickCreateResult> {
  const { nombres, apellidos } = splitNombreCompleto(input.nombreCompleto)
  const generoDB = mapGeneroToDB(input.genero)

  const phoneNorm = normalizePhonePY(input.telefono)
  if (!phoneNorm) throw new QuickCreateError("VALIDATION_ERROR", "Teléfono inválido o no normalizable", 400)

  let emailNorm: string | undefined
  if (input.email) {
    emailNorm = normalizeEmail(input.email) ?? undefined
    if (!emailNorm) throw new QuickCreateError("VALIDATION_ERROR", "Email inválido", 400)
  }

  // Pre-check documento
  const docExists = await prisma.documento.findFirst({
    where: { tipo: input.tipoDocumento as any, numero: input.dni.trim() },
    select: { idDocumento: true },
  })
  if (docExists) throw new QuickCreateError("UNIQUE_CONFLICT", "Ya existe un paciente con ese documento", 409)

  try {
    const { idPaciente, idPersona } = await prisma.$transaction(async (tx) => {
      const persona = await pacienteRepo.createPersonaConDocumento(tx, {
        nombres,
        apellidos,
        genero: generoDB,
        fechaNacimiento: toDateUTCFromYYYYMMDD(input.fechaNacimiento),
        direccion: null,
        doc: {
          tipo: input.tipoDocumento,
          numero: input.dni.trim(),
          ruc: null,
          paisEmision: "PY",
        },
      })

      await pacienteRepo.createContactoTelefono(tx, {
        personaId: persona.idPersona,
        valorRaw: input.telefono,
        valorNorm: phoneNorm,
        prefer: { recordatorio: true, cobranza: !emailNorm },
      })

      if (emailNorm) {
        await pacienteRepo.createContactoEmail(tx, {
          personaId: persona.idPersona,
          valorRaw: input.email!,
          valorNorm: emailNorm,
          prefer: { recordatorio: true, cobranza: true },
        })
      }

      const paciente = await pacienteRepo.createPaciente(tx, {
        personaId: persona.idPersona,
        notasJson: {},
      })

      // Auditoría opcional…

      return { idPaciente: paciente.idPaciente, idPersona: persona.idPersona }
    })

    const item = await pacienteRepo.getPacienteUI(idPaciente)
    return { idPaciente, idPersona, item }
  } catch (e: any) {
    if (isPrismaUniqueError(e)) {
      throw new QuickCreateError("UNIQUE_CONFLICT", "Ya existe un paciente con ese documento o contacto", 409)
    }
    throw e
  }
}
