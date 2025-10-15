import { PrismaClient, RolNombre, TipoDocumento, TipoContacto } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** util mínima para normalizar teléfonos a E.164 (paraguay +595) en casos simples */
function normPhonePY(raw: string): string {
  let s = raw.replace(/\D+/g, '')
  if (s.startsWith('0')) s = s.slice(1)
  if (!s.startsWith('595')) s = '595' + s
  return '+' + s
}
function normEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** Busca o crea Persona + Documento único (tipo+numero+pais) */
async function ensurePersonaConDocumento(p: {
  nombres: string
  apellidos: string
  genero?: string | null
  fechaNacimiento?: Date | null
  doc: { tipo: TipoDocumento; numero: string; paisEmision?: string | null; ruc?: string | null }
}) {
  const { doc } = p
  // 1) ¿Existe Documento (unique [tipo, numero, paisEmision])?
  const existente = await prisma.documento.findFirst({
    where: { tipo: doc.tipo, numero: doc.numero, paisEmision: doc.paisEmision ?? null },
    include: { persona: true },
  })
  if (existente) {
    // Asegura que la persona esté activa y con nombres actualizados si estuvieran vacíos
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

  // 2) Crear Persona y Documento
  const persona = await prisma.persona.create({
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
  return persona
}

/** Crea contactos idempotentes (unique [personaId, tipo, valorNorm]) */
async function ensureContactos(personaId: number, contactos: Array<{
  tipo: TipoContacto
  valor: string
  label?: string
  whatsappCapaz?: boolean
  smsCapaz?: boolean
  esPrincipal?: boolean
  esPreferidoRecordatorio?: boolean
  esPreferidoCobranza?: boolean
}>) {
  for (const c of contactos) {
    const valorNorm = c.tipo === 'PHONE' ? normPhonePY(c.valor) : normEmail(c.valor)
    await prisma.personaContacto.upsert({
      where: {
        personaId_tipo_valorNorm: { personaId, tipo: c.tipo, valorNorm },
      },
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

/** Roles base */
async function ensureRoles() {
  for (const r of [RolNombre.ADMIN, RolNombre.ODONT, RolNombre.RECEP]) {
    await prisma.rol.upsert({
      where: { nombreRol: r },
      update: {},
      create: { nombreRol: r },
    })
  }
}

/** Usuario con rol (idempotente por username) */
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
    update: {}, // no tocamos email/rol en upsert para no romper pruebas; si necesitas, cámbialo
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

/** Especialidades y puente M:N (idempotente) */
async function ensureEspecialidades(nombres: string[]) {
  for (const nombre of nombres) {
    await prisma.especialidad.upsert({
      where: { nombre },
      update: { isActive: true },
      create: { nombre, isActive: true },
    })
  }
}

/** Vincula profesional a especialidades (sin duplicar) */
async function ensureProfesionalEspecialidades(profesionalId: number, nombres: string[]) {
  for (const nombre of nombres) {
    const esp = await prisma.especialidad.findUnique({ where: { nombre } })
    if (!esp) continue
    await prisma.profesionalEspecialidad.upsert({
      where: {
        profesionalId_especialidadId: { profesionalId, especialidadId: esp.idEspecialidad },
      },
      update: {},
      create: { profesionalId, especialidadId: esp.idEspecialidad },
    })
  }
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
    password: 'Admin123!', // dev only
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

  // 3) Persona + Documento + Contactos para la odontóloga
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

  // 4) Profesional (1:1 Usuario ↔ Profesional y 1:1 Persona ↔ Profesional)
  //    upsert por unique(userId)
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

  // 5) Especialidades y vínculo M:N
  await ensureEspecialidades(['Odontología General', 'Endodoncia', 'Ortodoncia'])
  await ensureProfesionalEspecialidades(profesionalVera.idProfesional, ['Odontología General', 'Endodoncia'])

  // 6) (Opcional) Persona + Documento + Contactos para la recepcionista (no profesional)
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

  console.log('✅ Seed completado')
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
