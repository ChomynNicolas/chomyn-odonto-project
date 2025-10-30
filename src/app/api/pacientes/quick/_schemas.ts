// src/app/api/pacientes/quick/_schemas.ts
import { z } from "zod";

export const GeneroEnum = z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]);
export const TipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"]);

export const pacienteQuickCreateSchema = z.object({
  nombreCompleto: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(160),
  genero: GeneroEnum.optional(),
  tipoDocumento: TipoDocumentoEnum,
  dni: z.string().trim().min(3, "El número de documento debe tener al menos 3 caracteres").max(32),
  telefono: z.string().trim().min(6, "El teléfono debe tener al menos 6 dígitos").max(40),
  email: z.string().email("Email inválido").optional().or(z.literal("")).transform(v => v || undefined),
  fechaNacimiento: z.union([z.string().date().optional(), z.string().length(0)]).optional().transform(v => v || undefined),
});

export type PacienteQuickCreateDTO = z.infer<typeof pacienteQuickCreateSchema>;

// Idempotencia opcional vía header
export const idempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().uuid().optional(),
});
export type IdempotencyHeaders = z.infer<typeof idempotencyHeaderSchema>;
