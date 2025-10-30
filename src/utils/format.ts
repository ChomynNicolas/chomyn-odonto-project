// utils/format.ts
import type { PacienteItem } from "@/lib/api/pacientes.types";

export function getAge(birthDate?: string | Date | null): number | null {
  if (!birthDate) return null;
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

export function renderNombre(p: PacienteItem): string {
  const nom = [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim();
  return nom || "—";
}
export function renderDocumento(p: PacienteItem): string {
  const doc = p.persona.documento;
  if (!doc) return "—";
  return `${doc.numero}${doc.ruc ? ` • RUC ${doc.ruc}` : ""}`;
}
export function renderTelefono(p: PacienteItem): string {
  const phone = p.persona.contactos.find((c) => c.tipo === "PHONE" && c.activo !== false);
  return phone?.valorNorm || "—";
}
export function renderEmail(p: PacienteItem): string {
  const mail = p.persona.contactos.find((c) => c.tipo === "EMAIL" && c.activo !== false);
  return mail?.valorNorm || "—";
}
export function renderGenero(p: PacienteItem): string {
  const genero = p.persona.genero;
  switch (genero) {
    case "MASCULINO": return "Masculino";
    case "FEMENINO": return "Femenino";
    case "OTRO": return "Otro";
    case "NO_ESPECIFICADO": return "N/E";
    default: return "—";
  }
}
