// Completion indicator for form sections

'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';

interface SectionCompletionIndicatorProps {
  isComplete: boolean;
  completionPercentage?: number;
  showPercentage?: boolean;
}

export function SectionCompletionIndicator({
  isComplete,
  completionPercentage,
  showPercentage = false,
}: SectionCompletionIndicatorProps) {
  if (isComplete) {
    return (
      <Badge variant="default" className="gap-1.5 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
        <CheckCircle2 className="h-3 w-3" />
        <span className="text-xs">Completo</span>
      </Badge>
    );
  }

  if (showPercentage && completionPercentage !== undefined) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Circle className="h-3 w-3" />
        <span className="text-xs">{completionPercentage}%</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <Circle className="h-3 w-3" />
      <span className="text-xs">Pendiente</span>
    </Badge>
  );
}

