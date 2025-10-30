"use client"

import { useParams, useRouter } from "next/navigation"
import PatientDetailSkeleton, {
  PatientError,
  PatientNotFound,
} from "@/components/pacientes/detail/PatientDetailSkeleton"
import PatientDetail from "@/components/pacientes/PatientDetail"
import { usePacienteDetail } from "@/hooks/usePacienteDetailQuery"

export default function PagePacienteDetalle() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading, isError, error, refetch } = usePacienteDetail(id)

  if (isLoading) {
    return (
      <main className="p-6">
        <PatientDetailSkeleton />
      </main>
    )
  }

  if (isError) {
    return (
      <main className="p-6">
        <PatientError message={(error as any)?.message} onRetry={() => refetch()} />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="p-6">
        <PatientNotFound onBack={() => router.push("/pacientes")} />
      </main>
    )
  }

  return (
    <main className="p-6">
      <PatientDetail paciente={data} />
    </main>
  )
}
