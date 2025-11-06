// src/lib/mappers/patient.ts
import type { PacienteFichaCompletaDTO, CitaLite } from "@/app/api/pacientes/[id]/_dto"
import type {
  OdontogramSnapshot,
  PatientRecord,
  PeriodontogramSnapshot,
  ToothCondition,
  ToothRecord,
  VitalSigns,
} from "@/lib/types/patient"

function mapPeriodontogramFromDTO(dto: PacienteFichaCompletaDTO): PeriodontogramSnapshot[] {
  const p = dto.periodontograma?.ultimo
  if (!p) return []

  const measurements = (p.measures ?? []).map((m) => ({
    toothNumber: String(m.toothNumber),
    site: m.site, // "B" | "MB" | "DB" | ...
    probingDepth: m.probingDepthMm ?? undefined, // UI espera probingDepth
    recession: undefined, // si no tienes ese dato
    bleeding: m.bleeding ? m.bleeding !== "NONE" : undefined, // string -> boolean
    plaque: m.plaque ?? undefined, // ya es boolean/null
  }))

  return [
    {
      id: String(p.id),
      recordedAt: p.takenAt, // takenAt -> recordedAt
      measurements,
      notes: undefined,
    },
  ]
}

// prioridad clínica para colapsar múltiples condiciones por diente
const CONDITION_PRIORITY: ToothCondition[] = [
  "MISSING",
  "IMPLANT",
  "ROOT_CANAL",
  "FRACTURED",
  "CROWN",
  "CARIES",
  "FILLED",
  "INTACT",
]

function pickCondition(conds: string[]): ToothCondition {
  // toma la condición "más severa" según prioridad
  for (const c of CONDITION_PRIORITY) if (conds.includes(c)) return c
  // si viene algo no esperado, cae a "INTACT"
  return "INTACT"
}

function mapOdontogramFromDTO(dto: PacienteFichaCompletaDTO): OdontogramSnapshot[] {
  const u = dto.odontograma?.ultimo
  if (!u) return []

  // Agrupar por diente
  const grouped = new Map<number, { conditions: string[]; surfaces: string[]; notes: string[] }>()
  for (const e of u.entries ?? []) {
    const tn = Number(e.toothNumber)
    if (!grouped.has(tn)) grouped.set(tn, { conditions: [], surfaces: [], notes: [] })
    const g = grouped.get(tn)!
    if (e.condition) g.conditions.push(e.condition)
    if (e.surface) g.surfaces.push(e.surface)
    if (e.notes) g.notes.push(e.notes)
  }

  const teeth: ToothRecord[] = Array.from(grouped.entries()).map(([toothNumber, g]) => ({
    toothNumber: String(toothNumber),
    condition: pickCondition(g.conditions),
    surfaces: g.surfaces.length ? Array.from(new Set(g.surfaces)) : undefined,
    notes: g.notes.length ? g.notes.join(" | ") : undefined,
  }))

  const snapshot: OdontogramSnapshot = {
    id: String(u.id),
    recordedAt: u.takenAt, // takenAt → recordedAt
    teeth,
    notes: undefined,
  }

  return [snapshot]
}

function splitApellidos(raw?: string | null): { lastName: string; secondLastName?: string } {
  const parts = (raw ?? "").trim().split(/\s+/).filter(Boolean)
  const lastName = parts.shift() ?? ""
  const secondLastName = parts.length ? parts.join(" ") : undefined
  return { lastName, secondLastName }
}

const splitNombre = (nombreApellido?: string) => {
  if (!nombreApellido) return undefined
  const [first, ...rest] = nombreApellido.trim().split(/\s+/)
  return { firstName: first ?? "", lastName: rest.join(" ") || undefined }
}

function mapVital(v: any): VitalSigns {
  return {
    id: v.id,
    recordedAt: v.measuredAt, // <- renombrado
    height: v.heightCm ?? null,
    weight: v.weightKg ?? null,
    bmi: v.bmi ?? null,
    systolicBP: v.bpSyst ?? null,
    diastolicBP: v.bpDiast ?? null,
    heartRate: v.heartRate ?? null,
    temperature: v.temperature ?? null,
    notes: v.notes ?? null,
    // si el backend aún no manda createdBy, quedará undefined (UI ya es defensiva)
    recordedBy: v.createdBy?.nombreApellido ? splitNombre(v.createdBy.nombreApellido) : undefined,
  }
}

export function mapVitalsFromDTO(dto: PacienteFichaCompletaDTO): VitalSigns[] {
  const arr: VitalSigns[] = []
  const ultimo = dto.clinico.vitales.ultimo
    ? mapVital({
        ...dto.clinico.vitales.ultimo,
        createdBy: dto.clinico.vitales.ultimo.createdBy, // si lo agregas en backend
      })
    : null

  if (ultimo) arr.push(ultimo)

  for (const v of dto.clinico.vitales.historial ?? []) {
    arr.push(mapVital(v))
  }

  return arr
}

function citaLiteToAppointment(c: CitaLite) {
  const [pf, ...pl] = (c.profesional?.nombre ?? "").trim().split(/\s+/)
  return {
    id: c.idCita,
    scheduledAt: c.inicio,
    status: c.estado,
    professional: {
      id: c.profesional.idProfesional,
      firstName: pf ?? "",
      lastName: pl.join(" "),
    },
    room: c.consultorio ? { id: c.consultorio.idConsultorio, name: c.consultorio.nombre } : undefined,
  }
}

export function mapFichaToPatientRecord(dto: PacienteFichaCompletaDTO): PatientRecord {
  const firstName = (dto.persona.nombres ?? "").trim()
  const { lastName, secondLastName } = splitApellidos(dto.persona.apellidos)

  // appointments: combinar proxima + proximasSemana + ultimas
  const appointments = [
    ...(dto.citas.proxima ? [dto.citas.proxima] : []),
    ...dto.citas.proximasSemana,
    ...dto.citas.ultimas,
  ].map(citaLiteToAppointment)

  const attachments = dto.adjuntos.recientes.map((a) => ({
    id: a.id,
    type: a.tipo,
    fileName: a.descripcion ?? a.tipo,
    uploadedAt: a.createdAt,
    url: a.secureUrl,
    thumbnailUrl: a.thumbnailUrl ?? undefined,
  }))

  const allergies = dto.clinico.alergias.map((x) => ({
    id: x.id,
    allergen: x.label,
    label: x.label,
    severity: x.severity as any,
    reaction: x.reaction ?? undefined,
    isActive: x.isActive,
    diagnosedAt: x.notedAt,
    notedAt: x.notedAt,
  }))

  const medications = dto.clinico.medicacion.map((m) => ({
    id: m.id,
    name: m.label,
    label: m.label,
    dosage: m.dose ?? undefined,
    dose: m.dose ?? undefined,
    frequency: m.freq ?? undefined,
    freq: m.freq ?? undefined,
    route: m.route ?? undefined,
    startedAt: m.startAt ?? undefined,
    startAt: m.startAt ?? undefined,
    endedAt: m.endAt ?? undefined,
    endAt: m.endAt ?? undefined,
    status: m.isActive ? "ACTIVE" : "INACTIVE",
  }))

  const diagnoses = dto.clinico.diagnosticos.map((d) => ({
    id: d.id,
    code: d.code ?? undefined,
    label: d.label,
    status: d.status, // ACTIVE | RESOLVED | ...
    diagnosedAt: d.notedAt, // <- renombramos aquí
    resolvedAt: d.resolvedAt ?? undefined,
    notes: d.notes ?? undefined,
    professional: undefined, // <- por ahora no disponible en tu DTO
  }))

  // vitales: opcional – compactamos “último” primero
  const vitalSigns = mapVitalsFromDTO(dto)

  const treatmentPlans = [
    ...(dto.planes.activo
      ? [
          {
            id: dto.planes.activo.id,
            title: dto.planes.activo.titulo,
            description: dto.planes.activo.descripcion ?? undefined,
            isActive: true,
            createdAt: dto.planes.activo.createdAt,
            steps: dto.planes.activo.pasos.map((s) => ({
              id: s.id,
              order: s.order,
              serviceType: s.serviceType ?? undefined,
              toothNumber: s.toothNumber ?? undefined,
              status: s.status,
              estimatedCostCents: s.estimatedCostCents ?? undefined,
              notes: s.notes ?? undefined,
            })),
          },
        ]
      : []),
    // historial (sin duplicar el activo)
    ...dto.planes.historial
      .filter((h) => !dto.planes.activo || h.id !== dto.planes.activo.id)
      .map((h) => ({
        id: h.id,
        title: h.titulo,
        isActive: h.isActive,
        createdAt: h.createdAt,
        steps: [] as any[],
      })),
  ]

  return {
    // Demográficos base
    id: dto.idPaciente,
    status: dto.estaActivo ? "ACTIVE" : "INACTIVE",
    firstName,
    lastName,
    secondLastName,
    dateOfBirth: dto.persona.fechaNacimiento ?? undefined,
    gender: dto.persona.genero ?? "NO_ESPECIFICADO",
    address: dto.persona.direccion ?? undefined,
    city: undefined,
    documentNumber: dto.persona.documento?.numero,

    // Contacto / responsables
    contacts: dto.persona.contactos.map((c) => ({
      type: c.tipo,
      value: c.valorNorm,
      label: c.label ?? undefined,
      isPrimary: c.esPrincipal,
      isActive: c.activo,
    })),
    responsibleParties: dto.responsables.map((r) => ({
      id: r.idPacienteResponsable,
      relation: r.relacion,
      isPrimary: r.esPrincipal,
      legalAuthority: r.autoridadLegal,
      person: {
        id: r.persona.idPersona,
        fullName: r.persona.nombreCompleto,
        doc: r.persona.documento ?? undefined,
        mainContact: r.persona.contactoPrincipal ?? undefined,
      },
    })),

    // Clínico
    allergies,
    medications,
    diagnoses,
    vitalSigns,
    treatmentPlans,
    odontogramSnapshots: mapOdontogramFromDTO(dto),
    periodontogramSnapshots: mapPeriodontogramFromDTO(dto),

    // Adjuntos y Citas
    attachments,
    appointments,
  }
}
