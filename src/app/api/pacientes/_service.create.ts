// src/app/api/pacientes/_service.create.ts
import type { PacienteCreateBody } from "./_schemas";
import { pacienteRepo } from "./_repo";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize";
import { splitNombreCompleto, mapGeneroToDB } from "./_dto";

export async function createPaciente(body: PacienteCreateBody, actorUserId?: number) {
  const { nombres, apellidos } = splitNombreCompleto(body.nombreCompleto);
  const generoDB = body.genero ? mapGeneroToDB(body.genero) : null;

  // Preferencias derivadas (negocio mínimo viable)
  const preferRecordatorio =
    !!(body.preferenciasContacto?.whatsapp || body.preferenciasContacto?.sms || body.preferenciasContacto?.llamada);
  const preferCobranza = !(body.email && body.preferenciasContacto?.email === false); // si hay email, suele preferirse cobranza por email

  const createdId = await prisma.$transaction(async (tx) => {
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

    // Teléfono (obligatorio)
    await pacienteRepo.createContactoTelefono(tx, {
      personaId: persona.idPersona,
      valorRaw: body.telefono,
      valorNorm: normalizePhonePY(body.telefono),
      prefer: { recordatorio: preferRecordatorio, cobranza: !body.email },
    });

    // Email (opcional)
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

    // Paciente (guardar clínicos simples en JSON – puedes migrar a columnas luego)
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

    // Responsable de pago (opcional)
    if (body.responsablePago) {
      await pacienteRepo.linkResponsablePago(tx, {
        pacienteId: paciente.idPaciente,
        personaId: body.responsablePago.personaId,
        relacion: body.responsablePago.relacion,
        esPrincipal: body.responsablePago.esPrincipal ?? true,
      });
    }

    // (Opcional) AuditLog: PACIENTE_CREATE
    // await tx.auditLog.create({
    //   data: {
    //     actorId: actorUserId ?? null,
    //     action: "PACIENTE_CREATE",
    //     entity: "Paciente",
    //     entityId: String(paciente.idPaciente),
    //     meta: body,
    //   },
    // });

    return paciente.idPaciente;
  });

  const item = await pacienteRepo.getPacienteUI(createdId);
  return { idPaciente: createdId, item };
}
