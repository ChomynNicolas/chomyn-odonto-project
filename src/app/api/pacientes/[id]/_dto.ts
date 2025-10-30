// src/app/api/pacientes/[id]/_dto.ts
export function splitNombreCompleto(nombre: string) {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" };
  const apellidos = parts.pop()!;
  return { nombres: parts.join(" "), apellidos };
}

export function safeJsonParse<T = unknown>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export type PacienteFichaDTO = {
  idPaciente: number;
  estaActivo: boolean;
  createdAt: string;
  updatedAt: string;
  persona: {
    idPersona: number;
    nombres: string | null;
    apellidos: string | null;
    genero: string | null;
    fechaNacimiento: string | null;
    direccion: string | null;
    documento: { tipo: string; numero: string; ruc: string | null } | null;
    contactos: Array<{ tipo: "PHONE"|"EMAIL"; valorNorm: string; label: string | null; esPrincipal: boolean; activo: boolean }>;
  };
  antecedentes: {
    antecedentesMedicos: string | null;
    alergias: string | null;
    medicacion: string | null;
    obraSocial: string | null;
  };
  klinic: {
    alergiasCatalogadas: Array<{ id: number; label: string; severity: string; isActive: boolean; notedAt: string }>;
    medicacionCatalogada: Array<{ id: number; label: string; isActive: boolean; startAt: string | null; endAt: string | null }>;
    diagnosticos: Array<{ id: number; label: string; status: string; notedAt: string; resolvedAt: string | null }>;
  };
  kpis: {
    proximoTurno: string | null;
    turnos90dias: number;
    saldo: number; // placeholder si aún no hay módulo de facturas
    noShow: number; // placeholder (podrías contar estado NO_SHOW)
  };
  proximasCitas: CitaLite[];
  ultimasCitas: CitaLite[];
};

export type CitaLite = {
  idCita: number;
  inicio: string;
  fin: string;
  tipo: string;
  estado: string;
  profesional: { idProfesional: number; nombre: string };
  consultorio: { idConsultorio: number; nombre: string } | null;
};

export function nombreCompleto(p?: { nombres: string | null; apellidos: string | null }) {
  return [p?.nombres ?? "", p?.apellidos ?? ""].join(" ").trim();
}
