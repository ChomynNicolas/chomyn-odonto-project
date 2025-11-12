// src/app/(dashboard)/agenda/citas/[id]/consulta/page.tsx
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ConsultaClinicaWorkspace } from "@/components/consulta-clinica/ConsultaClinicaWorkspace"
import { prisma } from "@/lib/prisma"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ConsultaClinicaPage({ params }: PageProps) {
  const { id } = await params
  const citaId = Number(id)

  if (!Number.isFinite(citaId) || citaId <= 0) {
    redirect("/agenda")
  }

  const session = await auth()
  if (!session?.user?.id) {
    redirect("/signin")
  }

  const rol: "ADMIN" | "ODONT" | "RECEP" = session.user.role ?? "RECEP"

  // Verificar que la cita existe
  const cita = await prisma.cita.findUnique({
    where: { idCita: citaId },
    select: {
      idCita: true,
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
    redirect("/agenda")
  }

  // RBAC: Solo ODONT y ADMIN pueden acceder al workspace completo
  // RECEP solo puede ver datos administrativos mínimos
  const canAccess = rol === "ADMIN" || rol === "ODONT" || rol === "RECEP"
  if (!canAccess) {
    redirect("/agenda")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consulta Clínica</h1>
        <p className="text-muted-foreground">
          Paciente: {cita.paciente.persona.nombres} {cita.paciente.persona.apellidos}
        </p>
      </div>

      <ConsultaClinicaWorkspace citaId={citaId} userRole={rol} />
    </div>
  )
}

