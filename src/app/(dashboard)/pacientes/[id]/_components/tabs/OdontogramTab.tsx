// Odontogram tab - displays tooth chart and history
// Uses the same components as OdontogramaModule for consistency

'use client';

import { useMemo, useState } from 'react';
import { usePatientOdontogram } from '@/lib/hooks/use-patient-odontogram';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, History, AlertCircle, Maximize2 } from 'lucide-react';
import { formatShortDate } from '@/lib/utils/date-formatters';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia
} from '@/components/ui/empty';
import { OdontogramEditor } from '@/components/pacientes/odontograma/OdontogramEditor';
import { OdontogramHistory } from '@/components/pacientes/odontograma/OdontogramHistory';
import { OdontogramModal } from '@/components/pacientes/odontograma/OdontogramModal';
import { entriesToToothRecords } from '@/lib/utils/odontogram-helpers';
import type { OdontogramSnapshot } from '@/lib/types/patient';

interface OdontogramTabProps {
  patientId: number;
}

export function OdontogramTab({ patientId }: OdontogramTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: snapshots, isLoading, error } = usePatientOdontogram(patientId, { limit: 10 });

  // Convert API snapshots to OdontogramSnapshot format expected by OdontogramHistory
  const historySnapshots: OdontogramSnapshot[] = useMemo(() => {
    if (!snapshots) return [];
    
    return snapshots.map((snapshot) => {
      // Convert entries to ToothRecord format
      const entries = snapshot.entries.map((e) => ({
        id: e.id,
        toothNumber: e.toothNumber,
        surface: e.surface as import("@prisma/client").DienteSuperficie | null,
        condition: e.condition as import("@prisma/client").ToothCondition,
        notes: e.notes,
      }));
      
      return {
        id: String(snapshot.id),
        recordedAt: snapshot.takenAt,
        teeth: entriesToToothRecords(entries),
        notes: snapshot.notes || "",
      };
    });
  }, [snapshots]);

  // Get the most recent snapshot for current view
  const currentSnapshot = snapshots?.[0];
  const currentTeeth = currentSnapshot
    ? entriesToToothRecords(
        currentSnapshot.entries.map((e) => ({
          id: e.id,
          toothNumber: e.toothNumber,
          surface: e.surface as import("@prisma/client").DienteSuperficie | null,
          condition: e.condition as import("@prisma/client").ToothCondition,
          notes: e.notes,
        }))
      )
    : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar odontograma</AlertDescription>
      </Alert>
    );
  }

  if (!snapshots || snapshots.length === 0 || !currentSnapshot) {
    return (
      <Empty>
        <EmptyMedia>
          <Activity className="h-12 w-12 text-muted-foreground" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Sin odontograma</EmptyTitle>
          <EmptyDescription>
            No hay registros de odontograma para este paciente.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">
            <Activity className="h-4 w-4 mr-2" />
            Odontograma Actual
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle>Odontograma</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="gap-2"
                    >
                      <Maximize2 className="h-4 w-4" />
                      Ver completo
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Registrado: {formatShortDate(new Date(currentSnapshot.takenAt))}
                    {currentSnapshot.consultaDate && (
                      <span className="ml-2">
                        • Consulta: {formatShortDate(new Date(currentSnapshot.consultaDate))}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Por: {currentSnapshot.createdBy}
                  </p>
                  {currentSnapshot.notes && (
                    <div className="mt-3 rounded-lg bg-muted p-3">
                      <p className="text-sm font-medium mb-1">Notas:</p>
                      <p className="text-sm">{currentSnapshot.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Use OdontogramEditor in read-only mode - compact preview */}
              <div className="opacity-90 hover:opacity-100 transition-opacity">
                <OdontogramEditor
                  teeth={currentTeeth}
                  notes={currentSnapshot.notes || ""}
                  onToothUpdate={() => {}} // No-op in read-only mode
                  onNotesChange={() => {}} // No-op in read-only mode
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <OdontogramHistory
            snapshots={historySnapshots}
            onClose={() => {}} // No-op in tab view
            onRestore={() => {}} // No-op in read-only mode
          />
        </TabsContent>
      </Tabs>
    </div>

      {/* Odontogram Modal */}
      <OdontogramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientId={patientId}
        showHistory={true}
      />
    </>
  );
}

