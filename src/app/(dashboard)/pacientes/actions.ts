"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize";
import { canCreatePaciente, canUpdatePaciente, canDeletePaciente, type Rol } from "@/lib/rbac";
import { pacienteCreateSchema, pacienteUpdateSchema, pacienteDeleteSchema, type PacienteCreateDTO, type PacienteUpdateDTO, type PacienteDeleteDTO } from "@/lib/schema/paciente";
import { auth } from "@/auth";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string,string> };

function assertRol(r?: string): asserts r is Rol {
  if (!r || !["ADMIN","ODONT","RECEP"].includes(r)) throw new Error("Rol inválido");
}

function packNotas(datosClinicos?: PacienteCreateDTO["datosClinicos"]) {
  if (!datosClinicos) return null;
  return JSON.stringify(datosClinicos);
}

export async function createPaciente(input: PacienteCreateDTO): Promise<ActionResult<{ idPaciente: number; personaId: number }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return { ok:false, error:"No autenticado" };
  assertRol(session.user.role);
  if (!canCreatePaciente(session.user.role)) return { ok:false, error:"No autorizado" };

  const parsed = pacienteCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: Object.fromEntries(parsed.error.issues.map(i => [i.path.join("."), i.message]))
    };
  }
  const dto = parsed.data;

  // normalizar contactos
  const contactos = (dto.contactos ?? []).map(c => ({
    tipo: c.tipo,
    valorRaw: c.valor.trim(),
    valorNorm: c.tipo === "EMAIL" ? normalizeEmail(c.valor) : normalizePhonePY(c.valor),
    label: c.label,
  }));

  try {
    const result = await db.$transaction(async (tx) => {
      // 1) Persona
      const persona = await tx.persona.create({
        data: {
          nombres: dto.nombres.trim(),
          apellidos: dto.apellidos.trim(),
          genero: dto.genero ?? null,
          fechaNacimiento: dto.fechaNacimiento ?? null,
          direccion: dto.direccion ?? null,
        }
      });

      // 2) Documento (único por persona)
      await tx.documento.create({
        data: {
          personaId: persona.idPersona,
          tipo: dto.documento.tipo,
          numero: dto.documento.numero.trim(),
          paisEmision: dto.documento.paisEmision ?? null,
          fechaEmision: dto.documento.fechaEmision ?? null,
          fechaVencimiento: dto.documento.fechaVencimiento ?? null,
          ruc: dto.documento.ruc ?? null,
        }
      });

      // 3) Contactos (PHONE/EMAIL)
      if (contactos.length) {
        await tx.personaContacto.createMany({
          data: contactos.map(c => ({
            personaId: persona.idPersona,
            tipo: c.tipo,
            valorRaw: c.valorRaw,
            valorNorm: c.valorNorm,
            label: c.label ?? null,
            whatsappCapaz: c.tipo === "PHONE" ? true : null,
            smsCapaz: c.tipo === "PHONE" ? true : null,
            esPrincipal: true, // el primero lo marcamos principal; luego puedes ajustar desde UI
          })),
          skipDuplicates: true,
        });
      }

      // 4) Paciente (clínico)
      const notas = packNotas(dto.datosClinicos);
      const paciente = await tx.paciente.create({
        data: {
          personaId: persona.idPersona,
          notas,
        }
      });

      // 5) Responsable de pago (opcional)
      if (dto.responsablePago) {
        const rp = dto.responsablePago;

        let personaRespId: number | null = null;
        if (rp.personaId) {
          personaRespId = rp.personaId;
        } else {
          // Crear persona responsable mínima si no existe
          const perR = await tx.persona.create({
            data: {
              nombres: rp.nombres?.trim() ?? "Responsable",
              apellidos: rp.apellidos?.trim() ?? "",
              genero: rp.genero ?? "NO_ESPECIFICADO",
            }
          });
          personaRespId = perR.idPersona;

          if (rp.documento) {
            await tx.documento.create({
              data: {
                personaId: personaRespId,
                tipo: rp.documento.tipo,
                numero: rp.documento.numero.trim(),
                paisEmision: rp.documento.paisEmision ?? null,
                fechaEmision: rp.documento.fechaEmision ?? null,
                fechaVencimiento: rp.documento.fechaVencimiento ?? null,
                ruc: rp.documento.ruc ?? null,
              }
            });
          }
        }

        await tx.pacienteResponsable.create({
          data: {
            pacienteId: paciente.idPaciente,
            personaId: personaRespId!,
            relacion: rp.relacion ?? "OTRO",
            esPrincipal: rp.esPrincipal ?? true,
            autoridadLegal: rp.autoridadLegal ?? false,
          }
        });
      }

      return { idPaciente: paciente.idPaciente, personaId: persona.idPersona };
    });

    // revalidar listados/vistas
    revalidatePath("/pacientes");
    revalidatePath(`/pacientes/${result.idPaciente}`);
    return { ok:true, data: result };
  } catch (e: any) {
    // manejar violaciones únicas (documento/contacto)
    const msg = e?.code === "P2002" ? "Conflicto de unicidad (documento/contacto ya existe)" : "Error al registrar el paciente";
    return { ok:false, error: msg };
  }
}

export async function updatePaciente(input: PacienteUpdateDTO): Promise<ActionResult<{ idPaciente: number }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return { ok:false, error:"No autenticado" };
  assertRol(session.user.role);
  if (!canUpdatePaciente(session.user.role)) return { ok:false, error:"No autorizado" };

  const parsed = pacienteUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok:false,
      error:"Datos inválidos",
      fieldErrors: Object.fromEntries(parsed.error.issues.map(i => [i.path.join("."), i.message])),
    };
  }
  const dto = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const pac = await tx.paciente.findUnique({
        where: { idPaciente: dto.idPaciente },
        include: { persona: true },
      });
      if (!pac) throw new Error("Paciente no encontrado");

      // Concurrencia optimista (si envías updatedAt ISO)
      if (dto.updatedAt && pac.updatedAt.toISOString() !== dto.updatedAt) {
        throw new Error("Conflicto de versión. Recarga la página.");
      }

      // Persona
      if (dto.nombres || dto.apellidos || "genero" in dto || "fechaNacimiento" in dto || "direccion" in dto) {
        await tx.persona.update({
          where: { idPersona: pac.personaId },
          data: {
            nombres: dto.nombres?.trim(),
            apellidos: dto.apellidos?.trim(),
            genero: dto.genero ?? undefined,
            fechaNacimiento: dto.fechaNacimiento ?? undefined,
            direccion: dto.direccion ?? undefined,
          }
        });
      }

      // Documento upsert
      if (dto.documento) {
        const existing = await tx.documento.findUnique({ where: { personaId: pac.personaId } });
        if (existing) {
          await tx.documento.update({
            where: { personaId: pac.personaId },
            data: {
              tipo: dto.documento.tipo,
              numero: dto.documento.numero.trim(),
              paisEmision: dto.documento.paisEmision ?? null,
              fechaEmision: dto.documento.fechaEmision ?? null,
              fechaVencimiento: dto.documento.fechaVencimiento ?? null,
              ruc: dto.documento.ruc ?? null,
            }
          });
        } else {
          await tx.documento.create({
            data: {
              personaId: pac.personaId,
              tipo: dto.documento.tipo,
              numero: dto.documento.numero.trim(),
              paisEmision: dto.documento.paisEmision ?? null,
              fechaEmision: dto.documento.fechaEmision ?? null,
              fechaVencimiento: dto.documento.fechaVencimiento ?? null,
              ruc: dto.documento.ruc ?? null,
            }
          });
        }
      }

      // Contactos (sync completo opcional)
      if (dto.contactos) {
        // estrategia simple: desactivar existentes y crear nuevos (o upsert por unique(personaId,tipo,valorNorm))
        await tx.personaContacto.updateMany({
          where: { personaId: pac.personaId },
          data: { activo: false, esPrincipal: false },
        });

        for (const c of dto.contactos) {
          const valorNorm = c.tipo === "EMAIL" ? normalizeEmail(c.valor) : normalizePhonePY(c.valor);
          await tx.personaContacto.upsert({
            where: { personaId_tipo_valorNorm: { personaId: pac.personaId, tipo: c.tipo, valorNorm } },
            create: {
              personaId: pac.personaId,
              tipo: c.tipo,
              valorRaw: c.valor.trim(),
              valorNorm,
              label: c.label ?? null,
              activo: true,
              esPrincipal: true, // deja principal, luego UI puede ajustar
              whatsappCapaz: c.tipo === "PHONE" ? true : null,
              smsCapaz: c.tipo === "PHONE" ? true : null,
            },
            update: {
              valorRaw: c.valor.trim(),
              label: c.label ?? null,
              activo: true,
              esPrincipal: true,
            }
          });
        }
      }

      // Paciente (notas clínicas + estado)
      let notas: string | undefined;
      if (dto.datosClinicos) notas = JSON.stringify(dto.datosClinicos);

      const updated = await tx.paciente.update({
        where: { idPaciente: dto.idPaciente },
        data: {
          notas: typeof notas !== "undefined" ? notas : undefined,
          estaActivo: typeof dto.estaActivo === "boolean" ? dto.estaActivo : undefined,
        },
        select: { idPaciente: true },
      });

      return updated;
    });

    revalidatePath("/pacientes");
    revalidatePath(`/pacientes/${dto.idPaciente}`);
    return { ok:true, data: { idPaciente: result.idPaciente } };
  } catch (e: any) {
    const msg = e?.message?.includes("Conflicto de versión") ? e.message : "Error al actualizar el paciente";
    return { ok:false, error: msg };
  }
}

export async function deletePaciente(input: PacienteDeleteDTO): Promise<ActionResult<{ idPaciente: number }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return { ok:false, error:"No autenticado" };
  assertRol(session.user.role);
  if (!canDeletePaciente(session.user.role)) return { ok:false, error:"No autorizado" };

  const parsed = pacienteDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok:false, error:"Solicitud inválida" };

  try {
    const updated = await db.paciente.update({
      where: { idPaciente: parsed.data.idPaciente },
      data: { estaActivo: false },
      select: { idPaciente: true },
    });
    revalidatePath("/pacientes");
    revalidatePath(`/pacientes/${parsed.data.idPaciente}`);
    return { ok:true, data: { idPaciente: updated.idPaciente } };
  } catch {
    return { ok:false, error:"Error al eliminar el paciente" };
  }
}
