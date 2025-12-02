// Anamnesis overview section component

'use client';

import { memo } from 'react';
import { usePatientAnamnesis } from '@/lib/hooks/use-patient-anamnesis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle, Edit } from 'lucide-react';
import { AnamnesisStatusBadge } from '../../shared/AnamnesisStatusBadge';
import { AnamnesisGeneralInfo } from './anamnesis/AnamnesisGeneralInfo';
import { AnamnesisMedicalHistory } from './anamnesis/AnamnesisMedicalHistory';
import { AnamnesisMedications } from './anamnesis/AnamnesisMedications';
import { AnamnesisAllergies } from './anamnesis/AnamnesisAllergies';
import { AnamnesisHygiene } from './anamnesis/AnamnesisHygiene';
import { useRouter } from 'next/navigation';
import type { RolNombre } from '@/types/patient';
import type {
  AnamnesisAntecedentResponse,
  AnamnesisMedicationResponse,
  AnamnesisAllergyResponse,
} from '@/app/api/pacientes/[id]/anamnesis/_schemas';
import type { PatientAnamnesisDTO } from '@/types/patient';

// Extended type to include normalized relationships from API response
type AnamnesisWithRelations = PatientAnamnesisDTO & {
  antecedents?: AnamnesisAntecedentResponse[];
  medications?: AnamnesisMedicationResponse[];
  allergies?: AnamnesisAllergyResponse[];
};

interface AnamnesisOverviewSectionProps {
  patientId: number;
  currentRole: RolNombre;
}

export const AnamnesisOverviewSection = memo(function AnamnesisOverviewSection({
  patientId,
  currentRole,
}: AnamnesisOverviewSectionProps) {
  const router = useRouter();
  const { data: anamnesisData, isLoading, error } = usePatientAnamnesis(patientId);
  const anamnesis = anamnesisData as AnamnesisWithRelations | null;

  // Don't show for receptionists
  if (currentRole === 'RECEP') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar anamnesis</AlertDescription>
      </Alert>
    );
  }

  if (!anamnesis) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Anamnesis
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No hay anamnesis registrada para este paciente.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                router.push(`/pacientes/${patientId}?tab=anamnesis`);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Crear Anamnesis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract normalized data from anamnesis (if available in response)
  const antecedents = anamnesis?.antecedents || [];
  const medications = anamnesis?.medications || [];
  const allergies = anamnesis?.allergies || [];

  return (
    <div className="space-y-4">
      {/* Header with status and action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Anamnesis
          </h2>
          <AnamnesisStatusBadge anamnesis={anamnesis} />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            router.push(`/pacientes/${patientId}?tab=anamnesis`);
          }}
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Anamnesis sections in responsive grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnamnesisGeneralInfo anamnesis={anamnesis} />
        <AnamnesisMedicalHistory anamnesis={anamnesis} antecedents={antecedents} />
        <AnamnesisMedications anamnesis={anamnesis} medications={medications} />
        <AnamnesisAllergies anamnesis={anamnesis} allergies={allergies} />
        <AnamnesisHygiene anamnesis={anamnesis} />
      </div>
    </div>
  );
});

