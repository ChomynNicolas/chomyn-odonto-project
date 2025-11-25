// Patient risk badges component with collapsible UI and tooltips
// Synchronized with anamnesis data via RiskFlagsDTO

'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle,
  Pill,
  Activity,
  Baby,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { RiskFlagsDTO } from '@/types/patient';
import { cn } from '@/lib/utils';

interface PatientRiskBadgesProps {
  riskFlags: RiskFlagsDTO;
  className?: string;
}

interface RiskBadge {
  id: string;
  label: string;
  count?: number;
  variant: 'destructive' | 'secondary' | 'default';
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  show: boolean;
}

export function PatientRiskBadges({ riskFlags, className }: PatientRiskBadgesProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Define all risk badges with their conditions
  const badges: RiskBadge[] = useMemo(() => {
    const allBadges: RiskBadge[] = [
      {
        id: 'high-severity-allergies',
        label: 'Alergia Severa',
        count: riskFlags.highSeverityAllergies,
        variant: 'destructive',
        icon: AlertTriangle,
        tooltip: `${riskFlags.highSeverityAllergies} alergia${riskFlags.highSeverityAllergies !== 1 ? 's' : ''} de severidad alta o severa registrada${riskFlags.highSeverityAllergies !== 1 ? 's' : ''}. Requiere atención especial durante el tratamiento.`,
        show: riskFlags.highSeverityAllergies > 0,
      },
      {
        id: 'allergies',
        label: 'Alergias',
        count: riskFlags.allergyCount,
        variant: riskFlags.highSeverityAllergies > 0 ? 'destructive' : 'secondary',
        icon: AlertTriangle,
        tooltip: `${riskFlags.allergyCount} alergia${riskFlags.allergyCount !== 1 ? 's' : ''} registrada${riskFlags.allergyCount !== 1 ? 's' : ''}. Verificar antes de procedimientos.`,
        show: riskFlags.hasAllergies && riskFlags.highSeverityAllergies === 0,
      },
      {
        id: 'chronic-diseases',
        label: 'Enfermedades Crónicas',
        variant: 'secondary',
        icon: Heart,
        tooltip: 'El paciente tiene enfermedades crónicas registradas. Considerar en plan de tratamiento.',
        show: riskFlags.hasChronicDiseases,
      },
      {
        id: 'medications',
        label: 'Medicación Actual',
        count: riskFlags.currentMedicationsCount,
        variant: 'secondary',
        icon: Pill,
        tooltip: `${riskFlags.currentMedicationsCount} medicamento${riskFlags.currentMedicationsCount !== 1 ? 's' : ''} activo${riskFlags.currentMedicationsCount !== 1 ? 's' : ''}. Verificar interacciones medicamentosas.`,
        show: riskFlags.currentMedicationsCount > 0,
      },
      {
        id: 'pregnant',
        label: 'Embarazada',
        variant: 'secondary',
        icon: Baby,
        tooltip: 'Paciente embarazada. Considerar limitaciones en procedimientos y radiografías.',
        show: riskFlags.isPregnant === true,
      },
      {
        id: 'current-pain',
        label: 'Dolor Actual',
        variant: 'destructive',
        icon: Activity,
        tooltip: 'El paciente reporta dolor actual. Priorizar evaluación y tratamiento.',
        show: riskFlags.hasCurrentPain,
      },
      {
        id: 'urgency',
        label: 'URGENCIA',
        variant: 'destructive',
        icon: AlertTriangle,
        tooltip: 'Urgencia clínica identificada. Requiere atención prioritaria.',
        show: riskFlags.urgencyLevel === 'URGENCIA',
      },
      {
        id: 'priority',
        label: 'PRIORITARIO',
        variant: 'secondary',
        icon: Activity,
        tooltip: 'Consulta prioritaria. Atender en breve.',
        show: riskFlags.urgencyLevel === 'PRIORITARIO',
      },
    ];

    return allBadges.filter((badge) => badge.show);
  }, [riskFlags]);

  // Don't render if no risks
  if (badges.length === 0) {
    return null;
  }

  // Primary badges (high severity, always visible when collapsed)
  const primaryBadges = badges.filter(
    (badge) => badge.variant === 'destructive' || badge.id === 'urgency'
  );

  // Secondary badges (shown when expanded)
  const secondaryBadges = badges.filter(
    (badge) => badge.variant !== 'destructive' && badge.id !== 'urgency'
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('w-full', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary badges - always visible */}
        {primaryBadges.map((badge) => {
          const Icon = badge.icon;
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <Badge
                  variant={badge.variant}
                  className="text-xs cursor-help"
                  aria-label={badge.tooltip}
                >
                  <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
                  {badge.count !== undefined
                    ? `${badge.count} ${badge.label}${badge.count !== 1 ? 's' : ''}`
                    : badge.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{badge.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Secondary badges - shown when expanded or if no primary badges */}
        {isOpen && secondaryBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {secondaryBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={badge.variant}
                      className="text-xs cursor-help"
                      aria-label={badge.tooltip}
                    >
                      <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
                      {badge.count !== undefined
                        ? `${badge.count} ${badge.label}${badge.count !== 1 ? 's' : ''}`
                        : badge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{badge.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Show secondary badges inline if no primary badges */}
        {primaryBadges.length === 0 &&
          !isOpen &&
          secondaryBadges.slice(0, 2).map((badge) => {
            const Icon = badge.icon;
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={badge.variant}
                    className="text-xs cursor-help"
                    aria-label={badge.tooltip}
                  >
                    <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
                    {badge.count !== undefined
                      ? `${badge.count} ${badge.label}${badge.count !== 1 ? 's' : ''}`
                      : badge.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{badge.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

        {/* Expand/Collapse button - only show if there are more badges to expand */}
        {secondaryBadges.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              aria-label={isOpen ? 'Ocultar más banderas de riesgo' : 'Mostrar más banderas de riesgo'}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" aria-hidden="true" />
                  Menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" aria-hidden="true" />
                  +{secondaryBadges.length} más
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}

        {/* Expanded content */}
        <CollapsibleContent className="w-full mt-2">
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            {secondaryBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={badge.variant}
                      className="text-xs cursor-help"
                      aria-label={badge.tooltip}
                    >
                      <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
                      {badge.count !== undefined
                        ? `${badge.count} ${badge.label}${badge.count !== 1 ? 's' : ''}`
                        : badge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{badge.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

