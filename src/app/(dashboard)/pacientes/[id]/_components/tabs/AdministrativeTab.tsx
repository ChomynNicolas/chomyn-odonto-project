// Administrative tab with responsible persons and notes

'use client';

import { useAdministrative } from '@/lib/hooks/use-administrative';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Users, Phone, Mail, FileText, ShieldCheck, User, AlertCircle } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia
} from '@/components/ui/empty';
import type { RolNombre } from '@/types/patient';

interface AdministrativeTabProps {
  patientId: number;
  currentRole: RolNombre;
}

export function AdministrativeTab({ patientId, currentRole }: AdministrativeTabProps) {
  const { data, isLoading, error } = useAdministrative(patientId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar datos: {error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
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
            <Empty
              icon={Users}
              title="Sin responsables registrados"
              description="No hay personas responsables registradas para este paciente."
            />
          ) : (
            <div className="space-y-6">
              {data.responsibles.map((resp) => (
                <div key={resp.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
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
                      <p className="text-sm text-muted-foreground">
                        Relación: {resp.relacion}
                      </p>
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

                  {/* Contacts */}
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
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-muted-foreground">
                    Vigente desde:{' '}
                    {new Date(resp.vigenteDesde).toLocaleDateString('es-PY')}
                    {resp.vigenteHasta && (
                      <> hasta {new Date(resp.vigenteHasta).toLocaleDateString('es-PY')}</>
                    )}
                  </div>

                  {resp !== data.responsibles[data.responsibles.length - 1] && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Info for ODONT role */}
      {currentRole === 'ODONT' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta sección es principalmente para uso administrativo. Puede ver la información
            básica necesaria para la atención clínica.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
