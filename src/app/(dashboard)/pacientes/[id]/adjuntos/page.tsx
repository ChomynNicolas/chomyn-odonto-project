import { notFound } from "next/navigation"
import { getPatientById } from "@/lib/api/patient-api"
import { AttachmentsTab } from "@/components/pacientes/tabs/AttachmentsTab"

export default async function PatientAttachmentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = await getPatientById(id)

  if (!patient) {
    notFound()
  }

  return <AttachmentsTab patient={patient} userRole="ADMIN" />
}
