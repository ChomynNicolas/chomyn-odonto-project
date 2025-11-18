// Patient timeline component - visual timeline of all patient events

'use client';

import { usePatientTimeline } from '@/lib/hooks/use-patient-timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, FileText, Stethoscope, AlertCircle } from 'lucide-react';
import { formatShortDate } from '@/lib/utils/date-formatters';

interface PatientTimelineProps {
  patientId: number;
  limit?: number;
}

export function PatientTimeline({ patientId, limit = 20 }: PatientTimelineProps) {
  const { data: timeline, isLoading, error } = usePatientTimeline(patientId, { limit });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar timeline</AlertDescription>
      </Alert>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            No hay eventos registrados en el timeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'CONSULTATION':
        return <Stethoscope className="h-4 w-4 text-green-600" />;
      case 'NOTE':
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return 'Cita';
      case 'CONSULTATION':
        return 'Consulta';
      case 'NOTE':
        return 'Nota';
      case 'DIAGNOSIS':
        return 'Diagnóstico';
      case 'TREATMENT_STEP':
        return 'Tratamiento';
      default:
        return type;
    }
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
      
      <div className="space-y-6">
        {timeline.map((entry, index) => (
          <div key={entry.id} className="relative flex items-start gap-4">
            {/* Timeline dot */}
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background border-2 border-primary">
              {getIcon(entry.type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">{entry.title}</h4>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getTypeLabel(entry.type)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span>{formatShortDate(new Date(entry.date))}</span>
                    {entry.professional && (
                      <>
                        <span>•</span>
                        <span>{entry.professional.name}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

