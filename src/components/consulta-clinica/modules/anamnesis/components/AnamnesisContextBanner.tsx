// Context banner showing anamnesis status and previous data info

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Info,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  History,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AnamnesisContext } from '@/lib/services/anamnesis-context.service';
import type { AnamnesisResponse } from '@/app/api/pacientes/[id]/anamnesis/_schemas';
import { useState } from 'react';

interface AnamnesisContextBannerProps {
  context: AnamnesisContext | null;
  anamnesis: AnamnesisResponse | null;
  onViewHistory?: () => void;
}

export function AnamnesisContextBanner({
  context,
  anamnesis,
  onViewHistory,
}: AnamnesisContextBannerProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!context) {
    return null;
  }

  const isFirstTime = context.isFirstTime;
  const hasExistingAnamnesis = context.hasExistingAnamnesis;
  const isOutdated = context.isSignificantlyOutdated;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Alert
        variant={isFirstTime ? 'default' : isOutdated ? 'destructive' : 'default'}
        className={`w-full ${
          isFirstTime
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
            : isOutdated
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
              : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
        }`}
      >
        <div className="flex items-center justify-between gap-6 w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Info className="h-5 w-5 flex-shrink-0" />
            <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
              <AlertDescription className="font-semibold text-base m-0 whitespace-nowrap">
                {isFirstTime
                  ? 'Primera Consulta - Nueva Anamnesis'
                  : hasExistingAnamnesis
                    ? 'Consulta de Seguimiento'
                    : 'Consulta de Seguimiento (Sin anamnesis previa)'}
              </AlertDescription>
              {isOutdated && (
                <Badge variant="destructive" className="text-xs flex-shrink-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Desactualizada
                </Badge>
              )}

              <CollapsibleContent className="flex  items-center gap-x-4 gap-y-2 text-sm">
                {hasExistingAnamnesis && context.lastAnamnesisUpdate && (
                  <>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        <span className="font-medium">Última actualización:</span>{' '}
                        {formatDistanceToNow(new Date(context.lastAnamnesisUpdate), {
                          addSuffix: true,
                          locale: es,
                        })}
                        {context.daysSinceLastUpdate !== null && (
                          <span className="ml-1">({context.daysSinceLastUpdate} días)</span>
                        )}
                      </span>
                    </div>
                    {anamnesis?.actualizadoPor && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          <span className="font-medium">Última edición por:</span>{' '}
                          {anamnesis.actualizadoPor.nombreApellido}
                        </span>
                      </div>
                    )}
                    {context.lastConsultationDate && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          <span className="font-medium">Última consulta:</span>{' '}
                          {new Date(context.lastConsultationDate).toLocaleDateString('es-PY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {onViewHistory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-sm text-primary hover:text-primary/80 flex-shrink-0"
                        onClick={onViewHistory}
                      >
                        <History className="h-3.5 w-3.5 mr-1" />
                        Ver historial
                      </Button>
                    )}
                  </>
                )}
                {isFirstTime && (
                  <p className="text-sm text-muted-foreground">
                    Esta es la primera consulta del paciente. Complete la anamnesis inicial.
                  </p>
                )}
              </CollapsibleContent>
            </div>
          </div>
        </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 ml-auto">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
      </Alert>
    </Collapsible>
  );
}

