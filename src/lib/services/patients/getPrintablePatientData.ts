// src/lib/services/patients/getPrintablePatientData.ts
"use server"

import { prisma as db } from "@/lib/prisma"
import {
  AllergySeverityEnum,
  DiagnosisStatusEnum,
  EstadoCitaEnum,
  GeneroEnum,
  PrintablePatientSchema,
  stripClinicalSectionsForLimitedScope,
  TipoDocumentoEnum,
  TreatmentStepStatusEnum,
  type PrintablePatientDTO,
} from "@/lib/validators/patient-print.schema"
import { calculateAge } from "@/lib/utils/patient-helpers"
import type { AllergySeverity, DiagnosisStatus, EstadoCita, Genero, TipoDocumento, TreatmentStepStatus } from "@prisma/client"

export type AccessScope = "FULL" | "LIMITED"

type Options = {
  scope?: AccessScope // si viene "LIMITED" se sanea el DTO antes de devolver
}

/**
 * Devuelve un DTO validado (Zod) con lo mínimo necesario para la impresión.
 * Sólo hace selects específicos para evitar arrastrar PHI innecesaria.
 */
export async function getPrintablePatientData(patientId: number, opts: Options = {}): Promise<PrintablePatientDTO> {
  if (!Number.isFinite(patientId)) {
    throw Object.assign(new Error("Parámetro inválido: patientId"), { status: 400 })
  }

  // === 1) Query principal con selects mínimos ===
  const patient = await db.paciente.findUnique({
    where: { idPaciente: patientId },
    select: {
      idPaciente: true,
      estaActivo: true,
      persona: {
        select: {
          nombres: true,
          apellidos: true,
          fechaNacimiento: true,
          genero: true,
          direccion: true,
          documento: {
            select: {
              tipo: true,
              numero: true,
              paisEmision: true,
              ruc: true,
            },
          },
          contactos: {
            where: { activo: true },
            select: {
              tipo: true,
              valorNorm: true,
              label: true,
              esPrincipal: true,
            },
            orderBy: [{ esPrincipal: "desc" }],
          },
        },
      },

      // Últimas 5 citas (ordenadas por inicio desc)
      citas: {
        orderBy: { inicio: "desc" },
        take: 5,
        select: {
          idCita: true,
          inicio: true,
          fin: true,
          estado: true,
          motivo: true,
          profesional: {
            select: {
              persona: { select: { nombres: true, apellidos: true } },
            },
          },
          consultorio: { select: { nombre: true } },
        },
      },

      // Clínico (puede ocultarse según alcance)
      PatientAllergy: {
        where: { isActive: true },
        orderBy: { notedAt: "desc" },
        select: {
          idPatientAllergy: true,
          label: true,
          reaction: true,
          severity: true,
          notedAt: true,
          allergyCatalog: { select: { name: true } },
        },
      },
      PatientDiagnosis: {
        where: { status: "ACTIVE" },
        orderBy: { notedAt: "desc" },
        select: {
          idPatientDiagnosis: true,
          label: true,
          code: true,
          status: true,
          notedAt: true,
          resolvedAt: true,
          notes: true,
          diagnosisCatalog: { select: { name: true } },
        },
      },
      PatientMedication: {
        where: { isActive: true },
        orderBy: { startAt: "desc" },
        select: {
          idPatientMedication: true,
          label: true,
          dose: true,
          freq: true,
          route: true,
          startAt: true,
          endAt: true,
          isActive: true,
          medicationCatalog: { select: { name: true } },
        },
      },
      PatientVitals: {
        orderBy: { measuredAt: "desc" },
        take: 1,
        select: {
          measuredAt: true,
          heightCm: true,
          weightKg: true,
          bmi: true,
          bpSyst: true,
          bpDiast: true,
          heartRate: true,
          notes: true,
        },
      },
      TreatmentPlan: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          idTreatmentPlan: true,
          titulo: true,
          descripcion: true,
          isActive: true,
          steps: {
            orderBy: { order: "asc" },
            select: {
              idTreatmentStep: true,
              order: true,
              serviceType: true,
              toothNumber: true,
              toothSurface: true,
              status: true,
              procedimientoCatalogo: {
                select: { nombre: true },
              },
            },
          },
        },
      },
    },
  })

  if (!patient) {
    throw Object.assign(new Error("Paciente no encontrado"), { status: 404 })
  }

  // === 2) Post-proceso (derivados y contactos principales) ===
  const persona = patient.persona
  const firstName = persona.nombres
  const lastName = persona.apellidos
  const fullName = [firstName, lastName].filter(Boolean).join(" ")
  const age = persona.fechaNacimiento ? calculateAge(persona.fechaNacimiento.toISOString?.() ?? String(persona.fechaNacimiento)) : null

  const primaryPhone =
    persona.contactos.find(c => c.tipo === "PHONE" && c.esPrincipal) ??
    persona.contactos.find(c => c.tipo === "PHONE")

  const primaryEmail =
    persona.contactos.find(c => c.tipo === "EMAIL" && c.esPrincipal) ??
    persona.contactos.find(c => c.tipo === "EMAIL")

  const vital = patient.PatientVitals[0] ?? null
  const plan = patient.TreatmentPlan[0] ?? null

  // === Helper functions for type mapping ===
  const mapGenero = (genero: Genero | null): (typeof GeneroEnum.enum)[keyof typeof GeneroEnum.enum] | null => {
    if (!genero) return null
    const validGeneros: Genero[] = ["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]
    if (validGeneros.includes(genero)) {
      return genero as (typeof GeneroEnum.enum)[keyof typeof GeneroEnum.enum]
    }
    return null
  }

  const mapTipoDocumento = (tipo: TipoDocumento): (typeof TipoDocumentoEnum.enum)[keyof typeof TipoDocumentoEnum.enum] => {
    const validTipos: TipoDocumento[] = ["CI", "DNI", "PASAPORTE", "RUC", "OTRO"]
    if (validTipos.includes(tipo)) {
      return tipo as (typeof TipoDocumentoEnum.enum)[keyof typeof TipoDocumentoEnum.enum]
    }
    return "OTRO"
  }

  const mapAllergySeverity = (severity: AllergySeverity): (typeof AllergySeverityEnum.enum)[keyof typeof AllergySeverityEnum.enum] => {
    const validSeverities: AllergySeverity[] = ["MILD", "MODERATE", "SEVERE"]
    if (validSeverities.includes(severity)) {
      return severity as (typeof AllergySeverityEnum.enum)[keyof typeof AllergySeverityEnum.enum]
    }
    return "MILD"
  }

  const mapDiagnosisStatus = (status: DiagnosisStatus): (typeof DiagnosisStatusEnum.enum)[keyof typeof DiagnosisStatusEnum.enum] => {
    const validStatuses: DiagnosisStatus[] = ["ACTIVE", "RESOLVED", "RULED_OUT"]
    if (validStatuses.includes(status)) {
      return status as (typeof DiagnosisStatusEnum.enum)[keyof typeof DiagnosisStatusEnum.enum]
    }
    return "ACTIVE"
  }

  const mapTreatmentStepStatus = (status: TreatmentStepStatus): (typeof TreatmentStepStatusEnum.enum)[keyof typeof TreatmentStepStatusEnum.enum] => {
    const validStatuses: TreatmentStepStatus[] = ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DEFERRED"]
    if (validStatuses.includes(status)) {
      return status as (typeof TreatmentStepStatusEnum.enum)[keyof typeof TreatmentStepStatusEnum.enum]
    }
    return "PENDING"
  }

  const mapEstadoCita = (estado: EstadoCita): (typeof EstadoCitaEnum.enum)[keyof typeof EstadoCitaEnum.enum] => {
    const validEstados: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]
    if (validEstados.includes(estado)) {
      return estado as (typeof EstadoCitaEnum.enum)[keyof typeof EstadoCitaEnum.enum]
    }
    return "SCHEDULED"
  }

  // === 3) Armar DTO (camelCase, sin datos sensibles redundantes) ===
  const dto: PrintablePatientDTO = {
    patient: {
      id: patient.idPaciente,
      active: patient.estaActivo,
      demographics: {
        firstName,
        lastName,
        birthDate: persona.fechaNacimiento ? new Date(persona.fechaNacimiento).toISOString() : null,
        age,
        gender: mapGenero(persona.genero),
        address: persona.direccion ?? null,
        document: persona.documento
          ? {
              tipo: mapTipoDocumento(persona.documento.tipo),
              numero: persona.documento.numero,
              paisEmision: persona.documento.paisEmision ?? null,
              ruc: persona.documento.ruc ?? null,
            }
          : null,
        contacts: {
          primaryPhone: primaryPhone
            ? {
                type: "PHONE",
                label: primaryPhone.label ?? null,
                valueNorm: primaryPhone.valorNorm,
                isPrimary: !!primaryPhone.esPrincipal,
              }
            : null,
          primaryEmail: primaryEmail
            ? {
                type: "EMAIL",
                label: primaryEmail.label ?? null,
                valueNorm: primaryEmail.valorNorm,
                isPrimary: !!primaryEmail.esPrincipal,
              }
            : null,
        },
        fullName,
      },
    },

    allergies: patient.PatientAllergy.map(a => ({
      id: a.idPatientAllergy,
      label: a.label ?? null,
      catalogName: a.allergyCatalog?.name ?? null,
      severity: mapAllergySeverity(a.severity),
      reaction: a.reaction ?? null,
      notedAt: new Date(a.notedAt).toISOString(),
    })),

    diagnoses: patient.PatientDiagnosis.map(d => ({
      id: d.idPatientDiagnosis,
      label: d.label,
      code: d.code ?? null,
      catalogName: d.diagnosisCatalog?.name ?? null,
      status: mapDiagnosisStatus(d.status),
      notedAt: new Date(d.notedAt).toISOString(),
      resolvedAt: d.resolvedAt ? new Date(d.resolvedAt).toISOString() : null,
      notes: d.notes ?? null,
    })),

    medications: patient.PatientMedication.map(m => ({
      id: m.idPatientMedication,
      label: m.label ?? null,
      catalogName: m.medicationCatalog?.name ?? null,
      dose: m.dose ?? null,
      freq: m.freq ?? null,
      route: m.route ?? null,
      startAt: m.startAt ? new Date(m.startAt).toISOString() : null,
      endAt: m.endAt ? new Date(m.endAt).toISOString() : null,
      isActive: m.isActive,
    })),

    vitalSigns: vital
      ? {
          measuredAt: new Date(vital.measuredAt).toISOString(),
          heightCm: vital.heightCm ?? null,
          weightKg: vital.weightKg ?? null,
          bmi: vital.bmi ?? null,
          bpSyst: vital.bpSyst ?? null,
          bpDiast: vital.bpDiast ?? null,
          heartRate: vital.heartRate ?? null,
          notes: vital.notes ?? null,
        }
      : null,

    treatmentPlan: plan
      ? {
          id: plan.idTreatmentPlan,
          title: plan.titulo,
          description: plan.descripcion ?? null,
          isActive: plan.isActive,
          steps: plan.steps.map(s => ({
            id: s.idTreatmentStep,
            order: s.order,
            procedureName: s.procedimientoCatalogo?.nombre ?? null,
            serviceType: s.serviceType ?? null,
            toothNumber: s.toothNumber ?? null,
            toothSurface: s.toothSurface ? String(s.toothSurface) : null,
            status: mapTreatmentStepStatus(s.status),
          })),
        }
      : null,

    appointments: patient.citas.map(c => ({
      id: c.idCita,
      scheduledAt: new Date(c.inicio).toISOString(),
      endAt: c.fin ? new Date(c.fin).toISOString() : null,
      status: mapEstadoCita(c.estado),
      reason: c.motivo ?? null,
      professional: {
        firstName: c.profesional.persona.nombres,
        lastName: c.profesional.persona.apellidos,
      },
      consultorioName: c.consultorio?.nombre ?? null,
    })),
  }

  // === 4) Validación runtime (Zod) ===
  const parsed = PrintablePatientSchema.parse(dto)

  // === 5) Alcance (ocultar secciones clínicas si LIMITED) ===
  if (opts.scope === "LIMITED") {
    return stripClinicalSectionsForLimitedScope(parsed)
  }

  return parsed
}
