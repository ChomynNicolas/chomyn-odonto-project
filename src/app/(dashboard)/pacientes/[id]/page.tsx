
import { PatientFichaView } from "@/components/pacientes/PatientFichaView"
import { notFound } from "next/navigation"
import { getPatientById } from '@/lib/api/patient-api';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getPatientById(id)

  if (!patient) {
    notFound()
  }

  return <PatientFichaView patient={patient} />
}
