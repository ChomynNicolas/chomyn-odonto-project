// src/app/api/pacientes/[id]/_service.get.ts
import { fichaRepo } from "./_repo"
import {
  safeJsonParse,
  nombreCompleto,
  calculateAge,
  daysSince,
  type PacienteFichaCompletaDTO,
  type CitaLite,
} from "./_dto"

export async function getPacienteFicha(idPaciente: number): Promise<PacienteFichaCompletaDTO | null> {
  const data = await fichaRepo.getPacienteCompleto(idPaciente)

  if (!data.base) return null

  const {
    base,
    responsables,
    allergies,
    medications,
    diagnoses,
    vitals,
    plans,
    odontograms,
    periodontograms,
    adjuntos,
  } = data

  const now = new Date()
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  // Parse legacy notes
  const notas = safeJsonParse<{
    antecedentesMedicos?: string | null
    alergias?: string | null
    medicacion?: string | null
    obraSocial?: string | null
  }>(base.notas as any, {})

  // Map citas
  const toCitaLite = (c: (typeof base.citas)[number]): CitaLite => ({
    idCita: c.idCita,
    inicio: c.inicio.toISOString(),
    fin: c.fin.toISOString(),
    tipo: c.tipo,
    estado: c.estado,
    profesional: {
      idProfesional: c.profesionalId,
      nombre: nombreCompleto(c.profesional.persona),
    },
    consultorio: c.consultorio ? { idConsultorio: c.consultorio.idConsultorio, nombre: c.consultorio.nombre } : null,
  })

  const citasFuturas = base.citas.filter((c) => c.inicio >= now && c.estado !== "CANCELLED")
  const citasPasadas = base.citas.filter((c) => c.inicio < now)

  const proximaCita = citasFuturas[0]
    ? {
        idCita: citasFuturas[0].idCita,
        inicio: citasFuturas[0].inicio.toISOString(),
        fin: citasFuturas[0].fin.toISOString(),
        tipo: citasFuturas[0].tipo,
        estado: citasFuturas[0].estado,
        motivo: citasFuturas[0].motivo,
        profesional: {
          idProfesional: citasFuturas[0].profesionalId,
          nombre: nombreCompleto(citasFuturas[0].profesional.persona),
        },
        consultorio: citasFuturas[0].consultorio
          ? {
              idConsultorio: citasFuturas[0].consultorio.idConsultorio,
              nombre: citasFuturas[0].consultorio.nombre,
            }
          : null,
      }
    : null

  const proximasSemana = citasFuturas
    .filter((c) => c.inicio <= oneWeekFromNow)
    .slice(0, 5)
    .map(toCitaLite)
  const ultimas = citasPasadas.slice(0, 5).map(toCitaLite)

  // Active treatment plan
  const planActivo = plans.find((p) => p.isActive)
  const planesHistorial = plans.map((p) => ({
    id: p.idTreatmentPlan,
    titulo: p.titulo,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    pasosCompletados: p.steps.filter((s) => s.status === "COMPLETED").length,
    pasosTotal: p.steps.length,
  }))

  // Odontogram
  const ultimoOdontograma = odontograms[0]
    ? {
        id: odontograms[0].idOdontogramSnapshot,
        takenAt: odontograms[0].takenAt.toISOString(),
        consultaId: odontograms[0].consultaId,
        entries: odontograms[0].entries.map((e) => ({
          toothNumber: e.toothNumber,
          surface: e.surface,
          condition: e.condition,
          notes: e.notes,
        })),
      }
    : null

  // Periodontogram
  const ultimoPeriodontograma = periodontograms[0]
    ? {
        id: periodontograms[0].idPeriodontogramSnapshot,
        takenAt: periodontograms[0].takenAt.toISOString(),
        consultaId: periodontograms[0].consultaId,
        measures: periodontograms[0].measures.map((m) => ({
          toothNumber: m.toothNumber,
          site: m.site,
          probingDepthMm: m.probingDepthMm,
          bleeding: m.bleeding,
          plaque: m.plaque,
          mobility: m.mobility,
        })),
      }
    : null

  // Adjuntos
  const adjuntosRecientes = adjuntos.slice(0, 10).map((a) => ({
    id: a.idAdjunto,
    tipo: a.tipo,
    descripcion: a.descripcion,
    secureUrl: a.secureUrl,
    thumbnailUrl:
      a.width && a.height ? `${a.secureUrl.split("/upload/")[0]}/upload/w_200,h_200,c_fill/${a.publicId}` : null,
    createdAt: a.createdAt.toISOString(),
    uploadedBy: a.uploadedBy.nombreApellido,
    bytes: a.bytes,
    originalFilename: a.originalFilename,
    format: a.format,
    width: a.width,
    height: a.height,
    publicId: a.publicId,
    resourceType: a.resourceType,
  }))

  const adjuntosPorTipo = {
    xrays: adjuntos.filter((a) => a.tipo === "XRAY").length,
    photos: adjuntos.filter((a) => ["INTRAORAL_PHOTO", "EXTRAORAL_PHOTO"].includes(a.tipo)).length,
    documents: adjuntos.filter((a) => ["DOCUMENT", "PDF", "LAB_REPORT"].includes(a.tipo)).length,
    other: adjuntos.filter((a) => a.tipo === "OTHER").length,
  }

  // Build complete DTO
  const dto: PacienteFichaCompletaDTO = {
    idPaciente: base.idPaciente,
    estaActivo: base.estaActivo,
    createdAt: base.createdAt.toISOString(),
    updatedAt: base.updatedAt.toISOString(),

    persona: {
      idPersona: base.persona.idPersona,
      nombres: base.persona.nombres,
      apellidos: base.persona.apellidos,
      nombreCompleto: nombreCompleto(base.persona),
      genero: base.persona.genero,
      fechaNacimiento: base.persona.fechaNacimiento ? base.persona.fechaNacimiento.toISOString() : null,
      edad: calculateAge(base.persona.fechaNacimiento),
      direccion: base.persona.direccion,
      documento: base.persona.documento
        ? {
            tipo: base.persona.documento.tipo,
            numero: base.persona.documento.numero,
            ruc: base.persona.documento.ruc,
          }
        : null,
      contactos: base.persona.contactos.map((c) => ({
        tipo: c.tipo as "PHONE" | "EMAIL",
        valorNorm: c.valorNorm,
        label: c.label,
        esPrincipal: c.esPrincipal,
        activo: c.activo,
        whatsappCapaz: c.whatsappCapaz,
        esPreferidoRecordatorio: c.esPreferidoRecordatorio,
        esPreferidoCobranza: c.esPreferidoCobranza,
      })),
    },

    responsables: responsables.map((r) => ({
      idPacienteResponsable: r.idPacienteResponsable,
      relacion: r.relacion,
      esPrincipal: r.esPrincipal,
      autoridadLegal: r.autoridadLegal,
      persona: {
        idPersona: r.persona.idPersona,
        nombreCompleto: nombreCompleto(r.persona),
        documento: r.persona.documento ? { tipo: r.persona.documento.tipo, numero: r.persona.documento.numero } : null,
        contactoPrincipal: r.persona.contactos[0]?.valorNorm ?? null,
      },
    })),

    antecedentes: {
      antecedentesMedicos: notas.antecedentesMedicos ?? null,
      alergias: notas.alergias ?? null,
      medicacion: notas.medicacion ?? null,
      obraSocial: notas.obraSocial ?? null,
    },

    clinico: {
      alergias: allergies.map((a) => ({
        id: a.idPatientAllergy,
        label: a.label ?? a.allergyCatalog?.name ?? "",
        severity: a.severity,
        reaction: a.reaction,
        isActive: a.isActive,
        notedAt: a.notedAt.toISOString(),
      })),
      medicacion: medications.map((m) => ({
        id: m.idPatientMedication,
        label: m.label ?? m.medicationCatalog?.name ?? "",
        dose: m.dose,
        freq: m.freq,
        route: m.route,
        isActive: m.isActive,
        startAt: m.startAt ? m.startAt.toISOString() : null,
        endAt: m.endAt ? m.endAt.toISOString() : null,
      })),
      diagnosticos: diagnoses.map((d) => ({
        id: d.idPatientDiagnosis,
        code: d.code ?? d.diagnosisCatalog?.code ?? null,
        label: d.label ?? d.diagnosisCatalog?.name ?? "",
        status: d.status,
        notedAt: d.notedAt.toISOString(),
        resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
        notes: d.notes,
      })),
      vitales: {
        ultimo: vitals[0]
          ? {
              id: vitals[0].idPatientVitals,
              measuredAt: vitals[0].measuredAt.toISOString(),
              heightCm: vitals[0].heightCm,
              weightKg: vitals[0].weightKg,
              bmi: vitals[0].bmi,
              bpSyst: vitals[0].bpSyst,
              bpDiast: vitals[0].bpDiast,
              heartRate: vitals[0].heartRate,
              createdBy: vitals[0].createdBy
          ? { idUsuario: vitals[0].createdBy.idUsuario, nombreApellido: vitals[0].createdBy.nombreApellido }
          : null,
            }
          : null,
        historial: vitals.slice(0, 5).map((v) => ({
          id: v.idPatientVitals,
          measuredAt: v.measuredAt.toISOString(),
          bpSyst: v.bpSyst,
          bpDiast: v.bpDiast,
          heartRate: v.heartRate,
          createdBy: v.createdBy
      ? { idUsuario: v.createdBy.idUsuario, nombreApellido: v.createdBy.nombreApellido }
      : null,
        })),
      },
    },

    planes: {
      activo: planActivo
        ? {
            id: planActivo.idTreatmentPlan,
            titulo: planActivo.titulo,
            descripcion: planActivo.descripcion,
            createdAt: planActivo.createdAt.toISOString(),
            pasos: planActivo.steps.map((s) => ({
              id: s.idTreatmentStep,
              order: s.order,
              serviceType: s.serviceType ?? s.procedimientoCatalogo?.nombre ?? null,
              toothNumber: s.toothNumber,
              status: s.status,
              estimatedCostCents: s.estimatedCostCents,
              notes: s.notes,
            })),
          }
        : null,
      historial: planesHistorial,
    },

    citas: {
      proxima: proximaCita,
      proximasSemana,
      ultimas,
    },

    odontograma: {
      ultimo: ultimoOdontograma,
    },

    periodontograma: {
      ultimo: ultimoPeriodontograma,
    },

    adjuntos: {
      recientes: adjuntosRecientes,
      porTipo: adjuntosPorTipo,
    },

    resumen: {
      proximaCitaEn: proximaCita ? proximaCita.inicio : null,
      ultimaCitaHace: citasPasadas[0] ? citasPasadas[0].inicio.toISOString() : null,
      citasProximos90Dias: citasFuturas.filter((c) => c.inicio <= ninetyDaysFromNow).length,
      citasUltimos90Dias: citasPasadas.filter((c) => c.inicio >= ninetyDaysAgo).length,
      citasNoShow: base.citas.filter((c) => c.estado === "NO_SHOW").length,
      saldoPendiente: 0, // TODO: integrate billing module
      planActivoId: planActivo?.idTreatmentPlan ?? null,
      tieneAlergias: allergies.filter((a) => a.isActive).length > 0,
      tieneMedicacion: medications.filter((m) => m.isActive).length > 0,
      ultimoOdontogramaHace: ultimoOdontograma ? daysSince(odontograms[0].takenAt) + " días" : null,
      ultimoPeriodontogramaHace: ultimoPeriodontograma ? daysSince(periodontograms[0].takenAt) + " días" : null,
    },
  }

  return dto
}
