import { PrismaClient, RolNombre, AdjuntoTipo, RelacionPaciente, EstadoCita, ConsultaEstado, DienteSuperficie } from "@prisma/client"
import { ALLOW_PROD_SEED, RESEED, COUNTS, PROB } from "./config"
import { log } from "./logger"
import { hashPassword, calculateAge } from "./utils"
import {
  ensureRoles,
  ensureUsuario,
  ensureEspecialidades,
  ensureProfesionalEspecialidades,
  ensurePersonaConDocumento,
  ensureContactos,
  ensurePacienteFromPersona,
  ensureConsultorio,
  ensureProcedimientoCatalogo,
  ensureResponsablePrincipal,
  ensureDiagnosisCatalog,
  ensureAllergyCatalog,
  ensureMedicationCatalog,
} from "./ensure"
import {
  ESPECIALIDADES,
  CONSULTORIOS,
  PROCEDIMIENTOS_CATALOGO,
  DIAGNOSIS_CATALOG,
  ALLERGY_CATALOG,
  MEDICATION_CATALOG,
} from "./data"
import { fakePersona, fakeDocumento, fakeContactosPersona } from "./factories"
import { generarAgendaParaProfesional, generarReprogramaciones, generarBloqueosAgenda } from "./agenda"
import {
  createPlanConSteps,
  ensureConsultaParaCita,
  addLineaProcedimiento,
  addAdjuntoConsulta,
  addClinicalBasics,
  addOdontoAndPerio,
  generarConsentimientosPaciente,
} from "./clinical"

const prisma = new PrismaClient()

async function safeTruncate() {
  const tables = [
    '"Consentimiento"',
    '"PeriodontogramMeasure"',
    '"PeriodontogramSnapshot"',
    '"OdontogramEntry"',
    '"OdontogramSnapshot"',
    '"PatientVitals"',
    '"PatientMedication"',
    '"MedicationCatalog"',
    '"PatientAllergy"',
    '"AllergyCatalog"',
    '"PatientDiagnosis"',
    '"DiagnosisCatalog"',
    '"ClinicalHistoryEntry"',
    '"Adjunto"',
    '"ConsultaProcedimiento"',
    '"Consulta"',
    '"TreatmentStep"',
    '"TreatmentPlan"',
    '"CitaEstadoHistorial"',
    '"Cita"',
    '"BloqueoAgenda"',
    '"PacienteResponsable"',
    '"ProfesionalEspecialidad"',
    '"Especialidad"',
    '"Profesional"',
    '"Paciente"',
    '"PersonaContacto"',
    '"Documento"',
    '"Persona"',
    '"Consultorio"',
    '"ProcedimientoCatalogo"',
    '"AuditLog"',
    '"Usuario"',
    '"Rol"',
  ]
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE;`)
}

async function main() {
  log.info("🌱 Seed iniciado")

  if (process.env.NODE_ENV === "production" && !ALLOW_PROD_SEED) {
    throw new Error("Semilla bloqueada en producción. Exporta ALLOW_PROD_SEED=1 si estás seguro.")
  }

  if (RESEED) {
    log.warn("🗑️  RESEED=1 → limpiando tablas...")
    await safeTruncate()
  }

  // 1) Roles
  await ensureRoles(prisma)
  log.ok("✅ Roles creados")

  // 2) Usuarios base
  const [adminHash, recepHash, odontHash] = await Promise.all([
    hashPassword("Admin123!"),
    hashPassword("Recep123!"),
    hashPassword("Odont123!"),
  ])

  await ensureUsuario(prisma, {
    usuario: "admin",
    email: "admin@clinica.com",
    nombreApellido: "Administrador General",
    rol: RolNombre.ADMIN,
    passwordHash: adminHash,
  })
  const recep = await ensureUsuario(prisma, {
    usuario: "recep.sosa",
    email: "recep@clinica.com",
    nombreApellido: "Recepcionista Sosa",
    rol: RolNombre.RECEP,
    passwordHash: recepHash,
  })
  log.ok("✅ Usuarios base creados")

  // 3) Especialidades y profesionales
  await ensureEspecialidades(prisma, ESPECIALIDADES)

  const profesionales: { idProfesional: number }[] = []
  for (let i = 0; i < COUNTS.profesionales; i++) {
    const user = await ensureUsuario(prisma, {
      usuario: i === 0 ? "dra.vera" : `dr_${i}`,
      email: i === 0 ? "doctora@clinica.com" : `doctor_${i}@clinica.com`,
      nombreApellido: i === 0 ? "Dra. Vera López" : `Dr. ${i} ${i % 2 ? "Gómez" : "Martínez"}`,
      rol: RolNombre.ODONT,
      passwordHash: odontHash,
    })

    const persona = await ensurePersonaConDocumento(prisma, {
      ...fakePersona(1000 + i),
      doc: fakeDocumento(1000 + i),
    })
    await ensureContactos(prisma, persona.idPersona, fakeContactosPersona(1000 + i, "odont"))

    const profesional = await prisma.profesional.upsert({
      where: { userId: user.idUsuario },
      update: {},
      create: {
        userId: user.idUsuario,
        personaId: persona.idPersona,
        numeroLicencia: `ODT-${10000 + i}`,
        estaActivo: true,
      },
      select: { idProfesional: true },
    })
    await ensureProfesionalEspecialidades(prisma, profesional.idProfesional, ESPECIALIDADES.slice(0, 2))
    profesionales.push(profesional)
  }
  log.ok(`✅ ${profesionales.length} profesionales creados`)

  // 4) Consultorios
  const consultorios = [] as { idConsultorio: number }[]
  for (const c of CONSULTORIOS.slice(0, COUNTS.consultorios)) {
    const row = await ensureConsultorio(prisma, c.nombre, c.colorHex)
    consultorios.push({ idConsultorio: row.idConsultorio })
  }
  log.ok(`✅ ${consultorios.length} consultorios creados`)

  // 5) Pacientes
  const pacientesData: Array<{ idPaciente: number; personaId: number; edad: number }> = []
  for (let i = 0; i < COUNTS.pacientes; i++) {
    const personaData = fakePersona(i)
    const per = await ensurePersonaConDocumento(prisma, { ...personaData, doc: fakeDocumento(i) })
    await ensureContactos(prisma, per.idPersona, fakeContactosPersona(i, "paciente"))
    const pac = await ensurePacienteFromPersona(prisma, per.idPersona)

    const edad = calculateAge(personaData.fechaNacimiento!)
    pacientesData.push({
      idPaciente: pac.idPaciente,
      personaId: per.idPersona,
      edad,
    })

    if (edad < 18 && Math.random() < PROB.pacienteConResponsable) {
      const responsableData = fakePersona(5000 + i)
      const responsable = await ensurePersonaConDocumento(prisma, {
        ...responsableData,
        doc: fakeDocumento(5000 + i),
      })
      await ensureContactos(prisma, responsable.idPersona, fakeContactosPersona(5000 + i, "responsable"))

      await ensureResponsablePrincipal(
        prisma,
        pac.idPaciente,
        responsable.idPersona,
        edad < 12 ? RelacionPaciente.PADRE : RelacionPaciente.TUTOR,
      )

      await generarConsentimientosPaciente(prisma, {
        pacienteId: pac.idPaciente,
        personaId: per.idPersona,
        responsableId: responsable.idPersona,
        registradoPorUserId: recep.idUsuario,
      })
    }
  }
  log.ok(`✅ ${pacientesData.length} pacientes creados`)

  // 6) Catálogos clínicos
  await ensureProcedimientoCatalogo(prisma, PROCEDIMIENTOS_CATALOGO)
  await ensureDiagnosisCatalog(prisma, DIAGNOSIS_CATALOG)
  await ensureAllergyCatalog(prisma, ALLERGY_CATALOG)
  await ensureMedicationCatalog(prisma, MEDICATION_CATALOG)
  log.ok("✅ Catálogos clínicos creados")

  // 7) Agenda con histórico + futuro
  let totalCitasCreadas = 0
  let totalCitasFallidas = 0

  for (const prof of profesionales) {
    const resultado = await generarAgendaParaProfesional(prisma, {
      profesionalId: prof.idProfesional,
      pacienteIds: pacientesData.map((p) => p.idPaciente),
      consultorioIds: consultorios.map((c) => c.idConsultorio),
      createdByUserId: recep.idUsuario,
    })
    totalCitasCreadas += resultado.creadas
    totalCitasFallidas += resultado.fallidas

    await generarReprogramaciones(prisma, {
      profesionalId: prof.idProfesional,
      createdByUserId: recep.idUsuario,
    })

    await generarBloqueosAgenda(prisma, {
      profesionalId: prof.idProfesional,
      createdByUserId: recep.idUsuario,
      cantidad: COUNTS.bloqueos,
    })
  }
  log.ok(`✅ ${totalCitasCreadas} citas creadas (${totalCitasFallidas} rechazadas por solapamiento)`)

  // 8) Datos clínicos expandidos
  const cantidadConClinica = Math.floor(pacientesData.length * COUNTS.pacientesConClinica)
  const pacientesClinica = pacientesData.slice(0, cantidadConClinica)

  log.info(`🏥 Generando datos clínicos para ${pacientesClinica.length} pacientes...`)

  for (const pac of pacientesClinica) {
    // Plan con 3 steps
    await createPlanConSteps(prisma, {
      pacienteId: pac.idPaciente,
      createdByUserId: recep.idUsuario,
      steps: [{ code: "CONS-INI" }, { code: "LIMP" }, { code: "OBT", toothNumber: 16, toothSurface: DienteSuperficie.O }],
    })

    // Buscar cita completada del paciente
    const cita = await prisma.cita.findFirst({
      where: {
        pacienteId: pac.idPaciente,
        estado: EstadoCita.COMPLETED,
      },
      orderBy: { inicio: "desc" },
    })

    if (!cita) continue

    // Crear consulta
    const consulta = await ensureConsultaParaCita(prisma, {
      citaId: cita.idCita,
      performedByProfessionalId: cita.profesionalId,
      createdByUserId: recep.idUsuario,
      status: ConsultaEstado.FINAL,
      reason: "Consulta integral",
    })

    // Procedimientos
    await addLineaProcedimiento(prisma, {
      consultaCitaId: consulta.citaId,
      code: "CONS-INI",
      quantity: 1,
      resultNotes: "Evaluación completa realizada",
    })

    const p2 = await addLineaProcedimiento(prisma, {
      consultaCitaId: consulta.citaId,
      code: "OBT",
      toothNumber: 16,
      toothSurface: DienteSuperficie.O,
      quantity: 1,
      resultNotes: "Resina compuesta aplicada exitosamente",
    })

    // Adjunto
    await addAdjuntoConsulta(prisma, {
      consultaCitaId: consulta.citaId,
      uploadedByUserId: recep.idUsuario,
      url: "https://example.com/xray_16.png",
      originalName: "xray_16.png",
      mimeType: "image/png",
      size: 120_000,
      tipo: AdjuntoTipo.XRAY,
      procedimientoId: p2.idConsultaProcedimiento,
    })

    // Datos clínicos básicos
    await addClinicalBasics(prisma, {
      pacienteId: pac.idPaciente,
      createdByUserId: recep.idUsuario,
      consultaId: consulta.citaId,
    })

    // Odontograma + periodontograma
    await addOdontoAndPerio(prisma, {
      pacienteId: pac.idPaciente,
      createdByUserId: recep.idUsuario,
      consultaId: consulta.citaId,
    })
  }

  log.ok(`✅ Datos clínicos generados para ${pacientesClinica.length} pacientes`)

  log.info("📊 RESUMEN FINAL:")
  log.ok(`   👥 Profesionales: ${profesionales.length}`)
  log.ok(`   🏥 Consultorios: ${consultorios.length}`)
  log.ok(`   🧑‍⚕️ Pacientes: ${pacientesData.length}`)
  log.ok(`   📅 Citas totales: ${totalCitasCreadas}`)
  log.ok(`   ❌ Citas rechazadas: ${totalCitasFallidas}`)
  log.ok(`   📋 Datos clínicos: ${pacientesClinica.length} pacientes`)
  log.ok("🎉 Seed completado exitosamente")
}

main()
  .catch((e) => {
    log.err("❌ Seed falló:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
