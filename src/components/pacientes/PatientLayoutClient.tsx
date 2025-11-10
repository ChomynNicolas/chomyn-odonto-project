"use client"

import type React from "react"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import type { PatientRecord, UserRole } from "@/lib/types/patient"
import type { CurrentUser } from "@/types/agenda"
import { calculateAge, formatFullName, formatGender, getSeverityColor } from "@/lib/utils/patient-helpers"
import { getPermissions } from "@/lib/utils/rbac"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Upload,
  MoreVertical,
  Printer,
  FileDown,
  History,
  MapPin,
  AlertTriangle,
  Stethoscope,
  Clock,
  ClipboardList,
  Activity,
  Paperclip,
  LayoutDashboard,
} from "lucide-react"
import { NuevaCitaSheet } from "@/components/agenda/NuevaCitaSheet"
import { toast } from "sonner"

interface PatientLayoutClientProps {
  patient: PatientRecord
  children: React.ReactNode
}

export function PatientLayoutClient({ patient, children }: PatientLayoutClientProps) {
  const [openNuevaCita, setOpenNuevaCita] = useState(false)
  const [userRole] = useState<UserRole>("ADMIN")
  const pathname = usePathname()
  const router = useRouter()

  const permissions = getPermissions(userRole)
  const age = calculateAge(patient.dateOfBirth)
  const fullName = formatFullName(patient.firstName, patient.lastName, patient.secondLastName)
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase()

  const activeAllergies = patient.allergies || []
  const severeAllergies = activeAllergies.filter((a) => a.severity === "SEVERE")
  const activeDiagnoses = patient.diagnoses?.filter((d) => d.status === "ACTIVE") || []
  const primaryDiagnosis = activeDiagnoses[0]

  const now = new Date()
  const nextAppointment = patient.appointments
    ?.filter((apt) => new Date(apt.scheduledAt) > now && apt.status !== "CANCELLED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  const handlePrint = () => {
    router.push(`/pacientes/${patient.id}/print`)
  }

  const handleExportPDF = () => {
    toast("Exportando PDF", { description: "La exportación comenzará en breve..." })
  }

  const getActiveTab = () => {
    if (pathname === `/pacientes/${patient.id}`) return "ficha"
    if (pathname.includes("/historia")) return "historia"
    if (pathname.includes("/consultas")) return "consultas"
    if (pathname.includes("/odontograma")) return "odontograma"
    if (pathname.includes("/adjuntos")) return "adjuntos"
    return "ficha"
  }

  const currentUser: CurrentUser = {
    idUsuario: 1, // TODO: Get from session
    role: userRole,
    profesionalId: undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Patient Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Left section: Patient info */}
            <div className="flex gap-4">
              <Avatar className="h-16 w-16 lg:h-20 lg:w-20">
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold lg:text-3xl">{fullName}</h1>
                  <Badge variant={patient.status === "ACTIVE" ? "default" : "secondary"}>
                    {patient.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    {age} años • {formatGender(patient.gender)}
                  </span>
                  {patient.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {patient.address}
                      {patient.city && `, ${patient.city}`}
                    </span>
                  )}
                </div>

                {/* Clinical alerts */}
                <div className="flex flex-wrap gap-2">
                  {severeAllergies.length > 0 && (
                    <Badge className={getSeverityColor("SEVERE")} variant="outline">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {severeAllergies.length} Alergia{severeAllergies.length > 1 ? "s" : ""} Severa
                      {severeAllergies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {activeAllergies.length > severeAllergies.length && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-200"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {activeAllergies.length - severeAllergies.length} Alergia
                      {activeAllergies.length - severeAllergies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {primaryDiagnosis && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                      <Stethoscope className="mr-1 h-3 w-3" />
                      {primaryDiagnosis.label}
                    </Badge>
                  )}
                  {nextAppointment && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200"
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      Próxima cita:{" "}
                      {new Date(nextAppointment.scheduledAt).toLocaleDateString("es-PY", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(nextAppointment.scheduledAt).toLocaleTimeString("es-PY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right section: Actions */}
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              {permissions.canScheduleAppointments && (
                <Button onClick={() => setOpenNuevaCita(true)} className="flex-1 lg:flex-none">
                  <Calendar className="mr-2 h-4 w-4" />
                  Nueva Cita
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Más opciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {permissions.canUploadAttachments && (
                    <DropdownMenuItem onClick={() => toast("Subir adjunto")}>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Adjunto
                    </DropdownMenuItem>
                  )}
                  {permissions.canPrint && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Ficha
                      </DropdownMenuItem>
                    </>
                  )}
                  {permissions.canExport && (
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </DropdownMenuItem>
                  )}
                  {permissions.canViewAudit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toast("Ver auditoría")}>
                        <History className="mr-2 h-4 w-4" />
                        Ver Auditoría
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <Tabs value={getActiveTab()} className="w-full">
            <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0">
              <Link href={`/pacientes/${patient.id}`} className="flex-shrink-0">
                <TabsTrigger
                  value="ficha"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Ficha</span>
                </TabsTrigger>
              </Link>

              <Link href={`/pacientes/${patient.id}/historia`} className="flex-shrink-0">
                <TabsTrigger
                  value="historia"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Historia Clínica</span>
                </TabsTrigger>
              </Link>

              <Link href={`/pacientes/${patient.id}/consultas`} className="flex-shrink-0">
                <TabsTrigger
                  value="consultas"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Consultas</span>
                </TabsTrigger>
              </Link>

              <Link href={`/pacientes/${patient.id}/odontograma`} className="flex-shrink-0">
                <TabsTrigger
                  value="odontograma"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Stethoscope className="h-4 w-4" />
                  <span className="hidden sm:inline">Odontograma</span>
                </TabsTrigger>
              </Link>

              <Link href={`/pacientes/${patient.id}/adjuntos`} className="flex-shrink-0">
                <TabsTrigger
                  value="adjuntos"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="hidden sm:inline">Adjuntos</span>
                </TabsTrigger>
              </Link>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">{children}</div>

      <NuevaCitaSheet
        open={openNuevaCita}
        onOpenChange={setOpenNuevaCita}
        defaults={{ inicio: new Date() }}
        currentUser={currentUser}
        prefill={{
          pacienteId: Number(patient.id),
          lockPaciente: true,
          motivo: "Consulta desde ficha",
          tipo: "CONSULTA",
        }}
        onSuccess={() => {
          toast.success("Cita creada", { description: "Se actualizó la ficha." })
          router.refresh()
        }}
      />
    </div>
  )
}
