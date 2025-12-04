// src/lib/hooks/use-current-patient-flow.ts
"use client"

import { useSession } from "next-auth/react"
import { useMemo, useEffect, useState } from "react"
import type { ColaDTO } from "@/app/api/dashboard/kpi/_dto"

interface CurrentPatientFlow {
  enAtencion: {
    idCita: number
    pacienteId: number
    paciente: string
    profesional: string
    hora: string
  } | null
  siguienteTurno: {
    idCita: number
    pacienteId: number
    paciente: string
    consultorio: string | null
    hora: string
  } | null
}

interface UseCurrentPatientFlowReturn {
  data: CurrentPatientFlow | null
  isLoading: boolean
  error: Error | null
}

/**
 * Hook para obtener el flujo de atención actual (paciente en atención + siguiente turno)
 * Filtra por profesional si el usuario es ODONT
 */
export function useCurrentPatientFlow(): UseCurrentPatientFlowReturn {
  const { data: session, status } = useSession()
  const [profesionalId, setProfesionalId] = useState<number | null>(null)
  const [loadingProfesional, setLoadingProfesional] = useState(false)
  const [flowData, setFlowData] = useState<ColaDTO | null>(null)
  const [isLoadingFlow, setIsLoadingFlow] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Obtener profesionalId si el usuario es ODONT
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      setProfesionalId(null)
      return
    }

    const role = session.user.role
    const userId = session.user.id

    if (role === "ODONT" && userId) {
      setLoadingProfesional(true)
      fetch(`/api/profesionales/by-user/${userId}`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              // Usuario no es profesional, está bien
              return null
            }
            throw new Error(`Failed to fetch profesional: ${res.status}`)
          }
          return res.json()
        })
        .then((data) => {
          if (data?.ok && data?.data?.idProfesional) {
            setProfesionalId(data.data.idProfesional)
          } else {
            setProfesionalId(null)
          }
        })
        .catch((err) => {
          console.error("Error fetching profesionalId:", err)
          setProfesionalId(null)
        })
        .finally(() => {
          setLoadingProfesional(false)
        })
    } else {
      setProfesionalId(null)
    }
  }, [session?.user, status])

  // Obtener datos del flujo de atención
  useEffect(() => {
    if (status !== "authenticated") {
      setFlowData(null)
      setIsLoadingFlow(false)
      return
    }

    setIsLoadingFlow(true)
    setError(null)

    fetch("/api/dashboard/kpi?slotMin=30")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch flow data: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (data?.ok && data?.data?.colas) {
          setFlowData(data.data.colas)
        } else {
          setFlowData(null)
        }
      })
      .catch((err) => {
        console.error("Error fetching flow data:", err)
        setError(err)
        setFlowData(null)
      })
      .finally(() => {
        setIsLoadingFlow(false)
      })
  }, [status])

  // Procesar y filtrar datos
  const processedData = useMemo((): CurrentPatientFlow | null => {
    if (!flowData) return null

    const role = session?.user?.role

    // Filtrar enAtencion por profesional si es ODONT
    let enAtencionFiltered = flowData.enAtencion
    if (role === "ODONT" && profesionalId !== null) {
      enAtencionFiltered = flowData.enAtencion.filter(
        (item) => item.profesionalId === profesionalId
      )
    }

    // Obtener primer paciente en atención
    const enAtencion = enAtencionFiltered.length > 0
      ? {
          idCita: enAtencionFiltered[0].idCita,
          pacienteId: enAtencionFiltered[0].pacienteId,
          paciente: enAtencionFiltered[0].paciente,
          profesional: enAtencionFiltered[0].profesional,
          hora: enAtencionFiltered[0].hora,
        }
      : null

    // Obtener siguiente turno en sala (primero de checkIn)
    const siguienteTurno = flowData.checkIn.length > 0
      ? {
          idCita: flowData.checkIn[0].idCita,
          pacienteId: flowData.checkIn[0].pacienteId,
          paciente: flowData.checkIn[0].paciente,
          consultorio: flowData.checkIn[0].consultorio,
          hora: flowData.checkIn[0].hora,
        }
      : null

    // Solo retornar si hay al menos un dato
    if (!enAtencion && !siguienteTurno) {
      return null
    }

    return {
      enAtencion,
      siguienteTurno,
    }
  }, [flowData, profesionalId, session?.user?.role])

  const isLoading = status === "loading" || loadingProfesional || isLoadingFlow

  return {
    data: processedData,
    isLoading,
    error,
  }
}

