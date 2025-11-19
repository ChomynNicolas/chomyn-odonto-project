// Main tabs navigation component

'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleGuard } from '@/lib/rbac/guards';
import { OverviewTab } from './tabs/OverviewTab';
import { ClinicalHistoryTab } from './tabs/ClinicalHistoryTab';
import { TreatmentPlansTab } from './tabs/TreatmentPlansTab';
import { AdministrativeTab } from './tabs/AdministrativeTab';
import { OdontogramTab } from './tabs/OdontogramTab';
import { AnamnesisTab } from './tabs/AnamnesisTab';
import type { RolNombre } from '@/types/patient';

interface PatientTabsProps {
  patientId: number;
  currentRole: RolNombre;
}

type TabValue = 'overview' | 'anamnesis' | 'clinical-history' | 'treatment-plans' | 'odontogram' | 'administrative';

export function PatientTabs({ patientId, currentRole }: PatientTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const clinicalTabs: TabValue[] = ['overview', 'anamnesis', 'clinical-history', 'treatment-plans', 'odontogram'];
  const adminTabs: TabValue[] = ['overview', 'administrative'];
  const visibleTabs = currentRole === 'RECEP' ? adminTabs : [...clinicalTabs, 'administrative'];

  // Get current tab from URL, default to 'overview'
  const urlTab = searchParams.get('tab') as TabValue | null;
  const activeTab = useMemo(() => {
    // Validate that the tab from URL is allowed for current role
    if (urlTab && visibleTabs.includes(urlTab)) {
      return urlTab;
    }
    return 'overview';
  }, [urlTab, visibleTabs]);

  // Handle tab change - update URL without page reload
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') {
      // Remove tab param for default tab to keep URL clean
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const newUrl = params.toString() 
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });
  };

  // Sync URL if invalid tab is in URL
  useEffect(() => {
    if (urlTab && !visibleTabs.includes(urlTab)) {
      // Invalid tab for current role, redirect to overview
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tab');
      router.replace(pathname, { scroll: false });
    }
  }, [urlTab, visibleTabs, searchParams, pathname, router]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="overview">Resumen</TabsTrigger>
        
        <RoleGuard allowedRoles={['ADMIN', 'ODONT']} currentRole={currentRole}>
          <TabsTrigger value="anamnesis">Anamnesis</TabsTrigger>
          <TabsTrigger value="clinical-history">Historial Clínico</TabsTrigger>
          <TabsTrigger value="treatment-plans">Planes de Tratamiento</TabsTrigger>
          <TabsTrigger value="odontogram">Odontograma</TabsTrigger>
        </RoleGuard>

        <TabsTrigger value="administrative">Administrativo</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab patientId={patientId} currentRole={currentRole} />
      </TabsContent>

      <RoleGuard allowedRoles={['ADMIN', 'ODONT']} currentRole={currentRole}>
        <TabsContent value="anamnesis" className="mt-6">
          <AnamnesisTab patientId={patientId} currentRole={currentRole} />
        </TabsContent>

        <TabsContent value="clinical-history" className="mt-6">
          <ClinicalHistoryTab patientId={patientId} />
        </TabsContent>

        <TabsContent value="treatment-plans" className="mt-6">
          <TreatmentPlansTab patientId={patientId} />
        </TabsContent>

        <TabsContent value="odontogram" className="mt-6">
          <OdontogramTab patientId={patientId} />
        </TabsContent>
      </RoleGuard>

      <TabsContent value="administrative" className="mt-6">
        <AdministrativeTab patientId={patientId} currentRole={currentRole} />
      </TabsContent>
    </Tabs>
  );
}
