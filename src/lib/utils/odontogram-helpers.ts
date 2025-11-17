// src/lib/utils/odontogram-helpers.ts
/**
 * Utilidades para conversión entre formatos de odontograma
 * - Formato componente: ToothRecord[] con toothNumber: string
 * - Formato API: OdontogramEntryDTO[] con toothNumber: number
 */

import type { ToothRecord, ToothCondition } from "@/lib/types/patient"
import type { OdontogramEntryDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { DienteSuperficie } from "@prisma/client"
import type { ToothCondition as PrismaToothCondition } from "@prisma/client"

/**
 * Mapea un valor de ToothCondition de Prisma al tipo del frontend
 * Asegura que todos los valores sean compatibles
 */
function mapPrismaConditionToFrontend(condition: PrismaToothCondition): ToothCondition {
  // Todos los valores de Prisma son válidos en el frontend
  return condition as ToothCondition
}

/**
 * Convierte entries del API a formato ToothRecord para el componente visual
 */
export function entriesToToothRecords(entries: OdontogramEntryDTO[]): ToothRecord[] {
  const recordsMap = new Map<string, ToothRecord>()

  // Agrupar por número de diente (puede haber múltiples entries por diente con diferentes superficies)
  entries.forEach((entry) => {
    const toothKey = String(entry.toothNumber)
    const existing = recordsMap.get(toothKey)

    if (existing) {
      // Si ya existe, agregar superficie si hay
      if (entry.surface) {
        const surfaces = existing.surfaces || []
        if (!surfaces.includes(entry.surface)) {
          surfaces.push(entry.surface)
        }
        existing.surfaces = surfaces
      }
      // Actualizar condición si es más grave o diferente
      if (entry.condition !== "INTACT" && existing.condition === "INTACT") {
        existing.condition = mapPrismaConditionToFrontend(entry.condition)
      }
      // Combinar notas
      if (entry.notes && !existing.notes?.includes(entry.notes)) {
        existing.notes = existing.notes ? `${existing.notes}; ${entry.notes}` : entry.notes
      }
    } else {
      // Crear nuevo registro
      recordsMap.set(toothKey, {
        toothNumber: toothKey,
        condition: mapPrismaConditionToFrontend(entry.condition),
        surfaces: entry.surface ? [entry.surface] : undefined,
        notes: entry.notes || undefined,
      })
    }
  })

  // Si no hay entries, inicializar todos los dientes como INTACT
  if (recordsMap.size === 0) {
    const initialTeeth: ToothRecord[] = []
    // Upper arch: 11-18, 21-28
    for (let i = 11; i <= 18; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
    for (let i = 21; i <= 28; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
    // Lower arch: 31-38, 41-48
    for (let i = 31; i <= 38; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
    for (let i = 41; i <= 48; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
    return initialTeeth
  }

  // Asegurar que todos los dientes estén presentes (rellenar con INTACT si faltan)
  const allTeethNumbers = [
    ...Array.from({ length: 8 }, (_, i) => String(11 + i)),
    ...Array.from({ length: 8 }, (_, i) => String(21 + i)),
    ...Array.from({ length: 8 }, (_, i) => String(31 + i)),
    ...Array.from({ length: 8 }, (_, i) => String(41 + i)),
  ]

  allTeethNumbers.forEach((toothNum) => {
    if (!recordsMap.has(toothNum)) {
      recordsMap.set(toothNum, { toothNumber: toothNum, condition: "INTACT" })
    }
  })

  return Array.from(recordsMap.values()).sort((a, b) => Number.parseInt(a.toothNumber) - Number.parseInt(b.toothNumber))
}

/**
 * Determina si un diente tiene información relevante para guardar
 * Un diente es relevante si:
 * - No está en estado INTACT, O
 * - Tiene superficies específicas, O
 * - Tiene notas
 */
export function isToothRelevant(tooth: ToothRecord): boolean {
  if (tooth.condition !== "INTACT") return true
  if (tooth.surfaces && tooth.surfaces.length > 0) return true
  if (tooth.notes && tooth.notes.trim().length > 0) return true
  return false
}

/**
 * Convierte ToothRecord[] a formato entries para el API
 * Crea una entry por cada superficie afectada o una entry general si no hay superficies
 * Filtra automáticamente dientes INTACT sin información adicional
 */
export function toothRecordsToEntries(teeth: ToothRecord[]): Array<{
  toothNumber: number
  surface: DienteSuperficie | null
  condition: ToothCondition
  notes: string | null
}> {
  const entries: Array<{
    toothNumber: number
    surface: DienteSuperficie | null
    condition: ToothCondition
    notes: string | null
  }> = []

  // Filtrar solo dientes relevantes
  const relevantTeeth = teeth.filter(isToothRelevant)

  relevantTeeth.forEach((tooth) => {
    const toothNum = Number.parseInt(tooth.toothNumber)
    if (isNaN(toothNum)) return

    // Si hay superficies específicas, crear una entry por cada superficie
    if (tooth.surfaces && tooth.surfaces.length > 0) {
      tooth.surfaces.forEach((surfaceStr) => {
        // Convertir string de superficie a enum
        const surface = mapSurfaceStringToEnum(surfaceStr)
        entries.push({
          toothNumber: toothNum,
          surface,
          condition: tooth.condition,
          notes: tooth.notes || null,
        })
      })
    } else {
      // Si no hay superficies específicas, crear una entry general (surface = null)
      entries.push({
        toothNumber: toothNum,
        surface: null,
        condition: tooth.condition,
        notes: tooth.notes || null,
      })
    }
  })

  return entries
}

/**
 * Mapea strings de superficie a enum DienteSuperficie
 */
function mapSurfaceStringToEnum(surfaceStr: string): DienteSuperficie | null {
  // Si ya es un valor del enum, devolverlo directamente
  if (Object.values(DienteSuperficie).includes(surfaceStr as DienteSuperficie)) {
    return surfaceStr as DienteSuperficie
  }
  
  const mapping: Record<string, DienteSuperficie> = {
    Oclusal: DienteSuperficie.O,
    Mesial: DienteSuperficie.M,
    Distal: DienteSuperficie.D,
    Vestibular: DienteSuperficie.V,
    "Lingual/Palatino": DienteSuperficie.L,
    MO: DienteSuperficie.MO,
    DO: DienteSuperficie.DO,
    VO: DienteSuperficie.VO,
    LO: DienteSuperficie.LO,
    MOD: DienteSuperficie.MOD,
    MV: DienteSuperficie.MV,
    DL: DienteSuperficie.DL,
  }

  return mapping[surfaceStr] || null
}

/**
 * Mapea enum DienteSuperficie a string legible
 */
export function mapSurfaceEnumToString(surface: DienteSuperficie | null): string {
  if (!surface) return ""
  const mapping: Record<DienteSuperficie, string> = {
    O: "Oclusal",
    M: "Mesial",
    D: "Distal",
    V: "Vestibular",
    L: "Lingual/Palatino",
    MO: "Mesio-Oclusal",
    DO: "Disto-Oclusal",
    VO: "Vestíbulo-Oclusal",
    LO: "Lingual-Oclusal",
    MOD: "Mesio-Ocluso-Distal",
    MV: "Mesio-Vestibular",
    DL: "Disto-Lingual",
  }
  return mapping[surface] || surface
}
