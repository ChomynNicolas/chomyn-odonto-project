// @/lib/api/pacientes.types

/** ===== Enums reutilizables ===== */
export type TipoDocumento = "CI" | "DNI" | "PASAPORTE" | "RUC" | "OTRO";
export type Genero = "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO";

// Subconjunto de estados que puede traer "próxima cita"
export type EstadoCitaFutura =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS";

/** ===== Query de lista ===== */
export type SortPacientes =
  | "createdAt desc"
  | "createdAt asc"
  | "nombre asc"
  | "nombre desc";

export interface PacientesQueryParams {
  q?: string;
  soloActivos?: boolean;
  limit?: number;
  cursor?: number;

  genero?: Genero;
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdFrom?: string; // "YYYY-MM-DD"
  createdTo?: string;   // "YYYY-MM-DD"
  sort?: SortPacientes;
  // (futuros flags derivados — client-side hasta tener columna/índice)
  // hasNextAppt?: boolean;
}

/** ===== DTO de la lista (alineado con backend B1) ===== */
export interface PacienteListItemDTO {
  /** Identificador lógico del paciente */
  idPaciente: number;

  /** Estado administrativo del registro */
  estaActivo: boolean;

  /** Datos de la persona (normalizados) */
  persona: {
    idPersona: number;
    nombres: string;
    apellidos: string;
    /** Enum Genero de tu schema; puede venir null si no declarado */
    genero: Genero | null;
    /** ISO string o null si no registraste fecha */
    fechaNacimiento: string | null;
  };

  /** Documento principal (puede venir null en alguno de los campos) */
  documento: {
    tipo: TipoDocumento | null;
    numero: string | null;
    ruc: string | null;
  };

  /** Contactos básicos para badges/acciones (Whats/SMS/email preferido, etc.) */
  contactos: Array<{
    tipo: "PHONE" | "EMAIL";
    valorNorm: string;
    esPrincipal: boolean;
    activo: boolean;
    whatsappCapaz?: boolean | null;
    esPreferidoRecordatorio?: boolean;
    esPreferidoCobranza?: boolean;
  }>;

  /** ===== Derivados clínico/administrativos para badges ===== */
  /** Edad en años completos (calculada server-side) */
  edad: number | null;
  /** ¿Tiene alergias registradas? (derivado de notas JSON por ahora) */
  hasAlergias: boolean;
  /** ¿Tiene medicación activa registrada? (derivado de notas JSON por ahora) */
  hasMedicacion: boolean;
  /** Obra social si está informada (string libre por ahora) */
  obraSocial: string | null;
  /** ¿Tiene responsable de pago principal? */
  hasResponsablePrincipal: boolean;

  /** ===== Relación con la agenda ===== */
  /** Última visita (pasada, no cancel/no_show) en ISO o null si no existe */
  lastVisitAt: string | null;
  /** Profesional de la última visita (para tooltip/enlace) */
  lastVisitProfesionalId: number | null;

  /** Próxima cita futura en estados whitelist (ISO o null si no existe) */
  nextAppointmentAt: string | null;
  /** Estado operativo de la próxima cita (solo whitelist) */
  nextAppointmentEstado: EstadoCitaFutura | null;
  /** Profesional vinculado a la próxima cita */
  nextAppointmentProfesionalId: number | null;
  /** Consultorio de la próxima cita (para logística/colores) */
  nextAppointmentConsultorioId: number | null;

  /** Conteo de planes de tratamiento activos (KPI rápido) */
  activePlansCount: number;
}

/** ===== Respuesta de la API de lista ===== */
export interface PacientesResponse {
  items: PacienteListItemDTO[];
  nextCursor: number | null;
  hasMore: boolean;
  /** Total real en DB para paginación y “n de m” (también viene en X-Total-Count) */
  totalCount: number;
}

/** ===== DTOs de creación (se mantienen) ===== */
export interface CreatePacienteQuickDTO {
  nombreCompleto: string;
  genero?: Genero;
  tipoDocumento: TipoDocumento;
  dni: string;
  telefono: string;
  email?: string;
}

export interface CreatePacienteFullDTO extends CreatePacienteQuickDTO {
  ruc?: string;
  domicilio?: string;
  antecedentesMedicos?: string;
  alergias?: string;
  medicacion?: string;
  responsablePago?: string;
  obraSocial?: string;
  preferenciasContacto?: {
    whatsapp?: boolean;
    sms?: boolean;
    llamada?: boolean;
    email?: boolean;
  };
}
