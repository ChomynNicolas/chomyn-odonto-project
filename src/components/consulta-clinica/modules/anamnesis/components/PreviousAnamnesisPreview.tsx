// Component to preview previous anamnesis data when editing follow-up

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Copy, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AnamnesisResponse } from '@/app/api/pacientes/[id]/anamnesis/_schemas';
import { useState } from 'react';

interface PreviousAnamnesisPreviewProps {
  previousAnamnesis: AnamnesisResponse | null;
  onCopyToForm?: (field: string, value: unknown) => void;
  onCopyAll?: () => void;
}

export function PreviousAnamnesisPreview({
  previousAnamnesis,
  onCopyToForm,
  onCopyAll,
}: PreviousAnamnesisPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!previousAnamnesis) {
    return null;
  }

  const lastUpdate = previousAnamnesis.updatedAt
    ? formatDistanceToNow(new Date(previousAnamnesis.updatedAt), {
        addSuffix: true,
        locale: es,
      })
    : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Anamnesis Anterior</CardTitle>
              <Badge variant="outline" className="text-xs">
                {lastUpdate || 'Anterior'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {onCopyAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopyAll}
                  className="h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar Todo
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          {previousAnamnesis.actualizadoPor && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span>Última edición: {previousAnamnesis.actualizadoPor.nombreApellido}</span>
              {previousAnamnesis.updatedAt && (
                <>
                  <span>•</span>
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(previousAnamnesis.updatedAt).toLocaleDateString('es-PY')}</span>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Motivo de Consulta removed - it's now in consulta, not anamnesis */}

            {/* Dolor */}
            {previousAnamnesis.tieneDolorActual && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">Dolor:</span>
                  {onCopyToForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onCopyToForm('tieneDolorActual', true)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  )}
                </div>
                <p className="text-sm">
                  Sí ({previousAnamnesis.dolorIntensidad ? `Intensidad: ${previousAnamnesis.dolorIntensidad}/10` : 'Sin intensidad registrada'})
                </p>
              </div>
            )}

            {/* Antecedentes */}
            {previousAnamnesis.antecedents && previousAnamnesis.antecedents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Antecedentes ({previousAnamnesis.antecedents.length}):
                  </span>
                  {onCopyToForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onCopyToForm('antecedents', previousAnamnesis.antecedents)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  )}
                </div>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {previousAnamnesis.antecedents.slice(0, 3).map((ant) => (
                    <li key={ant.idAnamnesisAntecedent}>
                      {ant.antecedentCatalog?.name || ant.customName || 'Antecedente'}
                      {ant.notes && <span className="text-muted-foreground"> - {ant.notes}</span>}
                    </li>
                  ))}
                  {previousAnamnesis.antecedents.length > 3 && (
                    <li className="text-muted-foreground">
                      +{previousAnamnesis.antecedents.length - 3} más
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Medicaciones */}
            {previousAnamnesis.medications && previousAnamnesis.medications.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Medicaciones ({previousAnamnesis.medications.length}):
                  </span>
                  {onCopyToForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onCopyToForm('medications', previousAnamnesis.medications)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  )}
                </div>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {previousAnamnesis.medications.slice(0, 3).map((med) => (
                    <li key={med.idAnamnesisMedication}>
                      {med.medication.medicationCatalog?.name || med.medication.label || 'Medicación'}
                      {med.medication.dose && <span className="text-muted-foreground"> - {med.medication.dose}</span>}
                    </li>
                  ))}
                  {previousAnamnesis.medications.length > 3 && (
                    <li className="text-muted-foreground">
                      +{previousAnamnesis.medications.length - 3} más
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Alergias */}
            {previousAnamnesis.allergies && previousAnamnesis.allergies.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Alergias ({previousAnamnesis.allergies.length}):
                  </span>
                  {onCopyToForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onCopyToForm('allergies', previousAnamnesis.allergies)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  )}
                </div>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {previousAnamnesis.allergies.slice(0, 3).map((all) => (
                    <li key={all.idAnamnesisAllergy}>
                      {all.allergy.allergyCatalog?.name || all.allergy.label || 'Alergia'}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {all.allergy.severity}
                      </Badge>
                    </li>
                  ))}
                  {previousAnamnesis.allergies.length > 3 && (
                    <li className="text-muted-foreground">
                      +{previousAnamnesis.allergies.length - 3} más
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

