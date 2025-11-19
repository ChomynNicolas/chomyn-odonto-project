// Medical history section for anamnesis

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, AlertTriangle, FileText } from 'lucide-react';
import type { PatientAnamnesisDTO } from '@/types/patient';

interface AnamnesisMedicalHistoryProps {
  anamnesis: PatientAnamnesisDTO;
  antecedents?: Array<{
    idAnamnesisAntecedent: number;
    customName: string | null;
    antecedentCatalog: {
      name: string;
      category: string;
    } | null;
    isActive: boolean;
    notes: string | null;
  }>;
}

export function AnamnesisMedicalHistory({ anamnesis, antecedents = [] }: AnamnesisMedicalHistoryProps) {
  const activeAntecedents = antecedents.filter((a) => a.isActive);

  if (!anamnesis.tieneEnfermedadesCronicas && activeAntecedents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Antecedentes Médicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se registran enfermedades crónicas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Antecedentes Médicos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anamnesis.tieneEnfermedadesCronicas && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Enfermedades crónicas
            </Badge>
          </div>
        )}

        {activeAntecedents.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Antecedentes registrados:</p>
            <div className="space-y-1.5">
              {activeAntecedents.map((ant) => (
                <div key={ant.idAnamnesisAntecedent} className="flex items-start gap-2 text-sm">
                  <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {ant.antecedentCatalog?.name || ant.customName || 'Antecedente sin nombre'}
                    </p>
                    {ant.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ant.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

