// DiagnosisStatusBadge component for displaying diagnosis status with proper styling
// Professional medical-style badge with color coding and accessible labels

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type DiagnosisStatus = 'ACTIVE' | 'UNDER_FOLLOW_UP' | 'RESOLVED' | 'DISCARDED' | 'RULED_OUT';

interface DiagnosisStatusBadgeProps {
  status: DiagnosisStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: {
    label: 'Activo',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  },
  UNDER_FOLLOW_UP: {
    label: 'En Seguimiento',
    variant: 'secondary',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  },
  RESOLVED: {
    label: 'Resuelto',
    variant: 'outline',
    className: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-300 dark:border-green-700',
  },
  DISCARDED: {
    label: 'Descartado',
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700',
  },
  RULED_OUT: {
    label: 'Descartado',
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700',
  },
};

export function DiagnosisStatusBadge({ status, className }: DiagnosisStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    variant: 'outline' as const,
    className: '',
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'text-xs font-medium border',
        config.className,
        className
      )}
      aria-label={`Estado del diagnóstico: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
}

