// src/app/(dashboard)/pacientes/[id]/consultas/[citaId]/page.tsx
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ConsultaDetailView } from "@/components/consulta-clinica/ConsultaDetailView"
import { prisma } from "@/lib/prisma"

interface PageProps {
  params: Promise<{ id: string; citaId: string }>
}

export default async function ConsultaDetailPage({ params }: PageProps) {
  const { id, citaId } = await params
  const patientId = Number(id)
  const citaIdNum = Number(citaId)

  if (!Number.isFinite(patientId) || patientId <= 0) {
    redirect(`/pacientes/${id}`)
  }

  if (!Number.isFinite(citaIdNum) || citaIdNum <= 0) {
    redirect(`/pacientes/${id}`)
  }

  const session = await auth()
  if (!session?.user?.id) {
    redirect("/signin")
  }

  const rol: "ADMIN" | "ODONT" | "RECEP" = session.user.role ?? "RECEP"

  // Verificar que la cita existe y pertenece al paciente
  const cita = await prisma.cita.findUnique({
    where: { idCita: citaIdNum },
    select: {
      idCita: true,
      pacienteId: true,
      paciente: {
        select: {
          persona: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
        },
      },
    },
  })

  if (!cita) {
    redirect(`/pacientes/${patientId}`)
  }

  // Verificar que la cita pertenece al paciente especificado
  if (cita.pacienteId !== patientId) {
    redirect(`/pacientes/${patientId}`)
  }

  // RBAC: Todos los roles pueden ver consultas en modo read-only
  const canAccess = rol === "ADMIN" || rol === "ODONT" || rol === "RECEP"
  if (!canAccess) {
    redirect(`/pacientes/${patientId}`)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <ConsultaDetailView citaId={citaIdNum} patientId={patientId} userRole={rol} />
    </div>
  )
}

