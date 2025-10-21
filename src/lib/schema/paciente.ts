import { z } from "zod";

export const GeneroEnum = z.enum(["MASCULINO","FEMENINO","OTRO","NO_ESPECIFICADO"]);
export const TipoDocumentoEnum = z.enum(["CI","DNI","PASAPORTE","RUC","OTRO"]);
export const TipoContactoEnum = z.enum(["PHONE","EMAIL"]);

const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;

export const contactoSchema = z.object({
  tipo: TipoContactoEnum,
  valor: z.string().trim().min(3).max(120),
  label: z.string().trim().max(60).optional()
});

export const documentoSchema = z.object({
  tipo: TipoDocumentoEnum,
  numero: z.string().trim().min(3).max(40),
  paisEmision: z.string().trim().max(60).optional().nullable(),
  ruc: z.string().trim().max(25).optional().nullable(), // opcional según requerimiento
  fechaEmision: z.coerce.date().optional().nullable(),
  fechaVencimiento: z.coerce.date().optional().nullable(),
});

export const datosClinicosSchema = z.object({
  obraSocial: z.string().trim().max(120).optional().nullable(),
  antecedentesMedicos: z.string().trim().max(2000).optional().nullable(),
  alergias: z.string().trim().max(1000).optional().nullable(),
  medicacion: z.string().trim().max(1000).optional().nullable(),
}).optional();

export const pacienteCreateSchema = z.object({
  // Persona
  nombres: z.string().trim().min(2, "Nombres demasiado corto").max(80),
  apellidos: z.string().trim().min(2, "Apellidos demasiado corto").max(80),
  genero: GeneroEnum.optional().nullable(),
  fechaNacimiento: z.coerce.date().optional().nullable(),
  direccion: z.string().trim().max(200).optional().nullable(),

  // Documento (obligatorio: DNI/Cédula; RUC si corresponde)
  documento: documentoSchema,

  // Contactos (teléfono y correo)
  contactos: z.array(contactoSchema).min(1, "Agrega al menos un contacto"),
  telefonoObligatorio: z.string().regex(phoneRegex, "Teléfono inválido").optional(), // por si lo separas
  // Clínico
  datosClinicos: datosClinicosSchema,

  // Responsable de pago (opcional)
  responsablePago: z.object({
    personaId: z.number().int().positive().optional(), // si ya existe en DB
    nombres: z.string().trim().min(2).max(80).optional(),
    apellidos: z.string().trim().min(2).max(80).optional(),
    genero: GeneroEnum.optional(),
    documento: documentoSchema.optional(),
    relacion: z.enum(["PADRE","MADRE","TUTOR","CONYUGE","FAMILIAR","OTRO"]).optional(),
    esPrincipal: z.boolean().optional(),
    autoridadLegal: z.boolean().optional(),
  }).optional(),
});

export type PacienteCreateDTO = z.infer<typeof pacienteCreateSchema>;

export const pacienteUpdateSchema = z.object({
  idPaciente: z.number().int().positive(),
  // Persona
  nombres: z.string().trim().min(2).max(80).optional(),
  apellidos: z.string().trim().min(2).max(80).optional(),
  genero: GeneroEnum.optional().nullable(),
  fechaNacimiento: z.coerce.date().optional().nullable(),
  direccion: z.string().trim().max(200).optional().nullable(),

  // Documento (upsert)
  documento: documentoSchema.optional(),

  // Contactos (full-sync opcional)
  contactos: z.array(contactoSchema).optional(),

  datosClinicos: datosClinicosSchema,
  estaActivo: z.boolean().optional(),
  // Concurrencia optimista
  updatedAt: z.string().datetime().optional(),
});
export type PacienteUpdateDTO = z.infer<typeof pacienteUpdateSchema>;

export const pacienteDeleteSchema = z.object({
  idPaciente: z.number().int().positive(),
});
export type PacienteDeleteDTO = z.infer<typeof pacienteDeleteSchema>;
