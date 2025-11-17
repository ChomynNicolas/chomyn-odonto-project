// src/lib/utils/odontogram-audit-helpers.ts
/**
 * Helpers para auditoría de odontograma
 * Calcula diferencias entre versiones para registro de auditoría
 */

import type { OdontogramEntryDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import type { DienteSuperficie, ToothCondition } from "@prisma/client"

export interface OdontogramDiff {
  added: Array<{
    toothNumber: number
    surface: DienteSuperficie | null
    condition: ToothCondition
    notes: string | null
  }>
  removed: Array<{
    toothNumber: number
    surface: DienteSuperficie | null
    condition: ToothCondition
    notes: string | null
  }>
  modified: Array<{
    toothNumber: number
    surface: DienteSuperficie | null
    oldCondition: ToothCondition
    newCondition: ToothCondition
    oldNotes: string | null
    newNotes: string | null
  }>
}

/**
 * Calcula la diferencia entre dos versiones de odontograma
 * @param oldEntries Entradas anteriores (puede ser null/undefined para creación nueva)
 * @param newEntries Entradas nuevas
 * @returns Diff con cambios detectados
 */
export function calculateOdontogramDiff(
  oldEntries: OdontogramEntryDTO[] | null | undefined,
  newEntries: OdontogramEntryDTO[],
): OdontogramDiff {
  const diff: OdontogramDiff = {
    added: [],
    removed: [],
    modified: [],
  }

  // Si no hay entradas anteriores, todas las nuevas son agregadas
  if (!oldEntries || oldEntries.length === 0) {
    diff.added = newEntries.map((e) => ({
      toothNumber: e.toothNumber,
      surface: e.surface ?? null,
      condition: e.condition,
      notes: e.notes ?? null,
    }))
    return diff
  }

  // Crear mapas para comparación rápida
  // Clave: `${toothNumber}-${surface ?? 'null'}`
  const oldMap = new Map<string, OdontogramEntryDTO>()
  const newMap = new Map<string, OdontogramEntryDTO>()

  oldEntries.forEach((entry) => {
    const key = `${entry.toothNumber}-${entry.surface ?? "null"}`
    oldMap.set(key, entry)
  })

  newEntries.forEach((entry) => {
    const key = `${entry.toothNumber}-${entry.surface ?? "null"}`
    newMap.set(key, entry)
  })

  // Encontrar entradas agregadas y modificadas
  newMap.forEach((newEntry, key) => {
    const oldEntry = oldMap.get(key)
    if (!oldEntry) {
      // Nueva entrada
      diff.added.push({
        toothNumber: newEntry.toothNumber,
        surface: newEntry.surface ?? null,
        condition: newEntry.condition,
        notes: newEntry.notes ?? null,
      })
    } else {
      // Verificar si cambió
      const conditionChanged = oldEntry.condition !== newEntry.condition
      const notesChanged = (oldEntry.notes ?? null) !== (newEntry.notes ?? null)
      if (conditionChanged || notesChanged) {
        diff.modified.push({
          toothNumber: newEntry.toothNumber,
          surface: newEntry.surface ?? null,
          oldCondition: oldEntry.condition,
          newCondition: newEntry.condition,
          oldNotes: oldEntry.notes ?? null,
          newNotes: newEntry.notes ?? null,
        })
      }
    }
  })

  // Encontrar entradas removidas
  oldMap.forEach((oldEntry, key) => {
    if (!newMap.has(key)) {
      diff.removed.push({
        toothNumber: oldEntry.toothNumber,
        surface: oldEntry.surface ?? null,
        condition: oldEntry.condition,
        notes: oldEntry.notes ?? null,
      })
    }
  })

  return diff
}

/**
 * Genera un resumen legible del diff para auditoría
 */
export function formatOdontogramDiffSummary(diff: OdontogramDiff): string {
  const parts: string[] = []

  if (diff.added.length > 0) {
    parts.push(`${diff.added.length} entrada(s) agregada(s)`)
  }
  if (diff.removed.length > 0) {
    parts.push(`${diff.removed.length} entrada(s) removida(s)`)
  }
  if (diff.modified.length > 0) {
    parts.push(`${diff.modified.length} entrada(s) modificada(s)`)
  }

  return parts.length > 0 ? parts.join(", ") : "Sin cambios"
}

