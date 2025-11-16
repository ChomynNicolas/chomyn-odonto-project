// src/app/api/pacientes/[id]/_schemas.ts
import { z } from "zod";

export const pathParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform((v) => Number(v)),
});

export const patientUpdateBodySchema = z.object({
  // Personal information
  firstName: z.string().min(1, "Nombre requerido").max(100).optional(),
  lastName: z.string().min(1, "Apellido requerido").max(100).optional(),
  secondLastName: z.string().max(100).optional().nullable(),

  // Demographics
  gender: z
    .enum(["MALE", "FEMALE", "OTHER"], {
      message: "Género inválido",
    })
    .optional(),
  dateOfBirth: z.string().datetime().optional().nullable(),

  // Document
  documentType: z.enum(["CI", "PASSPORT", "RUC", "OTHER"]).optional(),
  documentNumber: z.string().min(1).max(50).optional(),
  documentCountry: z.enum(["PY", "AR", "BR", "OTHER"]).optional(),
  documentIssueDate: z.string().datetime().optional().nullable(), // ⭐ Added
  documentExpiryDate: z.string().datetime().optional().nullable(), // ⭐ Added
  ruc: z.string().max(50).optional().nullable(),

  // Contact
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().min(6).max(20).optional().nullable(),

  // Address
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.enum(["PY", "AR", "BR", "OTHER"]).optional().nullable(), // ⭐ Added

  // Insurance
  insurance: z.string().max(120).optional().nullable(),

  // Emergency contact
  emergencyContactName: z.string().max(160).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
  emergencyContactRelation: z.string().max(50).optional().nullable(), // ⭐ Added

  // Status (only ADMIN/RECEP can change)
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),

  // Concurrency control
  updatedAt: z.string().datetime({ message: "updatedAt requerido para control de versión" }),
})

export type PatientUpdateBody = z.infer<typeof patientUpdateBodySchema>

export const deleteQuerySchema = z.object({
  hard: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"), // default: false
});
export type DeleteQuery = z.infer<typeof deleteQuerySchema>;


