// Patient risk banner component - prominent display of critical risks

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronUp, Pill, Activity, Baby } from 'lucide-react';
import { useState } from 'react';
import type { RiskFlagsDTO } from '@/types/patient';

interface PatientRiskBannerProps {
  riskFlags: RiskFlagsDTO;
}

export function PatientRiskBanner({ riskFlags }: PatientRiskBannerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if no risks
  if (!riskFlags.hasAllergies && 
      !riskFlags.hasChronicDiseases && 
      riskFlags.currentMedicationsCount === 0 &&
      !riskFlags.isPregnant &&
      riskFlags.urgencyLevel === null &&
      !riskFlags.hasCurrentPain) {
    return null;
  }

  const hasHighSeverity = riskFlags.highSeverityAllergies > 0 || 
                          riskFlags.urgencyLevel === 'URGENCIA' ||
                          riskFlags.hasCurrentPain;

  if (!hasHighSeverity) {
    return null; // Only show banner for high-severity risks
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Alert 
        variant={riskFlags.urgencyLevel === 'URGENCIA' ? 'destructive' : 'default'}
        className="border-l-4 border-l-destructive"
        role="alert"
        aria-live="polite"
      >
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        <AlertTitle className="flex items-center justify-between">
          <span>Alertas Clínicas Importantes</span>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              aria-label={isOpen ? 'Ocultar detalles' : 'Mostrar detalles'}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </CollapsibleTrigger>
        </AlertTitle>
        <AlertDescription>
          <div className="flex flex-wrap gap-2 mb-2">
            {riskFlags.highSeverityAllergies > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {riskFlags.highSeverityAllergies} Alergia{riskFlags.highSeverityAllergies > 1 ? 's' : ''} Severa{riskFlags.highSeverityAllergies > 1 ? 's' : ''}
              </Badge>
            )}
            {riskFlags.urgencyLevel === 'URGENCIA' && (
              <Badge variant="destructive" className="text-xs">
                Urgencia Clínica
              </Badge>
            )}
            {riskFlags.hasCurrentPain && (
              <Badge variant="destructive" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Dolor Actual
              </Badge>
            )}
          </div>
          
          <CollapsibleContent className="mt-2 space-y-2">
            {riskFlags.hasAllergies && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>
                  {riskFlags.allergyCount} alergia{riskFlags.allergyCount > 1 ? 's' : ''} registrada{riskFlags.allergyCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {riskFlags.hasChronicDiseases && (
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>Enfermedades crónicas</span>
              </div>
            )}
            {riskFlags.currentMedicationsCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <span>
                  {riskFlags.currentMedicationsCount} medicamento{riskFlags.currentMedicationsCount > 1 ? 's' : ''} actual{riskFlags.currentMedicationsCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {riskFlags.isPregnant && (
              <div className="flex items-center gap-2 text-sm">
                <Baby className="h-4 w-4 text-pink-500" />
                <span>Embarazada</span>
              </div>
            )}
          </CollapsibleContent>
        </AlertDescription>
      </Alert>
    </Collapsible>
  );
}

