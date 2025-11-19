// Patient header with identity and risk flags

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Phone, Mail, MapPin, FileText, Calendar, MoreVertical, AlertTriangle, Pill, Activity, Baby } from 'lucide-react';
import type { PatientIdentityDTO, ContactInfoDTO, RiskFlagsDTO, RolNombre } from '@/types/patient';
import { PatientRiskBanner } from './shared/PatientRiskBanner';
import { AnamnesisStatusBadge } from './shared/AnamnesisStatusBadge';
import { AnamnesisQuickIndicators } from './shared/AnamnesisQuickIndicators';
import { usePatientAnamnesis } from '@/lib/hooks/use-patient-anamnesis';

interface PatientHeaderProps {
  patient: PatientIdentityDTO;
  contacts: ContactInfoDTO;
  riskFlags: RiskFlagsDTO;
  currentRole: RolNombre;
  patientId: number;
}

export function PatientHeader({
  patient,
  contacts,
  riskFlags,
  currentRole,
  patientId,
}: PatientHeaderProps) {
  const { data: anamnesis, isLoading: isLoadingAnamnesis } = usePatientAnamnesis(patientId);

  return (
    <div className="sticky top-0 z-10 bg-background pb-4">
      {/* Risk Banner - shown prominently for high-severity risks */}
      {currentRole !== 'RECEP' && <PatientRiskBanner riskFlags={riskFlags} />}
      
      <Card className="p-6 shadow-sm">
      <div className="flex items-start justify-between">
        {/* Left: Identity */}
        <div className="flex items-start gap-4 flex-1">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2 flex-1">
            <div>
              <h1 className="text-2xl font-bold text-balance">{patient.fullName}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                {patient.age && <span>{patient.age} años</span>}
                {patient.gender && <span>{patient.gender}</span>}
                {patient.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {patient.city}
                  </span>
                )}
              </div>
            </div>

            {/* Document & Contact */}
            <div className="flex items-center gap-4 text-sm">
              {patient.document && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {patient.document.type} {patient.document.number}
                </span>
              )}
              {contacts.primaryPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {contacts.primaryPhone}
                </span>
              )}
              {contacts.primaryEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {contacts.primaryEmail}
                </span>
              )}
            </div>

            {/* Anamnesis Status & Quick Indicators - Clinical roles only */}
            {currentRole !== 'RECEP' && (
              <div className="flex flex-wrap items-center gap-2">
                <AnamnesisStatusBadge anamnesis={anamnesis || null} isLoading={isLoadingAnamnesis} />
                {anamnesis && <AnamnesisQuickIndicators anamnesis={anamnesis} compact />}
              </div>
            )}

            {/* Risk Flags */}
            <div className="flex flex-wrap gap-2">
              {riskFlags.hasAllergies && (
                <Badge
                  variant={riskFlags.highSeverityAllergies > 0 ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {riskFlags.allergyCount} Alergia{riskFlags.allergyCount > 1 ? 's' : ''}
                </Badge>
              )}
              {riskFlags.hasChronicDiseases && (
                <Badge variant="secondary" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Enfermedad Crónica
                </Badge>
              )}
              {riskFlags.currentMedicationsCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Pill className="h-3 w-3 mr-1" />
                  {riskFlags.currentMedicationsCount} Medicamento{riskFlags.currentMedicationsCount > 1 ? 's' : ''}
                </Badge>
              )}
              {riskFlags.isPregnant && (
                <Badge variant="secondary" className="text-xs">
                  <Baby className="h-3 w-3 mr-1" />
                  Embarazada
                </Badge>
              )}
              {riskFlags.urgencyLevel && riskFlags.urgencyLevel !== 'RUTINA' && (
                <Badge variant="destructive" className="text-xs">
                  {riskFlags.urgencyLevel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(currentRole === 'ADMIN' || currentRole === 'RECEP') && (
              <>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Editar Paciente
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Cita
                </DropdownMenuItem>
              </>
            )}
            {(currentRole === 'ADMIN' || currentRole === 'ODONT') && (
              <DropdownMenuItem>
                <Activity className="h-4 w-4 mr-2" />
                Iniciar Consulta
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
    </div>
  );
}
