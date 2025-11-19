// Hygiene habits section for anamnesis

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wind, Baby, Droplet } from 'lucide-react';
import type { PatientAnamnesisDTO } from '@/types/patient';

interface AnamnesisHygieneProps {
  anamnesis: PatientAnamnesisDTO;
}

export function AnamnesisHygiene({ anamnesis }: AnamnesisHygieneProps) {
  const hasHygieneData =
    anamnesis.higieneCepilladosDia !== null ||
    anamnesis.usaHiloDental !== null ||
    anamnesis.bruxismo !== null ||
    anamnesis.expuestoHumoTabaco !== null ||
    anamnesis.tieneHabitosSuccion !== null ||
    anamnesis.lactanciaRegistrada !== null;

  if (!hasHygieneData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Hábitos de Higiene
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay información de hábitos registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Hábitos de Higiene
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Brushing */}
          {anamnesis.higieneCepilladosDia !== null && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cepillados diarios</p>
                <p className="text-sm font-medium">{anamnesis.higieneCepilladosDia}</p>
              </div>
            </div>
          )}

          {/* Floss */}
          {anamnesis.usaHiloDental !== null && (
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hilo dental</p>
                <Badge variant={anamnesis.usaHiloDental ? 'default' : 'outline'} className="text-xs">
                  {anamnesis.usaHiloDental ? 'Sí' : 'No'}
                </Badge>
              </div>
            </div>
          )}

          {/* Bruxism */}
          {anamnesis.bruxismo !== null && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Bruxismo</p>
                <Badge variant={anamnesis.bruxismo ? 'secondary' : 'outline'} className="text-xs">
                  {anamnesis.bruxismo ? 'Sí' : 'No'}
                </Badge>
              </div>
            </div>
          )}

          {/* Tobacco exposure */}
          {anamnesis.expuestoHumoTabaco !== null && (
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Exposición a humo</p>
                <Badge variant={anamnesis.expuestoHumoTabaco ? 'destructive' : 'outline'} className="text-xs">
                  {anamnesis.expuestoHumoTabaco ? 'Sí' : 'No'}
                </Badge>
              </div>
            </div>
          )}

          {/* Sucking habits (pediatric) */}
          {anamnesis.tieneHabitosSuccion !== null && (
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hábitos de succión</p>
                <Badge variant={anamnesis.tieneHabitosSuccion ? 'secondary' : 'outline'} className="text-xs">
                  {anamnesis.tieneHabitosSuccion ? 'Sí' : 'No'}
                </Badge>
              </div>
            </div>
          )}

          {/* Breastfeeding (pediatric) */}
          {anamnesis.lactanciaRegistrada !== null && (
            <div className="flex items-center gap-2">
              <Droplet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Lactancia</p>
                <Badge variant={anamnesis.lactanciaRegistrada ? 'default' : 'outline'} className="text-xs">
                  {anamnesis.lactanciaRegistrada ? 'Sí' : 'No'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

