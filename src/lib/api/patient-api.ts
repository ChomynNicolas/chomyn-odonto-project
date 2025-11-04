// API client for patient data

import type { PatientRecord, PatientKPIs, AuditEntry } from "@/lib/types/patient"
import { mapFichaToPatientRecord } from "../mappers/patient";
import { PacienteFichaCompletaDTO } from "@/app/api/pacientes/[id]/_dto";

interface FetchOptions extends RequestInit {
  etag?: string
}

/**
 * Fetch patient record by ID
 */
export async function fetchPatientRecord(
  id: string,
  options?: FetchOptions,
): Promise<{ data: PatientRecord; etag?: string }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.etag && { "If-None-Match": options.etag }),
  }

  const res = await fetch(`/api/pacientes/${id}`, { ...options, headers, cache: "no-store" })
  if (!res.ok) {
    if (res.status === 304) throw new Error("NOT_MODIFIED")
    throw new Error(`Failed to fetch patient: ${res.statusText}`)
  }

  const raw = (await res.json()) as { ok: boolean; data: PacienteFichaCompletaDTO }
  const etag = res.headers.get("ETag") || undefined

  // ✨ normalizamos aquí
  const normalized = mapFichaToPatientRecord(raw.data)
  return { data: normalized, etag }
}

/**
 * Calculate patient KPIs
 */
export function calculatePatientKPIs(patient: PatientRecord): PatientKPIs {
  const asArray = <T>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);

  // Normalizaciones defensivas
  const appointments = asArray(patient.appointments);
  const attachments  = asArray(patient.attachments);
  const diagnoses    = asArray(patient.diagnoses);
  const allergies    = asArray(patient.allergies);
  const medications  = asArray(patient.medications);

  const now = new Date();

  // Ordenar sin mutar
  const sortedAppointments = appointments
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const nextAppointment = sortedAppointments.find(
    (apt) => new Date(apt.scheduledAt) > now && apt.status !== "CANCELLED",
  );

  const lastAppointment = sortedAppointments
    .slice()
    .reverse()
    .find((apt) => new Date(apt.scheduledAt) < now && apt.status === "COMPLETED");

  const recentEvents = [
    ...appointments.slice(-5).map((apt) => ({
      id: apt.id,
      type: "appointment" as const,
      date: apt.scheduledAt,
      description: `Cita con ${apt.professional?.firstName ?? ""} ${apt.professional?.lastName ?? ""}`.trim(),
    })),
    ...attachments.slice(-5).map((att) => ({
      id: att.id,
      type: "attachment" as const,
      date: att.uploadedAt,
      description: `Adjunto: ${att.fileName}`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return {
    totalAppointments: appointments.length,
    totalAttachments: attachments.length,
    activeDiagnoses: diagnoses.filter((d) => d.status === "ACTIVE").length,
    activeAllergies: allergies.length,
    activeMedications: medications.filter((m) => m.status === "ACTIVE").length,
    nextAppointment,
    lastAppointment,
    recentEvents,
  };
}


/**
 * Update patient data
 */
export async function updatePatientData(
  id: string,
  data: Partial<PatientRecord>,
  etag?: string,
): Promise<{ data: PatientRecord; etag?: string }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(etag && { "If-Match": etag }),
  }

  const response = await fetch(`/api/pacientes/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
    cache: "no-store",
  })

  if (!response.ok) {
    if (response.status === 412) {
      throw new Error("VERSION_CONFLICT")
    }
    throw new Error(`Failed to update patient: ${response.statusText}`)
  }

  const updatedData = await response.json()
  const newEtag = response.headers.get("ETag") || undefined

  return { data: updatedData, etag: newEtag }
}

/**
 * Fetch audit log
 */
export async function fetchAuditLog(patientId: string): Promise<AuditEntry[]> {
  const response = await fetch(`/api/pacientes/${patientId}/audit`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch audit log: ${response.statusText}`)
  }

  return response.json()
}
