// src/app/api/pacientes/_dto.ts
import type { PacienteCreateBody } from "./_schemas";

export function splitNombreCompleto(nombreCompleto: string) {
  const parts = nombreCompleto.trim().split(/\s+/);
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" };
  const apellidos = parts.pop()!;
  return { nombres: parts.join(" "), apellidos };
}

export function mapGeneroToDB(g: string) {
  if (g === "NO_ESPECIFICADO") return "NO_ESPECIFICADO";
  return g;
}

export type CrearPacienteTxResult = { idPaciente: number };
