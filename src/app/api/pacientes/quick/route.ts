// src/app/api/pacientes/quick/route.ts
import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { pacienteQuickCreateSchema } from "@/lib/schema/paciente.quick";
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = pacienteQuickCreateSchema.parse(json);

    const persona = await db.persona.create({
      data: {
        nombres: parsed.nombreCompleto, // si luego separas nombres/apellidos, ajusta aquí
        apellidos: "",
        genero: parsed.genero as any,
        estaActivo: true,
        documento: {
          create: {
            tipo: "CI",                         // o según tu UI/DTO
            numero: parsed.dni.trim(),
            paisEmision: "PY",
          },
        },
      },
    });

    // contactos (tel obligatorio, email opcional)
    await db.personaContacto.create({
      data: {
        personaId: persona.idPersona,
        tipo: "PHONE",
        valorRaw: parsed.telefono,
        valorNorm: normalizePhonePY(parsed.telefono),
        label: "Móvil",
        whatsappCapaz: true,
        smsCapaz: true,
        esPrincipal: true,
        esPreferidoRecordatorio: true,
        activo: true,
      },
    });

    if (parsed.email) {
      await db.personaContacto.create({
        data: {
          personaId: persona.idPersona,
          tipo: "EMAIL",
          valorRaw: parsed.email,
          valorNorm: normalizeEmail(parsed.email),
          label: "Trabajo",
          esPrincipal: true,
          esPreferidoCobranza: true,
          activo: true,
        },
      });
    }

    const paciente = await db.paciente.create({
      data: { personaId: persona.idPersona, estaActivo: true },
    });

    // Relee el item completo como lo usa tu UI (PacienteItem)
    const item = await db.paciente.findUnique({
      where: { idPaciente: paciente.idPaciente },
      include: {
        persona: {
          select: {
            idPersona: true, nombres: true, apellidos: true, genero: true,
            documento: { select: { tipo: true, numero: true, ruc: true } },
            contactos: { select: { tipo: true, valorNorm: true, activo: true, esPrincipal: true } },
          }
        }
      }
    });

    return NextResponse.json({ ok: true, data: { item } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "Error al crear paciente" }, { status: 400 });
  }
}
