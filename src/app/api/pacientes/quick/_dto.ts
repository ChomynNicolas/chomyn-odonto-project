/**
 * Utilidades para transformar datos del formulario de creación rápida
 */

/**
 * Divide un nombre completo en nombres, apellidos y segundo apellido
 * Asume que si hay 3+ palabras, las últimas 2 son apellidos
 * @example splitNombreCompleto("Juan Carlos Pérez") => { nombres: "Juan Carlos", apellidos: "Pérez", segundoApellido: null }
 * @example splitNombreCompleto("Juan Carlos Pérez García") => { nombres: "Juan Carlos", apellidos: "Pérez", segundoApellido: "García" }
 */
export function splitNombreCompleto(nombreCompleto: string): {
  nombres: string
  apellidos: string
  segundoApellido: string | null
} {
  const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return { nombres: parts[0], apellidos: "", segundoApellido: null }
  }

  if (parts.length === 2) {
    return { nombres: parts[0], apellidos: parts[1], segundoApellido: null }
  }

  // 3+ words: last 2 are last names (apellidos + segundoApellido)
  const segundoApellido = parts.pop()!
  const apellidos = parts.pop()!
  return { nombres: parts.join(" "), apellidos, segundoApellido }
}

/**
 * Mapea el género del formulario al formato de base de datos
 * Permite null para género no especificado
 */
export function mapGeneroToDB(g?: string | null): string | null {
  return g ?? null
}
