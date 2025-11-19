// Clinical history tab with consultations timeline
// Enhanced to show diagnoses per encounter with status badges and detail links

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useClinicalHistory } from '@/lib/hooks/use-clinical-history';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Empty, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EncounterSection } from './EncounterSection';

interface ClinicalHistoryTabProps {
  patientId: number;
}

export function ClinicalHistoryTab({ patientId }: ClinicalHistoryTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useClinicalHistory(patientId, { page, limit: 10 });

  // Memoize pagination handlers to prevent unnecessary re-renders
  const handlePreviousPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (data) {
      setPage((p) => Math.min(data.pagination.totalPages, p + 1));
    }
  }, [data]);

  // Memoize total diagnoses count for display
  const totalDiagnoses = useMemo(() => {
    if (!data) return 0;
    return data.data.reduce((sum, entry) => sum + (entry.diagnoses?.length || 0), 0);
  }, [data]);

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
      <Empty>
        <EmptyMedia variant="icon">
          <FileText className="h-6 w-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Sin historial clínico</EmptyTitle>
          <EmptyDescription>
            No hay consultas registradas para este paciente.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Historial Clínico</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {data.pagination.total} consulta{data.pagination.total !== 1 ? 's' : ''} registrada{data.pagination.total !== 1 ? 's' : ''}
            {totalDiagnoses > 0 && (
              <span className="ml-2">
                • {totalDiagnoses} diagnóstico{totalDiagnoses !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {data.data.map((entry) => (
          <EncounterSection
            key={entry.id}
            entry={entry}
            patientId={patientId}
          />
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
              onClick={handlePreviousPage}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
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
