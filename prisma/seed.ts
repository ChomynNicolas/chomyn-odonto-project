import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Hash passwords using bcrypt
 * Plain text passwords for reference:
 * - admin123 → $2a$10$wD8YhZ9dMhZvEe6u.8rXyOxvG9tXqHGbZ7vJ5NJcZ4kXhQYyJ1Znu
 * - odont123 → $2a$10$Y1KfMZzJvXqHGbZ7vJ5NJcZ4kXhQYyJ1ZnuwD8YhZ9dMhZvEe6u.8r
 * - recep123 → $2a$10$xvG9tXqHGbZ7vJ5NJcZ4kXhQYyJ1ZnuwD8YhZ9dMhZvEe6u.8rXyO
 */
async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

/**
 * Generate random selection from array (deterministic based on index)
 */
function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

/**
 * Generate date range helper
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Check if two date ranges overlap
 */
function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Normalize phone numbers (Paraguay format)
 */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, ''); // Remove non-digits
}

/**
 * Normalize email
 */
function normalizeEmail(raw: string): string {
  return raw.toLowerCase().trim();
}

// ============================================================
// SAMPLE DATA CONSTANTS
// ============================================================

const NOMBRES_MASCULINOS = [
  'Juan', 'Carlos', 'Miguel', 'Pedro', 'Luis', 'José', 'Francisco', 'Antonio'
];

const NOMBRES_FEMENINOS = [
  'María', 'Ana', 'Carmen', 'Laura', 'Rosa', 'Patricia', 'Gloria', 'Sofía'
];

const APELLIDOS = [
  'González', 'Rodríguez', 'Martínez', 'García', 'López', 'Fernández', 
  'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Benítez', 'Acosta'
];

const CIUDADES_PY = [
  'Asunción', 'Ciudad del Este', 'Luque', 'San Lorenzo', 'Lambaré', 
  'Fernando de la Mora', 'Capiatá', 'Encarnación'
];

const DIRECCIONES = [
  'Av. España c/ Brasil',
  'Calle Palma 123',
  'Av. Mcal. López 456',
  'Calle 15 de Agosto',
  'Av. Eusebio Ayala',
  'Calle Eligio Ayala'
];

// ============================================================
// SEED FUNCTIONS
// ============================================================

/**
 * Phase 1: Seed Roles
 */
async function seedRoles() {
  console.log('📋 Seeding roles...');
  
  const roles = [
    { nombreRol: 'ADMIN' as const },
    { nombreRol: 'ODONT' as const },
    { nombreRol: 'RECEP' as const }
  ];

  for (const roleData of roles) {
    await prisma.rol.upsert({
      where: { nombreRol: roleData.nombreRol },
      update: {},
      create: roleData
    });
  }

  console.log('✅ Roles seeded');
}

/**
 * Phase 2: Seed Users and Professionals
 */
async function seedUsersAndProfessionals() {
  console.log('👥 Seeding users and professionals...');

  const roles = await prisma.rol.findMany();
  const adminRole = roles.find(r => r.nombreRol === 'ADMIN')!;
  const odontRole = roles.find(r => r.nombreRol === 'ODONT')!;
  const recepRole = roles.find(r => r.nombreRol === 'RECEP')!;

  // Admin user
  const adminUser = await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      usuario: 'admin',
      email: 'admin@clinica.com',
      passwordHash: await hashPassword('admin123'), // Plain: admin123
      nombreApellido: 'Administrador Sistema',
      rolId: adminRole.idRol,
      estaActivo: true
    }
  });

  // Odontologist 1: Dr. Carlos González
  const personaCarlos = await prisma.persona.create({
    data: {
      nombres: 'Carlos',
      apellidos: 'González',
      segundoApellido: 'Martínez',
      fechaNacimiento: new Date('1980-05-15'),
      genero: 'MASCULINO',
      direccion: 'Av. España 1234',
      ciudad: 'Asunción',
      pais: 'PY',
      contactoEmergenciaNombre: 'María González',
      contactoEmergenciaTelefono: '+595981123456',
      contactoEmergenciaRelacion: 'CONYUGE',
      estaActivo: true
    }
  });

  const userCarlos = await prisma.usuario.upsert({
    where: { usuario: 'cglz' },
    update: {},
    create: {
      usuario: 'cglz',
      email: 'carlos.gonzalez@clinica.com',
      passwordHash: await hashPassword('odont123'), // Plain: odont123
      nombreApellido: 'Dr. Carlos González',
      rolId: odontRole.idRol,
      estaActivo: true
    }
  });

  await prisma.profesional.upsert({
    where: { userId: userCarlos.idUsuario },
    update: {},
    create: {
      userId: userCarlos.idUsuario,
      personaId: personaCarlos.idPersona,
      numeroLicencia: 'ODO-PY-001234',
      estaActivo: true,
      disponibilidad: {
        lunes: [{ inicio: '08:00', fin: '12:00' }, { inicio: '14:00', fin: '18:00' }],
        martes: [{ inicio: '08:00', fin: '12:00' }, { inicio: '14:00', fin: '18:00' }],
        miercoles: [{ inicio: '08:00', fin: '12:00' }, { inicio: '14:00', fin: '18:00' }],
        jueves: [{ inicio: '08:00', fin: '12:00' }, { inicio: '14:00', fin: '18:00' }],
        viernes: [{ inicio: '08:00', fin: '12:00' }, { inicio: '14:00', fin: '17:00' }]
      }
    }
  });

  // Odontologist 2: Dra. Ana Rodríguez
  const personaAna = await prisma.persona.create({
    data: {
      nombres: 'Ana',
      apellidos: 'Rodríguez',
      segundoApellido: 'López',
      fechaNacimiento: new Date('1985-09-22'),
      genero: 'FEMENINO',
      direccion: 'Calle Palma 567',
      ciudad: 'Asunción',
      pais: 'PY',
      contactoEmergenciaNombre: 'Pedro Rodríguez',
      contactoEmergenciaTelefono: '+595981234567',
      contactoEmergenciaRelacion: 'FAMILIAR',
      estaActivo: true
    }
  });

  const userAna = await prisma.usuario.upsert({
    where: { usuario: 'arlz' },
    update: {},
    create: {
      usuario: 'arlz',
      email: 'ana.rodriguez@clinica.com',
      passwordHash: await hashPassword('odont123'), // Plain: odont123
      nombreApellido: 'Dra. Ana Rodríguez',
      rolId: odontRole.idRol,
      estaActivo: true
    }
  });

  await prisma.profesional.upsert({
    where: { userId: userAna.idUsuario },
    update: {},
    create: {
      userId: userAna.idUsuario,
      personaId: personaAna.idPersona,
      numeroLicencia: 'ODO-PY-005678',
      estaActivo: true,
      disponibilidad: {
        lunes: [{ inicio: '09:00', fin: '13:00' }, { inicio: '15:00', fin: '19:00' }],
        martes: [{ inicio: '09:00', fin: '13:00' }, { inicio: '15:00', fin: '19:00' }],
        miercoles: [{ inicio: '09:00', fin: '13:00' }, { inicio: '15:00', fin: '19:00' }],
        jueves: [{ inicio: '09:00', fin: '13:00' }, { inicio: '15:00', fin: '19:00' }],
        viernes: [{ inicio: '09:00', fin: '13:00' }]
      }
    }
  });

  // Receptionist
  await prisma.usuario.upsert({
    where: { usuario: 'recep' },
    update: {},
    create: {
      usuario: 'recep',
      email: 'recepcion@clinica.com',
      passwordHash: await hashPassword('recep123'), // Plain: recep123
      nombreApellido: 'Laura Martínez',
      rolId: recepRole.idRol,
      estaActivo: true
    }
  });

  console.log('✅ Users and professionals seeded');
}

/**
 * Phase 3: Seed Specialties and link to professionals
 */
async function seedSpecialties() {
  console.log('🦷 Seeding specialties...');

  const specialties = [
    { nombre: 'Odontología General', descripcion: 'Atención odontológica general' },
    { nombre: 'Ortodoncia', descripcion: 'Corrección de malposiciones dentales' },
    { nombre: 'Endodoncia', descripcion: 'Tratamiento de conductos radiculares' },
    { nombre: 'Periodoncia', descripcion: 'Tratamiento de encías y tejidos de soporte' },
    { nombre: 'Cirugía Oral', descripcion: 'Procedimientos quirúrgicos orales' }
  ];

  for (const spec of specialties) {
    await prisma.especialidad.upsert({
      where: { nombre: spec.nombre },
      update: {
        descripcion: spec.descripcion,
      },
      create: {
        nombre: spec.nombre,
        descripcion: spec.descripcion,
      },
    });
  }

  // Link professionals to specialties
  const professionals = await prisma.profesional.findMany();
  const allSpecialties = await prisma.especialidad.findMany();

  // Dr. Carlos: General + Endodoncia
  const carlos = professionals.find(p => p.numeroLicencia === 'ODO-PY-001234');
  const general = allSpecialties.find(s => s.nombre === 'Odontología General');
  const endo = allSpecialties.find(s => s.nombre === 'Endodoncia');

  if (carlos && general) {
    await prisma.profesionalEspecialidad.upsert({
      where: {
        profesionalId_especialidadId: {
          profesionalId: carlos.idProfesional,
          especialidadId: general.idEspecialidad
        }
      },
      update: {},
      create: {
        profesionalId: carlos.idProfesional,
        especialidadId: general.idEspecialidad
      }
    });
  }

  if (carlos && endo) {
    await prisma.profesionalEspecialidad.upsert({
      where: {
        profesionalId_especialidadId: {
          profesionalId: carlos.idProfesional,
          especialidadId: endo.idEspecialidad
        }
      },
      update: {},
      create: {
        profesionalId: carlos.idProfesional,
        especialidadId: endo.idEspecialidad
      }
    });
  }

  // Dra. Ana: General + Ortodoncia
  const ana = professionals.find(p => p.numeroLicencia === 'ODO-PY-005678');
  const orto = allSpecialties.find(s => s.nombre === 'Ortodoncia');

  if (ana && general) {
    await prisma.profesionalEspecialidad.upsert({
      where: {
        profesionalId_especialidadId: {
          profesionalId: ana.idProfesional,
          especialidadId: general.idEspecialidad
        }
      },
      update: {},
      create: {
        profesionalId: ana.idProfesional,
        especialidadId: general.idEspecialidad
      }
    });
  }

  if (ana && orto) {
    await prisma.profesionalEspecialidad.upsert({
      where: {
        profesionalId_especialidadId: {
          profesionalId: ana.idProfesional,
          especialidadId: orto.idEspecialidad
        }
      },
      update: {},
      create: {
        profesionalId: ana.idProfesional,
        especialidadId: orto.idEspecialidad
      }
    });
  }

  console.log('✅ Specialties seeded');
}

/**
 * Phase 4: Seed Patients with Personas
 */
async function seedPatientsAndPersonas() {
  console.log('🧑 Seeding patients and personas...');

  const patientData = [
    {
      nombres: 'Roberto',
      apellidos: 'Pérez',
      segundoApellido: 'García',
      fechaNacimiento: new Date('1975-03-10'),
      genero: 'MASCULINO' as const,
      ciudad: 'Asunción',
      docTipo: 'CI' as const,
      docNumero: '1234567',
      esAdulto: true
    },
    {
      nombres: 'María',
      apellidos: 'Fernández',
      segundoApellido: 'López',
      fechaNacimiento: new Date('1990-07-18'),
      genero: 'FEMENINO' as const,
      ciudad: 'Luque',
      docTipo: 'CI' as const,
      docNumero: '2345678',
      esAdulto: true
    },
    {
      nombres: 'Pedro',
      apellidos: 'Sánchez',
      segundoApellido: 'Torres',
      fechaNacimiento: new Date('1982-11-25'),
      genero: 'MASCULINO' as const,
      ciudad: 'San Lorenzo',
      docTipo: 'CI' as const,
      docNumero: '3456789',
      esAdulto: true
    },
    {
      nombres: 'Carmen',
      apellidos: 'Ramírez',
      segundoApellido: 'Benítez',
      fechaNacimiento: new Date('1995-02-14'),
      genero: 'FEMENINO' as const,
      ciudad: 'Asunción',
      docTipo: 'CI' as const,
      docNumero: '4567890',
      esAdulto: true
    },
    {
      nombres: 'Luis',
      apellidos: 'Torres',
      segundoApellido: 'Flores',
      fechaNacimiento: new Date('1988-06-30'),
      genero: 'MASCULINO' as const,
      ciudad: 'Fernando de la Mora',
      docTipo: 'CI' as const,
      docNumero: '5678901',
      esAdulto: true
    },
    // Minor patient (child)
    {
      nombres: 'Sofía',
      apellidos: 'González',
      segundoApellido: 'Martínez',
      fechaNacimiento: new Date('2015-09-05'),
      genero: 'FEMENINO' as const,
      ciudad: 'Asunción',
      docTipo: 'CI' as const,
      docNumero: '6789012',
      esAdulto: false,
      nombrePadre: 'Jorge',
      apellidoPadre: 'González',
      docPadre: '7890123'
    },
    {
      nombres: 'Patricia',
      apellidos: 'Acosta',
      segundoApellido: 'Díaz',
      fechaNacimiento: new Date('1992-12-08'),
      genero: 'FEMENINO' as const,
      ciudad: 'Capiatá',
      docTipo: 'CI' as const,
      docNumero: '8901234',
      esAdulto: true
    },
    {
      nombres: 'Miguel',
      apellidos: 'Benítez',
      segundoApellido: 'Castro',
      fechaNacimiento: new Date('1978-04-20'),
      genero: 'MASCULINO' as const,
      ciudad: 'Asunción',
      docTipo: 'CI' as const,
      docNumero: '9012345',
      esAdulto: true
    }
  ];

  for (const data of patientData) {
    const persona = await prisma.persona.create({
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        segundoApellido: data.segundoApellido,
        fechaNacimiento: data.fechaNacimiento,
        genero: data.genero,
        direccion: pick(DIRECCIONES, Math.random() * 100),
        ciudad: data.ciudad,
        pais: 'PY',
        contactoEmergenciaNombre: data.esAdulto ? undefined : `${data.nombrePadre || 'Padre'} ${data.apellidoPadre || data.apellidos}`,
        contactoEmergenciaTelefono: data.esAdulto ? undefined : '+595981999888',
        contactoEmergenciaRelacion: data.esAdulto ? undefined : 'PADRE',
        estaActivo: true
      }
    });

    // Create document (handle duplicates gracefully)
    try {
      await prisma.documento.create({
        data: {
          personaId: persona.idPersona,
          tipo: data.docTipo,
          numero: data.docNumero,
          paisEmision: 'PY',
          fechaEmision: addMonths(new Date(), -36)
        }
      });
    } catch (error: any) {
      // Ignore duplicate document errors (P2002)
      if (error.code !== 'P2002') {
        throw error;
      }
      // If document already exists, try to link it to this persona if personaId is different
      const existingDoc = await prisma.documento.findFirst({
        where: {
          tipo: data.docTipo,
          numero: data.docNumero,
          paisEmision: 'PY'
        }
      });
      if (existingDoc && existingDoc.personaId !== persona.idPersona) {
        // Document exists for different persona - skip (this shouldn't happen in real scenario)
        console.log(`⚠️ Document ${data.docNumero} already exists for different persona, skipping`);
      }
    }

    // Create patient
    const paciente = await prisma.paciente.create({
      data: {
        personaId: persona.idPersona,
        notasAdministrativas: data.esAdulto ? 'Paciente regular' : 'Paciente pediátrico - requiere acompañamiento',
        estaActivo: true
      }
    });

    // If minor, create responsible adult
    if (!data.esAdulto && data.nombrePadre) {
      const personaPadre = await prisma.persona.create({
        data: {
          nombres: data.nombrePadre,
          apellidos: data.apellidoPadre || data.apellidos,
          fechaNacimiento: new Date('1980-01-01'),
          genero: 'MASCULINO',
          direccion: pick(DIRECCIONES, Math.random() * 100),
          ciudad: data.ciudad,
          pais: 'PY',
          estaActivo: true
        }
      });

      try {
        await prisma.documento.create({
          data: {
            personaId: personaPadre.idPersona,
            tipo: 'CI',
            numero: data.docPadre!,
            paisEmision: 'PY'
          }
        });
      } catch (error: any) {
        // Ignore duplicate document errors (P2002)
        if (error.code !== 'P2002') {
          throw error;
        }
        console.log(`⚠️ Parent document ${data.docPadre} already exists, skipping`);
      }

      await prisma.pacienteResponsable.create({
        data: {
          pacienteId: paciente.idPaciente,
          personaId: personaPadre.idPersona,
          relacion: 'PADRE',
          esPrincipal: true,
          autoridadLegal: true
        }
      });
    }
  }

  console.log('✅ Patients and personas seeded');
}

/**
 * Phase 5: Seed Contacts for Personas
 */
async function seedContactsAndDocuments() {
  console.log('📞 Seeding contacts...');

  const personas = await prisma.persona.findMany();

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    
    // Add phone contact
    const phoneRaw = `+595 981 ${String(100000 + i).padStart(6, '0')}`;
    const phoneNorm = normalizePhone(phoneRaw);

    await prisma.personaContacto.upsert({
      where: {
        personaId_tipo_valorNorm: {
          personaId: persona.idPersona,
          tipo: 'PHONE',
          valorNorm: phoneNorm
        }
      },
      update: {},
      create: {
        personaId: persona.idPersona,
        tipo: 'PHONE',
        valorRaw: phoneRaw,
        valorNorm: phoneNorm,
        label: 'Móvil',
        whatsappCapaz: true,
        smsCapaz: true,
        esPrincipal: true,
        esPreferidoRecordatorio: true,
        activo: true
      }
    });

    // Add email contact (only for professionals and some adults)
    if (i < 10) {
      const emailRaw = `persona${i + 1}@example.com`;
      const emailNorm = normalizeEmail(emailRaw);

      await prisma.personaContacto.upsert({
        where: {
          personaId_tipo_valorNorm: {
            personaId: persona.idPersona,
            tipo: 'EMAIL',
            valorNorm: emailNorm
          }
        },
        update: {},
        create: {
          personaId: persona.idPersona,
          tipo: 'EMAIL',
          valorRaw: emailRaw,
          valorNorm: emailNorm,
          label: 'Personal',
          esPrincipal: false,
          activo: true
        }
      });
    }
  }

  console.log('✅ Contacts seeded');
}

/**
 * Phase 6: Seed Consultorio
 */
async function seedConsultorio() {
  console.log('🏥 Seeding consultorio...');

  await prisma.consultorio.upsert({
    where: { nombre: 'Consultorio Principal' },
    update: {},
    create: {
      nombre: 'Consultorio Principal',
      colorHex: '#4A90E2',
      activo: true
    }
  });

  console.log('✅ Consultorio seeded');
}

/**
 * Phase 7: Seed Procedure Catalog
 */
async function seedProcedureCatalog() {
  console.log('💉 Seeding procedure catalog...');

  const procedures = [
    {
      code: 'CON-001',
      nombre: 'Consulta General',
      descripcion: 'Consulta odontológica general',
      defaultDurationMin: 30,
      defaultPriceCents: 15000000, // 150,000 Gs
      aplicaDiente: false,
      aplicaSuperficie: false
    },
    {
      code: 'LIM-001',
      nombre: 'Limpieza Dental',
      descripcion: 'Profilaxis y limpieza dental completa',
      defaultDurationMin: 45,
      defaultPriceCents: 20000000,
      aplicaDiente: false,
      aplicaSuperficie: false
    },
    {
      code: 'OBT-001',
      nombre: 'Obturación Simple',
      descripcion: 'Obturación de caries simple',
      defaultDurationMin: 45,
      defaultPriceCents: 25000000,
      aplicaDiente: true,
      aplicaSuperficie: true
    },
    {
      code: 'OBT-002',
      nombre: 'Obturación Compuesta',
      descripcion: 'Obturación de caries compuesta',
      defaultDurationMin: 60,
      defaultPriceCents: 35000000,
      aplicaDiente: true,
      aplicaSuperficie: true
    },
    {
      code: 'END-001',
      nombre: 'Tratamiento de Conducto',
      descripcion: 'Endodoncia unirradicular',
      defaultDurationMin: 90,
      defaultPriceCents: 50000000,
      aplicaDiente: true,
      aplicaSuperficie: false
    },
    {
      code: 'EXT-001',
      nombre: 'Extracción Simple',
      descripcion: 'Extracción dental simple',
      defaultDurationMin: 30,
      defaultPriceCents: 20000000,
      aplicaDiente: true,
      aplicaSuperficie: false
    },
    {
      code: 'RX-001',
      nombre: 'Radiografía Periapical',
      descripcion: 'Radiografía dental periapical',
      defaultDurationMin: 15,
      defaultPriceCents: 8000000,
      aplicaDiente: true,
      aplicaSuperficie: false
    },
    {
      code: 'COR-001',
      nombre: 'Corona Dental',
      descripcion: 'Colocación de corona dental',
      defaultDurationMin: 60,
      defaultPriceCents: 80000000,
      aplicaDiente: true,
      aplicaSuperficie: false
    },
    {
      code: 'ORT-001',
      nombre: 'Control Ortodoncia',
      descripcion: 'Control mensual de ortodoncia',
      defaultDurationMin: 30,
      defaultPriceCents: 30000000,
      aplicaDiente: false,
      aplicaSuperficie: false
    },
    {
      code: 'BLA-001',
      nombre: 'Blanqueamiento Dental',
      descripcion: 'Blanqueamiento dental profesional',
      defaultDurationMin: 90,
      defaultPriceCents: 100000000,
      aplicaDiente: false,
      aplicaSuperficie: false
    }
  ];

  for (const proc of procedures) {
    await prisma.procedimientoCatalogo.upsert({
      where: { code: proc.code },
      update: {},
      create: proc
    });
  }

  console.log('✅ Procedure catalog seeded');
}

/**
 * Phase 8: Seed Catalogs (Diagnosis, Allergies, Medications)
 */
async function seedCatalogs() {
  console.log('📚 Seeding catalogs...');

  // Diagnosis Catalog
  const diagnoses = [
    { code: 'K02.0', name: 'Caries limitada al esmalte', description: 'Caries inicial' },
    { code: 'K02.1', name: 'Caries de la dentina', description: 'Caries que afecta dentina' },
    { code: 'K04.0', name: 'Pulpitis', description: 'Inflamación de la pulpa dental' },
    { code: 'K05.0', name: 'Gingivitis aguda', description: 'Inflamación aguda de encías' },
    { code: 'K05.1', name: 'Gingivitis crónica', description: 'Inflamación crónica de encías' },
    { code: 'K08.1', name: 'Pérdida de dientes por accidente', description: 'Pérdida traumática' },
    { code: 'K10.2', name: 'Enfermedad inflamatoria de los maxilares', description: 'Inflamación maxilar' }
  ];

  for (const diag of diagnoses) {
    await prisma.diagnosisCatalog.upsert({
      where: { code: diag.code },
      update: {},
      create: diag
    });
  }

  // Allergy Catalog
  const allergies = [
    { name: 'Penicilina', description: 'Alergia a penicilina y derivados' },
    { name: 'Látex', description: 'Alergia al látex' },
    { name: 'Lidocaína', description: 'Alergia a anestésicos locales' },
    { name: 'Ibuprofeno', description: 'Alergia a antiinflamatorios no esteroideos' },
    { name: 'Níquel', description: 'Alergia a metales' }
  ];

  for (const allergy of allergies) {
    await prisma.allergyCatalog.upsert({
      where: { name: allergy.name },
      update: {},
      create: allergy
    });
  }

  // Medication Catalog
  const medications = [
    { name: 'Amoxicilina 500mg', description: 'Antibiótico' },
    { name: 'Ibuprofeno 400mg', description: 'Antiinflamatorio y analgésico' },
    { name: 'Paracetamol 500mg', description: 'Analgésico y antipirético' },
    { name: 'Ácido Tranexámico', description: 'Antihemorrágico' },
    { name: 'Clorhexidina 0.12%', description: 'Enjuague bucal antiséptico' }
  ];

  for (const med of medications) {
    await prisma.medicationCatalog.upsert({
      where: { name: med.name },
      update: {},
      create: med
    });
  }

  console.log('✅ Catalogs seeded');
}

/**
 * Phase 9: Seed Appointments (Citas) with overlap detection
 */
async function seedCitasWithoutOverlap() {
  console.log('📅 Seeding appointments...');

  const professionals = await prisma.profesional.findMany();
  const patients = await prisma.paciente.findMany();
  const consultorio = await prisma.consultorio.findFirst();
  const createdByUser = await prisma.usuario.findFirst({ where: { usuario: 'recep' } });

  if (!consultorio || !createdByUser || professionals.length === 0 || patients.length === 0) {
    console.log('⚠️ Missing required data for appointments');
    return;
  }

  const appointmentTypes: Array<{ tipo: any; duracion: number }> = [
    { tipo: 'CONSULTA', duracion: 30 },
    { tipo: 'LIMPIEZA', duracion: 45 },
    { tipo: 'ENDODONCIA', duracion: 90 },
    { tipo: 'CONTROL', duracion: 30 },
    { tipo: 'URGENCIA', duracion: 45 }
  ];

  const estados: any[] = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  // Track existing appointments to check overlaps
  const existingCitas: Array<{
    profesionalId: number;
    consultorioId: number;
    inicio: Date;
    fin: Date;
  }> = [];

  const today = new Date();
  let citasCreated = 0;

  // Generate 30 appointments over next 4 weeks
  for (let day = 1; day <= 28 && citasCreated < 30; day++) {
    const appointmentDate = addDays(today, day);
    
    // Skip weekends
    if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) continue;

    // Generate 1-3 appointments per day
    const appointmentsPerDay = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < appointmentsPerDay && citasCreated < 30; i++) {
      const professional = pick(professionals, citasCreated);
      const patient = pick(patients, citasCreated);
      const appointmentType = pick(appointmentTypes, citasCreated);
      const estado = pick(estados, citasCreated);

      // Generate time slot (between 8:00 and 17:00)
      const hour = 8 + Math.floor(Math.random() * 9);
      const minute = Math.random() < 0.5 ? 0 : 30;

      const inicio = new Date(appointmentDate);
      inicio.setHours(hour, minute, 0, 0);
      const fin = addMinutes(inicio, appointmentType.duracion);

      // Check for overlaps
      const hasOverlap = existingCitas.some(existing => {
        if (existing.profesionalId === professional.idProfesional) {
          return rangesOverlap(inicio, fin, existing.inicio, existing.fin);
        }
        if (existing.consultorioId === consultorio.idConsultorio) {
          return rangesOverlap(inicio, fin, existing.inicio, existing.fin);
        }
        return false;
      });

      if (hasOverlap) {
        console.log(`⚠️ Skipping overlapping appointment for day ${day}`);
        continue;
      }

      // Create appointment
      const cita = await prisma.cita.create({
        data: {
          pacienteId: patient.idPaciente,
          profesionalId: professional.idProfesional,
          consultorioId: consultorio.idConsultorio,
          createdByUserId: createdByUser.idUsuario,
          inicio,
          fin,
          duracionMinutos: appointmentType.duracion,
          tipo: appointmentType.tipo,
          estado,
          motivo: `${appointmentType.tipo} - Paciente solicita atención`,
          notas: estado === 'CANCELLED' ? 'Paciente canceló por motivos personales' : undefined,
          cancelReason: estado === 'CANCELLED' ? 'PACIENTE' : undefined,
          cancelledAt: estado === 'CANCELLED' ? new Date() : undefined,
          cancelledByUserId: estado === 'CANCELLED' ? createdByUser.idUsuario : undefined
        }
      });

      // Track this appointment
      existingCitas.push({
        profesionalId: professional.idProfesional,
        consultorioId: consultorio.idConsultorio,
        inicio,
        fin
      });

      // Create state history
      await prisma.citaEstadoHistorial.create({
        data: {
          citaId: cita.idCita,
          estadoPrevio: null,
          estadoNuevo: 'SCHEDULED',
          nota: 'Cita agendada',
          changedByUserId: createdByUser.idUsuario
        }
      });

      if (estado !== 'SCHEDULED') {
        await prisma.citaEstadoHistorial.create({
          data: {
            citaId: cita.idCita,
            estadoPrevio: 'SCHEDULED',
            estadoNuevo: estado,
            nota: estado === 'CANCELLED' ? 'Cancelado por paciente' : `Actualizado a ${estado}`,
            changedByUserId: createdByUser.idUsuario
          }
        });
      }

      citasCreated++;
    }
  }

  console.log(`✅ ${citasCreated} appointments seeded`);
}

/**
 * Phase 10: Seed Clinical Records (Consultas and Procedures)
 */
async function seedConsultasAndProcedures() {
  console.log('🏥 Seeding consultas and procedures...');

  const completedCitas = await prisma.cita.findMany({
    where: { estado: { in: ['COMPLETED', 'CONFIRMED'] } },
    include: { profesional: true }
  });

  const procedures = await prisma.procedimientoCatalogo.findMany();
  const adminUser = await prisma.usuario.findFirst({ where: { usuario: 'admin' } });

  if (!adminUser) return;

  for (const cita of completedCitas.slice(0, 15)) {
    // Create consulta
    const consulta = await prisma.consulta.create({
      data: {
        citaId: cita.idCita,
        performedById: cita.profesionalId,
        status: 'FINAL',
        startedAt: cita.inicio,
        finishedAt: cita.fin,
        diagnosis: 'Evaluación completada',
        clinicalNotes: 'Paciente presenta condición estable. Se realizaron procedimientos indicados.',
        createdByUserId: adminUser.idUsuario
      }
    });

    // Add 2-3 procedures per consulta
    const numProcedures = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < numProcedures; i++) {
      const procedure = pick(procedures, cita.idCita + i);
      
      await prisma.consultaProcedimiento.create({
        data: {
          consultaId: consulta.citaId,
          procedureId: procedure.idProcedimiento,
          toothNumber: procedure.aplicaDiente ? 1 + Math.floor(Math.random() * 32) : null,
          toothSurface: procedure.aplicaSuperficie ? pick(['O', 'M', 'D', 'V', 'L'] as const, i) : null,
          quantity: 1,
          unitPriceCents: procedure.defaultPriceCents,
          totalCents: procedure.defaultPriceCents,
          resultNotes: 'Procedimiento completado satisfactoriamente'
        }
      });
    }
  }

  console.log('✅ Consultas and procedures seeded');
}

/**
 * Phase 11: Seed Clinical Data (History, Diagnoses, Allergies, Meds, Vitals)
 */
async function seedClinicalData() {
  console.log('📋 Seeding clinical data...');

  const patients = await prisma.paciente.findMany({ take: 8 });
  const adminUser = await prisma.usuario.findFirst({ where: { usuario: 'admin' } });
  const diagnoses = await prisma.diagnosisCatalog.findMany();
  const allergies = await prisma.allergyCatalog.findMany();
  const medications = await prisma.medicationCatalog.findMany();

  if (!adminUser) return;

  for (const patient of patients) {
    // Clinical History Entry
    await prisma.clinicalHistoryEntry.create({
      data: {
        pacienteId: patient.idPaciente,
        fecha: new Date(),
        title: 'Primer visita',
        notes: 'Paciente acude por primera vez a la clínica. Se realiza evaluación inicial.',
        createdByUserId: adminUser.idUsuario
      }
    });

    // Patient Diagnoses (2-3 per patient)
    const numDiagnoses = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numDiagnoses && i < diagnoses.length; i++) {
      const diagnosis = diagnoses[i];
      
      await prisma.patientDiagnosis.create({
        data: {
          pacienteId: patient.idPaciente,
          diagnosisId: diagnosis.idDiagnosisCatalog,
          label: diagnosis.name,
          status: i === 0 ? 'ACTIVE' : 'RESOLVED',
          notedAt: addDays(new Date(), -30),
          resolvedAt: i === 0 ? null : new Date(),
          notes: i === 0 ? 'Diagnóstico activo' : 'Condición resuelta tras tratamiento',
          createdByUserId: adminUser.idUsuario
        }
      });
    }

    // Patient Allergies (1-2 per some patients)
    if (Math.random() > 0.5 && allergies.length > 0) {
      const allergy = pick(allergies, patient.idPaciente);
      
      await prisma.patientAllergy.create({
        data: {
          pacienteId: patient.idPaciente,
          allergyId: allergy.idAllergyCatalog,
          label: allergy.name,
          severity: pick(['MILD', 'MODERATE', 'SEVERE'] as const, patient.idPaciente),
          reaction: 'Reacción cutánea y/o respiratoria',
          notedAt: addDays(new Date(), -90),
          isActive: true,
          createdByUserId: adminUser.idUsuario
        }
      });
    }

    // Patient Medications (1-2 current)
    if (medications.length > 0) {
      const medication = pick(medications, patient.idPaciente);
      
      await prisma.patientMedication.create({
        data: {
          pacienteId: patient.idPaciente,
          medicationId: medication.idMedicationCatalog,
          label: medication.name,
          dose: '500mg',
          freq: 'Cada 8 horas',
          route: 'Oral',
          startAt: addDays(new Date(), -7),
          endAt: addDays(new Date(), 7),
          isActive: true,
          createdByUserId: adminUser.idUsuario
        }
      });
    }

    // Patient Vitals
    await prisma.patientVitals.create({
      data: {
        pacienteId: patient.idPaciente,
        measuredAt: new Date(),
        heightCm: 160 + Math.floor(Math.random() * 30),
        weightKg: 60 + Math.floor(Math.random() * 30),
        bpSyst: 110 + Math.floor(Math.random() * 20),
        bpDiast: 70 + Math.floor(Math.random() * 15),
        heartRate: 60 + Math.floor(Math.random() * 30),
        notes: 'Signos vitales normales',
        createdByUserId: adminUser.idUsuario
      }
    });
  }

  console.log('✅ Clinical data seeded');
}

/**
 * Phase 12: Seed Odontogram and Periodontogram
 */
async function seedOdontogramAndPeriodontogram() {
  console.log('🦷 Seeding odontogram and periodontogram...');

  const patients = await prisma.paciente.findMany({ take: 4 });
  const adminUser = await prisma.usuario.findFirst({ where: { usuario: 'admin' } });

  if (!adminUser) return;

  for (const patient of patients) {
    // Odontogram Snapshot
    const odontogramSnapshot = await prisma.odontogramSnapshot.create({
      data: {
        pacienteId: patient.idPaciente,
        takenAt: new Date(),
        notes: 'Estado dental inicial',
        createdByUserId: adminUser.idUsuario
      }
    });

    // Add entries for several teeth
    const teethToRecord = [1, 2, 3, 16, 17, 18, 19, 20, 30, 31, 32];
    const conditions: any[] = ['INTACT', 'CARIES', 'FILLED', 'ROOT_CANAL', 'CROWN'];

    for (const toothNum of teethToRecord) {
      await prisma.odontogramEntry.create({
        data: {
          snapshotId: odontogramSnapshot.idOdontogramSnapshot,
          toothNumber: toothNum,
          surface: null,
          condition: pick(conditions, toothNum),
          notes: `Diente ${toothNum}`
        }
      });
    }

    // Periodontogram Snapshot
    const periodontogramSnapshot = await prisma.periodontogramSnapshot.create({
      data: {
        pacienteId: patient.idPaciente,
        takenAt: new Date(),
        notes: 'Evaluación periodontal inicial',
        createdByUserId: adminUser.idUsuario
      }
    });

    // Add measures for selected teeth
    const teethForPerio = [1, 2, 3, 16, 30, 31];
    const sites: any[] = ['DB', 'B', 'MB', 'DL', 'L', 'ML'];

    for (const toothNum of teethForPerio) {
      for (const site of sites) {
        await prisma.periodontogramMeasure.create({
          data: {
            snapshotId: periodontogramSnapshot.idPeriodontogramSnapshot,
            toothNumber: toothNum,
            site,
            probingDepthMm: 1 + Math.floor(Math.random() * 4),
            bleeding: Math.random() > 0.7 ? 'YES' : 'NONE',
            plaque: Math.random() > 0.6,
            mobility: Math.floor(Math.random() * 2)
          }
        });
      }
    }
  }

  console.log('✅ Odontogram and periodontogram seeded');
}

/**
 * Phase 13: Seed Treatment Plans
 */
async function seedTreatmentPlans() {
  console.log('📝 Seeding treatment plans...');

  const patients = await prisma.paciente.findMany({ take: 5 });
  const adminUser = await prisma.usuario.findFirst({ where: { usuario: 'admin' } });
  const procedures = await prisma.procedimientoCatalogo.findMany();

  if (!adminUser) return;

  for (const patient of patients) {
    const treatmentPlan = await prisma.treatmentPlan.create({
      data: {
        pacienteId: patient.idPaciente,
        titulo: 'Plan de Tratamiento Integral',
        descripcion: 'Plan de tratamiento para abordar necesidades dentales del paciente',
        isActive: true,
        createdByUserId: adminUser.idUsuario
      }
    });

    // Add 3-5 steps
    const numSteps = 3 + Math.floor(Math.random() * 3);
    const statuses: any[] = ['PENDING', 'SCHEDULED', 'COMPLETED'];

    for (let i = 0; i < numSteps && i < procedures.length; i++) {
      const procedure = procedures[i];
      
      await prisma.treatmentStep.create({
        data: {
          treatmentPlanId: treatmentPlan.idTreatmentPlan,
          order: i + 1,
          procedureId: procedure.idProcedimiento,
          toothNumber: procedure.aplicaDiente ? 1 + Math.floor(Math.random() * 32) : null,
          estimatedDurationMin: procedure.defaultDurationMin,
          estimatedCostCents: procedure.defaultPriceCents,
          priority: i === 0 ? 1 : 2,
          status: pick(statuses, i),
          notes: `Paso ${i + 1} del tratamiento`
        }
      });
    }
  }

  console.log('✅ Treatment plans seeded');
}

/**
 * Phase 14: Seed Consents and Anamnesis
 */
async function seedConsentsAndAnamnesis() {
  console.log('📄 Seeding consents and anamnesis...');

  const patients = await prisma.paciente.findMany({ 
    take: 8,
    include: { persona: true }
  });
  const adminUser = await prisma.usuario.findFirst({ where: { usuario: 'admin' } });

  if (!adminUser) return;

  for (const patient of patients) {
    // Consentimiento
    await prisma.consentimiento.create({
      data: {
        Paciente_idPaciente: patient.idPaciente,
        Persona_idPersona_responsable: patient.personaId,
        Usuario_idUsuario_registradoPor: adminUser.idUsuario,
        tipo: 'TRATAMIENTO_ESPECIFICO',
        firmado_en: addDays(new Date(), -30),
        vigente_hasta: addDays(new Date(), 335),
        public_id: `consent_${patient.idPaciente}_${Date.now()}`,
        secure_url: `https://res.cloudinary.com/demo/consent_${patient.idPaciente}.pdf`,
        format: 'pdf',
        bytes: 125000,
        provider: 'CLOUDINARY',
        observaciones: 'Consentimiento firmado para tratamiento general',
        activo: true
      }
    });

    // Patient Anamnesis
    const esAdulto = patient.persona.fechaNacimiento 
      ? new Date().getFullYear() - patient.persona.fechaNacimiento.getFullYear() >= 18
      : true;

    const anamnesisPayload = esAdulto
      ? {
          antecedentesPersonales: {
            enfermedadesCronicas: ['Diabetes tipo 2'],
            alergias: [],
            medicacionActual: ['Metformina 500mg']
          },
          antecedentesFamiliares: {
            enfermedadesRelevantes: ['Hipertensión']
          },
          historiaDental: {
            ultimaVisita: '2023-06-15',
            tratamientosPrevios: ['Limpieza dental', 'Obturaciones']
          },
          habitos: {
            fumador: false,
            consumeAlcohol: false,
            bruxismo: false,
            cepilladosDiarios: 3,
            usaHiloDental: true
          }
        }
      : {
          antecedentesPerinatales: {
            embarazoNormal: true,
            partoNormal: true
          },
          desarrolloPsicomotor: {
            normal: true
          },
          habitosInfantiles: {
            usaChupete: false,
            seChupaDedo: false,
            biberon: false
          },
          lactancia: {
            maternaExclusiva: true,
            duracionMeses: 6
          }
        };

    await prisma.patientAnamnesis.create({
      data: {
        pacienteId: patient.idPaciente,
        tipo: esAdulto ? 'ADULTO' : 'PEDIATRICO',
        motivoConsulta: 'Revisión general',
        tieneDolorActual: false,
        urgenciaPercibida: 'RUTINA',
        tieneEnfermedadesCronicas: esAdulto,
        tieneAlergias: false,
        tieneMedicacionActual: esAdulto,
        embarazada: !esAdulto ? null : patient.persona.genero === 'FEMENINO' ? false : null,
        bruxismo: false,
        higieneCepilladosDia: 3,
        usaHiloDental: true,
        ultimaVisitaDental: addMonths(new Date(), -6),
        payload: anamnesisPayload,
        creadoPorUserId: adminUser.idUsuario
      }
    });
  }

  console.log('✅ Consents and anamnesis seeded');
}

/**
 * Phase 15: Seed Audit Logs
 */
async function seedAuditLogs() {
  console.log('📊 Seeding audit logs...');

  const adminUser = await prisma.usuario.findFirst({ where: { usuario: 'admin' } });
  const patients = await prisma.paciente.findMany({ take: 3 });

  if (!adminUser || patients.length === 0) return;

  const actions = [
    {
      action: 'PATIENT_CREATE',
      entity: 'Patient',
      entityId: patients[0].idPaciente,
      metadata: {
        before: null,
        after: { id: patients[0].idPaciente, activo: true }
      }
    },
    {
      action: 'PATIENT_UPDATE',
      entity: 'Patient',
      entityId: patients[1].idPaciente,
      metadata: {
        before: { notasAdministrativas: '' },
        after: { notasAdministrativas: 'Paciente actualizado' }
      }
    },
    {
      action: 'APPOINTMENT_SCHEDULE',
      entity: 'Appointment',
      entityId: 1,
      metadata: {
        appointmentDate: new Date().toISOString(),
        professional: 'Dr. Carlos González'
      }
    }
  ];

  for (const log of actions) {
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.idUsuario,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        ip: '192.168.1.100',
        metadata: log.metadata
      }
    });
  }

  console.log('✅ Audit logs seeded');
}

/**
 * Phase 16: Seed Schedule Blocks
 */
async function seedBloqueoAgenda() {
  console.log('🚫 Seeding schedule blocks...');

  const professionals = await prisma.profesional.findMany();
  const consultorio = await prisma.consultorio.findFirst();
  const adminUser = await prisma.usuario.findFirst({ where: { usuario: 'admin' } });

  if (!adminUser || professionals.length === 0) return;

  // Professional vacation
  await prisma.bloqueoAgenda.create({
    data: {
      profesionalId: professionals[0].idProfesional,
      desde: addDays(new Date(), 60),
      hasta: addDays(new Date(), 74),
      tipo: 'VACACIONES',
      motivo: 'Vacaciones programadas',
      activo: true,
      createdByUserId: adminUser.idUsuario
    }
  });

  // Consultorio maintenance
  if (consultorio) {
    await prisma.bloqueoAgenda.create({
      data: {
        consultorioId: consultorio.idConsultorio,
        desde: addDays(new Date(), 30),
        hasta: addDays(new Date(), 31),
        tipo: 'MANTENIMIENTO',
        motivo: 'Mantenimiento de equipos',
        activo: true,
        createdByUserId: adminUser.idUsuario
      }
    });
  }

  console.log('✅ Schedule blocks seeded');
}

// ============================================================
// MAIN SEED EXECUTION
// ============================================================

async function main() {
  console.log('🌱 Starting seed process...\n');

  try {
    // Execute all seeding phases in order
    await seedRoles();
    await seedUsersAndProfessionals();
    await seedSpecialties();
    await seedPatientsAndPersonas();
    await seedContactsAndDocuments();
    await seedConsultorio();
    await seedProcedureCatalog();
    await seedCatalogs();
    await seedCitasWithoutOverlap();
    await seedConsultasAndProcedures();
    await seedClinicalData();
    await seedOdontogramAndPeriodontogram();
    await seedTreatmentPlans();
    await seedConsentsAndAnamnesis();
    await seedAuditLogs();
    await seedBloqueoAgenda();

    console.log('\n✅ Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed process:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
