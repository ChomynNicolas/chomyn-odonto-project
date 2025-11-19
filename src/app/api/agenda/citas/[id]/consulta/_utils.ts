// src/app/api/agenda/citas/[id]/consulta/_utils.ts
import type { ProcedimientoDTO } from "./_dto"

/**
 * Sanitizes a procedure DTO based on user role
 * ODONT role should not see monetary values
 */
export function sanitizeProcedimientoForRole(
  proc: ProcedimientoDTO,
  role: "ADMIN" | "ODONT" | "RECEP"
): ProcedimientoDTO {
  if (role === "ODONT") {
    // Hide prices from dentists
    return {
      ...proc,
      unitPriceCents: null,
      totalCents: null,
    }
  }
  // ADMIN and RECEP can see prices (though RECEP typically doesn't see procedures)
  return proc
}

/**
 * Sanitizes an array of procedures based on user role
 */
export function sanitizeProcedimientosArrayForRole(
  procedimientos: ProcedimientoDTO[],
  role: "ADMIN" | "ODONT" | "RECEP"
): ProcedimientoDTO[] {
  return procedimientos.map((proc) => sanitizeProcedimientoForRole(proc, role))
}

