// src/app/api/pacientes/[id]/_service.update.ts
import { fichaRepo } from "./_repo";
import { splitNombreCompleto } from "./_dto";
import type { PacienteUpdateBody } from "./_schemas";

export async function updatePaciente(idPaciente: number, body: PacienteUpdateBody) {
  return await (await import("@/lib/prisma")).prisma.$transaction(async (tx) => {
    const current = await fichaRepo.getPacienteWithPersona(idPaciente);
    if (!current) {
      const err: any = new Error("Paciente no encontrado");
      err.status = 404;
      throw err;
    }

    // Persona
    if (body.nombreCompleto || body.genero || "fechaNacimiento" in body || "domicilio" in body) {
      const { nombres, apellidos } = body.nombreCompleto ? splitNombreCompleto(body.nombreCompleto) : { nombres: current.persona.nombres, apellidos: current.persona.apellidos };
      await fichaRepo.updatePersona(current.personaId, {
        nombres,
        apellidos,
        genero: body.genero as any ?? current.persona.genero,
        fechaNacimiento: body.fechaNacimiento === undefined ? current.persona.fechaNacimiento : body.fechaNacimiento,
        direccion: body.domicilio === undefined ? current.persona.direccion : (body.domicilio ?? null),
      });
    }

    // Notas clínicas (legacy)
    const newNotas = {
      antecedentesMedicos: body.antecedentesMedicos ?? undefined,
      alergias: body.alergias ?? undefined,
      medicacion: body.medicacion ?? undefined,
      obraSocial: body.obraSocial ?? undefined,
      responsablePago: body.responsablePago ?? undefined,
    };
    await fichaRepo.updatePacienteNotas(idPaciente, newNotas);

    // TODO: si quieres actualizar responsablePago como fila en PacienteResponsable, hazlo aquí.

    return { ok: true };
  });
}
