import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { pacienteFullCreateSchema } from "@/lib/schema/paciente.full";
import { normalizeEmail, normalizePhonePY, splitNombreCompleto } from "@/lib/normalize";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const cursor = searchParams.get("cursor");
  const soloActivos = (searchParams.get("soloActivos") ?? "true") === "true";

  const where: any = {
    AND: [
      {},
      soloActivos ? { estaActivo: true } : {},
    ]
  };

  // búsqueda por nombre/apellido/documento/email/phone
  if (q) {
    where.AND.push({
      OR: [
        { persona: { nombres: { contains: q, mode: "insensitive" } } },
        { persona: { apellidos: { contains: q, mode: "insensitive" } } },
        { persona: { documento: { numero: { contains: q, mode: "insensitive" } } } },
        { persona: { contactos: { some: { valorNorm: { contains: q.toLowerCase() } } } } },
      ]
    });
  }

  const items = await db.paciente.findMany({
    where,
    include: {
      persona: {
        select: {
          idPersona: true, nombres: true, apellidos: true, genero: true,
          documento: { select: { tipo:true, numero:true, ruc:true } },
          contactos: { select: { tipo:true, valorNorm:true, esPrincipal:true, activo:true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { idPaciente: Number(cursor) } } : {}),
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const next = items.pop()!;
    nextCursor = String(next.idPaciente);
  }

  return NextResponse.json({ items, nextCursor });
}



export async function POST(req: Request) {
  try {
    const json = await req.json();
    const dto = pacienteFullCreateSchema.parse(json);

    const { nombres, apellidos } = splitNombreCompleto(dto.nombreCompleto);

    const created = await db.$transaction(async (tx) => {
      // Persona + Documento
      const persona = await tx.persona.create({
        data: {
          nombres,
          apellidos,
          genero: dto.genero,
          direccion: dto.domicilio || null,
          estaActivo: true,
          documento: {
            create: {
              tipo: "CI",                 // si manejas tipo en UI, cámbialo
              numero: dto.dni.trim(),
              paisEmision: "PY",
              ruc: dto.ruc ?? null,
            }
          }
        }
      });

      // Contactos: teléfono (oblig), email (opcional)
      await tx.personaContacto.create({
        data: {
          personaId: persona.idPersona,
          tipo: "PHONE",
          valorRaw: dto.telefono,
          valorNorm: normalizePhonePY(dto.telefono),
          label: "Móvil",
          whatsappCapaz: true,
          smsCapaz: true,
          esPrincipal: true,
          esPreferidoRecordatorio: dto.preferenciasContacto.whatsapp || dto.preferenciasContacto.sms || dto.preferenciasContacto.llamada,
          esPreferidoCobranza: !(dto.email && dto.preferenciasContacto.email), // si no hay email preferido, usa phone
          activo: true,
        }
      });

      if (dto.email) {
        await tx.personaContacto.create({
          data: {
            personaId: persona.idPersona,
            tipo: "EMAIL",
            valorRaw: dto.email,
            valorNorm: normalizeEmail(dto.email)!,
            label: "Correo",
            esPrincipal: true,
            esPreferidoRecordatorio: dto.preferenciasContacto.email === true,
            esPreferidoCobranza: true,
            activo: true,
          }
        });
      }

      // Paciente
      const paciente = await tx.paciente.create({
        data: {
          personaId: persona.idPersona,
          notas: JSON.stringify({
            antecedentesMedicos: dto.antecedentesMedicos ?? null,
            alergias: dto.alergias ?? null,
            medicacion: dto.medicacion ?? null,
            responsablePago: dto.responsablePago ?? null,
            obraSocial: dto.obraSocial ?? null,
          }),
          estaActivo: true,
        }
      });

      return paciente.idPaciente;
    });

    // Releer el item completo para la UI
    const item = await db.paciente.findUnique({
      where: { idPaciente: created },
      include: {
        persona: {
          select: {
            idPersona: true, nombres: true, apellidos: true, genero: true,
            documento: { select: { tipo:true, numero:true, ruc:true } },
            contactos: { select: { tipo:true, valorNorm:true, activo:true, esPrincipal:true } }
          }
        }
      }
    });

    return NextResponse.json({ ok: true, data: { idPaciente: created, item } });
  } catch (e: any) {
    // unicidad (P2002) u otros
    const msg = e?.code === "P2002"
      ? "Conflicto de unicidad (documento o contacto ya existe)"
      : (e?.message ?? "Error al crear paciente");
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
