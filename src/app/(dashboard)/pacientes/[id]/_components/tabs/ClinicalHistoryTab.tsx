// Clinical history tab with consultations timeline

'use client';

import { useState } from 'react';
import { useClinicalHistory } from '@/lib/hooks/use-clinical-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AlertCircle, FileText, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia
} from '@/components/ui/empty';

interface ClinicalHistoryTabProps {
  patientId: number;
}

export function ClinicalHistoryTab({ patientId }: ClinicalHistoryTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useClinicalHistory(patientId, { page, limit: 10 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
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
        <AlertDescription>Error al cargar historial: {error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Empty
        icon={FileText}
        title="Sin historial clínico"
        description="No hay consultas registradas para este paciente."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Historial Clínico</h2>
        <p className="text-sm text-muted-foreground">
          {data.pagination.total} consulta{data.pagination.total !== 1 ? 's' : ''} registrada{data.pagination.total !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-4">
        {data.data.map((entry) => (
          <Card key={entry.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{entry.date}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {entry.professional.name}
                  </p>
                </div>
                <Badge variant="outline">{entry.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {entry.consultation?.diagnosis && (
                <div>
                  <p className="text-sm font-medium mb-1">Diagnóstico</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.consultation.diagnosis}
                  </p>
                </div>
              )}

              {entry.consultation?.clinicalNotes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notas Clínicas</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.consultation.clinicalNotes}
                  </p>
                </div>
              )}

              {entry.procedures.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Procedimientos</p>
                  <div className="space-y-1">
                    {entry.procedures.map((proc) => (
                      <div key={proc.id} className="flex items-center gap-2 text-sm">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                        <span>{proc.procedure}</span>
                        {proc.toothNumber && (
                          <Badge variant="secondary" className="text-xs">
                            Diente {proc.toothNumber}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entry.vitals && (
                <div className="flex gap-4 text-sm">
                  {entry.vitals.bp && (
                    <div>
                      <span className="text-muted-foreground">PA:</span>{' '}
                      <span className="font-medium">{entry.vitals.bp}</span>
                    </div>
                  )}
                  {entry.vitals.heartRate && (
                    <div>
                      <span className="text-muted-foreground">FC:</span>{' '}
                      <span className="font-medium">{entry.vitals.heartRate} bpm</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.pagination.page} de {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
