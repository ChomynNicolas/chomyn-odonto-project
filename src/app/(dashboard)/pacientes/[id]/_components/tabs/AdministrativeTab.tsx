'use client';

import { useState } from 'react';
import { useAdministrative } from '@/lib/hooks/use-administrative';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Users,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  AlertCircle,
  Calendar,
  FileCheck,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  UserX,
  CalendarCheck,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import type { RolNombre } from '@/types/patient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdministrativeTabProps {
  patientId: number;
  currentRole: RolNombre;
}

const CONSENTS_PER_PAGE = 5;

export function AdministrativeTab({ patientId, currentRole }: AdministrativeTabProps) {
  const { data, isLoading, error } = useAdministrative(patientId);
  const [consentsPage, setConsentsPage] = useState(1);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar datos administrativos: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const showClinicalData = currentRole !== 'RECEP';

  // Pagination logic for consents
  const totalConsents = data.consents.length;
  const totalPages = Math.ceil(totalConsents / CONSENTS_PER_PAGE);
  const startIndex = (consentsPage - 1) * CONSENTS_PER_PAGE;
  const endIndex = startIndex + CONSENTS_PER_PAGE;
  const paginatedConsents = data.consents.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Patient Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={data.status.estaActivo ? 'default' : 'secondary'} className="text-xs">
                {data.status.estaActivo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fecha de registro</p>
              <p className="text-sm font-medium">
                {format(new Date(data.status.createdAt), 'PPP', { locale: es })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Última actualización</p>
              <p className="text-sm font-medium">
                {format(new Date(data.status.updatedAt), 'PPP', { locale: es })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumen de Citas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{data.appointmentsSummary.total}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success-600" />
                  <p className="text-xs text-muted-foreground">Completadas</p>
                </div>
                <p className="text-2xl font-bold text-success-600">
                  {data.appointmentsSummary.completed}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-error-600" />
                  <p className="text-xs text-muted-foreground">Canceladas</p>
                </div>
                <p className="text-2xl font-bold text-error-600">
                  {data.appointmentsSummary.cancelled}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <UserX className="h-3 w-3 text-warning-600" />
                  <p className="text-xs text-muted-foreground">Ausencias</p>
                </div>
                <p className="text-2xl font-bold text-warning-600">
                  {data.appointmentsSummary.noShow}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3 text-brand-600" />
                  <p className="text-xs text-muted-foreground">Programadas</p>
                </div>
                <p className="text-2xl font-bold text-brand-600">
                  {data.appointmentsSummary.scheduled}
                </p>
              </div>
            </div>

            <Separator />

            {/* Attendance Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tasa de Asistencia</span>
                </div>
                <span className="text-sm font-bold">{data.appointmentsSummary.attendanceRate}%</span>
              </div>
              <Progress value={data.appointmentsSummary.attendanceRate} className="h-2" />
            </div>

            <Separator />

            {/* Next and Last Appointments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.appointmentsSummary.nextAppointment ? (
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground">Próxima Cita</p>
                  <p className="text-sm font-semibold">
                    {format(new Date(data.appointmentsSummary.nextAppointment.date), 'PPP', {
                      locale: es,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.appointmentsSummary.nextAppointment.tipo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dr. {data.appointmentsSummary.nextAppointment.profesional}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground">Próxima Cita</p>
                  <p className="text-sm">No hay citas programadas</p>
                </div>
              )}

              {data.appointmentsSummary.lastAppointment ? (
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground">Última Cita</p>
                  <p className="text-sm font-semibold">
                    {format(new Date(data.appointmentsSummary.lastAppointment.date), 'PPP', {
                      locale: es,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.appointmentsSummary.lastAppointment.tipo}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground">Última Cita</p>
                  <p className="text-sm">Sin historial de citas</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsible Persons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personas Responsables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.responsibles.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>Sin responsables registrados</EmptyTitle>
              <EmptyDescription>No hay personas responsables registradas para este paciente.</EmptyDescription>
            </Empty>
          ) : (
            <div className="space-y-6">
              {data.responsibles.map((resp, index) => (
                <div key={resp.id}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{resp.persona.fullName}</h3>
                          {resp.esPrincipal && (
                            <Badge variant="default" className="text-xs">
                              Principal
                            </Badge>
                          )}
                          {resp.autoridadLegal && (
                            <Badge variant="secondary" className="text-xs">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Autoridad Legal
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Relación: {resp.relacion}</p>
                      </div>
                    </div>

                    {resp.persona.document && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {resp.persona.document.type} {resp.persona.document.number}
                        </span>
                      </div>
                    )}

                    {resp.persona.contacts.length > 0 && (
                      <div className="space-y-2">
                        {resp.persona.contacts.map((contact, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {contact.tipo === 'PHONE' && (
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            )}
                            {contact.tipo === 'EMAIL' && (
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{contact.valor}</span>
                            {contact.esPrincipal && (
                              <Badge variant="outline" className="text-xs">
                                Principal
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {resp.notas && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Notas:</p>
                        <p className="text-sm whitespace-pre-wrap">{resp.notas}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Vigente desde: {format(new Date(resp.vigenteDesde), 'PPP', { locale: es })}
                        {resp.vigenteHasta && (
                          <> hasta {format(new Date(resp.vigenteHasta), 'PPP', { locale: es })}</>
                        )}
                      </span>
                    </div>
                  </div>

                  {index < data.responsibles.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment Plans - Only for clinical roles */}
      {showClinicalData && data.treatmentPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Planes de Tratamiento Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.treatmentPlans.map((plan) => (
                <div key={plan.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{plan.titulo}</h3>
                      {plan.descripcion && (
                        <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
                      )}
                    </div>
                    <Badge variant="default" className="text-xs">
                      Activo
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">
                        {plan.completedSteps}/{plan.totalSteps} pasos completados
                      </span>
                    </div>
                    <Progress value={plan.progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {plan.progressPercentage}% completado
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Creado: {format(new Date(plan.createdAt), 'PP', { locale: es })}</span>
                    <span>Pendientes: {plan.pendingSteps}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consents with Pagination */}
      {data.consents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Consentimientos Informados
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {totalConsents} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                {paginatedConsents.map((consent) => (
                  <div
                    key={consent.id}
                    className="p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{consent.tipo}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Firmado: {format(new Date(consent.firmadoEn), 'PP', { locale: es })}
                            </span>
                          </div>

                          {consent.cita && (
                            <div className="flex items-center gap-1.5">
                              <CalendarCheck className="h-3 w-3" />
                              <span>
                                Cita: {format(new Date(consent.cita.fecha), 'PP', { locale: es })}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            <span>Firmado por: {consent.responsable.fullName}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Registrado por: {consent.registradoPor}</span>
                          </div>
                        </div>

                        {consent.observaciones && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <p className="text-muted-foreground mb-1">Observaciones:</p>
                            <p className="whitespace-pre-wrap">{consent.observaciones}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, totalConsents)} de{' '}
                    {totalConsents}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConsentsPage((prev) => Math.max(1, prev - 1))}
                      disabled={consentsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Página {consentsPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConsentsPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={consentsPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Administrative Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas Administrativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.administrativeNotes ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm whitespace-pre-wrap">{data.administrativeNotes}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay notas administrativas registradas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Alert for ODONT role */}
      {currentRole === 'ODONT' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta sección es principalmente para uso administrativo. Puede ver la información básica
            necesaria para la atención clínica.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
