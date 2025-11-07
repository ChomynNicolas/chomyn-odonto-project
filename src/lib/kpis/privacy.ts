// src/lib/kpis/privacy.ts
/**
 * Utilidades para ofuscación de PII según modo privacidad
 */

export function ofuscarNombre(nombre: string, privacyMode: boolean): string {
  if (!privacyMode) return nombre

  const partes = nombre.trim().split(/\s+/)
  if (partes.length === 0) return "***"

  // Mostrar primera letra de cada parte + ***
  return partes.map((p) => p.charAt(0).toUpperCase() + "***").join(" ")
}

export function ofuscarDocumento(documento: string, privacyMode: boolean): string {
  if (!privacyMode) return documento

  const clean = documento.replace(/\D/g, "")
  if (clean.length <= 4) return "****"

  // Mostrar últimos 4 dígitos
  return "****" + clean.slice(-4)
}

export function ofuscarTelefono(telefono: string, privacyMode: boolean): string {
  if (!privacyMode) return telefono

  const clean = telefono.replace(/\D/g, "")
  if (clean.length <= 4) return "****"

  return "****" + clean.slice(-4)
}

export function ofuscarEmail(email: string, privacyMode: boolean): string {
  if (!privacyMode) return email

  const [local, domain] = email.split("@")
  if (!domain) return "***@***"

  const localOfuscado = local.charAt(0) + "***"
  return `${localOfuscado}@${domain}`
}
