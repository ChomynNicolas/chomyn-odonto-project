// Overview tab - quick summary of key information

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { RolNombre } from '@/types/patient';

interface OverviewTabProps {
  patientId: number;
  currentRole: RolNombre;
}

export function OverviewTab({ patientId, currentRole }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esta vista proporciona un resumen rápido del paciente. Use las pestañas superiores
          para ver información detallada.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              La información general del paciente se muestra en el encabezado superior.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Actividad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Las estadísticas y resúmenes se muestran en las tarjetas de la barra lateral.
            </p>
          </CardContent>
        </Card>
      </div>

      {currentRole !== 'RECEP' && (
        <Card>
          <CardHeader>
            <CardTitle>Acceso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              Use el menú de acciones en el encabezado para:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Iniciar una nueva consulta</li>
              <li>Agendar una cita</li>
              <li>Ver historial completo</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
