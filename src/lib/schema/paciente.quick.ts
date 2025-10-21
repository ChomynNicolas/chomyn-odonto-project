// src/lib/schema/paciente.quick.ts
import { z } from "zod";

export const phoneRegex = /^(?:\+?\d[\d\s\-]{5,14})$/;
export const dniRegex = /^[A-Za-z0-9.\-]{5,}$/;

export const generoEnum = z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]);

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const pacienteQuickCreateSchema = z.object({
  nombreCompleto: z.string().trim().min(3, "Mín. 3 caracteres"),
  genero: generoEnum,
  dni: z.string().trim().regex(dniRegex, "Documento inválido"),
  telefono: z.string().trim().regex(phoneRegex, "Teléfono inválido"),
  email: z.preprocess(emptyToUndef, z.string().trim().email("Email inválido").optional()),
}).transform(v => ({
  ...v,
  nombreCompleto: v.nombreCompleto.replace(/\s+/g, " ").trim(),
}));

export type PacienteQuickCreateDTO = z.infer<typeof pacienteQuickCreateSchema>;
