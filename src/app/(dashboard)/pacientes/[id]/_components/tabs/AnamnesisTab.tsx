// Anamnesis tab - comprehensive anamnesis view and edit

'use client';

import { usePatientAnamnesis } from '@/lib/hooks/use-patient-anamnesis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle, Edit, Loader2 } from 'lucide-react';
import { AnamnesisForm } from '@/components/consulta-clinica/modules/anamnesis/AnamnesisForm';
import { useRouter } from 'next/navigation';
import type { RolNombre } from '@/types/patient';

interface AnamnesisTabProps {
  patientId: number;
  currentRole: RolNombre;
}

export function AnamnesisTab({ patientId, currentRole }: AnamnesisTabProps) {
  const router = useRouter();
  const { data: anamnesis, isLoading, error, refetch } = usePatientAnamnesis(patientId);

  // Don't show for receptionists
  if (currentRole === 'RECEP') {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No tiene permisos para ver esta información.</AlertDescription>
      </Alert>
    );
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
        <AlertDescription>
          Error al cargar anamnesis: {error.message}
          <Button
            variant="outline"
            size="sm"
            className="ml-4"
            onClick={() => refetch()}
          >
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Determine if user can edit (ADMIN and ODONT can edit)
  const canEdit = currentRole === 'ADMIN' || currentRole === 'ODONT';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Anamnesis
              </CardTitle>
              <CardDescription className="mt-1">
                Información clínica completa del paciente. Los campos marcados con * son obligatorios.
              </CardDescription>
            </div>
            {!canEdit && (
              <Badge variant="secondary">Solo lectura</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AnamnesisForm
            pacienteId={patientId}
            initialData={anamnesis ? {
              ...anamnesis,
              antecedents: (anamnesis as any).antecedents || [],
              medications: (anamnesis as any).medications || [],
              allergies: (anamnesis as any).allergies || [],
            } : null}
            onSave={() => {
              refetch();
              // Optionally navigate back to overview
              // router.push(`/pacientes/${patientId}?tab=overview`);
            }}
            canEdit={canEdit}
            patientGender={undefined} // Could be passed from patient data if available
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Add missing import
import { Badge } from '@/components/ui/badge';

