// Overview tab - quick summary of key information

'use client';

import { ClinicalSummary } from './overview/ClinicalSummary';
import { RecentActivity } from './overview/RecentActivity';
import { QuickStats } from './overview/QuickStats';
import { AnamnesisOverviewSection } from './overview/AnamnesisOverviewSection';
import { PatientAlerts } from '../shared/PatientAlerts';
import type { RolNombre } from '@/types/patient';

interface OverviewTabProps {
  patientId: number;
  currentRole: RolNombre;
}

export function OverviewTab({ patientId, currentRole }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Alerts Panel */}
      {currentRole !== 'RECEP' && (
        <PatientAlerts patientId={patientId} />
      )}

      {/* Quick Stats */}
      <QuickStats patientId={patientId} />

      {/* Anamnesis Overview Section - Prioritized for clinical roles */}
      {currentRole !== 'RECEP' && (
        <AnamnesisOverviewSection patientId={patientId} currentRole={currentRole} />
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ClinicalSummary patientId={patientId} currentRole={currentRole} />
        <RecentActivity patientId={patientId} />
      </div>
    </div>
  );
}
