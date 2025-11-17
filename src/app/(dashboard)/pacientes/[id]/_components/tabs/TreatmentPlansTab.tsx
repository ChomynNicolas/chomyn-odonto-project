// Treatment plans tab

'use client';

import { useState } from 'react';
import { useTreatmentPlans } from '@/lib/hooks/use-treatment-plans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AlertCircle, ClipboardList, CheckCircle2, Clock, Circle } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia
} from '@/components/ui/empty';

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
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
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
        <Empty
          icon={ClipboardList}
          title="Sin planes de tratamiento"
          description="No hay planes de tratamiento registrados para este paciente."
        />
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{plan.titulo}</CardTitle>
                    {plan.descripcion && (
                      <p className="text-sm text-muted-foreground">
                        {plan.descripcion}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Creado por {plan.createdBy} el{' '}
                      {new Date(plan.createdAt).toLocaleDateString('es-PY')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">
                      {plan.progress.completed}/{plan.progress.total} completados
                    </span>
                  </div>
                  <Progress
                    value={(plan.progress.completed / plan.progress.total) * 100}
                  />
                </div>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Procedimiento</TableHead>
                      <TableHead>Diente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Costo Est.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.steps.map((step) => (
                      <TableRow key={step.id}>
                        <TableCell className="font-medium">{step.order}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{step.procedure}</p>
                            {step.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {step.toothNumber ? (
                            <Badge variant="outline" className="text-xs">
                              {step.toothNumber}
                              {step.surface && ` (${step.surface})`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              step.status === 'COMPLETED'
                                ? 'default'
                                : step.status === 'IN_PROGRESS'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {step.status === 'COMPLETED' && (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            {step.status === 'IN_PROGRESS' && (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {step.status === 'PENDING' && (
                              <Circle className="h-3 w-3 mr-1" />
                            )}
                            {step.status === 'COMPLETED' && 'Completado'}
                            {step.status === 'IN_PROGRESS' && 'En Progreso'}
                            {step.status === 'PENDING' && 'Pendiente'}
                            {step.status === 'CANCELLED' && 'Cancelado'}
                          </Badge>
                          {step.executedCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.executedCount} vez{step.executedCount > 1 ? 'ces' : ''}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {step.estimatedCostCents ? (
                            <span className="font-medium">
                              Gs. {(step.estimatedCostCents / 100).toLocaleString('es-PY')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
