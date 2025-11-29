// Hook for smart auto-population from previous anamnesis

import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import type { AnamnesisCreateUpdateBody } from '@/app/api/pacientes/[id]/anamnesis/_schemas';
import type { AnamnesisResponse } from '@/app/api/pacientes/[id]/anamnesis/_schemas';

interface UseAnamnesisAutoPopulateOptions {
  form: UseFormReturn<AnamnesisCreateUpdateBody>;
  previousAnamnesis: AnamnesisResponse | null;
  onConfirm?: (fields: string[]) => Promise<boolean>;
}

export function useAnamnesisAutoPopulate({
  form,
  previousAnamnesis,
  onConfirm,
}: UseAnamnesisAutoPopulateOptions) {
  // Identify stable vs variable fields
  const stableFields = [
    'tieneEnfermedadesCronicas',
    'antecedents',
    'tieneAlergias',
    'allergies',
    'tieneMedicacionActual',
    'medications',
    'expuestoHumoTabaco',
    'bruxismo',
    'higieneCepilladosDia',
    'usaHiloDental',
    'tieneHabitosSuccion',
    'lactanciaRegistrada',
  ];

  const variableFields = [
    // motivoConsulta removed - it's now in consulta, not anamnesis
    'tieneDolorActual',
    'dolorIntensidad',
    'urgenciaPercibida',
    'ultimaVisitaDental',
  ];

  const autoPopulateStable = useCallback(async () => {
    if (!previousAnamnesis) return;

    const fieldsToPopulate: string[] = [];

    // Populate stable fields
    if (previousAnamnesis.tieneEnfermedadesCronicas) {
      form.setValue('tieneEnfermedadesCronicas', true);
      fieldsToPopulate.push('tieneEnfermedadesCronicas');
    }

    if (previousAnamnesis.antecedents && previousAnamnesis.antecedents.length > 0) {
      form.setValue(
        'antecedents',
        previousAnamnesis.antecedents.map((ant) => ({
          antecedentId: ant.antecedentId ?? undefined,
          customName: ant.customName ?? undefined,
          customCategory: ant.customCategory ?? undefined,
          notes: ant.notes ?? undefined,
          diagnosedAt: ant.diagnosedAt ?? undefined,
          isActive: ant.isActive,
          resolvedAt: ant.resolvedAt ?? undefined,
        }))
      );
      fieldsToPopulate.push('antecedents');
    }

    if (previousAnamnesis.tieneAlergias) {
      form.setValue('tieneAlergias', true);
      fieldsToPopulate.push('tieneAlergias');
    }

    if (previousAnamnesis.allergies && previousAnamnesis.allergies.length > 0) {
      form.setValue(
        'allergies',
        previousAnamnesis.allergies
          .filter((a) => a.allergy.isActive)
          .map((a) => ({
            allergyId: a.allergyId,
            severity: a.allergy.severity,
            reaction: a.allergy.reaction ?? undefined,
            isActive: a.allergy.isActive,
          }))
      );
      fieldsToPopulate.push('allergies');
    }

    if (previousAnamnesis.tieneMedicacionActual) {
      form.setValue('tieneMedicacionActual', true);
      fieldsToPopulate.push('tieneMedicacionActual');
    }

    if (previousAnamnesis.medications && previousAnamnesis.medications.length > 0) {
      form.setValue(
        'medications',
        previousAnamnesis.medications
          .filter((m) => m.medication.isActive)
          .map((m) => ({
            medicationId: m.medicationId,
            isActive: m.medication.isActive,
          }))
      );
      fieldsToPopulate.push('medications');
    }

    // Hygiene and habits
    if (previousAnamnesis.expuestoHumoTabaco !== null) {
      form.setValue('expuestoHumoTabaco', previousAnamnesis.expuestoHumoTabaco);
      fieldsToPopulate.push('expuestoHumoTabaco');
    }

    if (previousAnamnesis.bruxismo !== null) {
      form.setValue('bruxismo', previousAnamnesis.bruxismo);
      fieldsToPopulate.push('bruxismo');
    }

    if (previousAnamnesis.higieneCepilladosDia !== null) {
      form.setValue('higieneCepilladosDia', previousAnamnesis.higieneCepilladosDia);
      fieldsToPopulate.push('higieneCepilladosDia');
    }

    if (previousAnamnesis.usaHiloDental !== null) {
      form.setValue('usaHiloDental', previousAnamnesis.usaHiloDental);
      fieldsToPopulate.push('usaHiloDental');
    }

    return fieldsToPopulate;
  }, [form, previousAnamnesis]);

  const autoPopulateVariable = useCallback(async (fields?: string[]) => {
    if (!previousAnamnesis) return;

    const fieldsToPopulate = fields || variableFields;
    const confirmedFields: string[] = [];

    if (onConfirm) {
      const confirmed = await onConfirm(fieldsToPopulate);
      if (!confirmed) return [];
    }

    // Populate variable fields
    // motivoConsulta removed - it's now in consulta, not anamnesis

    if (fieldsToPopulate.includes('tieneDolorActual')) {
      form.setValue('tieneDolorActual', previousAnamnesis.tieneDolorActual);
      confirmedFields.push('tieneDolorActual');
    }

    if (fieldsToPopulate.includes('dolorIntensidad') && previousAnamnesis.dolorIntensidad !== null) {
      form.setValue('dolorIntensidad', previousAnamnesis.dolorIntensidad);
      confirmedFields.push('dolorIntensidad');
    }

    if (fieldsToPopulate.includes('urgenciaPercibida') && previousAnamnesis.urgenciaPercibida) {
      form.setValue('urgenciaPercibida', previousAnamnesis.urgenciaPercibida);
      confirmedFields.push('urgenciaPercibida');
    }

    if (fieldsToPopulate.includes('ultimaVisitaDental') && previousAnamnesis.ultimaVisitaDental) {
      form.setValue('ultimaVisitaDental', previousAnamnesis.ultimaVisitaDental);
      confirmedFields.push('ultimaVisitaDental');
    }

    return confirmedFields;
  }, [form, previousAnamnesis, onConfirm]);

  const autoPopulateAll = useCallback(async () => {
    const stable = await autoPopulateStable();
    const variable = await autoPopulateVariable();
    return [...(stable || []), ...(variable || [])];
  }, [autoPopulateStable, autoPopulateVariable]);

  return {
    autoPopulateStable,
    autoPopulateVariable,
    autoPopulateAll,
    stableFields,
    variableFields,
  };
}

