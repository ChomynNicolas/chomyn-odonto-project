import {
  PrismaClient,
  RolNombre,
  TipoDocumento,
  TipoContacto,
  TipoCita,
  EstadoCita,
  RelacionPaciente,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ---------- Utils de normalización ----------
function normPhonePY(raw: string): string {
  let s = raw.replace(/\D+/g, '')
  if (s.startsWith('0')) s = s.slice(1)
  if (!s.startsWith('595')) s = '595' + s
  return '+' + s
}
function normEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

// ---------- Personas / Documento / Contactos ----------
async function ensurePersonaConDocumento(p: {
  nombres: string
  apellidos: string
  genero?: string | null
  fechaNacimiento?: Date | null
  doc: { tipo: TipoDocumento; numero: string; paisEmision?: string | null; ruc?: string | null }
}) {
  const { doc } = p
  const existente = await prisma.documento.findFirst({
    where: { tipo: doc.tipo, numero: doc.numero, paisEmision: doc.paisEmision ?? null },
    include: { persona: true },
  })
  if (existente) {
    if (!existente.persona.estaActivo || !existente.persona.nombres || !existente.persona.apellidos) {
      await prisma.persona.update({
        where: { idPersona: existente.persona.idPersona },
        data: {
          estaActivo: true,
          nombres: existente.persona.nombres || p.nombres,
          apellidos: existente.persona.apellidos || p.apellidos,
          genero: p.genero as any,
          fechaNacimiento: p.fechaNacimiento ?? undefined,
        },
      })
    }
    return existente.persona
  }
  return prisma.persona.create({
    data: {
      nombres: p.nombres,
      apellidos: p.apellidos,
      genero: (p.genero as any) ?? null,
      fechaNacimiento: p.fechaNacimiento ?? null,
      estaActivo: true,
      documento: {
        create: {
          tipo: doc.tipo,
          numero: doc.numero,
          paisEmision: doc.paisEmision ?? null,
          ruc: doc.ruc ?? null,
        },
      },
    },
  })
}

async function ensureContactos(
  personaId: number,
  contactos: Array<{
    tipo: TipoContacto
    valor: string
    label?: string
    whatsappCapaz?: boolean
    smsCapaz?: boolean
    esPrincipal?: boolean
    esPreferidoRecordatorio?: boolean
    esPreferidoCobranza?: boolean
  }>
) {
  for (const c of contactos) {
    const valorNorm = c.tipo === 'PHONE' ? normPhonePY(c.valor) : normEmail(c.valor)
    await prisma.personaContacto.upsert({
      where: { personaId_tipo_valorNorm: { personaId, tipo: c.tipo, valorNorm } },
      update: {
        label: c.label,
        whatsappCapaz: c.whatsappCapaz,
        smsCapaz: c.smsCapaz,
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
        label: c.label,
        whatsappCapaz: c.whatsappCapaz,
        smsCapaz: c.smsCapaz,
        esPrincipal: !!c.esPrincipal,
        esPreferidoRecordatorio: !!c.esPreferidoRecordatorio,
        esPreferidoCobranza: !!c.esPreferidoCobranza,
        activo: true,
      },
    })
  }
}

// ---------- Seguridad / Usuarios / Roles ----------
async function ensureRoles() {
  for (const r of [RolNombre.ADMIN, RolNombre.ODONT, RolNombre.RECEP]) {
    await prisma.rol.upsert({
      where: { nombreRol: r },
      update: {},
      create: { nombreRol: r },
    })
  }
}

async function ensureUsuario(u: {
  usuario: string
  email?: string
  nombreApellido: string
  rol: RolNombre
  password: string
}) {
  const hash = await bcrypt.hash(u.password, 12)
  return prisma.usuario.upsert({
    where: { usuario: u.usuario.toLowerCase() },
    update: {},
    create: {
      usuario: u.usuario.toLowerCase(),
      email: u.email ? normEmail(u.email) : null,
      nombreApellido: u.nombreApellido,
      passwordHash: hash,
      rol: { connect: { nombreRol: u.rol } },
      estaActivo: true,
    },
  })
}

async function ensureEspecialidades(nombres: string[]) {
  for (const nombre of nombres) {
    await prisma.especialidad.upsert({
      where: { nombre },
      update: { isActive: true },
      create: { nombre, isActive: true },
    })
  }
}
async function ensureProfesionalEspecialidades(profesionalId: number, nombres: string[]) {
  for (const nombre of nombres) {
    const esp = await prisma.especialidad.findUnique({ where: { nombre } })
    if (!esp) continue
    await prisma.profesionalEspecialidad.upsert({
      where: { profesionalId_especialidadId: { profesionalId, especialidadId: esp.idEspecialidad } },
      update: {},
      create: { profesionalId, especialidadId: esp.idEspecialidad },
    })
  }
}

// ---------- Agenda: Paciente / Responsable / Consultorio / Cita ----------
async function ensurePacienteFromPersona(personaId: number) {
  // Usa el campo único definido en Prisma (personaId), no el nombre mapeado SQL
  const existing = await prisma.paciente.findUnique({
    where: { personaId },
  })
  if (existing) return existing

  return prisma.paciente.create({
    data: { personaId, estaActivo: true },
  })
}

async function ensureResponsablePrincipal(pacienteId: number, personaId: number, relacion: RelacionPaciente) {
  const exists = await prisma.pacienteResponsable.findFirst({
    where: { pacienteId, personaId, relacion },
  })
  if (exists) return exists
  return prisma.pacienteResponsable.create({
    data: {
      pacienteId,
      personaId,
      relacion,
      esPrincipal: true, // si luego agregas el índice único parcial, este campo quedará garantizado
      autoridadLegal: true,
      vigenteDesde: new Date(),
    },
  })
}

async function ensureConsultorio(nombre: string, colorHex?: string) {
  return prisma.consultorio.upsert({
    where: { nombre },
    update: { activo: true, colorHex },
    create: { nombre, activo: true, colorHex },
  })
}

// Como no tienes constraints de solapamiento en BD, controlamos por app al sembrar:
async function haySolapeCita(params: {
  profesionalId: number
  consultorioId?: number | null
  inicio: Date
  fin: Date
}) {
  const { profesionalId, consultorioId, inicio, fin } = params
  const solapeProfesional = await prisma.cita.findFirst({
    where: {
      profesionalId,
      // (inicio < fin2) AND (fin > inicio2)
      inicio: { lt: fin },
      fin: { gt: inicio },
    },
    select: { idCita: true },
  })
  if (solapeProfesional) return true

  if (consultorioId) {
    const solapeSala = await prisma.cita.findFirst({
      where: {
        consultorioId,
        inicio: { lt: fin },
        fin: { gt: inicio },
      },
      select: { idCita: true },
    })
    if (solapeSala) return true
  }
  return false
}

async function crearCitaSegura(data: {
  pacienteId: number
  profesionalId: number
  consultorioId?: number | null
  createdById: number
  inicio: Date
  fin: Date
  tipo: TipoCita
  estado?: EstadoCita
  motivo?: string | null
  notas?: string | null
}) {
  const overlap = await haySolapeCita({
    profesionalId: data.profesionalId,
    consultorioId: data.consultorioId ?? null,
    inicio: data.inicio,
    fin: data.fin,
  })
  if (overlap) {
    console.warn('⚠️  Evitada creación de cita solapada (profesional o sala). Ajusta horarios en el seed.')
    return null
  }
  return prisma.cita.create({ data: { estado: EstadoCita.SCHEDULED, ...data } })
}

async function main() {
  console.log('🌱 Seed: inicio')

  // 1) Roles
  await ensureRoles()

  // 2) Usuarios base
  const admin = await ensureUsuario({
    usuario: 'admin',
    email: 'admin@clinica.com',
    nombreApellido: 'Administrador General',
    rol: RolNombre.ADMIN,
    password: 'Admin123!',
  })
  const recep = await ensureUsuario({
    usuario: 'recep.sosa',
    email: 'recep@clinica.com',
    nombreApellido: 'Recepcionista Sosa',
    rol: RolNombre.RECEP,
    password: 'Recep123!',
  })
  const odUser = await ensureUsuario({
    usuario: 'dra.vera',
    email: 'doctora@clinica.com',
    nombreApellido: 'Dra. Vera López',
    rol: RolNombre.ODONT,
    password: 'Odont123!',
  })

  // 3) Persona + Documento + Contactos (odontóloga)
  const personaVera = await ensurePersonaConDocumento({
    nombres: 'Vera',
    apellidos: 'López',
    genero: 'FEMENINO',
    fechaNacimiento: new Date('1990-03-15'),
    doc: { tipo: TipoDocumento.CI, numero: '1234567', paisEmision: 'PY', ruc: null },
  })
  await ensureContactos(personaVera.idPersona, [
    { tipo: 'PHONE', valor: '0981 111 222', label: 'Móvil', whatsappCapaz: true, smsCapaz: true, esPrincipal: true, esPreferidoRecordatorio: true },
    { tipo: 'EMAIL', valor: 'doctora@clinica.com', label: 'Trabajo', esPrincipal: true, esPreferidoCobranza: true },
  ])

  // 4) Profesional (1:1 con Usuario y Persona)
  const profesionalVera = await prisma.profesional.upsert({
    where: { userId: odUser.idUsuario },
    update: {},
    create: {
      userId: odUser.idUsuario,
      personaId: personaVera.idPersona,
      numeroLicencia: 'ODT-12345',
      estaActivo: true,
    },
  })

  // 5) Especialidades y vínculo
  await ensureEspecialidades(['Odontología General', 'Endodoncia', 'Ortodoncia'])
  await ensureProfesionalEspecialidades(profesionalVera.idProfesional, ['Odontología General', 'Endodoncia'])

  // 6) Persona + Documento + Contactos (recepcionista, no profesional)
  const personaRecep = await ensurePersonaConDocumento({
    nombres: 'Laura',
    apellidos: 'Sosa',
    genero: 'FEMENINO',
    fechaNacimiento: new Date('1998-11-20'),
    doc: { tipo: TipoDocumento.CI, numero: '7654321', paisEmision: 'PY', ruc: null },
  })
  await ensureContactos(personaRecep.idPersona, [
    { tipo: 'PHONE', valor: '0971 333 444', label: 'Móvil', whatsappCapaz: true, smsCapaz: true, esPrincipal: true },
    { tipo: 'EMAIL', valor: 'recep@clinica.com', label: 'Trabajo', esPrincipal: true },
  ])

  // 7) Paciente (niño) + Responsable (madre)
  const personaNinio = await ensurePersonaConDocumento({
    nombres: 'Carlos',
    apellidos: 'Pérez',
    genero: 'MASCULINO',
    fechaNacimiento: new Date('2015-06-10'),
    doc: { tipo: TipoDocumento.CI, numero: '5588991', paisEmision: 'PY' },
  })
  await ensureContactos(personaNinio.idPersona, [
    { tipo: 'PHONE', valor: '0984 555 666', label: 'Tutor', whatsappCapaz: true, smsCapaz: true },
  ])
  const pacienteNinio = await ensurePacienteFromPersona(personaNinio.idPersona)

  const personaMadre = await ensurePersonaConDocumento({
    nombres: 'María',
    apellidos: 'Pérez',
    genero: 'FEMENINO',
    fechaNacimiento: new Date('1988-02-01'),
    doc: { tipo: TipoDocumento.CI, numero: '4411223', paisEmision: 'PY', ruc: '4411223-1' },
  })
  await ensureContactos(personaMadre.idPersona, [
    { tipo: 'PHONE', valor: '0982 777 888', label: 'Móvil', whatsappCapaz: true, smsCapaz: true, esPrincipal: true, esPreferidoCobranza: true },
    { tipo: 'EMAIL', valor: 'maria.perez@example.com', label: 'Personal', esPrincipal: true, esPreferidoRecordatorio: true },
  ])

  await ensureResponsablePrincipal(pacienteNinio.idPaciente, personaMadre.idPersona, RelacionPaciente.MADRE)

  // 8) Consultorios
  const box1 = await ensureConsultorio('Box 1', '#2DD4BF')
  const box2 = await ensureConsultorio('Box 2', '#60A5FA')

  // 9) Citas de prueba (sin solaparse)
  const now = new Date()
  const t1Start = new Date(now.getTime())
  t1Start.setHours(t1Start.getHours() + 1, 0, 0, 0) // +1h redondeado
  const t1End = new Date(t1Start.getTime() + 45 * 60 * 1000) // 45 min

  const t2Start = new Date(t1End.getTime() + 15 * 60 * 1000) // 15 min después de la anterior
  const t2End = new Date(t2Start.getTime() + 60 * 60 * 1000) // 60 min

  // Cita 1 (niño con la odontóloga, creada por recep, en Box 1)
  const cita1 = await crearCitaSegura({
    pacienteId: pacienteNinio.idPaciente,
    profesionalId: profesionalVera.idProfesional,
    consultorioId: box1.idConsultorio,
    createdById: recep.idUsuario,
    inicio: t1Start,
    fin: t1End,
    tipo: TipoCita.CONSULTA,
    estado: EstadoCita.SCHEDULED,
    motivo: 'Dolor molar',
  })

  // Cita 2 (otro turno en Box 1, no solapa)
  const cita2 = await crearCitaSegura({
    pacienteId: pacienteNinio.idPaciente,
    profesionalId: profesionalVera.idProfesional,
    consultorioId: box1.idConsultorio,
    createdById: recep.idUsuario,
    inicio: t2Start,
    fin: t2End,
    tipo: TipoCita.CONTROL,
    estado: EstadoCita.SCHEDULED,
    motivo: 'Control post tratamiento',
  })

  console.log('✅ Seed completado', { cita1: !!cita1, cita2: !!cita2 })
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
