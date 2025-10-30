// src/app/api/procedimientos/[id]/_dto.ts

export type ProcedimientoDetalleDTO = {
  id: number;                    // idConsultaProcedimiento
  consultaId: number;            // FK a Consulta (citaId)
  citaId: number;                // id de la Cita
  pacienteId: number;
  profesionalId: number;

  // Definición del procedimiento (catálogo o texto libre)
  procedureId: number | null;    // catálogo (si aplica)
  catalogo?: {
    id: number;
    code: string | null;
    nombre: string | null;
    descripcion: string | null;
    defaultDurationMin: number | null;
    defaultPriceCents: number | null;
  } | null;
  serviceType: string | null;    // texto libre

  // Contexto dental
  toothNumber: number | null;
  toothSurface: string | null;

  // Cantidad y costos
  quantity: number;
  unitPriceCents: number | null;
  totalCents: number | null;

  // Planificación (si corresponde)
  treatmentStepId: number | null;

  // Clínica
  diagnostico: string | null;     // Consulta.diagnosis
  notasClinicas: string | null;   // Consulta.clinicalNotes
  resultado: string | null;       // ConsultaProcedimiento.resultNotes

  // Duración
  duracionMin: number | null;     // desde Cita.duracionMinutos

  // Aún no modelados en DB (placeholder listo para futuras migraciones)
  materiales: Array<{ nombre: string; cantidad?: number; unidad?: string }>;
  tags: string[];

  // Adjuntos asociados a este procedimiento
  adjuntos: Array<{
    id: number;
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
    tipo: string;
    metadata?: any;
    uploadedByUserId: number;
    createdAt: string;
  }>;

  // Trazabilidad
  createdAt: string;
  updatedAt: string;
};
