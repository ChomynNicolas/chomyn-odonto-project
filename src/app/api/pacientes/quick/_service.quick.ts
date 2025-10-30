// src/app/api/pacientes/quick/_service.quick.ts
import { prisma } from "@/lib/prisma";
import { pacienteRepo } from "@/app/api/pacientes/_repo";
import type { PacienteQuickCreateDTO } from "./_schemas";
import { splitNombreCompleto, mapGeneroToDB } from "./_dto";
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize";

export class QuickCreateError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Alta rápida mínima. 
 * - Persona + Documento + Contacto PHONE (required) + EMAIL (opcional) + Paciente
 * - Devuelve un item listo para UI.
 * - Si existe conflicto único (P2002), emite error 'UNIQUE_CONFLICT'.
 * - (Opcional) idempotenciaKey puede persistirse en una tabla si lo necesitas.
 */
export async function quickCreatePaciente(input: PacienteQuickCreateDTO, actorUserId?: number) {
  const { nombres, apellidos } = splitNombreCompleto(input.nombreCompleto);
  const generoDB = mapGeneroToDB(input.genero);

  // Pre-chequeo simple para mensaje más claro (evita ir directo a P2002)
  const docExists = await prisma.documento.findFirst({
    where: { tipo: input.tipoDocumento as any, numero: input.dni.trim() },
    select: { idDocumento: true },
  });
  if (docExists) {
    throw new QuickCreateError("UNIQUE_CONFLICT", "Ya existe un paciente con ese documento", 409);
  }

  try {
    const createdId = await prisma.$transaction(async (tx) => {
      const persona = await pacienteRepo.createPersonaConDocumento(tx, {
        nombres,
        apellidos,
        genero: generoDB,
        fechaNacimiento: input.fechaNacimiento ? new Date(input.fechaNacimiento) : null,
        direccion: null,
        doc: {
          tipo: input.tipoDocumento,
          numero: input.dni.trim(),
          ruc: null,
          paisEmision: "PY",
        },
      });

      await pacienteRepo.createContactoTelefono(tx, {
        personaId: persona.idPersona,
        valorRaw: input.telefono,
        valorNorm: normalizePhonePY(input.telefono),
        // en quick, recordatorio por phone y cobranza por email si hay
        prefer: { recordatorio: true, cobranza: !input.email },
      });

      if (input.email) {
        const norm = normalizeEmail(input.email);
        if (norm) {
          await pacienteRepo.createContactoEmail(tx, {
            personaId: persona.idPersona,
            valorRaw: input.email,
            valorNorm: norm,
            prefer: { recordatorio: true, cobranza: true },
          });
        }
      }

      const paciente = await pacienteRepo.createPaciente(tx, {
        personaId: persona.idPersona,
        notasJson: {}, // quick no completa historial clínico
      });

      // (Opcional) AuditLog PACIENTE_CREATE_QUICK
      // await tx.auditLog.create({ data: { actorId: actorUserId ?? null, action: "PACIENTE_CREATE_QUICK", entity: "Paciente", entityId: String(paciente.idPaciente), meta: input } });

      return paciente.idPaciente;
    });

    const item = await pacienteRepo.getPacienteUI(createdId);

    return { idPaciente: createdId, item };
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new QuickCreateError("UNIQUE_CONFLICT", "Ya existe un paciente con ese documento o contacto", 409);
    }
    throw e;
  }
}
