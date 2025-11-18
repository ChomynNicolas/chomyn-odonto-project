// Patient alerts component - displays aggregated alerts

'use client';

import { memo } from 'react';
import { usePatientAlerts } from '@/lib/hooks/use-patient-alerts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface PatientAlertsProps {
  patientId: number;
}

export const PatientAlerts = memo(function PatientAlerts({ patientId }: PatientAlertsProps) {
  const { data: alerts, isLoading } = usePatientAlerts(patientId);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const variant = alert.severity === 'HIGH' ? 'destructive' : 'default';
        const Icon = alert.severity === 'HIGH' ? AlertTriangle : AlertCircle;

        return (
      <Alert 
        key={alert.id} 
        variant={variant} 
        className="relative"
        role="alert"
        aria-live={alert.severity === 'HIGH' ? 'assertive' : 'polite'}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{alert.title}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
              <span>{alert.message}</span>
              <div className="flex items-center gap-2">
                {alert.actionable && alert.actionUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={alert.actionUrl}>
                      {alert.actionLabel || 'Ver'}
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(alert.id)}
                  className="h-6 w-6 p-0"
                  aria-label={`Descartar alerta: ${alert.title}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
});

