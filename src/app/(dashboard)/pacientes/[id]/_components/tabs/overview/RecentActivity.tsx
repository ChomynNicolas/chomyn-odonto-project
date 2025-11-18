// Recent activity component for overview tab

'use client';

import { memo } from 'react';
import { usePatientTimeline } from '@/lib/hooks/use-patient-timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, FileText, Stethoscope, AlertCircle } from 'lucide-react';
import { formatShortDate } from '@/lib/utils/date-formatters';

interface RecentActivityProps {
  patientId: number;
}

export const RecentActivity = memo(function RecentActivity({ patientId }: RecentActivityProps) {
  const { data: timeline, isLoading, error } = usePatientTimeline(patientId, { limit: 5 });

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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar actividad reciente</AlertDescription>
      </Alert>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay actividad registrada recientemente.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="h-4 w-4" />;
      case 'CONSULTATION':
        return <Stethoscope className="h-4 w-4" />;
      case 'NOTE':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="mt-0.5 text-muted-foreground">
                {getIcon(entry.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{entry.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(entry.type)}
                  </Badge>
                </div>
                {entry.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {entry.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatShortDate(new Date(entry.date))}</span>
                  {entry.professional && (
                    <>
                      <span>•</span>
                      <span>{entry.professional.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

