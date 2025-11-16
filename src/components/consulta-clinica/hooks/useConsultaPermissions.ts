// src/components/consulta-clinica/hooks/useConsultaPermissions.ts
import { useMemo } from "react"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

export function useConsultaPermissions(
  userRole: "ADMIN" | "ODONT" | "RECEP",
  consulta: ConsultaClinicaDTO | null
) {
  return useMemo(() => {
    const canEdit = userRole === "ADMIN" || userRole === "ODONT"
    const canView = canEdit || userRole === "RECEP"
    const isFinalized = consulta?.status === "FINAL"
    const hasConsulta = consulta?.createdAt !== null
    const canEditModules = canEdit && !isFinalized
    const canViewResumen = canEdit

    return {
      canEdit,
      canView,
      isFinalized,
      hasConsulta,
      canEditModules,
      canViewResumen,
    }
  }, [userRole, consulta])
}

