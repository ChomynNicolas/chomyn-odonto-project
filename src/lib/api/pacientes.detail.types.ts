// src/lib/api/pacientes.detail.types.ts
export type ContactoItem = {
  tipo: "PHONE" | "EMAIL";
  valorNorm: string;
  label: string | null;
  esPrincipal: boolean;
  activo: boolean;
};

export type DocumentoItem = {
  tipo: "CI" | "DNI" | "PASAPORTE" | "RUC" | "OTRO";
  numero: string;
  ruc: string | null;
};

export type PersonaLite = {
  idPersona: number;
  nombres: string;
  apellidos: string;
  genero: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO" | null;
  direccion: string | null;
  documento: DocumentoItem | null;
  contactos: ContactoItem[];
};

export type CitaLite = {
  idCita: number;
  inicio: string;     // ISO
  fin: string;        // ISO
  tipo: string;
  estado: string;
  profesional: { idProfesional: number; nombre: string };
  consultorio?: { idConsultorio: number; nombre: string } | null;
};

export type PacienteDetailDTO = {
  idPaciente: number;
  estaActivo: boolean;
  createdAt: string;
  updatedAt: string;
  persona: PersonaLite;
  // KPIs básicos (puedes expandir luego)
  kpis: {
    proximoTurno?: string | null;    // ISO de próxima cita
    turnos90dias: number;
    saldo: number;                   // simulamos 0 por ahora
    noShow: number;                  // simulamos 0 por ahora
  };
  // colecciones que alimentarán tabs
  proximasCitas: CitaLite[];
  ultimasCitas: CitaLite[];
  // placeholders para otros tabs (historia, adjuntos, etc.) a completar después
  // historiaClinica?: ...
  // adjuntos?: ...
  // facturacion?: ...
};


export type HistoriaClinicaDTO = {
  antecedentesMedicos: string | null;
  alergias: string | null;
  medicacion: string | null;
  evoluciones: Array<{
    id: number;
    fecha: string;          // ISO
    nota: string;
    profesional: string;    // nombre completo
  }>;
};

export type PlanTratamientoDTO = {
  id: number;
  nombre: string;
  estado: "Activo" | "En curso" | "Cerrado";
  progreso: number;           // 0–100
  tieneOdontograma: boolean;
};
export type PlanesPacienteDTO = {
  planes: PlanTratamientoDTO[];
};


export type TurnoDTO = {
  id: number;
  fecha: string;             // ISO de inicio
  fin: string;               // ISO de fin
  motivo: string | null;
  tipo: string;              // TipoCita
  estado: string;            // EstadoCita
  profesional: string;       // nombre completo
  consultorio?: string | null;
  duracionMin: number;
};

export type TurnosPacienteDTO = {
  proximos: TurnoDTO[];
  pasados: TurnoDTO[];
  noShow: TurnoDTO[];
};

export type FacturaDTO = {
  id: string;
  fecha: string;             // ISO
  total: number;             // en guaraníes (o tu moneda)
  estado: "Pagada" | "Parcial" | "Pendiente";
};
export type PagoDTO = {
  id: string;
  fecha: string;             // ISO
  monto: number;
  medio: string;
};
export type DeudaDTO = {
  id: string;
  concepto: string;
  saldo: number;
};
export type FacturacionPacienteDTO = {
  facturas: FacturaDTO[];
  pagos: PagoDTO[];
  deudas: DeudaDTO[];
  saldo: number; // calculado
};

export type AdjuntoDTO = {
  id: string;
  nombre: string;
  tipo: "CEDULA" | "RADIOGRAFIA" | "OTRO";
  url: string;
  fecha: string; // ISO
};
export type AdjuntosPacienteDTO = {
  items: AdjuntoDTO[];
};