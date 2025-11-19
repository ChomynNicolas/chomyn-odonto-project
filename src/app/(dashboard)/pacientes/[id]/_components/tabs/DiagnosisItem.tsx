// DiagnosisItem component for displaying individual diagnosis in clinical history
// Shows diagnosis details with status badge and link to detail view

'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DiagnosisStatusBadge } from './DiagnosisStatusBadge';
import { ClipboardList, ExternalLink, Calendar, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils/patient-helpers';
import { cn } from '@/lib/utils';

interface DiagnosisItemProps {
  diagnosis: {
    id: number;
    label: string;
    code: string | null;
    status: string;
    notedAt: string;
    resolvedAt: string | null;
    notes: string | null;
    encounterNotes: string | null;
    wasEvaluated: boolean;
    wasManaged: boolean;
  };
  citaId: number;
  patientId: number;
  className?: string;
}

export const DiagnosisItem = memo(function DiagnosisItem({
  diagnosis,
  citaId,
  patientId,
  className,
}: DiagnosisItemProps) {
  const detailUrl = `/agenda/citas/${citaId}/consulta?diagnosisId=${diagnosis.id}`;

  return (
    <Card className={cn('p-3 hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header with label and status */}
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ClipboardList className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h4 className="font-medium text-sm leading-tight">{diagnosis.label}</h4>
              </div>
              {diagnosis.code && (
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  Código: {diagnosis.code}
                </p>
              )}
            </div>
            <DiagnosisStatusBadge status={diagnosis.status} />
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground ml-6">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Notado: {formatDate(diagnosis.notedAt, true)}</span>
            </div>
            {diagnosis.resolvedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Resuelto: {formatDate(diagnosis.resolvedAt, true)}</span>
              </div>
            )}
            {diagnosis.encounterNotes && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span className="italic">Notas del encuentro</span>
              </div>
            )}
          </div>

          {/* Notes preview */}
          {(diagnosis.notes || diagnosis.encounterNotes) && (
            <div className="ml-6">
              {diagnosis.encounterNotes && (
                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  {diagnosis.encounterNotes}
                </p>
              )}
              {diagnosis.notes && !diagnosis.encounterNotes && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {diagnosis.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="flex-shrink-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            aria-label={`Ver detalles del diagnóstico: ${diagnosis.label}`}
          >
            <Link href={detailUrl}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver detalles
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
});

