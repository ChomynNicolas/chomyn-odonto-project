// Clinical summary component for overview tab

'use client';

import { memo } from 'react';
import { usePatientAnamnesis } from '@/lib/hooks/use-patient-anamnesis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertTriangle, Activity, Heart, Calendar } from 'lucide-react';
import type { RolNombre } from '@/types/patient';

interface ClinicalSummaryProps {
  patientId: number;
  currentRole: RolNombre;
}

export const ClinicalSummary = memo(function ClinicalSummary({ patientId, currentRole }: ClinicalSummaryProps) {
  const { data: anamnesis, isLoading, error } = usePatientAnamnesis(patientId);

  if (currentRole === 'RECEP') {
    return null; // Clinical data not available for receptionists
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error al cargar resumen clínico</AlertDescription>
      </Alert>
    );
  }

  if (!anamnesis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumen Clínico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay anamnesis registrada para este paciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resumen Clínico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* motivoConsulta removed - it's now in consulta, not anamnesis */}

        {/* Urgencia */}
        {anamnesis.urgenciaPercibida && anamnesis.urgenciaPercibida !== 'RUTINA' && (
          <div>
            <Badge
              variant={anamnesis.urgenciaPercibida === 'URGENCIA' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {anamnesis.urgenciaPercibida === 'URGENCIA' ? 'Urgencia' : 'Prioritario'}
            </Badge>
          </div>
        )}

        {/* Dolor actual */}
        {anamnesis.tieneDolorActual && (
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-destructive" />
            <span className="text-sm">
              Dolor actual
              {anamnesis.dolorIntensidad !== null && (
                <span className="font-medium ml-1">
                  (Intensidad: {anamnesis.dolorIntensidad}/10)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Indicadores clínicos */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {anamnesis.tieneEnfermedadesCronicas && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span>Enfermedades crónicas</span>
            </div>
          )}
          {anamnesis.tieneAlergias && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Alergias</span>
            </div>
          )}
          {anamnesis.tieneMedicacionActual && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>Medicación actual</span>
            </div>
          )}
          {anamnesis.embarazada && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <span>Embarazada</span>
            </div>
          )}
        </div>

        {/* Hábitos de higiene */}
        {(anamnesis.higieneCepilladosDia !== null || anamnesis.usaHiloDental !== null) && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Hábitos de Higiene</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {anamnesis.higieneCepilladosDia !== null && (
                <p>Cepillados diarios: {anamnesis.higieneCepilladosDia}</p>
              )}
              {anamnesis.usaHiloDental !== null && (
                <p>Usa hilo dental: {anamnesis.usaHiloDental ? 'Sí' : 'No'}</p>
              )}
            </div>
          </div>
        )}

        {/* Última visita dental */}
        {anamnesis.ultimaVisitaDental && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Última visita dental:{' '}
                {new Date(anamnesis.ultimaVisitaDental).toLocaleDateString('es-PY')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

