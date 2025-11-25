// Odontogram viewer component - read-only optimized for display
// Displays odontogram snapshot with metadata in a clean, centered layout

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, FileText } from 'lucide-react';
import { formatShortDate } from '@/lib/utils/date-formatters';
import { OdontogramEditor } from './OdontogramEditor';
import { entriesToToothRecords } from '@/lib/utils/odontogram-helpers';
import type { OdontogramSnapshotAPI, OdontogramEntryAPI } from '@/lib/types/patient';

interface OdontogramViewerProps {
  snapshot: OdontogramSnapshotAPI;
  showMetadata?: boolean;
}

/**
 * OdontogramViewer - Read-only viewer for odontogram snapshots
 * Displays the odontogram with metadata (date, created by, notes)
 * Optimized for clear display in modal or fullscreen view
 */
export function OdontogramViewer({ snapshot, showMetadata = true }: OdontogramViewerProps) {
  // Convert API entries to ToothRecord format for OdontogramEditor
  const teeth = useMemo(() => {
    const entries = snapshot.entries.map((e: OdontogramEntryAPI) => ({
      id: e.id,
      toothNumber: e.toothNumber,
      surface: e.surface as import("@prisma/client").DienteSuperficie | null,
      condition: e.condition as import("@prisma/client").ToothCondition,
      notes: e.notes,
    }));
    return entriesToToothRecords(entries);
  }, [snapshot.entries]);

  return (
    <div className="space-y-6">
      {/* Metadata Header */}
      {showMetadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Odontograma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de registro</p>
                  <p className="font-medium">{formatShortDate(snapshot.takenAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Registrado por</p>
                  <p className="font-medium">{snapshot.createdBy.name}</p>
                </div>
              </div>
            </div>
            {snapshot.consultaId && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Consulta asociada</p>
                  <Badge variant="secondary">ID: {snapshot.consultaId}</Badge>
                </div>
              </div>
            )}
            {snapshot.notes && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Notas</p>
                  <p className="text-sm">{snapshot.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Odontogram Display - Read-only */}
      <div className="rounded-lg border bg-card">
        <OdontogramEditor
          teeth={teeth}
          notes={snapshot.notes || ''}
          onToothUpdate={() => {}} // No-op in read-only mode
          onNotesChange={() => {}} // No-op in read-only mode
        />
      </div>
    </div>
  );
}

