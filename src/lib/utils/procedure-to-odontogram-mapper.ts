// src/lib/utils/procedure-to-odontogram-mapper.ts
/**
 * Utilidades para mapear procedimientos a condiciones dentales del odontograma
 */

import type { ProcedimientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import type { ToothCondition } from "@/lib/types/patient"
import { DienteSuperficie } from "@prisma/client"

export interface ProcedureSuggestion {
  condition: ToothCondition
  surface: string | null
  notes?: string
}

/**
 * Mapea el tipo de procedimiento (serviceType) a una condición dental sugerida
 */
export function mapProcedureToToothCondition(serviceType: string | null): ToothCondition {
  if (!serviceType) return "INTACT"

  const normalized = serviceType.toLowerCase().trim()

  // Obturaciones y restauraciones
  if (
    normalized.includes("obturación") ||
    normalized.includes("obturacion") ||
    normalized.includes("amalgama") ||
    normalized.includes("resina") ||
    normalized.includes("composite") ||
    normalized.includes("restauración") ||
    normalized.includes("restauracion")
  ) {
    return "FILLED"
  }

  // Endodoncias
  if (
    normalized.includes("endodoncia") ||
    normalized.includes("tratamiento de conducto") ||
    normalized.includes("conducto radicular") ||
    normalized.includes("pulpectomía") ||
    normalized.includes("pulpectomia")
  ) {
    return "ROOT_CANAL"
  }

  // Coronas
  if (
    normalized.includes("corona") ||
    normalized.includes("fundas") ||
    normalized.includes("cap") ||
    normalized.includes("jacket")
  ) {
    return "CROWN"
  }

  // Extracciones
  if (
    normalized.includes("extracción") ||
    normalized.includes("extraccion") ||
    normalized.includes("exodoncia") ||
    normalized.includes("avulsión") ||
    normalized.includes("avulsion")
  ) {
    return "MISSING"
  }

  // Implantes
  if (
    normalized.includes("implante") ||
    normalized.includes("implantología") ||
    normalized.includes("implantologia")
  ) {
    return "IMPLANT"
  }

  // Caries
  if (
    normalized.includes("caries") ||
    normalized.includes("cavidad") ||
    normalized.includes("lesión cariosa") ||
    normalized.includes("lesion cariosa")
  ) {
    return "CARIES"
  }

  // Fracturas
  if (
    normalized.includes("fractura") ||
    normalized.includes("fisura") ||
    normalized.includes("grieta")
  ) {
    return "FRACTURED"
  }

  // Puentes
  if (
    normalized.includes("puente") ||
    normalized.includes("bridge") ||
    normalized.includes("prótesis fija") ||
    normalized.includes("protesis fija")
  ) {
    return "BRIDGE"
  }

  // Extracción necesaria (diagnóstico)
  if (
    normalized.includes("extracción necesaria") ||
    normalized.includes("extraccion necesaria") ||
    normalized.includes("indicada extracción") ||
    normalized.includes("indicada extraccion")
  ) {
    return "EXTRACTION_NEEDED"
  }

  // Por defecto, no sugerir cambio (mantener INTACT o condición actual)
  return "INTACT"
}

/**
 * Obtiene la superficie sugerida desde el procedimiento
 */
export function getProcedureSurface(procedure: ProcedimientoDTO): string | null {
  if (!procedure.toothSurface) return null

  // Mapear enum DienteSuperficie a string para el frontend
  const surfaceMap: Record<DienteSuperficie, string> = {
    [DienteSuperficie.O]: "Oclusal",
    [DienteSuperficie.M]: "Mesial",
    [DienteSuperficie.D]: "Distal",
    [DienteSuperficie.V]: "Vestibular",
    [DienteSuperficie.L]: "Lingual/Palatino",
    [DienteSuperficie.MO]: "Mesio-Oclusal",
    [DienteSuperficie.DO]: "Disto-Oclusal",
    [DienteSuperficie.VO]: "Vestibulo-Oclusal",
    [DienteSuperficie.LO]: "Lingual-Oclusal",
    [DienteSuperficie.MOD]: "Mesio-Ocluso-Distal",
    [DienteSuperficie.MV]: "Mesio-Vestibular",
    [DienteSuperficie.DL]: "Disto-Lingual",
  }

  return surfaceMap[procedure.toothSurface] || null
}

/**
 * Obtiene sugerencias de condición y superficie para un procedimiento
 */
export function getProcedureSuggestions(procedure: ProcedimientoDTO): ProcedureSuggestion {
  const condition = mapProcedureToToothCondition(procedure.serviceType)
  const surface = getProcedureSurface(procedure)

  // Construir notas sugeridas
  const notesParts: string[] = []
  if (procedure.serviceType) {
    notesParts.push(`Procedimiento: ${procedure.serviceType}`)
  }
  if (procedure.resultNotes) {
    notesParts.push(`Notas: ${procedure.resultNotes}`)
  }

  return {
    condition,
    surface,
    notes: notesParts.length > 0 ? notesParts.join(" | ") : undefined,
  }
}

/**
 * Agrupa procedimientos por número de diente
 */
export function groupProceduresByTooth(
  procedures: ProcedimientoDTO[],
): Map<number, ProcedimientoDTO[]> {
  const grouped = new Map<number, ProcedimientoDTO[]>()

  procedures
    .filter((proc) => proc.toothNumber !== null && proc.toothNumber !== undefined)
    .forEach((proc) => {
      const toothNum = proc.toothNumber!
      if (toothNum >= 1 && toothNum <= 85) {
        // Validar rango válido
        if (!grouped.has(toothNum)) {
          grouped.set(toothNum, [])
        }
        grouped.get(toothNum)!.push(proc)
      }
    })

  return grouped
}

/**
 * Verifica si un diente tiene procedimientos asociados
 */
export function hasProceduresForTooth(
  toothNumber: string,
  procedures: ProcedimientoDTO[],
): boolean {
  const toothNum = Number.parseInt(toothNumber, 10)
  if (isNaN(toothNum)) return false

  return procedures.some(
    (proc) => proc.toothNumber === toothNum && proc.toothNumber !== null,
  )
}

/**
 * Obtiene todos los procedimientos para un diente específico
 */
export function getProceduresForTooth(
  toothNumber: string,
  procedures: ProcedimientoDTO[],
): ProcedimientoDTO[] {
  const toothNum = Number.parseInt(toothNumber, 10)
  if (isNaN(toothNum)) return []

  return procedures.filter(
    (proc) => proc.toothNumber === toothNum && proc.toothNumber !== null,
  )
}

