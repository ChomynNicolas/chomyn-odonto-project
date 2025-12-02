// Zod validation schemas

import { z } from 'zod';

export const patientIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// URLSearchParams returns strings or null, need proper coercion and null handling
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 10))
    .pipe(z.number().int().min(1).max(100)),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const clinicalHistoryQuerySchema = paginationQuerySchema.extend({
  professionalId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .pipe(z.number().int().positive().optional()),
});
