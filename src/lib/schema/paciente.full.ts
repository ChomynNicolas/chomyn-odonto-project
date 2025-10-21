// src/lib/schema/paciente.full.ts
import { z } from "zod";

const phoneRegex = /^(?:\+?\d[\d\s\-]{5,14})$/;
const dniRegex = /^[A-Za-z0-9.\-]{5,}$/;

export const generoEnum = z.enum(["MASCULINO","FEMENINO","OTRO","NO_ESPECIFICADO"]);

export const pacienteFullCreateSchema = z.object({
  nombreCompleto: z.string().trim().min(3, "Mín. 3 caracteres"),
  genero: generoEnum,
  dni: z.string().trim().regex(dniRegex, "Documento inválido"),
  ruc: z.string().trim().optional().nullable(),
  telefono: z.string().trim().regex(phoneRegex, "Teléfono inválido"),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")).optional(),
  domicilio: z.string().trim().min(3, "Domicilio requerido"),
  obraSocial: z.string().trim().optional().nullable(),

  antecedentesMedicos: z.string().trim().optional().nullable(),
  alergias: z.string().trim().optional().nullable(),
  medicacion: z.string().trim().optional().nullable(),
  responsablePago: z.string().trim().optional().nullable(),

  preferenciasContacto: z.object({
    whatsapp: z.boolean().default(true),
    llamada: z.boolean().default(false),
    email: z.boolean().default(false),
    sms: z.boolean().default(false),
  }).default({ whatsapp:true, llamada:false, email:false, sms:false }),

  // adjuntos mock (en el futuro irán a S3/Cloudinary)
  adjuntos: z.array(z.object({
    id: z.string(),
    nombre: z.string(),
    tipo: z.enum(["CEDULA","RADIOGRAFIA","OTRO"]),
    url: z.string().url(),
  })).optional().default([]),
}).transform(v => ({
  ...v,
  nombreCompleto: v.nombreCompleto.replace(/\s+/g, " ").trim(),
  email: v.email ? v.email.trim() : undefined,
}));

export type PacienteFullCreateDTO = z.infer<typeof pacienteFullCreateSchema>;
