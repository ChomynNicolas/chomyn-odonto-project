// src/app/api/personas/_service.create.ts
/**
 * Servicio para crear Persona (sin Paciente)
 */

import { prisma } from "@/lib/prisma"
import type { PersonaCreateBody } from "./_schemas.create"
import { normalizarEmail, normalizarTelefono, esMovilPY } from "@/lib/normalize"

export async function createPersona(body: PersonaCreateBody) {
  // Validar que el documento no exista
  const documentoExistente = await prisma.documento.findFirst({
    where: {
      tipo: body.documento.tipo,
      numero: body.documento.numero,
    },
    include: {
      persona: {
        select: {
          idPersona: true,
          nombres: true,
          apellidos: true,
        },
      },
    },
  })

  if (documentoExistente) {
    throw new Error(
      `Ya existe una persona con ${body.documento.tipo} ${body.documento.numero}: ${documentoExistente.persona.nombres} ${documentoExistente.persona.apellidos}`
    )
  }

  // Crear Persona con documento y contactos en transacción
  const persona = await prisma.$transaction(async (tx) => {
    // 1. Crear Persona con Documento
    const nuevaPersona = await tx.persona.create({
      data: {
        nombres: body.nombres,
        apellidos: body.apellidos,
        segundoApellido: body.segundoApellido || null,
        fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
        genero: body.genero || null,
        direccion: body.direccion || null,
        estaActivo: true,
        documento: {
          create: {
            tipo: body.documento.tipo,
            numero: body.documento.numero,
            ruc: body.documento.ruc || null,
            paisEmision: body.documento.paisEmision || "PY",
          },
        },
      },
      include: {
        documento: true,
      },
    })

    // 2. Crear contactos si se proporcionan
    if (body.contactos && body.contactos.length > 0) {
      const contactosData = body.contactos.map((contacto) => {
        const valorNorm =
          contacto.tipo === "EMAIL" ? normalizarEmail(contacto.valor) : normalizarTelefono(contacto.valor)
        const esMovil = contacto.tipo === "PHONE" ? esMovilPY(contacto.valor) : false

        return {
          personaId: nuevaPersona.idPersona,
          tipo: contacto.tipo,
          valorRaw: contacto.valor,
          valorNorm,
          label: contacto.label || null,
          whatsappCapaz: esMovil,
          smsCapaz: esMovil,
          esPrincipal: false, // El primero será principal
          esPreferidoRecordatorio: false,
          esPreferidoCobranza: false,
          activo: true,
        }
      })

      // Marcar el primer contacto como principal
      if (contactosData.length > 0) {
        contactosData[0].esPrincipal = true
      }

      await tx.personaContacto.createMany({
        data: contactosData,
      })
    }

    return nuevaPersona
  })

  return persona
}

