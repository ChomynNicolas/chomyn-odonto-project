// src/lib/mappers/patient.ts
import type { PacienteFichaCompletaDTO } from "@/app/api/pacientes/[id]/_dto"
import type {
  AllergySeverity,
  AppointmentStatus,
  AttachmentType,
  ContactType,
  DiagnosisStatus,
  DocumentType,
  Gender,
  OdontogramSnapshot,
  PatientRecord,
  PeriodontogramSnapshot,
  RelationType,
  ToothCondition,
  ToothRecord,
  TreatmentPlan,
  TreatmentPlanStatus,
  TreatmentStep,
  TreatmentStepStatus,
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

// Type for vital signs from DTO
type VitalSignsDTO = {
  id: number
  measuredAt: string
  heightCm?: number | null
  weightKg?: number | null
  bmi?: number | null
  bpSyst?: number | null
  bpDiast?: number | null
  heartRate?: number | null
  temperature?: number | null
  notes?: string | null
}

function mapVital(v: VitalSignsDTO): VitalSigns {
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
    // recordedBy no está disponible en el DTO actual
    recordedBy: undefined,
  }
}

export function mapVitalsFromDTO(dto: PacienteFichaCompletaDTO): VitalSigns[] {
  const arr: VitalSigns[] = []
  const ultimo = dto.clinico.vitales.ultimo
    ? mapVital(dto.clinico.vitales.ultimo)
    : null

  if (ultimo) arr.push(ultimo)

  for (const v of dto.clinico.vitales.historial ?? []) {
    arr.push(mapVital(v))
  }

  return arr
}

// Helper function to map CitaLite or similar structure to Appointment
function citaLiteToAppointment(c: {
  idCita: number
  inicio: string
  fin: string
  estado: string
  profesional: { idProfesional: number; nombre: string }
  consultorio: { idConsultorio: number; nombre: string } | null
  motivo?: string | null
}) {
  const [pf, ...pl] = (c.profesional?.nombre ?? "").trim().split(/\s+/)
  
  // Calculate duration in minutes from inicio and fin
  const duration = c.inicio && c.fin
    ? Math.round((new Date(c.fin).getTime() - new Date(c.inicio).getTime()) / (1000 * 60))
    : 30 // Default to 30 minutes if not available
  
  // Map appointment status from string to AppointmentStatus
  const getAppointmentStatus = (estado: string): AppointmentStatus => {
    const statusMap: Record<string, AppointmentStatus> = {
      SCHEDULED: "SCHEDULED",
      CONFIRMED: "CONFIRMED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
      NO_SHOW: "NO_SHOW",
    }
    return statusMap[estado.toUpperCase()] ?? "SCHEDULED"
  }
  
  return {
    id: String(c.idCita),
    scheduledAt: c.inicio,
    duration,
    status: getAppointmentStatus(c.estado),
    notes: c.motivo ?? undefined, // Use motivo if available
    professional: {
      id: String(c.profesional.idProfesional),
      firstName: pf ?? "",
      lastName: pl.join(" "),
    },
    office: c.consultorio ? { id: String(c.consultorio.idConsultorio), name: c.consultorio.nombre } : undefined,
  }
}

export function mapFichaToPatientRecord(dto: PacienteFichaCompletaDTO): PatientRecord {
  const firstName = (dto.persona.nombres ?? "").trim()
  const lastName = (dto.persona.apellidos ?? "").trim()
  const secondLastName = dto.persona.segundoApellido ?? undefined // ⭐ Use segundoApellido from DTO

  // appointments: combinar proxima + proximasSemana + ultimas
  const appointments = [
    ...(dto.citas.proxima ? [dto.citas.proxima] : []),
    ...dto.citas.proximasSemana,
    ...dto.citas.ultimas,
  ].map(citaLiteToAppointment)

  // Helper to split nombreApellido
  const splitNombreApellido = (nombreApellido?: string | null) => {
    if (!nombreApellido) return { firstName: "", lastName: "" }
    const parts = nombreApellido.trim().split(/\s+/)
    const firstName = parts[0] ?? ""
    const lastName = parts.slice(1).join(" ") || ""
    return { firstName, lastName }
  }

  const attachments = dto.adjuntos.recientes.map((a) => {
    const { firstName, lastName } = splitNombreApellido(a.uploadedBy)
    // Determine MIME type from format and resourceType
    const getMimeType = (format?: string | null, resourceType?: string | null) => {
      if (format === "pdf") return "application/pdf"
      if (resourceType === "image") {
        if (format === "jpg" || format === "jpeg") return "image/jpeg"
        if (format === "png") return "image/png"
        if (format === "gif") return "image/gif"
        return "image/*"
      }
      if (resourceType === "video") return "video/*"
      return "application/octet-stream"
    }

    // Map tipo from string to AttachmentType
    const attachmentTypeMap: Record<string, AttachmentType> = {
      XRAY: "XRAY",
      INTRAORAL_PHOTO: "INTRAORAL_PHOTO",
      EXTRAORAL_PHOTO: "EXTRAORAL_PHOTO",
      IMAGE: "IMAGE",
      DOCUMENT: "DOCUMENT",
      PDF: "PDF",
      LAB_REPORT: "LAB_REPORT",
      OTHER: "OTHER",
    }
    const type: AttachmentType = attachmentTypeMap[a.tipo] ?? "OTHER"

    return {
      id: String(a.id),
      type, // Map from Prisma type to frontend type
      fileName: a.originalFilename || a.descripcion || `adjunto-${a.id}`,
      fileSize: a.bytes || 0,
      mimeType: getMimeType(a.format, a.resourceType),
      uploadedAt: a.createdAt,
      description: a.descripcion ?? undefined,
      secureUrl: a.secureUrl,
      thumbnailUrl: a.thumbnailUrl ?? undefined,
      uploadedBy: {
        firstName,
        lastName,
        fullName: a.uploadedBy || undefined,
      },
      width: a.width ?? undefined,
      height: a.height ?? undefined,
      format: a.format ?? undefined,
      publicId: a.publicId ?? undefined,
      resourceType: a.resourceType ?? undefined,
    }
  })

  // Map severity from string to AllergySeverity
  const severityMap: Record<string, AllergySeverity> = {
    MILD: "MILD",
    MODERATE: "MODERATE",
    SEVERE: "SEVERE",
  }
  const getSeverity = (severity: string): AllergySeverity => {
    return severityMap[severity] ?? "MILD"
  }

  const allergies = dto.clinico.alergias.map((x) => ({
    id: x.id,
    allergen: x.label,
    label: x.label,
    severity: getSeverity(x.severity),
    reaction: x.reaction ?? undefined,
    isActive: x.isActive,
    diagnosedAt: x.notedAt,
    notedAt: x.notedAt,
  }))

  // Map medication status: "INACTIVE" -> "SUSPENDED" to match MedicationStatus
  const getMedicationStatus = (isActive: boolean): "ACTIVE" | "SUSPENDED" | "COMPLETED" => {
    return isActive ? "ACTIVE" : "SUSPENDED"
  }

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
    status: getMedicationStatus(m.isActive),
  }))

  // Map diagnosis status from string to DiagnosisStatus
  const getDiagnosisStatus = (status: string): DiagnosisStatus => {
    const statusMap: Record<string, DiagnosisStatus> = {
      ACTIVE: "ACTIVE",
      RESOLVED: "RESOLVED",
      CHRONIC: "CHRONIC",
      MONITORING: "MONITORING",
      RULED_OUT: "RULED_OUT",
    }
    return statusMap[status.toUpperCase()] ?? "ACTIVE"
  }

  const diagnoses = dto.clinico.diagnosticos.map((d) => ({
    id: d.id,
    code: d.code ?? undefined,
    label: d.label,
    status: getDiagnosisStatus(d.status),
    diagnosedAt: d.notedAt, // <- renombramos aquí
    resolvedAt: d.resolvedAt ?? undefined,
    notes: d.notes ?? undefined,
    professional: undefined, // <- por ahora no disponible en tu DTO
  }))

  // vitales: opcional – compactamos “último” primero
  const vitalSigns = mapVitalsFromDTO(dto)

  // Map treatment plan status
  const getTreatmentPlanStatus = (isActive: boolean): TreatmentPlanStatus => {
    return isActive ? "ACTIVE" : "COMPLETED"
  }

  // Map treatment step status
  const getTreatmentStepStatus = (status: string): TreatmentStepStatus => {
    const statusMap: Record<string, TreatmentStepStatus> = {
      PENDING: "PENDING",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
    }
    return statusMap[status] ?? "PENDING"
  }

  const treatmentPlans: TreatmentPlan[] = [
    ...(dto.planes.activo
      ? [
          {
            id: String(dto.planes.activo.id),
            title: dto.planes.activo.titulo,
            status: "ACTIVE" as TreatmentPlanStatus,
            startDate: dto.planes.activo.createdAt,
            endDate: undefined,
            estimatedCost: undefined,
            steps: dto.planes.activo.pasos.map((s) => ({
              id: String(s.id),
              order: s.order,
              status: getTreatmentStepStatus(s.status),
              procedure: {
                code: s.serviceType ?? "",
                name: s.serviceType ?? "",
              },
              tooth: s.toothNumber ? String(s.toothNumber) : undefined,
              surface: undefined,
              notes: s.notes ?? undefined,
              estimatedCost: s.estimatedCostCents ? s.estimatedCostCents / 100 : undefined,
            })),
          },
        ]
      : []),
    // historial (sin duplicar el activo)
    ...dto.planes.historial
      .filter((h) => !dto.planes.activo || h.id !== dto.planes.activo.id)
      .map((h) => ({
        id: String(h.id),
        title: h.titulo,
        status: getTreatmentPlanStatus(h.isActive),
        startDate: h.createdAt,
        endDate: undefined,
        estimatedCost: undefined,
        steps: [] as TreatmentStep[],
      })),
  ]

  // Map gender from string to Gender type
  const genderMap: Record<string, Gender> = {
    MASCULINO: "MALE",
    FEMENINO: "FEMALE",
    OTRO: "OTHER",
    NO_ESPECIFICADO: "OTHER",
  }
  const gender: Gender = dto.persona.genero ? genderMap[dto.persona.genero] ?? "OTHER" : "OTHER"

  // Map document type
  const documentTypeMap: Record<string, DocumentType> = {
    CI: "CI",
    DNI: "CI",
    PASAPORTE: "PASSPORT",
    RUC: "RUC",
    OTRO: "OTHER",
  }
  const documentType: DocumentType | undefined = dto.persona.documento?.tipo
    ? documentTypeMap[dto.persona.documento.tipo] ?? "OTHER"
    : undefined

  return {
    // Demográficos base
    id: String(dto.idPaciente),
    status: dto.estaActivo ? "ACTIVE" : "INACTIVE",
    firstName,
    lastName,
    secondLastName,
    dateOfBirth: dto.persona.fechaNacimiento ?? "",
    gender,
    address: dto.persona.direccion ?? undefined,
    city: dto.persona.ciudad ?? undefined, // ⭐ Added
    documentType,
    documentNumber: dto.persona.documento?.numero,
    documentCountry: dto.persona.documento?.paisEmision ?? undefined, // ⭐ Added
    documentIssueDate: dto.persona.documento?.fechaEmision ?? undefined, // ⭐ Added
    documentExpiryDate: dto.persona.documento?.fechaVencimiento ?? undefined, // ⭐ Added
    ruc: dto.persona.documento?.ruc ?? undefined,
    country: dto.persona.pais ?? "PY", // ⭐ Added
    emergencyContactName: dto.persona.contactoEmergenciaNombre ?? undefined, // ⭐ Added
    emergencyContactPhone: dto.persona.contactoEmergenciaTelefono ?? undefined, // ⭐ Added
    emergencyContactRelation: dto.persona.contactoEmergenciaRelacion ?? undefined, // ⭐ Added
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,

    // Contacto / responsables
    contacts: dto.persona.contactos.map((c, index) => ({
      id: `contact-${dto.idPaciente}-${index}`, // Generate ID from index
      type: c.tipo as ContactType, // "PHONE" | "EMAIL" is compatible with ContactType
      value: c.valorNorm,
      isPrimary: c.esPrincipal,
      isWhatsAppCapable: c.whatsappCapaz ?? undefined,
      isSmsCapable: undefined, // Not available in DTO
      notes: c.label ?? undefined,
    })),
    responsibleParties: dto.responsables.map((r) => {
      // Split nombreCompleto into firstName and lastName
      const nombreParts = r.persona.nombreCompleto.trim().split(/\s+/)
      const firstName = nombreParts[0] ?? ""
      const lastName = nombreParts.slice(1).join(" ") || ""

      // Map document type
      const docType = r.persona.documento?.tipo
        ? documentTypeMap[r.persona.documento.tipo] ?? undefined
        : undefined

      return {
        id: String(r.idPacienteResponsable),
        relation: r.relacion as RelationType, // Cast to RelationType
        isPrimary: r.esPrincipal,
        hasLegalAuthority: r.autoridadLegal, // Changed from legalAuthority
        validFrom: r.vigenteDesde, // ⭐ Added
        validUntil: r.vigenteHasta ?? undefined, // ⭐ Added
        notes: r.notas ?? undefined, // ⭐ Added
        person: {
          firstName,
          lastName,
          documentType: docType,
          documentNumber: r.persona.documento?.numero,
          contacts: r.persona.contactos.map((c) => ({ // ⭐ Added: map contacts from DTO
            id: `contact-${r.idPacienteResponsable}-${c.tipo}-${c.valorNorm}`,
            type: c.tipo as ContactType,
            value: c.valorNorm,
            isPrimary: c.esPrincipal,
            notes: c.label ?? undefined,
          })),
        },
      }
    }),

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
