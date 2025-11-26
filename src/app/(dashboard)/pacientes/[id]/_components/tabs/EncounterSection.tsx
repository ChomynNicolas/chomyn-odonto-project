// EncounterSection component for grouping diagnoses and procedures by encounter
// Displays encounter header and lists diagnoses and procedures

'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DiagnosisItem } from './DiagnosisItem';
import { Activity, Calendar, User, FileText, ExternalLink } from 'lucide-react';
import type { ClinicalHistoryEntryDTO } from '@/types/patient';
import { formatDate } from '@/lib/utils/patient-helpers';

interface EncounterSectionProps {
  entry: ClinicalHistoryEntryDTO;
  patientId: number;
}

export const EncounterSection = memo(function EncounterSection({
  entry,
  patientId,
}: EncounterSectionProps) {
  const hasDiagnoses = entry.diagnoses && entry.diagnoses.length > 0;
  const hasProcedures = entry.procedures && entry.procedures.length > 0;
  const hasContent = hasDiagnoses || hasProcedures || entry.consultation?.clinicalNotes;

  // Group diagnoses by status for better visual organization
  const diagnosesByStatus = useMemo(() => {
    if (!hasDiagnoses) return { active: [], resolved: [], other: [] };

    return entry.diagnoses.reduce(
      (acc, diag) => {
        const status = diag.status as string;
        if (status === 'ACTIVE' || status === 'UNDER_FOLLOW_UP') {
          acc.active.push(diag);
        } else if (status === 'RESOLVED') {
          acc.resolved.push(diag);
        } else {
          acc.other.push(diag);
        }
        return acc;
      },
      { active: [] as typeof entry.diagnoses, resolved: [] as typeof entry.diagnoses, other: [] as typeof entry.diagnoses }
    );
  }, [entry.diagnoses, hasDiagnoses]);

  if (!entry.consultation) {
    return null;
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {entry.date}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{entry.professional.name}</span>
              </div>
              {entry.consultation.status && (
                <Badge
                  variant={entry.consultation.status === 'FINAL' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {entry.consultation.status === 'FINAL' ? 'Finalizada' : 'Borrador'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline">{entry.type}</Badge>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label={`Ver detalle completo de la consulta del ${entry.date}`}
            >
              <Link href={`/pacientes/${patientId}/consultas/${entry.consultation.citaId}`}>
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">Ver Detalle</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      {hasContent && (
        <CardContent className="space-y-4">
          {/* Diagnoses Section */}
          {hasDiagnoses && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Diagnósticos ({entry.diagnoses.length})
                </h3>
              </div>

              {/* Active/Under Follow-up Diagnoses */}
              {diagnosesByStatus.active.length > 0 && (
                <div className="space-y-2">
                  {diagnosesByStatus.active.map((diagnosis) => (
                    <DiagnosisItem
                      key={diagnosis.id}
                      diagnosis={diagnosis}
                      citaId={entry.consultation!.citaId}
                      patientId={patientId}
                    />
                  ))}
                </div>
              )}

              {/* Resolved Diagnoses */}
              {diagnosesByStatus.resolved.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">
                    Resueltos ({diagnosesByStatus.resolved.length})
                  </p>
                  {diagnosesByStatus.resolved.map((diagnosis) => (
                    <DiagnosisItem
                      key={diagnosis.id}
                      diagnosis={diagnosis}
                      citaId={entry.consultation!.citaId}
                      patientId={patientId}
                      className="opacity-75"
                    />
                  ))}
                </div>
              )}

              {/* Other Status Diagnoses */}
              {diagnosesByStatus.other.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">
                    Otros ({diagnosesByStatus.other.length})
                  </p>
                  {diagnosesByStatus.other.map((diagnosis) => (
                    <DiagnosisItem
                      key={diagnosis.id}
                      diagnosis={diagnosis}
                      citaId={entry.consultation!.citaId}
                      patientId={patientId}
                      className="opacity-75"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clinical Notes */}
          {entry.consultation.clinicalNotes && (
            <div>
              <p className="text-sm font-medium mb-1">Notas Clínicas</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {entry.consultation.clinicalNotes}
              </p>
            </div>
          )}

          {/* Procedures Section */}
          {hasProcedures && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Procedimientos ({entry.procedures.length})
                </p>
              </div>
              <div className="space-y-2">
                {entry.procedures.map((proc) => (
                  <div key={proc.id} className="flex flex-col gap-1 text-sm pl-6">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1">{proc.procedure}</span>
                      {proc.toothNumber && (
                        <Badge variant="secondary" className="text-xs">
                          Diente {proc.toothNumber}
                        </Badge>
                      )}
                    </div>
                    {proc.notes && (
                      <p className="text-xs text-muted-foreground ml-5 italic">
                        {proc.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vitals */}
          {entry.vitals && (
            <div className="flex gap-4 text-sm pt-2 border-t">
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
      )}

      {!hasContent && (
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            No hay información clínica registrada para este encuentro.
          </p>
        </CardContent>
      )}
    </Card>
  );
});

