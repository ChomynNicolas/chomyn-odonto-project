/**
 * Utilidades para transformar datos del formulario de creación rápida
 */

/**
 * Divide un nombre completo en nombres y apellidos
 * Asume que la última palabra es el apellido
 * @example splitNombreCompleto("Juan Carlos Pérez") => { nombres: "Juan Carlos", apellidos: "Pérez" }
 */
export function splitNombreCompleto(nombreCompleto: string): {
  nombres: string
  apellidos: string
} {
  const parts = nombreCompleto.trim().split(/\s+/)

  if (parts.length === 1) {
    return { nombres: parts[0], apellidos: "" }
  }

  const apellidos = parts.pop()!
  return { nombres: parts.join(" "), apellidos }
}

/**
 * Mapea el género del formulario al formato de base de datos
 * Permite null para género no especificado
 */
export function mapGeneroToDB(g?: string | null): string | null {
  return g ?? null
}
