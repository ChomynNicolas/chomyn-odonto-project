// Quick indicators for critical anamnesis flags

'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity, Heart, Pill, Baby } from 'lucide-react';
import type { PatientAnamnesisDTO } from '@/types/patient';

interface AnamnesisQuickIndicatorsProps {
  anamnesis: PatientAnamnesisDTO | null;
  compact?: boolean;
}

export function AnamnesisQuickIndicators({ anamnesis, compact = false }: AnamnesisQuickIndicatorsProps) {
  if (!anamnesis) {
    return null;
  }

  const urgencyVariant: 'destructive' | 'secondary' = anamnesis.urgenciaPercibida === 'URGENCIA' ? 'destructive' : 'secondary';
  
  const indicators = [
    {
      icon: <Activity className="h-3.5 w-3.5" />,
      label: `Dolor actual${anamnesis.dolorIntensidad ? ` (${anamnesis.dolorIntensidad}/10)` : ''}`,
      variant: 'destructive' as const,
      show: anamnesis.tieneDolorActual,
    },
    {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: anamnesis.urgenciaPercibida === 'URGENCIA' ? 'Urgencia' : 'Prioritario',
      variant: urgencyVariant,
      show: anamnesis.urgenciaPercibida !== null && anamnesis.urgenciaPercibida !== 'RUTINA',
    },
    {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: 'Alergias',
      variant: 'secondary' as const,
      show: anamnesis.tieneAlergias,
    },
    {
      icon: <Pill className="h-3.5 w-3.5" />,
      label: 'Medicación actual',
      variant: 'secondary' as const,
      show: anamnesis.tieneMedicacionActual,
    },
    {
      icon: <Heart className="h-3.5 w-3.5" />,
      label: 'Enfermedades crónicas',
      variant: 'secondary' as const,
      show: anamnesis.tieneEnfermedadesCronicas,
    },
    {
      icon: <Baby className="h-3.5 w-3.5" />,
      label: 'Embarazada',
      variant: 'secondary' as const,
      show: anamnesis.embarazada === true,
    },
  ].filter((ind) => ind.show) as Array<{
    icon: React.ReactNode;
    label: string;
    variant: 'default' | 'destructive' | 'secondary';
    show: boolean;
  }>;

  if (indicators.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {indicators.slice(0, 3).map((ind, idx) => (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <Badge variant={ind.variant} className="gap-1 text-xs px-1.5 py-0.5">
                {ind.icon}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{ind.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {indicators.length > 3 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                +{indicators.length - 3}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {indicators.slice(3).map((ind, idx) => (
                  <p key={idx} className="text-xs">
                    {ind.label}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {indicators.map((ind, idx) => (
        <Tooltip key={idx}>
          <TooltipTrigger asChild>
            <Badge variant={ind.variant} className="gap-1.5 text-xs">
              {ind.icon}
              <span>{ind.label}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Información de anamnesis</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

