// src/app/api/pacientes/_service.create.ts
import type { PacienteCreateBody } from "./_schemas";
import { pacienteRepo } from "./_repo";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize";
import { splitNombreCompleto, mapGeneroToDB } from "./_dto";

/**
 * Crea paciente + persona + documento + contactos (+ responsablePago opcional).
 * Devuelve: idPaciente + item UI (consistente con la lista y la vista detalle).
 */
export async function createPaciente(body: PacienteCreateBody, actorUserId?: number) {
  const { nombres, apellidos } = splitNombreCompleto(body.nombreCompleto);
  const generoDB = body.genero ? mapGeneroToDB(body.genero) : null;

  const preferRecordatorio =
    !!(body.preferenciasContacto?.whatsapp || body.preferenciasContacto?.sms || body.preferenciasContacto?.llamada);

  const createdId = await prisma.$transaction(async (tx) => {
    // Persona + Documento
    const persona = await pacienteRepo.createPersonaConDocumento(tx, {
      nombres,
      apellidos,
      genero: generoDB,
      fechaNacimiento: body.fechaNacimiento ?? null,
      direccion: body.domicilio ?? null,
      doc: {
        tipo: body.tipoDocumento ?? "CI",
        numero: body.dni.trim(),
        ruc: body.ruc || null,
      },
    });

    // Contacto teléfono
    await pacienteRepo.createContactoTelefono(tx, {
      personaId: persona.idPersona,
      valorRaw: body.telefono,
      valorNorm: normalizePhonePY(body.telefono),
      prefer: { recordatorio: preferRecordatorio, cobranza: !body.email },
    });

    // Contacto email (opcional)
    if (body.email) {
      const norm = normalizeEmail(body.email);
      if (norm) {
        await pacienteRepo.createContactoEmail(tx, {
          personaId: persona.idPersona,
          valorRaw: body.email,
          valorNorm: norm,
          prefer: { recordatorio: !!body.preferenciasContacto?.email, cobranza: true },
        });
      }
    }

    // Paciente + notas clínicas mínimas en JSON (obra social, alergias, etc.)
    const paciente = await pacienteRepo.createPaciente(tx, {
      personaId: persona.idPersona,
      notasJson: {
        antecedentesMedicos: body.antecedentesMedicos || null,
        alergias: body.alergias || null,
        medicacion: body.medicacion || null,
        responsablePago: body.responsablePago || null,
        obraSocial: body.obraSocial || null,
      },
    });

    // Responsable de pago (si se provee personaId ya existente)
    if (body.responsablePago?.personaId) {
      await pacienteRepo.linkResponsablePago(tx, {
        pacienteId: paciente.idPaciente,
        personaId: body.responsablePago.personaId,
        relacion: body.responsablePago.relacion,
        esPrincipal: body.responsablePago.esPrincipal ?? true,
      });
    }

    // TODO: AuditLog (cuando habilites)
    // await tx.auditLog.create({ ... actorUserId, ... })

    return paciente.idPaciente;
  });

  const item = await pacienteRepo.getPacienteUI(createdId);
  return { idPaciente: createdId, item };
}
