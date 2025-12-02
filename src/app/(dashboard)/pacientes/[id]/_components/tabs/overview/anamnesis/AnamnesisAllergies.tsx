// Allergies section for anamnesis

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { PatientAnamnesisDTO } from '@/types/patient';

interface AnamnesisAllergiesProps {
  anamnesis: PatientAnamnesisDTO;
  allergies?: Array<{
    idAnamnesisAllergy: number;
    allergy: {
      idPatientAllergy: number;
      label: string | null;
      allergyCatalog: {
        name: string;
      } | null;
      severity: 'MILD' | 'MODERATE' | 'SEVERE';
      reaction: string | null;
      isActive: boolean;
    };
  }>;
}

export function AnamnesisAllergies({ anamnesis, allergies = [] }: AnamnesisAllergiesProps) {
  const activeAllergies = allergies.filter((a) => a.allergy.isActive);
  const severeAllergies = activeAllergies.filter((a) => a.allergy.severity === 'SEVERE');

  if (!anamnesis.tieneAlergias && activeAllergies.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alergias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se registran alergias</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Alergias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anamnesis.tieneAlergias && (
          <div className="flex items-center gap-2">
            <Badge
              variant={severeAllergies.length > 0 ? 'destructive' : 'secondary'}
              className="gap-1.5"
            >
              <AlertTriangle className="h-3 w-3" />
              {severeAllergies.length > 0
                ? `${severeAllergies.length} alergia${severeAllergies.length > 1 ? 's' : ''} severa${severeAllergies.length > 1 ? 's' : ''}`
                : 'Alergias registradas'}
            </Badge>
          </div>
        )}

        {activeAllergies.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">
              Alergias registradas ({activeAllergies.length}):
            </p>
            <div className="space-y-1.5">
              {activeAllergies.map((allergy) => {
                const label =
                  allergy.allergy.allergyCatalog?.name || allergy.allergy.label || 'Alergia sin nombre';
                const severityColors = {
                  SEVERE: 'destructive',
                  MODERATE: 'secondary',
                  MILD: 'outline',
                } as const;

                return (
                  <div key={allergy.idAnamnesisAllergy} className="flex items-start gap-2 text-sm">
                    <AlertTriangle
                      className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                        allergy.allergy.severity === 'SEVERE'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{label}</p>
                        <Badge variant={severityColors[allergy.allergy.severity]} className="text-xs">
                          {allergy.allergy.severity === 'SEVERE'
                            ? 'Severa'
                            : allergy.allergy.severity === 'MODERATE'
                              ? 'Moderada'
                              : 'Leve'}
                        </Badge>
                      </div>
                      {allergy.allergy.reaction && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Reacción: {allergy.allergy.reaction}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

