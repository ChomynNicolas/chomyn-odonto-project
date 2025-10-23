import { z } from "zod";
import { CrearProcedimientoSchema, ListQuerySchema, ParamIdSchema } from "./_schemas";

export type CrearProcedimientoDTO = z.infer<typeof CrearProcedimientoSchema>;
export type ParamId = z.infer<typeof ParamIdSchema>;
export type ListQuery = z.infer<typeof ListQuerySchema>;

export type ProcedimientoListItem = {
  idConsultaProcedimiento: number;
  consultaId: number;
  procedureId: number | null;
  serviceType: string | null;
  toothNumber: number | null;
  toothSurface: string | null;
  quantity: number;
  unitPriceCents: number | null;
  totalCents: number | null;
  treatmentStepId: number | null;
  resultNotes: string | null;
  createdAt: string;
  // info extra
  catalogo?: { id: number; code?: string | null; nombre?: string | null } | null;
  adjuntosCount: number;
};