// Patient Attachments Viewer Page
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { checkPatientAccess } from "@/lib/access/patients"
import { prisma } from "@/lib/prisma"
import { PatientAttachmentsViewer } from "@/components/pacientes/PatientAttachmentsViewer"
import { PatientAttachmentsSkeleton } from "@/components/pacientes/PatientAttachmentsSkeleton"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientAttachmentsPage({ params }: PageProps) {
  // Verify authentication
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/signin")
  }

  const { id } = await params
  const patientId = Number.parseInt(id, 10)

  // Validate patientId
  if (isNaN(patientId) || patientId <= 0) {
    redirect("/pacientes")
  }

  // Check access permissions
  const user = {
    id: Number.parseInt(session.user.id, 10),
    role: (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP",
  }

  const accessDecision = await checkPatientAccess(user, patientId)

  if (!accessDecision.ok) {
    if (accessDecision.reason === "NOT_FOUND") {
      redirect("/pacientes")
    }
    // FORBIDDEN - redirect to patient page or show error
    redirect(`/pacientes/${patientId}`)
  }

  // Check if user can view clinical data (required for attachments)
  if (!accessDecision.permissions.canViewClinicalData) {
    redirect(`/pacientes/${patientId}`)
  }

  // Fetch patient basic info for header
  const patient = await prisma.paciente.findUnique({
    where: { idPaciente: patientId },
    select: {
      idPaciente: true,
      persona: {
        select: {
          nombres: true,
          apellidos: true,
          segundoApellido: true,
        },
      },
    },
  })

  if (!patient) {
    redirect("/pacientes")
  }

  const patientName = `${patient.persona.nombres} ${patient.persona.apellidos}${
    patient.persona.segundoApellido ? ` ${patient.persona.segundoApellido}` : ""
  }`.trim()

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<PatientAttachmentsSkeleton />}>
        <PatientAttachmentsViewer
          patientId={patientId}
          patientName={patientName}
          permissions={accessDecision.permissions}
          userRole={user.role}
        />
      </Suspense>
    </div>
  )
}

