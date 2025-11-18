// Quick stats component for overview tab

'use client';

import { memo } from 'react';
import { usePatientOverview } from '@/lib/hooks/use-patient-overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface QuickStatsProps {
  patientId: number;
}

export const QuickStats = memo(function QuickStats({ patientId }: QuickStatsProps) {
  const { data, isLoading } = usePatientOverview(patientId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const stats = data.summaryCards.statistics;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Estadísticas Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold">{stats.totalVisits}</p>
            </div>
            <p className="text-xs text-muted-foreground">Total Visitas</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <p className="text-2xl font-bold">{stats.completedThisYear}</p>
            </div>
            <p className="text-xs text-muted-foreground">Este Año</p>
          </div>

          {stats.noShows > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-destructive" />
                <p className="text-2xl font-bold">{stats.noShows}</p>
              </div>
              <p className="text-xs text-muted-foreground">Inasistencias</p>
            </div>
          )}

          {data.summaryCards.activeTreatmentPlans && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <p className="text-2xl font-bold">
                  {data.summaryCards.activeTreatmentPlans.count}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Planes Activos</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

