// Treatment plans tab

'use client';

import { useState } from 'react';
import { useTreatmentPlans } from '@/lib/hooks/use-treatment-plans';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { PlanCard } from '@/components/treatment-plans/PlanCard';
import { Card } from '@/components/ui/card';

interface TreatmentPlansTabProps {
  patientId: number;
}

export function TreatmentPlansTab({ patientId }: TreatmentPlansTabProps) {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data, isLoading, error } = useTreatmentPlans(patientId, includeInactive);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar planes: {error.message}</AlertDescription>
      </Alert>
    );
  }

  const plans = data?.plans || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Planes de Tratamiento</h2>
        <div className="flex items-center gap-2">
          <Switch
            id="include-inactive"
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          <Label htmlFor="include-inactive" className="text-sm">
            Mostrar inactivos
          </Label>
        </div>
      </div>

      {plans.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>Sin planes de tratamiento</EmptyTitle>
            <EmptyDescription>
              No hay planes de tratamiento registrados para este paciente.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
