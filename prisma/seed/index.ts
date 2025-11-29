import { PrismaClient, RolNombre, AdjuntoTipo, RelacionPaciente, EstadoCita, ConsultaEstado, DienteSuperficie, AnamnesisTipo } from "@prisma/client"
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
  ensureAntecedentCatalog,
  ensureAnamnesisConfig,
  ensureProfesionalDisponibilidad,
} from "./ensure"
import {
  ESPECIALIDADES,
  CONSULTORIOS,
  PROCEDIMIENTOS_CATALOGO,
  DIAGNOSIS_CATALOG,
  ALLERGY_CATALOG,
  MEDICATION_CATALOG,
  ANTECEDENT_CATALOG,
  ANAMNESIS_CONFIG_SAMPLES,
} from "./data"
import { fakePersona, fakeDocumento, fakeContactosPersona, fakeProfesionalDisponibilidad } from "./factories"
import { generarAgendaParaProfesional, generarReprogramaciones, generarBloqueosAgenda } from "./agenda"
import {
  createPlanConSteps,
  ensureConsultaParaCita,
  addLineaProcedimiento,
  addAdjuntoConsulta,
  addClinicalBasics,
  addOdontoAndPerio,
  generarConsentimientosPaciente,
  addComprehensiveAdjuntos,
} from "./clinical"
import {
  seedAnamnesisCatalog,
  seedAnamnesisConfig,
  seedPatientAnamnesis,
  seedAnamnesisAntecedents,
  seedAnamnesisJunctions,
  seedAnamnesisVersions,
  seedAnamnesisAuditLogs,
  seedAnamnesisPendingReviews,
  seedAnamnesisMedicationAudits,
  seedAnamnesisAllergyAudits,
  seedAnamnesisFieldDiffs,
} from "./anamnesis"
import {
  seedEncounterDiagnoses,
  seedDiagnosisStatusHistory,
} from "./diagnosis"

const prisma = new PrismaClient()

async function safeTruncate() {
  const tables = [
    '"AnamnesisPendingReview"',
    '"AnamnesisFieldDiff"',
    '"AnamnesisAuditLog"',
    '"AnamnesisAllergyAudit"',
    '"AnamnesisMedicationAudit"',
    '"AnamnesisAllergy"',
    '"AnamnesisMedication"',
    '"AnamnesisAntecedent"',
    '"PatientAnamnesisVersion"',
    '"PatientAnamnesis"',
    '"AnamnesisConfig"',
    '"AntecedentCatalog"',
    '"DiagnosisStatusHistory"',
    '"EncounterDiagnosis"',
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
    '"audit_logs"',
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
    try {
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
          disponibilidad: fakeProfesionalDisponibilidad() as any,
        },
        select: { idProfesional: true },
      })
      await ensureProfesionalEspecialidades(prisma, profesional.idProfesional, ESPECIALIDADES.slice(0, 2))
      profesionales.push(profesional)
    } catch (error: any) {
      log.warn(`⚠️  Error creando profesional ${i}: ${error.message}`)
    }
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
    try {
      const personaData = fakePersona(i)
      const per = await ensurePersonaConDocumento(prisma, { ...personaData, doc: fakeDocumento(i) })
      await ensureContactos(prisma, per.idPersona, fakeContactosPersona(i, "paciente"))
      const pac = await ensurePacienteFromPersona(prisma, per.idPersona)

      const edad = personaData.fechaNacimiento ? calculateAge(personaData.fechaNacimiento) : 0
      pacientesData.push({
        idPaciente: pac.idPaciente,
        personaId: per.idPersona,
        edad,
      })

      if (edad < 18 && Math.random() < PROB.pacienteConResponsable) {
        try {
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
        } catch (error: any) {
          log.warn(`⚠️  Error creando responsable para paciente ${i}: ${error.message}`)
        }
      }
    } catch (error: any) {
      log.warn(`⚠️  Error creando paciente ${i}: ${error.message}`)
    }
  }
  log.ok(`✅ ${pacientesData.length} pacientes creados`)

  // 6) Catálogos clínicos
  await ensureProcedimientoCatalogo(prisma, PROCEDIMIENTOS_CATALOGO)
  await ensureDiagnosisCatalog(prisma, DIAGNOSIS_CATALOG)
  await ensureAllergyCatalog(prisma, ALLERGY_CATALOG)
  await ensureMedicationCatalog(prisma, MEDICATION_CATALOG)
  await ensureAntecedentCatalog(prisma, ANTECEDENT_CATALOG)
  log.ok("✅ Catálogos clínicos creados")

  // 6.1) Anamnesis Catalog and Config
  const admin = await prisma.usuario.findFirst({ where: { usuario: "admin" } })
  if (admin) {
    await seedAnamnesisCatalog(prisma, admin.idUsuario)
    await seedAnamnesisConfig(prisma, admin.idUsuario)
    log.ok("✅ Catálogo y configuración de anamnesis creados")
  }

  // 7) Agenda con histórico + futuro
  let totalCitasCreadas = 0
  let totalCitasFallidas = 0

  for (const prof of profesionales) {
    try {
      const resultado = await generarAgendaParaProfesional(prisma, {
        profesionalId: prof.idProfesional,
        pacienteIds: pacientesData.map((p) => p.idPaciente),
        consultorioIds: consultorios.map((c) => c.idConsultorio),
        createdByUserId: recep.idUsuario,
      })
      totalCitasCreadas += resultado.creadas
      totalCitasFallidas += resultado.fallidas

      try {
        await generarReprogramaciones(prisma, {
          profesionalId: prof.idProfesional,
          createdByUserId: recep.idUsuario,
        })
      } catch (error: any) {
        log.warn(`⚠️  Error generando reprogramaciones: ${error.message}`)
      }

      try {
        await generarBloqueosAgenda(prisma, {
          profesionalId: prof.idProfesional,
          createdByUserId: recep.idUsuario,
          cantidad: COUNTS.bloqueos,
        })
      } catch (error: any) {
        log.warn(`⚠️  Error generando bloqueos: ${error.message}`)
      }
    } catch (error: any) {
      log.warn(`⚠️  Error generando agenda para profesional ${prof.idProfesional}: ${error.message}`)
    }
  }
  log.ok(`✅ ${totalCitasCreadas} citas creadas (${totalCitasFallidas} rechazadas por solapamiento)`)

  // 8) Datos clínicos expandidos
  const cantidadConClinica = Math.floor(pacientesData.length * COUNTS.pacientesConClinica)
  const pacientesClinica = pacientesData.slice(0, cantidadConClinica)

  log.info(`🏥 Generando datos clínicos para ${pacientesClinica.length} pacientes...`)

  let totalAdjuntosCreados = 0
  let totalAdjuntosFallidos = 0

  for (const pac of pacientesClinica) {
    try {
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
        startedAt: cita.inicio,
        finishedAt: cita.fin,
        diagnosis: "Evaluación completa realizada",
        clinicalNotes: "Consulta integral sin complicaciones",
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

      // Adjuntos comprehensivos
      const procedimientoIds = [p2.idConsultaProcedimiento]
      try {
        const adjuntos = await addComprehensiveAdjuntos(prisma, {
          consultaCitaId: consulta.citaId,
          pacienteId: pac.idPaciente,
          uploadedByUserId: recep.idUsuario,
          procedimientoIds,
        })
        totalAdjuntosCreados += adjuntos.length
      } catch (error: any) {
        totalAdjuntosFallidos++
        log.warn(`⚠️  Error agregando adjuntos para paciente ${pac.idPaciente}: ${error.message}`)
        if (error.stack) {
          log.warn(`   Stack: ${error.stack.split('\n')[0]}`)
        }
      }

      // Datos clínicos básicos
      try {
        await addClinicalBasics(prisma, {
          pacienteId: pac.idPaciente,
          createdByUserId: recep.idUsuario,
          consultaId: consulta.citaId,
        })
      } catch (error: any) {
        log.warn(`⚠️  Error agregando datos clínicos básicos: ${error.message}`)
      }

      // Odontograma + periodontograma
      try {
        await addOdontoAndPerio(prisma, {
          pacienteId: pac.idPaciente,
          createdByUserId: recep.idUsuario,
          consultaId: consulta.citaId,
        })
      } catch (error: any) {
        log.warn(`⚠️  Error agregando odontograma/periodontograma: ${error.message}`)
      }

      // Encounter Diagnoses
      try {
        await seedEncounterDiagnoses(prisma, {
          consultaId: consulta.citaId,
          pacienteId: pac.idPaciente,
        })
      } catch (error: any) {
        // Ignore - may not have diagnoses yet
      }

      // Diagnosis Status History (para algunos diagnósticos)
      try {
        const diagnoses = await prisma.patientDiagnosis.findMany({
          where: { pacienteId: pac.idPaciente },
          take: 2,
        })
        for (const diagnosis of diagnoses) {
          try {
            await seedDiagnosisStatusHistory(prisma, {
              diagnosisId: diagnosis.idPatientDiagnosis,
              consultaId: consulta.citaId,
              changedByUserId: recep.idUsuario,
            })
          } catch (error: any) {
            // Ignore errors
          }
        }
      } catch (error: any) {
        // Ignore
      }
    } catch (error: any) {
      log.warn(`⚠️  Error procesando paciente ${pac.idPaciente}: ${error.message}`)
    }
  }

  log.ok(`✅ Datos clínicos generados para ${pacientesClinica.length} pacientes`)
  log.ok(`   📎 Adjuntos creados: ${totalAdjuntosCreados} (${totalAdjuntosFallidos} fallidos)`)

  // 9) Anamnesis
  log.info("📋 Generando anamnesis para pacientes...")
  let anamnesisCreadas = 0
  for (const pac of pacientesData) {
    try {
      const persona = await prisma.persona.findUnique({
        where: { idPersona: pac.personaId },
      })
      if (!persona) continue

      const edad = persona.fechaNacimiento ? calculateAge(persona.fechaNacimiento) : null
      const tipo = edad !== null && edad < 18 ? AnamnesisTipo.PEDIATRICO : AnamnesisTipo.ADULTO

      const anamnesis = await seedPatientAnamnesis(prisma, {
        pacienteId: pac.idPaciente,
        personaId: pac.personaId,
        createdByUserId: recep.idUsuario,
        tipo,
      })

      // Seed antecedents
      await seedAnamnesisAntecedents(prisma, anamnesis.idPatientAnamnesis)

      // Seed junctions (medications and allergies)
      await seedAnamnesisJunctions(prisma, {
        anamnesisId: anamnesis.idPatientAnamnesis,
        pacienteId: pac.idPaciente,
        createdByUserId: recep.idUsuario,
      })

      // Seed medication and allergy audits
      const anamnesisMedications = await prisma.anamnesisMedication.findMany({
        where: { anamnesisId: anamnesis.idPatientAnamnesis },
      })
      for (const med of anamnesisMedications) {
        try {
          await seedAnamnesisMedicationAudits(prisma, {
            anamnesisMedicationId: med.idAnamnesisMedication,
            performedByUserId: recep.idUsuario,
          })
        } catch (error: any) {
          // Ignore
        }
      }

      const anamnesisAllergies = await prisma.anamnesisAllergy.findMany({
        where: { anamnesisId: anamnesis.idPatientAnamnesis },
      })
      for (const alg of anamnesisAllergies) {
        try {
          await seedAnamnesisAllergyAudits(prisma, {
            anamnesisAllergyId: alg.idAnamnesisAllergy,
            performedByUserId: recep.idUsuario,
          })
        } catch (error: any) {
          // Ignore
        }
      }

      // Seed version for some patients
      const cita = await prisma.cita.findFirst({
        where: { pacienteId: pac.idPaciente, estado: EstadoCita.COMPLETED },
        orderBy: { inicio: "desc" },
      })

      if (cita) {
        const consulta = await prisma.consulta.findUnique({
          where: { citaId: cita.idCita },
        })

        if (consulta) {
          await seedAnamnesisVersions(prisma, {
            anamnesisId: anamnesis.idPatientAnamnesis,
            pacienteId: pac.idPaciente,
            consultaId: consulta.citaId,
            createdByUserId: recep.idUsuario,
          })

          // Seed audit log
          const auditLog = await seedAnamnesisAuditLogs(prisma, {
            anamnesisId: anamnesis.idPatientAnamnesis,
            pacienteId: pac.idPaciente,
            actorId: recep.idUsuario,
            consultaId: consulta.citaId,
          })

          // Seed field diffs if audit log was created
          if (auditLog) {
            try {
              await seedAnamnesisFieldDiffs(prisma, {
                auditLogId: auditLog.idAnamnesisAuditLog,
              })
            } catch (error: any) {
              // Ignore
            }
          }
        }
      }

      anamnesisCreadas++
    } catch (error: any) {
      log.warn(`⚠️  Error creando anamnesis para paciente ${pac.idPaciente}: ${error.message}`)
    }
  }
  log.ok(`✅ ${anamnesisCreadas} anamnesis creadas`)

  // 10) Audit Logs
  log.info("📊 Generando logs de auditoría...")
  let auditLogsCreados = 0
  let auditLogsFallidos = 0
  
  // Get some patients and create audit logs for various actions
  const pacientesParaAudit = pacientesData.slice(0, Math.min(30, pacientesData.length))
  
  for (const pac of pacientesParaAudit) {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: recep.idUsuario,
          action: faker.helpers.arrayElement([
            "PATIENT_CREATE",
            "PATIENT_UPDATE",
            "APPOINTMENT_SCHEDULE",
            "CONSULTA_CREATE",
          ]),
          entity: "Patient",
          entityId: pac.idPaciente,
          ip: faker.internet.ip(),
          metadata: {
            timestamp: new Date().toISOString(),
            changes: faker.lorem.sentence(),
          },
        },
      })
      auditLogsCreados++
    } catch (error: any) {
      auditLogsFallidos++
      if (auditLogsFallidos <= 3) {
        // Only log first few errors to avoid spam
        log.warn(`⚠️  Error creando audit log: ${error.message}`)
      }
    }
  }
  log.ok(`✅ ${auditLogsCreados} logs de auditoría creados${auditLogsFallidos > 0 ? ` (${auditLogsFallidos} fallidos)` : ""}`)

  // Get final counts for summary
  const totalAdjuntos = await prisma.adjunto.count()
  const totalAuditLogs = await prisma.auditLog.count()
  const totalAnamnesisAuditLogs = await prisma.anamnesisAuditLog.count()
  const totalConsultas = await prisma.consulta.count()
  const totalProcedimientos = await prisma.consultaProcedimiento.count()
  const totalDiagnoses = await prisma.patientDiagnosis.count()
  const totalTreatmentPlans = await prisma.treatmentPlan.count()

  log.info("📊 RESUMEN FINAL:")
  log.ok(`   👥 Profesionales: ${profesionales.length}`)
  log.ok(`   🏥 Consultorios: ${consultorios.length}`)
  log.ok(`   🧑‍⚕️ Pacientes: ${pacientesData.length}`)
  log.ok(`   📅 Citas totales: ${totalCitasCreadas}`)
  log.ok(`   ❌ Citas rechazadas: ${totalCitasFallidas}`)
  log.ok(`   🏥 Consultas: ${totalConsultas}`)
  log.ok(`   💉 Procedimientos: ${totalProcedimientos}`)
  log.ok(`   📎 Adjuntos: ${totalAdjuntos}`)
  log.ok(`   📋 Datos clínicos: ${pacientesClinica.length} pacientes`)
  log.ok(`   🔬 Diagnósticos: ${totalDiagnoses}`)
  log.ok(`   📝 Anamnesis: ${anamnesisCreadas} creadas`)
  log.ok(`   📋 Planes de tratamiento: ${totalTreatmentPlans}`)
  log.ok(`   📊 Logs de auditoría: ${totalAuditLogs} (${totalAnamnesisAuditLogs} de anamnesis)`)
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
