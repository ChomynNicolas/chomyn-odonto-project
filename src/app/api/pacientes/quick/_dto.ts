// src/app/api/pacientes/quick/_dto.ts
export function splitNombreCompleto(nombreCompleto: string) {
  const parts = nombreCompleto.trim().split(/\s+/);
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" };
  const apellidos = parts.pop()!;
  return { nombres: parts.join(" "), apellidos };
}

export function mapGeneroToDB(g?: string | null) {
  return g ?? null; // ya usas enum Genero con NO_ESPECIFICADO disponible
}
