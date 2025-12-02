// General information section for anamnesis

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, Activity, Calendar } from 'lucide-react';
import type { PatientAnamnesisDTO } from '@/types/patient';

interface AnamnesisGeneralInfoProps {
  anamnesis: PatientAnamnesisDTO;
}

export function AnamnesisGeneralInfo({ anamnesis }: AnamnesisGeneralInfoProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Información General
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* motivoConsulta removed - it's now in consulta, not anamnesis */}

        {/* Urgency and Pain */}
        <div className="flex items-center gap-2 flex-wrap">
          {anamnesis.urgenciaPercibida && anamnesis.urgenciaPercibida !== 'RUTINA' && (
            <Badge
              variant={anamnesis.urgenciaPercibida === 'URGENCIA' ? 'destructive' : 'secondary'}
              className="gap-1.5"
            >
              <AlertTriangle className="h-3 w-3" />
              {anamnesis.urgenciaPercibida === 'URGENCIA' ? 'Urgencia' : 'Prioritario'}
            </Badge>
          )}
          {anamnesis.tieneDolorActual && (
            <Badge variant="destructive" className="gap-1.5">
              <Activity className="h-3 w-3" />
              Dolor actual
              {anamnesis.dolorIntensidad !== null && (
                <span className="ml-1">({anamnesis.dolorIntensidad}/10)</span>
              )}
            </Badge>
          )}
        </div>

        {/* Last Dental Visit */}
        {anamnesis.ultimaVisitaDental && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="h-4 w-4" />
            <span>
              Última visita dental:{' '}
              {new Date(anamnesis.ultimaVisitaDental).toLocaleDateString('es-PY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

