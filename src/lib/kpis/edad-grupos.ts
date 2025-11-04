// src/lib/kpis/edad-grupos.ts
/**
 * Definición de grupos etarios para segmentación
 */

export interface EdadGrupo {
  label: string
  min: number
  max: number | null // null = sin límite superior
}

export const EDAD_GRUPOS_DEFAULT: EdadGrupo[] = [
  { label: "0-12", min: 0, max: 12 },
  { label: "13-17", min: 13, max: 17 },
  { label: "18-39", min: 18, max: 39 },
  { label: "40-64", min: 40, max: 64 },
  { label: "65+", min: 65, max: null },
]

export function getEdadGrupo(edad: number, grupos: EdadGrupo[] = EDAD_GRUPOS_DEFAULT): string | null {
  for (const grupo of grupos) {
    if (edad >= grupo.min && (grupo.max === null || edad <= grupo.max)) {
      return grupo.label
    }
  }
  return null
}

export function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date()
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
  const mes = hoy.getMonth() - fechaNacimiento.getMonth()

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--
  }

  return edad
}
