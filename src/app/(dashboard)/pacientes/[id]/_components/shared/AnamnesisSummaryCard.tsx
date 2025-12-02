// Anamnesis summary card for sidebar

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Activity,
  Heart,
  Pill,
  Calendar,
  Edit,
} from 'lucide-react';
import { usePatientAnamnesis } from '@/lib/hooks/use-patient-anamnesis';
import { AnamnesisStatusBadge } from './AnamnesisStatusBadge';
import { AnamnesisQuickIndicators } from './AnamnesisQuickIndicators';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import type { RolNombre } from '@/types/patient';

interface AnamnesisSummaryCardProps {
  patientId: number;
  currentRole: RolNombre;
}

export function AnamnesisSummaryCard({ patientId, currentRole }: AnamnesisSummaryCardProps) {
  const router = useRouter();
  const { data: anamnesis, isLoading } = usePatientAnamnesis(patientId);
  const [isOpen, setIsOpen] = React.useState(false);

  // Don't show for receptionists
  if (currentRole === 'RECEP') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasAnamnesis = !!anamnesis;
  const lastUpdate = anamnesis?.updatedAt ? new Date(anamnesis.updatedAt) : null;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Anamnesis
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CardContent>
          {!hasAnamnesis ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No hay anamnesis registrada</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // Navigate to anamnesis form or consultation
                  router.push(`/pacientes/${patientId}?tab=anamnesis`);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Crear Anamnesis
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <AnamnesisStatusBadge anamnesis={anamnesis} />
                {lastUpdate && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>

              {/* Quick Indicators */}
              <AnamnesisQuickIndicators anamnesis={anamnesis} compact />

              {/* Key Information */}
              <CollapsibleContent className="space-y-2 pt-2 border-t">
                {/* motivoConsulta removed - it's now in consulta, not anamnesis */}

                {/* Flags Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {anamnesis.tieneDolorActual && (
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-destructive" />
                      <span>Dolor actual</span>
                    </div>
                  )}
                  {anamnesis.tieneAlergias && (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>Alergias</span>
                    </div>
                  )}
                  {anamnesis.tieneMedicacionActual && (
                    <div className="flex items-center gap-1.5">
                      <Pill className="h-3 w-3 text-muted-foreground" />
                      <span>Medicación</span>
                    </div>
                  )}
                  {anamnesis.tieneEnfermedadesCronicas && (
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-3 w-3 text-muted-foreground" />
                      <span>Crónicas</span>
                    </div>
                  )}
                </div>

                {/* Last Dental Visit */}
                {anamnesis.ultimaVisitaDental && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Última visita:{' '}
                      {new Date(anamnesis.ultimaVisitaDental).toLocaleDateString('es-PY', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    router.push(`/pacientes/${patientId}?tab=anamnesis`);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Ver/Editar Anamnesis
                </Button>
              </CollapsibleContent>
            </div>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
}

