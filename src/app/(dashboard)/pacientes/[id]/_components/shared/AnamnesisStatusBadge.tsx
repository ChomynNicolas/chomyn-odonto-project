// Anamnesis status badge component

'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PatientAnamnesisDTO } from '@/types/patient';

interface AnamnesisStatusBadgeProps {
  anamnesis: PatientAnamnesisDTO | null;
  isLoading?: boolean;
}

export function AnamnesisStatusBadge({ anamnesis, isLoading }: AnamnesisStatusBadgeProps) {
  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <FileText className="h-3 w-3 animate-pulse" />
        <span className="text-xs">Cargando...</span>
      </Badge>
    );
  }

  if (!anamnesis) {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="h-3 w-3" />
        <span className="text-xs">Sin Anamnesis</span>
      </Badge>
    );
  }


  // Anamnesis is considered complete if it exists (motivoConsulta is no longer required)
  const isComplete = true; // Anamnesis exists, so it's considered complete

  // Check if outdated (more than 1 year old)
  const updatedAt = new Date(anamnesis.updatedAt);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const isOutdated = updatedAt < oneYearAgo;

  if (isOutdated) {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <Clock className="h-3 w-3" />
        <span className="text-xs">Desactualizada</span>
      </Badge>
    );
  }

  if (!isComplete) {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
        <AlertCircle className="h-3 w-3" />
        <span className="text-xs">Incompleta</span>
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="gap-1.5 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
      <CheckCircle2 className="h-3 w-3" />
      <span className="text-xs">
        Completa
        {updatedAt && (
          <span className="ml-1 opacity-75">
            ({formatDistanceToNow(updatedAt, { addSuffix: true, locale: es })})
          </span>
        )}
      </span>
    </Badge>
  );
}

