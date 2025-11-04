// Custom hook for patient data fetching with SWR

"use client"

import useSWR from "swr"
import type { PatientRecord, PatientKPIs } from "@/lib/types/patient"
import { fetchPatientRecord, calculatePatientKPIs } from "@/lib/api/patient-api"

interface UsePatientDataResult {
  patient: PatientRecord | undefined
  kpis: PatientKPIs | undefined
  etag: string | undefined
  isLoading: boolean
  error: Error | undefined
  mutate: () => void
}

/**
 * Hook to fetch and manage patient data
 */
export function usePatientData(patientId: string): UsePatientDataResult {
  const { data, error, isLoading, mutate } = useSWR(
    patientId ? `/api/pacientes/${patientId}` : null,
    () => fetchPatientRecord(patientId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  )

  const kpis = data?.data ? calculatePatientKPIs(data.data) : undefined

  return {
    patient: data?.data,
    kpis,
    etag: data?.etag,
    isLoading,
    error,
    mutate,
  }
}
