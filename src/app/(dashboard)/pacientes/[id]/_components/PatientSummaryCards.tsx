// Summary cards in the right sidebar

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RestrictedSection } from '@/lib/rbac/guards';
import { Calendar, Clock, TrendingUp, XCircle, ClipboardList, FileCheck, AlertTriangle } from 'lucide-react';
import { AnamnesisSummaryCard } from './shared/AnamnesisSummaryCard';
import type { PatientOverviewDTO, RolNombre } from '@/types/patient';
import type { RBACPermissions } from '@/lib/utils/rbac';

interface PatientSummaryCardsProps {
  summaryCards: PatientOverviewDTO['summaryCards'];
  riskFlags: PatientOverviewDTO['riskFlags'];
  currentRole: RolNombre;
  permissions?: RBACPermissions | null;
  patientId: number;
}

export function PatientSummaryCards({
  summaryCards,
  riskFlags,
  currentRole,
  patientId,
}: PatientSummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* Anamnesis Summary Card - First for clinical roles */}
      {currentRole !== 'RECEP' && (
        <AnamnesisSummaryCard patientId={patientId} currentRole={currentRole} />
      )}

      {/* Next Appointment */}
      {summaryCards.nextAppointment ? (
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Próxima Cita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="font-medium text-base">{summaryCards.nextAppointment.date}</p>
                <p className="text-sm text-muted-foreground">
                  {summaryCards.nextAppointment.time}
                </p>
              </div>
              <p className="text-sm">{summaryCards.nextAppointment.professional}</p>
              {summaryCards.nextAppointment.consultorio && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground cursor-help">
                      {summaryCards.nextAppointment.consultorio}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Consultorio</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Badge variant="outline" className="text-xs">
                {summaryCards.nextAppointment.type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Próxima Cita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Sin citas programadas</p>
          </CardContent>
        </Card>
      )}

      {/* Last Visit */}
      {summaryCards.lastVisit && (
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              Última Visita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">{summaryCards.lastVisit.date}</p>
              <p className="text-sm text-muted-foreground">
                {summaryCards.lastVisit.professional}
              </p>
              <Badge variant="outline" className="text-xs">
                {summaryCards.lastVisit.type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total visitas</span>
            <span className="font-medium">{summaryCards.statistics.totalVisits}</span>
          </div>
          {summaryCards.statistics.noShows > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Inasistencias
              </span>
              <span className="font-medium text-destructive">
                {summaryCards.statistics.noShows}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Este año</span>
            <span className="font-medium">
              {summaryCards.statistics.completedThisYear}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Treatment Plans - Clinical only */}
      {currentRole !== 'RECEP' && summaryCards.activeTreatmentPlans ? (
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-600" />
              Planes Activos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Planes</span>
              <span className="font-medium">
                {summaryCards.activeTreatmentPlans.count}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span>
                  {summaryCards.activeTreatmentPlans.completedSteps}/
                  {summaryCards.activeTreatmentPlans.totalSteps}
                </span>
              </div>
              <Progress
                value={
                  (summaryCards.activeTreatmentPlans.completedSteps /
                    summaryCards.activeTreatmentPlans.totalSteps) *
                  100
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : currentRole === 'RECEP' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Planes de Tratamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RestrictedSection message="Información clínica restringida" />
          </CardContent>
        </Card>
      ) : null}

      {/* Consent Status */}
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-amber-600" />
            Consentimientos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Activos</span>
            <span className="font-medium">
              {summaryCards.consentStatus.activeCount}
            </span>
          </div>
          {summaryCards.consentStatus.expiringSoonCount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Por vencer
              </span>
              <span className="font-medium text-amber-600">
                {summaryCards.consentStatus.expiringSoonCount}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Summary - Clinical only */}
      {currentRole !== 'RECEP' && (
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Resumen de Riesgos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {riskFlags.hasAllergies && (
              <div className="flex items-center justify-between">
                <span>Alergias</span>
                <Badge variant={riskFlags.highSeverityAllergies > 0 ? 'destructive' : 'secondary'} className="text-xs">
                  {riskFlags.allergyCount}
                </Badge>
              </div>
            )}
            {riskFlags.hasChronicDiseases && (
              <div className="flex items-center justify-between">
                <span>Enfermedades crónicas</span>
                <Badge variant="secondary" className="text-xs">
                  Sí
                </Badge>
              </div>
            )}
            {riskFlags.currentMedicationsCount > 0 && (
              <div className="flex items-center justify-between">
                <span>Medicación actual</span>
                <Badge variant="secondary" className="text-xs">
                  {riskFlags.currentMedicationsCount}
                </Badge>
              </div>
            )}
            {!riskFlags.hasAllergies && 
             !riskFlags.hasChronicDiseases && 
             riskFlags.currentMedicationsCount === 0 && (
              <p className="text-muted-foreground">Sin riesgos identificados</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
