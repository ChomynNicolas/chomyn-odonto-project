// Medications section for anamnesis

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, FileText } from 'lucide-react';
import type { PatientAnamnesisDTO } from '@/types/patient';

interface AnamnesisMedicationsProps {
  anamnesis: PatientAnamnesisDTO;
  medications?: Array<{
    idAnamnesisMedication: number;
    medication: {
      idPatientMedication: number;
      label: string | null;
      medicationCatalog: {
        name: string;
      } | null;
      dose: string | null;
      freq: string | null;
      route: string | null;
      isActive: boolean;
    };
  }>;
}

export function AnamnesisMedications({ anamnesis, medications = [] }: AnamnesisMedicationsProps) {
  const activeMedications = medications.filter((m) => m.medication.isActive);

  if (!anamnesis.tieneMedicacionActual && activeMedications.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medicación Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se registra medicación actual</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pill className="h-4 w-4" />
          Medicación Actual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anamnesis.tieneMedicacionActual && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Pill className="h-3 w-3" />
              Medicación activa
            </Badge>
          </div>
        )}

        {activeMedications.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">
              Medicamentos ({activeMedications.length}):
            </p>
            <div className="space-y-1.5">
              {activeMedications.map((med) => {
                const label = med.medication.medicationCatalog?.name || med.medication.label || 'Medicamento sin nombre';
                const details = [med.medication.dose, med.medication.freq, med.medication.route]
                  .filter(Boolean)
                  .join(' • ');

                return (
                  <div key={med.idAnamnesisMedication} className="flex items-start gap-2 text-sm">
                    <Pill className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{label}</p>
                      {details && (
                        <p className="text-xs text-muted-foreground mt-0.5">{details}</p>
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

