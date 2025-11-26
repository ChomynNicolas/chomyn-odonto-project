// Main patient workspace orchestrator component

'use client';

import { usePatientOverview } from '@/lib/hooks/use-patient-overview';
import { usePatientPermissions } from '@/lib/hooks/use-patient-permissions';
import { PatientHeader } from './PatientHeader';
import { PatientSummaryCards } from './PatientSummaryCards';
import { PatientTabs } from './PatientTabs';
import { PatientQuickActions } from './shared/PatientQuickActions';
import { PatientWorkspaceSkeleton } from './PatientWorkspaceSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RolNombre } from '@/types/patient';

interface PatientWorkspaceProps {
  patientId: number;
}

export function PatientWorkspace({ patientId }: PatientWorkspaceProps) {
  const { role, permissions, isLoading: isLoadingPermissions } = usePatientPermissions();
  const { data, isLoading, error, refetch } = usePatientOverview(patientId);

  // Derive currentRole from permissions hook
  const currentRole: RolNombre = role ?? 'RECEP';

  if (isLoading || isLoadingPermissions) {
    return <PatientWorkspaceSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Error al cargar datos del paciente: {error.message}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Paciente no encontrado</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PatientHeader
        patient={data.patient}
        contacts={data.contacts}
        riskFlags={data.riskFlags}
        currentRole={currentRole}
        permissions={permissions}
        patientId={patientId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <PatientTabs patientId={patientId} currentRole={currentRole} permissions={permissions} />
        </div>

        <div className="lg:col-span-1">
          <PatientSummaryCards
            summaryCards={data.summaryCards}
            riskFlags={data.riskFlags}
            currentRole={currentRole}
            permissions={permissions}
            patientId={patientId}
          />
        </div>
      </div>

      {/* Quick Actions Floating Button */}
      <PatientQuickActions patientId={patientId} currentRole={currentRole} permissions={permissions} />
    </div>
  );
}
