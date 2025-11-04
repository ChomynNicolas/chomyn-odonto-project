"use client"

import type { Appointment, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/patient-helpers"
import { Calendar, Clock, User, MapPin, ExternalLink, Plus } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface AppointmentsSectionProps {
  appointments: Appointment[]
  userRole: UserRole
  onNewAppointment?: () => void
  onViewInAgenda?: (appointmentId: string) => void
  onReschedule?: (appointmentId: string) => void
}

export function AppointmentsSection({
  appointments,
  userRole,
  onNewAppointment,
  onViewInAgenda,
  onReschedule,
}: AppointmentsSectionProps) {
  const permissions = getPermissions(userRole)
  const now = new Date()

  // Sort appointments by date
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  )

  // Find next appointment
  const nextAppointment = sortedAppointments
    .filter((apt) => new Date(apt.scheduledAt) > now && apt.status !== "CANCELLED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  // Last 5 appointments
  const recentAppointments = sortedAppointments
    .filter((apt) => new Date(apt.scheduledAt) <= now || apt.status === "CANCELLED")
    .slice(0, 5)

  const getStatusBadge = (status: Appointment["status"]) => {
    const statusConfig = {
      SCHEDULED: { label: "Programada", variant: "secondary" as const },
      CONFIRMED: { label: "Confirmada", variant: "default" as const },
      IN_PROGRESS: { label: "En Curso", variant: "default" as const },
      COMPLETED: { label: "Completada", variant: "outline" as const },
      CANCELLED: { label: "Cancelada", variant: "destructive" as const },
      NO_SHOW: { label: "No Asistió", variant: "destructive" as const },
    }
    return statusConfig[status] || statusConfig.SCHEDULED
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Citas</CardTitle>
        {permissions.canScheduleAppointments && (
          <Button onClick={onNewAppointment} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Next appointment */}
        {nextAppointment && (
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Próxima Cita</h3>
              <Badge {...getStatusBadge(nextAppointment.status)} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(nextAppointment.scheduledAt, true)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{nextAppointment.duration} minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {nextAppointment.professional.firstName} {nextAppointment.professional.lastName}
                </span>
              </div>
              {nextAppointment.office && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{nextAppointment.office.name}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onViewInAgenda?.(nextAppointment.id)}>
                <ExternalLink className="mr-2 h-3 w-3" />
                Ver en Agenda
              </Button>
              {permissions.canScheduleAppointments && (
                <Button size="sm" variant="outline" onClick={() => onReschedule?.(nextAppointment.id)}>
                  Reprogramar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Recent appointments */}
        <div>
          <h3 className="mb-3 font-semibold">Últimas Citas</h3>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay citas recientes</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatDate(apt.scheduledAt, true)}</span>
                      <Badge {...getStatusBadge(apt.status)} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {apt.professional.firstName} {apt.professional.lastName}
                      {apt.office && ` • ${apt.office.name}`}
                    </p>
                    {apt.procedures && apt.procedures.length > 0 && (
                      <p className="text-xs text-muted-foreground">{apt.procedures.map((p) => p.name).join(", ")}</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onViewInAgenda?.(apt.id)}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
