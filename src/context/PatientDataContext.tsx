"use client"

import { createContext, useContext, type ReactNode } from "react"
import useSWR, { type SWRResponse } from "swr"
import type { PatientRecord, PatientKPIs } from "@/lib/types/patient"
import { fetchPatientRecord, calculatePatientKPIs } from "@/lib/api/patient-api"

interface PatientDataContextValue {
  patient: PatientRecord | undefined
  kpis: PatientKPIs | undefined
  etag: string | undefined
  isLoading: boolean
  error: Error | undefined
  mutate: () => void
}

const PatientDataContext = createContext<PatientDataContextValue | null>(null)

interface PatientDataProviderProps {
  patientId: string
  initialData?: PatientRecord
  children: ReactNode
}

/**
 * Provider that manages patient data with SWR caching
 * Shares data across all tabs to prevent unnecessary refetches
 */
export function PatientDataProvider({ patientId, initialData, children }: PatientDataProviderProps) {
  const { data, error, isLoading, mutate }: SWRResponse<{ data: PatientRecord; etag?: string }> = useSWR(
    patientId ? `/api/pacientes/${patientId}` : null,
    () => fetchPatientRecord(patientId),
    {
      fallbackData: initialData ? { data: initialData, etag: undefined } : undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute - prevent duplicate requests
      focusThrottleInterval: 300000, // 5 minutes - throttle revalidation on focus
      keepPreviousData: true, // Keep previous data while revalidating
    },
  )

  const kpis = data?.data ? calculatePatientKPIs(data.data) : undefined

  const value: PatientDataContextValue = {
    patient: data?.data,
    kpis,
    etag: data?.etag,
    isLoading,
    error,
    mutate,
  }

  return <PatientDataContext.Provider value={value}>{children}</PatientDataContext.Provider>
}

/**
 * Hook to access patient data from context
 * Must be used within PatientDataProvider
 */
export function usePatientContext(): PatientDataContextValue {
  const context = useContext(PatientDataContext)
  if (!context) {
    throw new Error("usePatientContext must be used within PatientDataProvider")
  }
  return context
}
