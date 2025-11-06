import type React from "react"
import { notFound } from "next/navigation"
import { PatientLayoutClient } from "@/components/pacientes/PatientLayoutClient"
import { PatientDataProvider } from "@/context/PatientDataContext"
import { getPatientById } from "@/lib/api/patient-api"

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = await getPatientById(id)

  if (!patient) {
    notFound()
  }

  return (
    <PatientDataProvider patientId={id} initialData={patient}>
      <PatientLayoutClient patient={patient}>{children}</PatientLayoutClient>
    </PatientDataProvider>
  )
}
