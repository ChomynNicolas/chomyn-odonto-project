// src/app/api/pacientes/[id]/anamnesis/_schemas.mvp.ts
// MVP: Simplified anamnesis schema for quick implementation
// Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 33-52

import { z } from "zod"

/**
 * MVP Anamnesis Request Body Schema
 * 
 * Validates the minimal essential fields required for anamnesis:
 * - motivoConsulta: Required, max 200 chars (Chief complaint)
 * - All other fields are optional free-text fields stored in payload JSON
 * 
 * This schema satisfies requirement: "Only the minimum essential fields needed 
 * for a clinic to start using it" (ANAMNESIS_MVP_IMPLEMENTATION.md line 13)
 */
export const AnamnesisMVPBodySchema = z.object({
  motivoConsulta: z.string().max(200).min(1, "El motivo de consulta es requerido"), // Required
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  allergies: z.string().optional(),
  noKnownAllergies: z.boolean().optional(),
  doctorNotes: z.string().optional(),
  consultaId: z.number().int().positive().optional(), // Link to consultation (optional for MVP)
})

export type AnamnesisMVPBody = z.infer<typeof AnamnesisMVPBodySchema>

/**
 * Response schema for anamnesis data
 * Maps to PatientAnamnesis model with user information
 */
export const AnamnesisResponseSchema = z.object({
  idPatientAnamnesis: z.number(),
  pacienteId: z.number(),
  tipo: z.enum(["ADULTO", "PEDIATRICO"]),
  motivoConsulta: z.string().nullable(),
  payload: z.record(z.string(), z.any()), // JSON payload
  creadoPor: z.object({
    idUsuario: z.number(),
    nombreApellido: z.string(),
  }),
  actualizadoPor: z
    .object({
      idUsuario: z.number(),
      nombreApellido: z.string(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AnamnesisResponse = z.infer<typeof AnamnesisResponseSchema>

