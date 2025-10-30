// src/app/api/pacientes/[id]/_service.get.ts
import { fichaRepo } from "./_repo";
import { safeJsonParse, nombreCompleto, type PacienteFichaDTO, type CitaLite } from "./_dto";

export async function getPacienteFicha(idPaciente: number): Promise<PacienteFichaDTO | null> {
  const base = await fichaRepo.getPacienteBase(idPaciente);
  if (!base) return null;

  const now = new Date();
  const futuras = base.citas.filter((c) => c.inicio >= now);
  const pasadas = base.citas.filter((c) => c.inicio < now);

  const toCitaLite = (c: typeof base.citas[number]): CitaLite => ({
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
  });

  const proxima = futuras[0]?.inicio ? futuras[0].inicio.toISOString() : null;
  const en90dias = futuras.filter((c) => c.inicio.getTime() <= (now.getTime() + 90 * 24 * 60 * 60 * 1000)).length;

  // notas clínicas “legacy” serializadas en Paciente.notas
  const notas = safeJsonParse<{
    antecedentesMedicos?: string | null;
    alergias?: string | null;
    medicacion?: string | null;
    obraSocial?: string | null;
  }>(base.notas as any, { antecedentesMedicos: null, alergias: null, medicacion: null, obraSocial: null });

  // clínico estructurado (si lo estás usando)
  const [allergies, meds, diags] = await fichaRepo.getClinicoEstructurado(idPaciente);
  const alergiasCatalogadas = allergies.map((a) => ({
    id: a.idPatientAllergy,
    label: a.label ?? a.allergyCatalog?.name ?? "",
    severity: a.severity,
    isActive: a.isActive,
    notedAt: a.notedAt.toISOString(),
  }));
  const medicacionCatalogada = meds.map((m) => ({
    id: m.idPatientMedication,
    label: m.label ?? m.medicationCatalog?.name ?? "",
    isActive: m.isActive,
    startAt: m.startAt ? m.startAt.toISOString() : null,
    endAt: m.endAt ? m.endAt.toISOString() : null,
  }));
  const diagnosticos = diags.map((d) => ({
    id: d.idPatientDiagnosis,
    label: d.label ?? d.diagnosisCatalog?.name ?? "",
    status: d.status,
    notedAt: d.notedAt.toISOString(),
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
  }));

  const dto: PacienteFichaDTO = {
    idPaciente: base.idPaciente,
    estaActivo: base.estaActivo,
    createdAt: base.createdAt.toISOString(),
    updatedAt: base.updatedAt.toISOString(),
    persona: {
      idPersona: base.persona.idPersona,
      nombres: base.persona.nombres,
      apellidos: base.persona.apellidos,
      genero: base.persona.genero as any,
      fechaNacimiento: base.persona.fechaNacimiento ? base.persona.fechaNacimiento.toISOString() : null,
      direccion: base.persona.direccion,
      documento: base.persona.documento
        ? { tipo: base.persona.documento.tipo, numero: base.persona.documento.numero, ruc: base.persona.documento.ruc }
        : null,
      contactos: base.persona.contactos.map((c) => ({
        tipo: c.tipo as any,
        valorNorm: c.valorNorm,
        label: c.label,
        esPrincipal: c.esPrincipal,
        activo: c.activo,
      })),
    },
    antecedentes: {
      antecedentesMedicos: notas.antecedentesMedicos ?? null,
      alergias: notas.alergias ?? null,
      medicacion: notas.medicacion ?? null,
      obraSocial: notas.obraSocial ?? null,
    },
    klinic: {
      alergiasCatalogadas,
      medicacionCatalogada,
      diagnosticos,
    },
    kpis: {
      proximoTurno: proxima,
      turnos90dias: en90dias,
      saldo: 0, // TODO: integrar módulo de facturación
      noShow: base.citas.filter((c) => c.estado === "NO_SHOW").length,
    },
    proximasCitas: futuras.slice(0, 5).map(toCitaLite),
    ultimasCitas: pasadas.slice(-5).map(toCitaLite),
  };

  return dto;
}
