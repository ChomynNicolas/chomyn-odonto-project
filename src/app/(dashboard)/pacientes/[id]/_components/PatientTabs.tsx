// Main tabs navigation component

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleGuard } from '@/lib/rbac/guards';
import { OverviewTab } from './tabs/OverviewTab';
import { ClinicalHistoryTab } from './tabs/ClinicalHistoryTab';
import { TreatmentPlansTab } from './tabs/TreatmentPlansTab';
import { AdministrativeTab } from './tabs/AdministrativeTab';
import type { RolNombre } from '@/types/patient';

interface PatientTabsProps {
  patientId: number;
  currentRole: RolNombre;
}

export function PatientTabs({ patientId, currentRole }: PatientTabsProps) {
  const clinicalTabs = ['overview', 'clinical-history', 'treatment-plans'];
  const adminTabs = ['overview', 'administrative'];
  const visibleTabs = currentRole === 'RECEP' ? adminTabs : [...clinicalTabs, 'administrative'];

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="overview">Resumen</TabsTrigger>
        
        <RoleGuard allowedRoles={['ADMIN', 'ODONT']} currentRole={currentRole}>
          <TabsTrigger value="clinical-history">Historial Clínico</TabsTrigger>
          <TabsTrigger value="treatment-plans">Planes de Tratamiento</TabsTrigger>
        </RoleGuard>

        <TabsTrigger value="administrative">Administrativo</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab patientId={patientId} currentRole={currentRole} />
      </TabsContent>

      <RoleGuard allowedRoles={['ADMIN', 'ODONT']} currentRole={currentRole}>
        <TabsContent value="clinical-history" className="mt-6">
          <ClinicalHistoryTab patientId={patientId} />
        </TabsContent>

        <TabsContent value="treatment-plans" className="mt-6">
          <TreatmentPlansTab patientId={patientId} />
        </TabsContent>
      </RoleGuard>

      <TabsContent value="administrative" className="mt-6">
        <AdministrativeTab patientId={patientId} currentRole={currentRole} />
      </TabsContent>
    </Tabs>
  );
}
