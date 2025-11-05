// src/app/api/personas/_dto.ts
import type { Prisma } from "@prisma/client"
import type { PersonaListItemDTO } from "@/lib/schema/personas"

type PersonaWithDocAndContacts = Prisma.PersonaGetPayload<{
  include: {
    documento: { select: { tipo: true; numero: true; ruc: true } }
    contactos: {
      where: { activo: true }
      select: {
        tipo: true
        valorNorm: true
        valorRaw: true
        activo: true
        esPrincipal: true
      }
    }
  }
}>

export function toPersonaListItemDTO(p: PersonaWithDocAndContacts): PersonaListItemDTO {
  return {
    idPersona: p.idPersona,
    nombreCompleto: [p.nombres, p.apellidos].filter(Boolean).join(" ").trim(),
    documento: {
      tipo: (p.documento?.tipo ?? "OTRO") as any,
      numero: p.documento?.numero ?? "",
      ruc: p.documento?.ruc ?? undefined,
    },
    contactos: p.contactos?.length
      ? p.contactos
          .filter((c) => c.activo && (c.tipo === "PHONE" || c.tipo === "EMAIL"))
          .map((c) => ({
            tipo: c.tipo as "PHONE" | "EMAIL",
            valor: (c.valorNorm ?? c.valorRaw ?? "").trim(),
          }))
      : undefined,
  }
}
