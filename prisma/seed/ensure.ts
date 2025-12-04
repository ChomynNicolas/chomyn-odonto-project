import {
  PrismaClient, RolNombre, TipoDocumento, TipoContacto, RelacionPaciente,
  TipoCita, EstadoCita, MotivoCancelacion,
  ConsultaEstado, TreatmentStepStatus, DienteSuperficie,
  AllergySeverity,
  DiagnosisStatus,
  PerioBleeding,
  PerioSite,
  AdjuntoTipo,
  Genero,
  ToothCondition
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { normEmail, normPhonePY } from "./utils";


export async function ensureRoles(prisma: PrismaClient) {
for (const r of [RolNombre.ADMIN, RolNombre.ODONT, RolNombre.RECEP]) {
await prisma.rol.upsert({ where: { nombreRol: r }, update: {}, create: { nombreRol: r } });
}
}


export async function ensureUsuario(prisma: PrismaClient, u: { usuario: string; email?: string; nombreApellido: string; rol: RolNombre; passwordHash: string; }) {
try {
return await prisma.usuario.upsert({
where: { usuario: u.usuario.toLowerCase() },
update: {
// Actualizar email solo si se proporciona y es diferente
...(u.email && { email: normEmail(u.email) }),
nombreApellido: u.nombreApellido,
estaActivo: true,
},
create: {
usuario: u.usuario.toLowerCase(),
email: u.email ? normEmail(u.email) : null,
nombreApellido: u.nombreApellido,
passwordHash: u.passwordHash,
rol: { connect: { nombreRol: u.rol } },
estaActivo: true,
},
});
} catch (error: any) {
// Si hay un error de email duplicado (P2002), intentar encontrar el usuario existente
if (error.code === "P2002" && error.meta?.target?.includes("email") && u.email) {
const emailNorm = normEmail(u.email);
// Buscar usuario existente por email
const existingUser = await prisma.usuario.findUnique({
where: { email: emailNorm },
});
if (existingUser) {
// Si existe, actualizar el usuario existente
return await prisma.usuario.update({
where: { idUsuario: existingUser.idUsuario },
data: {
usuario: u.usuario.toLowerCase(),
nombreApellido: u.nombreApellido,
estaActivo: true,
},
});
}
}
// Si hay un error de usuario duplicado, buscar por usuario
if (error.code === "P2002" && error.meta?.target?.includes("usuario")) {
const existingByUsuario = await prisma.usuario.findUnique({
where: { usuario: u.usuario.toLowerCase() },
});
if (existingByUsuario) {
// Actualizar el usuario existente
return await prisma.usuario.update({
where: { idUsuario: existingByUsuario.idUsuario },
data: {
...(u.email && { email: normEmail(u.email) }),
nombreApellido: u.nombreApellido,
estaActivo: true,
},
});
}
}
// Si no es un error de duplicado o no se pudo resolver, relanzar
throw error;
}
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
nombres: string; apellidos: string; segundoApellido?: string | null; genero?: Genero | null; fechaNacimiento?: Date | null;
direccion?: string | null; ciudad?: string | null; pais?: string | null;
contactoEmergenciaNombre?: string | null; contactoEmergenciaTelefono?: string | null; contactoEmergenciaRelacion?: string | null;
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
segundoApellido: typeof p.segundoApellido !== "undefined" ? p.segundoApellido : per.segundoApellido,
genero: typeof p.genero !== "undefined" ? p.genero : per.genero,
fechaNacimiento: typeof p.fechaNacimiento !== "undefined" ? p.fechaNacimiento : per.fechaNacimiento,
direccion: typeof p.direccion !== "undefined" ? p.direccion : per.direccion,
ciudad: typeof p.ciudad !== "undefined" ? p.ciudad : per.ciudad,
pais: typeof p.pais !== "undefined" ? p.pais : per.pais,
contactoEmergenciaNombre: typeof p.contactoEmergenciaNombre !== "undefined" ? p.contactoEmergenciaNombre : per.contactoEmergenciaNombre,
contactoEmergenciaTelefono: typeof p.contactoEmergenciaTelefono !== "undefined" ? p.contactoEmergenciaTelefono : per.contactoEmergenciaTelefono,
contactoEmergenciaRelacion: typeof p.contactoEmergenciaRelacion !== "undefined" ? p.contactoEmergenciaRelacion : per.contactoEmergenciaRelacion,
}});
}
return existente.persona;
}
return prisma.persona.create({ data: {
nombres: p.nombres,
apellidos: p.apellidos,
segundoApellido: p.segundoApellido ?? null,
genero: p.genero ?? null,
fechaNacimiento: p.fechaNacimiento ?? null,
direccion: p.direccion ?? null,
ciudad: p.ciudad ?? null,
pais: p.pais ?? "PY",
contactoEmergenciaNombre: p.contactoEmergenciaNombre ?? null,
contactoEmergenciaTelefono: p.contactoEmergenciaTelefono ?? null,
contactoEmergenciaRelacion: p.contactoEmergenciaRelacion ?? null,
estaActivo: true,
documento: { create: { tipo: doc.tipo, numero: doc.numero, paisEmision: doc.paisEmision ?? null, ruc: doc.ruc ?? null } },
}});
}


export async function ensureContactos(prisma: PrismaClient, personaId: number, contactos: ReadonlyArray<{
tipo: TipoContacto; valor: string; label?: string; whatsappCapaz?: boolean; smsCapaz?: boolean; esPrincipal?: boolean; esPreferidoRecordatorio?: boolean; esPreferidoCobranza?: boolean;
}>) {
// Filtrar contactos duplicados por tipo y valor normalizado antes de procesarlos
const contactosUnicos = new Map<string, typeof contactos[0]>();
for (const c of contactos) {
const valorNorm = c.tipo === TipoContacto.PHONE ? normPhonePY(c.valor) : normEmail(c.valor);
const key = `${c.tipo}:${valorNorm}`;
// Si ya existe un contacto con el mismo tipo y valor normalizado, mantener el primero
if (!contactosUnicos.has(key)) {
contactosUnicos.set(key, c);
}
}

// Procesar solo los contactos únicos
for (const c of contactosUnicos.values()) {
const valorNorm = c.tipo === TipoContacto.PHONE ? normPhonePY(c.valor) : normEmail(c.valor);
try {
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
} catch (error: any) {
// Si hay un error de restricción única (P2002), ignorarlo silenciosamente
// Esto puede ocurrir si hay una condición de carrera o si el contacto ya existe
if (error.code === "P2002") {
// Contacto ya existe, continuar
continue;
}
// Para otros errores, relanzar
throw error;
}
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

/**
 * Asegura que los procedimientos del catálogo existan en la base de datos
 * 
 * NOTA: El campo defaultPriceCents almacena guaraníes (PYG), no centavos.
 * El nombre del campo se mantiene por compatibilidad, pero representa guaraníes enteros.
 */
export async function ensureProcedimientoCatalogo(
  prisma: PrismaClient,
  items: Array<{
    code: string; nombre: string; descripcion?: string;
    defaultDurationMin?: number | null; defaultPriceCents?: number | null; // en guaraníes (PYG)
    aplicaDiente?: boolean; aplicaSuperficie?: boolean;
    esCirugia?: boolean;
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
        esCirugia: !!it.esCirugia,
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
        esCirugia: !!it.esCirugia,
        activo: true,
      },
    });
  }
}

/**
 * Asegura que los planes de tratamiento del catálogo existan en la base de datos
 * 
 * NOTA: Los precios (estimatedCostCents) están en guaraníes (PYG), no en centavos.
 */
export async function ensureTreatmentPlanCatalog(
  prisma: PrismaClient,
  items: Array<{
    code: string
    nombre: string
    descripcion?: string | null
    isActive?: boolean
    steps: Array<{
      order: number
      procedureCode?: string
      serviceType?: string | null
      toothNumber?: number | null
      toothSurface?: DienteSuperficie | null
      estimatedDurationMin?: number | null
      estimatedCostCents?: number | null
      priority?: number | null
      notes?: string | null
      requiresMultipleSessions?: boolean
      totalSessions?: number | null
    }>
  }>
) {
  for (const plan of items) {
    // Crear o actualizar el plan de catálogo
    const catalogPlan = await prisma.treatmentPlanCatalog.upsert({
      where: { code: plan.code },
      update: {
        nombre: plan.nombre,
        descripcion: plan.descripcion ?? null,
        isActive: plan.isActive ?? true,
      },
      create: {
        code: plan.code,
        nombre: plan.nombre,
        descripcion: plan.descripcion ?? null,
        isActive: plan.isActive ?? true,
      },
    })

    // Eliminar pasos existentes y recrearlos (para mantener sincronización)
    await prisma.treatmentPlanCatalogStep.deleteMany({
      where: { catalogPlanId: catalogPlan.idTreatmentPlanCatalog },
    })

    // Crear los pasos del plan
    for (const step of plan.steps) {
      let procedureId: number | null = null

      // Si hay un código de procedimiento, buscar el procedimiento en el catálogo
      if (step.procedureCode) {
        const procedure = await prisma.procedimientoCatalogo.findUnique({
          where: { code: step.procedureCode },
        })
        if (procedure) {
          procedureId = procedure.idProcedimiento
        }
      }

      // Determinar valores por defecto desde el procedimiento si existe
      let estimatedDuration = step.estimatedDurationMin ?? null
      let estimatedCost = step.estimatedCostCents ?? null

      if (procedureId) {
        const procedure = await prisma.procedimientoCatalogo.findUnique({
          where: { idProcedimiento: procedureId },
        })
        if (procedure) {
          // Usar valores del catálogo si no se especificaron explícitamente
          if (estimatedDuration == null) {
            estimatedDuration = procedure.defaultDurationMin
          }
          if (estimatedCost == null) {
            estimatedCost = procedure.defaultPriceCents
          }
        }
      }

      await prisma.treatmentPlanCatalogStep.create({
        data: {
          catalogPlanId: catalogPlan.idTreatmentPlanCatalog,
          order: step.order,
          procedureId: procedureId ?? null,
          serviceType: step.serviceType ?? null,
          toothNumber: step.toothNumber ?? null,
          toothSurface: step.toothSurface ?? null,
          estimatedDurationMin: estimatedDuration,
          estimatedCostCents: estimatedCost,
          priority: step.priority ?? null,
          notes: step.notes ?? null,
          requiresMultipleSessions: step.requiresMultipleSessions ?? false,
          totalSessions: step.totalSessions ?? null,
        },
      })
    }
  }
}



// ===================================================
// B) TreatmentPlan & TreatmentStep (planificación)
// ===================================================
/**
 * Crea un plan de tratamiento con sus pasos
 * 
 * NOTA: estimatedCostCents almacena guaraníes (PYG) cuando proviene del catálogo.
 * Si se proporciona desde el catálogo, el valor será en guaraníes.
 */
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
      estimatedCostCents?: number | null; // en guaraníes (PYG) si proviene del catálogo
      priority?: number | null;
    }>;
  }
) {
  const plan = await prisma.treatmentPlan.create({
    data: {
      pacienteId: params.pacienteId,
      titulo: "Plan inicial",
      createdByUserId: params.createdByUserId,
    },
  });

  let order = 1;
  for (const st of params.steps) {
    let procedureId: number | null = null;
    let estimatedCost: number | null = st.estimatedCostCents ?? null;
    let estimatedDuration: number | null = st.estimatedDurationMin ?? null;
    
    if (st.code) {
      const proc = await prisma.procedimientoCatalogo.findUnique({ where: { code: st.code } });
      if (proc) {
        procedureId = proc.idProcedimiento;
        // Si no se proporcionó precio explícitamente, usar el del catálogo
        if (estimatedCost == null) {
          estimatedCost = proc.defaultPriceCents ?? null;
        }
        // Si no se proporcionó duración explícitamente, usar la del catálogo
        if (estimatedDuration == null) {
          estimatedDuration = proc.defaultDurationMin ?? null;
        }
      }
    }
    
    await prisma.treatmentStep.create({
      data: {
        treatmentPlanId: plan.idTreatmentPlan,
        order: order++,
        procedureId: procedureId ?? undefined,
        serviceType: st.serviceType ?? null,
        toothNumber: st.toothNumber ?? null,
        toothSurface: st.toothSurface ?? null,
        estimatedDurationMin: estimatedDuration,
        estimatedCostCents: estimatedCost,
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
      diagnosis: params.diagnosis ?? null,
      clinicalNotes: params.clinicalNotes ?? null,
    },
  });
}

/**
 * Agrega un procedimiento a una consulta
 * 
 * NOTA: Si unitPriceCents no se proporciona y el procedimiento viene del catálogo,
 * se usa defaultPriceCents del catálogo que está en guaraníes (PYG).
 * Los valores unitPriceCents y totalCents en ConsultaProcedimiento también están en guaraníes.
 */
export async function addProcedimientoALaConsulta(
  prisma: PrismaClient,
  params: {
    consultaCitaId: number;
    code?: string;             // del catálogo
    serviceType?: string;      // texto libre si no usas catálogo
    toothNumber?: number | null;
    toothSurface?: DienteSuperficie | null;
    quantity?: number;
    unitPriceCents?: number | null; // en guaraníes (PYG)
    totalCents?: number | null;     // en guaraníes (PYG)
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

  // Si no se proporciona unitPriceCents y hay un procedimiento del catálogo,
  // usar defaultPriceCents que está en guaraníes
  let unit = params.unitPriceCents ?? null;
  if (unit == null && procedureId) {
    const proc = await prisma.procedimientoCatalogo.findUnique({ where: { idProcedimiento: procedureId } });
    unit = proc?.defaultPriceCents ?? null; // en guaraníes
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
    metadata?: unknown; // ignorado aquí, pero mantenemos la firma
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

  // Crear múltiples diagnósticos para tener datos suficientes
  const diagnoses = await prisma.diagnosisCatalog.findMany({ where: { isActive: true }, take: 3 });
  if (diagnoses.length > 0) {
    const numDiagnoses = faker.number.int({ min: 1, max: Math.min(3, diagnoses.length) });
    const selectedDiagnoses = faker.helpers.arrayElements(diagnoses, numDiagnoses);
    
    for (const dx of selectedDiagnoses) {
      // Crear diagnósticos con fechas variadas
      const dateType = faker.helpers.arrayElement(["recent", "intermediate", "old"]);
      let notedAt = new Date();
      
      switch (dateType) {
        case "recent":
          notedAt = faker.date.recent({ days: 30 });
          break;
        case "intermediate":
          const daysAgo = faker.number.int({ min: 30, max: 90 });
          notedAt = new Date();
          notedAt.setDate(notedAt.getDate() - daysAgo);
          break;
        case "old":
          const daysAgoOld = faker.number.int({ min: 90, max: 365 });
          notedAt = new Date();
          notedAt.setDate(notedAt.getDate() - daysAgoOld);
          break;
      }
      
      await prisma.patientDiagnosis.create({
        data: {
          pacienteId: params.pacienteId,
          diagnosisId: dx.idDiagnosisCatalog,
          code: dx.code,
          label: dx.name,
          status: DiagnosisStatus.ACTIVE,
          notedAt,
          notes: faker.helpers.arrayElement([
            "Diagnóstico demo",
            "Diagnóstico establecido en consulta",
            "Hallazgo clínico",
            "Diagnóstico confirmado",
          ]),
          createdByUserId: params.createdByUserId,
          consultaId: params.consultaId ?? null,
        },
      });
    }
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
        description: null,
        dose: "1 comp",
        freq: "c/8h",
        route: "VO",
        startAt: new Date(),
        isActive: true,
        consultaId: params.consultaId ?? null,
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
      { snapshotId: od.idOdontogramSnapshot, toothNumber: 16, surface: DienteSuperficie.O, condition: ToothCondition.CARIES },
      { snapshotId: od.idOdontogramSnapshot, toothNumber: 26, surface: DienteSuperficie.O, condition: ToothCondition.FILLED },
    ],
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
      { snapshotId: perio.idPeriodontogramSnapshot, toothNumber: 16, site: PerioSite.MB, probingDepthMm: 3, bleeding: PerioBleeding.NONE },
      { snapshotId: perio.idPeriodontogramSnapshot, toothNumber: 16, site: PerioSite.B, probingDepthMm: 2, bleeding: PerioBleeding.NONE },
    ],
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

export async function ensureAntecedentCatalog(
  prisma: PrismaClient,
  items: Array<{
    code: string;
    name: string;
    category: string;
    description?: string;
  }>
) {
  for (const it of items) {
    await prisma.antecedentCatalog.upsert({
      where: { code: it.code },
      update: {
        name: it.name,
        category: it.category as any,
        description: it.description ?? null,
        isActive: true,
      },
      create: {
        code: it.code,
        name: it.name,
        category: it.category as any,
        description: it.description ?? null,
        isActive: true,
      },
    });
  }
}

export async function ensureAnamnesisConfig(
  prisma: PrismaClient,
  items: Array<{
    key: string;
    value: unknown;
    description?: string;
    updatedByUserId: number;
  }>
) {
  for (const it of items) {
    await prisma.anamnesisConfig.upsert({
      where: { key: it.key },
      update: {
        value: it.value as any,
        description: it.description ?? null,
        updatedByUserId: it.updatedByUserId,
      },
      create: {
        key: it.key,
        value: it.value as any,
        description: it.description ?? null,
        updatedByUserId: it.updatedByUserId,
      },
    });
  }
}

export async function ensureProfesionalDisponibilidad(
  prisma: PrismaClient,
  profesionalId: number,
  disponibilidad: Record<string, Array<{ inicio: string; fin: string }>>
) {
  await prisma.profesional.update({
    where: { idProfesional: profesionalId },
    data: { disponibilidad: disponibilidad as any },
  });
}