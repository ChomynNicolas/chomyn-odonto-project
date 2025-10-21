// src/lib/normalize.ts
export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function normalizePhonePY(raw: string) {
  let s = raw.replace(/\D+/g, "");
  if (s.startsWith("0")) s = s.slice(1);
  if (!s.startsWith("595")) s = "595" + s;
  return "+" + s;
}

export function splitNombreCompleto(nombreCompleto: string) {
  const parts = nombreCompleto.trim().split(/\s+/);
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" };
  const apellidos = parts.pop()!;
  return { nombres: parts.join(" "), apellidos };
}
