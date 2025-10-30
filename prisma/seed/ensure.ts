import {
  PrismaClient, RolNombre, TipoDocumento, TipoContacto, RelacionPaciente,
  TipoCita, EstadoCita, MotivoCancelacion,
  ConsultaEstado, ClinicoArchivoTipo, TreatmentStepStatus, DienteSuperficie,
  AllergySeverity,
  DiagnosisStatus,
  PerioBleeding,
  PerioSite,
  AdjuntoTipo
} from "@prisma/client";
import { normEmail, normPhonePY } from "./utils";


export async function ensureRoles(prisma: PrismaClient) {
for (const r of [RolNombre.ADMIN, RolNombre.ODONT, RolNombre.RECEP]) {
await prisma.rol.upsert({ where: { nombreRol: r }, update: {}, create: { nombreRol: r } });
}
}


export async function ensureUsuario(prisma: PrismaClient, u: { usuario: string; email?: string; nombreApellido: string; rol: RolNombre; passwordHash: string; }) {
return prisma.usuario.upsert({
where: { usuario: u.usuario.toLowerCase() },
update: {},
create: {
usuario: u.usuario.toLowerCase(),
email: u.email ? normEmail(u.email) : null,
nombreApellido: u.nombreApellido,
passwordHash: u.passwordHash,
rol: { connect: { nombreRol: u.rol } },
estaActivo: true,
},
});
}

export async function ensureEspecialidades(prisma: PrismaClient, nombres: string[]) {
for (const nombre of nombres) {
await prisma.especialidad.upsert({ where: { nombre }, update: { isActive: true }, create: { nombre, isActive: true } });
}
}


export async function ensureProfesionalEspecialidades(prisma: PrismaClient, profesionalId: number, nombres: string[]) {
for (const nombre of nombres) {
const esp = await prisma.especialidad.findUnique({ where: { nombre } });
if (!esp) continue;
await prisma.profesionalEspecialidad.upsert({
where: { profesionalId_especialidadId: { profesionalId, especialidadId: esp.idEspecialidad } },
update: {},
create: { profesionalId, especialidadId: esp.idEspecialidad },
});
}
}



export async function ensurePersonaConDocumento(prisma: PrismaClient, p: {
nombres: string; apellidos: string; genero?: any; fechaNacimiento?: Date | null;
doc: { tipo: TipoDocumento; numero: string; paisEmision?: string | null; ruc?: string | null };
}) {
const { doc } = p;
const existente = await prisma.documento.findFirst({ where: { tipo: doc.tipo, numero: doc.numero, paisEmision: doc.paisEmision ?? null }, include: { persona: true } });
if (existente) {
const per = existente.persona;
if (!per.estaActivo || !per.nombres || !per.apellidos) {
await prisma.persona.update({ where: { idPersona: per.idPersona }, data: {
estaActivo: true,
nombres: per.nombres || p.nombres,
apellidos: per.apellidos || p.apellidos,
genero: typeof p.genero !== "undefined" ? p.genero : per.genero,
fechaNacimiento: typeof p.fechaNacimiento !== "undefined" ? p.fechaNacimiento : per.fechaNacimiento,
}});
}
return existente.persona;
}
return prisma.persona.create({ data: {
nombres: p.nombres,
apellidos: p.apellidos,
genero: p.genero ?? null,
fechaNacimiento: p.fechaNacimiento ?? null,
estaActivo: true,
documento: { create: { tipo: doc.tipo, numero: doc.numero, paisEmision: doc.paisEmision ?? null, ruc: doc.ruc ?? null } },
}});
}


export async function ensureContactos(prisma: PrismaClient, personaId: number, contactos: Array<{
tipo: TipoContacto; valor: string; label?: string; whatsappCapaz?: boolean; smsCapaz?: boolean; esPrincipal?: boolean; esPreferidoRecordatorio?: boolean; esPreferidoCobranza?: boolean;
}>) {
for (const c of contactos) {
const valorNorm = c.tipo === TipoContacto.PHONE ? normPhonePY(c.valor) : normEmail(c.valor);
await prisma.personaContacto.upsert({
where: { personaId_tipo_valorNorm: { personaId, tipo: c.tipo, valorNorm } },
update: {
label: c.label ?? null,
whatsappCapaz: c.whatsappCapaz ?? null,
smsCapaz: c.smsCapaz ?? null,
esPrincipal: !!c.esPrincipal,
esPreferidoRecordatorio: !!c.esPreferidoRecordatorio,
esPreferidoCobranza: !!c.esPreferidoCobranza,
activo: true,
},
create: {
personaId,
tipo: c.tipo,
valorRaw: c.valor,
valorNorm,
label: c.label ?? null,
whatsappCapaz: c.whatsappCapaz ?? null,
smsCapaz: c.smsCapaz ?? null,
esPrincipal: !!c.esPrincipal,
esPreferidoRecordatorio: !!c.esPreferidoRecordatorio,
esPreferidoCobranza: !!c.esPreferidoCobranza,
activo: true,
},
});
}
}




export async function ensurePacienteFromPersona(prisma: PrismaClient, personaId: number) {
const existing = await prisma.paciente.findUnique({ where: { personaId } });
if (existing) return existing;
return prisma.paciente.create({ data: { personaId, estaActivo: true } });
}


export async function ensureResponsablePrincipal(prisma: PrismaClient, pacienteId: number, personaId: number, relacion: RelacionPaciente) {
const exists = await prisma.pacienteResponsable.findFirst({ where: { pacienteId, personaId, relacion } });
if (exists) return exists;
return prisma.pacienteResponsable.create({ data: { pacienteId, personaId, relacion, esPrincipal: true, autoridadLegal: true, vigenteDesde: new Date() } });
}


export async function ensureConsultorio(prisma: PrismaClient, nombre: string, colorHex?: string) {
return prisma.consultorio.upsert({ where: { nombre }, update: { activo: true, colorHex }, create: { nombre, activo: true, colorHex } });
}


export async function haySolapeCita(prisma: PrismaClient, params: { profesionalId: number; consultorioId?: number | null; inicio: Date; fin: Date; }) {
const { profesionalId, consultorioId, inicio, fin } = params;
const solapeProfesional = await prisma.cita.findFirst({ where: { profesionalId, inicio: { lt: fin }, fin: { gt: inicio }, estado: { in: [EstadoCita.SCHEDULED, EstadoCita.CONFIRMED, EstadoCita.CHECKED_IN, EstadoCita.IN_PROGRESS] } }, select: { idCita: true } });
if (solapeProfesional) return true;
if (consultorioId) {
const solapeSala = await prisma.cita.findFirst({ where: { consultorioId, inicio: { lt: fin }, fin: { gt: inicio }, estado: { in: [EstadoCita.SCHEDULED, EstadoCita.CONFIRMED, EstadoCita.CHECKED_IN, EstadoCita.IN_PROGRESS] } }, select: { idCita: true } });
if (solapeSala) return true;
}
return false;
}






export async function crearCitaSegura(prisma: PrismaClient, data: {
pacienteId: number; profesionalId: number; consultorioId?: number | null; createdByUserId: number; inicio: Date; fin: Date; tipo: TipoCita; estado?: EstadoCita; motivo?: string | null; notas?: string | null; reprogramadaDesdeId?: number | null;
}) {
const overlap = await haySolapeCita(prisma, { profesionalId: data.profesionalId, consultorioId: data.consultorioId ?? null, inicio: data.inicio, fin: data.fin });
if (overlap) return null;
const cita = await prisma.cita.create({ data: {
estado: data.estado ?? EstadoCita.SCHEDULED,
pacienteId: data.pacienteId,
profesionalId: data.profesionalId,
consultorioId: data.consultorioId ?? null,
createdByUserId: data.createdByUserId,
inicio: data.inicio,
fin: data.fin,
duracionMinutos: Math.round(((data.fin.getTime() - data.inicio.getTime()) / 60000) || 30),
tipo: data.tipo,
motivo: data.motivo ?? null,
notas: data.notas ?? null,
reprogramadaDesdeId: data.reprogramadaDesdeId ?? null,
}});
await prisma.citaEstadoHistorial.create({ data: { citaId: cita.idCita, estadoPrevio: null, estadoNuevo: cita.estado, nota: "Creación de cita", changedAt: new Date() } });
return cita;
}


export async function cancelarCita(prisma: PrismaClient, params: { citaId: number; userId: number; reason: MotivoCancelacion; nota?: string; when?: Date; }) {
const when = params.when ?? new Date();
const prev = await prisma.cita.findUnique({ where: { idCita: params.citaId }, select: { estado: true } });
if (!prev) return null;
const res = await prisma.cita.update({ where: { idCita: params.citaId }, data: { estado: EstadoCita.CANCELLED, cancelReason: params.reason, cancelledAt: when, cancelledByUserId: params.userId } });
await prisma.citaEstadoHistorial.create({ data: { citaId: params.citaId, estadoPrevio: prev.estado, estadoNuevo: EstadoCita.CANCELLED, nota: params.nota ?? `Cancelada (${params.reason})`, changedByUserId: params.userId, changedAt: when } });
return res;
}

export async function ensureProcedimientoCatalogo(
  prisma: PrismaClient,
  items: Array<{
    code: string; nombre: string; descripcion?: string;
    defaultDurationMin?: number | null; defaultPriceCents?: number | null;
    aplicaDiente?: boolean; aplicaSuperficie?: boolean;
  }>
) {
  for (const it of items) {
    await prisma.procedimientoCatalogo.upsert({
      where: { code: it.code },
      update: {
        nombre: it.nombre,
        descripcion: it.descripcion ?? null,
        defaultDurationMin: it.defaultDurationMin ?? null,
        defaultPriceCents: it.defaultPriceCents ?? null,
        aplicaDiente: !!it.aplicaDiente,
        aplicaSuperficie: !!it.aplicaSuperficie,
        activo: true,
      },
      create: {
        code: it.code,
        nombre: it.nombre,
        descripcion: it.descripcion ?? null,
        defaultDurationMin: it.defaultDurationMin ?? null,
        defaultPriceCents: it.defaultPriceCents ?? null,
        aplicaDiente: !!it.aplicaDiente,
        aplicaSuperficie: !!it.aplicaSuperficie,
        activo: true,
      },
    });
  }
}



// ===================================================
// B) TreatmentPlan & TreatmentStep (planificación)
// ===================================================
export async function createPlanSimpleConSteps(
  prisma: PrismaClient,
  params: {
    pacienteId: number;
    createdByUserId: number;
    steps: Array<{
      code?: string;         // si viene del catálogo
      serviceType?: string;  // si libre
      toothNumber?: number | null;
      toothSurface?: DienteSuperficie | null;
      estimatedDurationMin?: number | null;
      estimatedCostCents?: number | null;
      priority?: number | null;
    }>;
  }
) {
  const plan = await prisma.treatmentPlan.create({
    data: {
      pacienteId: params.pacienteId,
      titulo: "Plan inicial",
      isActive: true,
      createdByUserId: params.createdByUserId,
    },
  });

  let order = 1;
  for (const st of params.steps) {
    let procedureId: number | null = null;
    if (st.code) {
      const proc = await prisma.procedimientoCatalogo.findUnique({ where: { code: st.code } });
      procedureId = proc?.idProcedimiento ?? null;
    }
    await prisma.treatmentStep.create({
      data: {
        treatmentPlanId: plan.idTreatmentPlan,
        order: order++,
        procedureId: procedureId ?? undefined,
        serviceType: st.serviceType ?? null,
        toothNumber: st.toothNumber ?? null,
        toothSurface: st.toothSurface ?? null,
        estimatedDurationMin: st.estimatedDurationMin ?? null,
        estimatedCostCents: st.estimatedCostCents ?? null,
        priority: st.priority ?? 3,
        status: TreatmentStepStatus.PENDING,
      },
    });
  }

  return plan;
}

// ===================================================
// C) Consulta (acto clínico) y operaciones
// ===================================================
export async function createConsultaParaCita(
  prisma: PrismaClient,
  params: {
    citaId: number;
    performedByProfessionalId: number;
    createdByUserId: number;
    status?: ConsultaEstado;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    reason?: string | null;
    diagnosis?: string | null;
    clinicalNotes?: string | null;
  }
) {
  return prisma.consulta.upsert({
    where: { citaId: params.citaId },
    update: {},
    create: {
      citaId: params.citaId,
      performedById: params.performedByProfessionalId,
      createdByUserId: params.createdByUserId,
      status: params.status ?? ConsultaEstado.DRAFT,
      startedAt: params.startedAt ?? null,
      finishedAt: params.finishedAt ?? null,
      reason: params.reason ?? null,
      diagnosis: params.diagnosis ?? null,
      clinicalNotes: params.clinicalNotes ?? null,
    },
  });
}

export async function addProcedimientoALaConsulta(
  prisma: PrismaClient,
  params: {
    consultaCitaId: number;
    code?: string;             // del catálogo
    serviceType?: string;      // texto libre si no usas catálogo
    toothNumber?: number | null;
    toothSurface?: DienteSuperficie | null;
    quantity?: number;
    unitPriceCents?: number | null;
    totalCents?: number | null;
    treatmentStepId?: number | null;
    resultNotes?: string | null;
  }
) {
  let procedureId: number | null = null;
  if (params.code) {
    const found = await prisma.procedimientoCatalogo.findUnique({ where: { code: params.code } });
    procedureId = found?.idProcedimiento ?? null;
  }
  const q = params.quantity && params.quantity > 0 ? params.quantity : 1;

  let unit = params.unitPriceCents ?? null;
  if (unit == null && procedureId) {
    const proc = await prisma.procedimientoCatalogo.findUnique({ where: { idProcedimiento: procedureId } });
    unit = proc?.defaultPriceCents ?? null;
  }
  const total = params.totalCents ?? (unit != null ? unit * q : null);

  return prisma.consultaProcedimiento.create({
    data: {
      consultaId: params.consultaCitaId,
      procedureId: procedureId ?? undefined,
      serviceType: procedureId ? null : (params.serviceType ?? "Procedimiento"),
      toothNumber: params.toothNumber ?? null,
      toothSurface: params.toothSurface ?? null,
      quantity: q,
      unitPriceCents: unit,
      totalCents: total,
      treatmentStepId: params.treatmentStepId ?? null,
      resultNotes: params.resultNotes ?? null,
    },
  });
}

function deriveStorageFromUrl(url: string, originalName?: string) {
  const u = new URL(url);
  const file = (originalName ?? u.pathname.split("/").pop() ?? "file.bin");
  const dot = file.lastIndexOf(".");
  const nameNoExt = dot > -1 ? file.slice(0, dot) : file;
  const ext = dot > -1 ? file.slice(dot + 1) : "bin";
  return {
    publicId: `seed/${nameNoExt}-${Math.random().toString(36).slice(2,8)}`,
    folder: "seed",
    resourceType: "image",   // si necesitas variar, deriva de mimeType
    format: ext,
    secureUrl: url,
  };
}

export async function addAdjuntoAConsulta(
  prisma: PrismaClient,
  params: {
    consultaCitaId: number;
    uploadedByUserId: number;
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
    tipo: AdjuntoTipo;
    procedimientoId?: number | null;
    metadata?: any; // ignorado aquí, pero mantenemos la firma
  }
) {
  const st = deriveStorageFromUrl(params.url, params.originalName);
  return prisma.adjunto.create({
    data: {
      // vínculos clínicos
      consultaId: params.consultaCitaId,
      procedimientoId: params.procedimientoId ?? null,

      // clasificación clínica
      tipo: params.tipo,
      descripcion: params.originalName,

      // storage "tipo Cloudinary"
      publicId: st.publicId,
      folder: st.folder,
      resourceType: st.resourceType,
      format: st.format,
      secureUrl: st.secureUrl,
      bytes: params.size,
      originalFilename: params.originalName,

      // auditoría
      uploadedByUserId: params.uploadedByUserId,
    },
  });
}

// + NUEVO:
export async function addClinicalBasics(
  prisma: PrismaClient,
  params: { pacienteId: number; createdByUserId: number; consultaId?: number | null }
) {
  await prisma.clinicalHistoryEntry.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      title: "Antecedentes",
      notes: "Entrada de historia clínica demo.",
      createdByUserId: params.createdByUserId,
    },
  });

  const dx = await prisma.diagnosisCatalog.findFirst();
  if (dx) {
    await prisma.patientDiagnosis.create({
      data: {
        pacienteId: params.pacienteId,
        diagnosisId: dx.idDiagnosisCatalog,
        label: dx.name,
        status: DiagnosisStatus.ACTIVE,
        notes: "Diagnóstico demo",
        createdByUserId: params.createdByUserId,
        consultaId: params.consultaId ?? null,
      },
    });
  }

  const alg = await prisma.allergyCatalog.findFirst();
  if (alg) {
    await prisma.patientAllergy.create({
      data: {
        pacienteId: params.pacienteId,
        allergyId: alg.idAllergyCatalog,
        label: alg.name,
        severity: AllergySeverity.MODERATE,
        reaction: "Rash leve",
        createdByUserId: params.createdByUserId,
      },
    });
  }

  const med = await prisma.medicationCatalog.findFirst();
  if (med) {
    await prisma.patientMedication.create({
      data: {
        pacienteId: params.pacienteId,
        medicationId: med.idMedicationCatalog,
        label: med.name,
        dose: "1 comp",
        freq: "c/8h",
        route: "VO",
        startAt: new Date(),
        isActive: true,
        createdByUserId: params.createdByUserId,
      },
    });
  }

  await prisma.patientVitals.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      heightCm: 170,
      weightKg: 72,
      bmi: 24.9,
      bpSyst: 120,
      bpDiast: 78,
      heartRate: 72,
      notes: "Signos vitales dentro de parámetros.",
      createdByUserId: params.createdByUserId,
    },
  });
}

export async function addOdontoAndPerio(
  prisma: PrismaClient,
  params: { pacienteId: number; createdByUserId: number; consultaId?: number | null }
) {
  const od = await prisma.odontogramSnapshot.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      notes: "Odontograma demo",
      createdByUserId: params.createdByUserId,
    },
  });

  await prisma.odontogramEntry.createMany({
    data: [
      { OdontogramSnapshot_id: od.idOdontogramSnapshot, tooth_number: 16, surface: "O" as any, condition: "CARIES" as any },
      { OdontogramSnapshot_id: od.idOdontogramSnapshot, tooth_number: 26, surface: "O" as any, condition: "FILLED" as any },
    ] as any,
  });

  const perio = await prisma.periodontogramSnapshot.create({
    data: {
      pacienteId: params.pacienteId,
      consultaId: params.consultaId ?? null,
      notes: "Periodontograma demo",
      createdByUserId: params.createdByUserId,
    },
  });

  await prisma.periodontogramMeasure.createMany({
    data: [
      { PeriodontogramSnapshot_id: perio.idPeriodontogramSnapshot, tooth_number: 16, site: "MB" as PerioSite, probing_depth_mm: 3, bleeding: "NONE" as PerioBleeding },
      { PeriodontogramSnapshot_id: perio.idPeriodontogramSnapshot, tooth_number: 16, site: "B"  as PerioSite, probing_depth_mm: 2, bleeding: "NONE" as PerioBleeding },
    ] as any,
  });
}



export async function ensureDiagnosisCatalog(prisma: PrismaClient, items: Array<{ code: string; name: string; description?: string }>) {
  for (const it of items) {
    await prisma.diagnosisCatalog.upsert({
      where: { code: it.code },
      update: { name: it.name, description: it.description ?? null, isActive: true },
      create: { code: it.code, name: it.name, description: it.description ?? null, isActive: true },
    });
  }
}

export async function ensureAllergyCatalog(prisma: PrismaClient, items: Array<{ name: string; description?: string }>) {
  for (const it of items) {
    await prisma.allergyCatalog.upsert({
      where: { name: it.name },
      update: { description: it.description ?? null, isActive: true },
      create: { name: it.name, description: it.description ?? null, isActive: true },
    });
  }
}

export async function ensureMedicationCatalog(prisma: PrismaClient, items: Array<{ name: string; description?: string }>) {
  for (const it of items) {
    await prisma.medicationCatalog.upsert({
      where: { name: it.name },
      update: { description: it.description ?? null, isActive: true },
      create: { name: it.name, description: it.description ?? null, isActive: true },
    });
  }
}