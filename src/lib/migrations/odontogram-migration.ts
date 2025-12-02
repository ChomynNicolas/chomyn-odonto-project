// src/lib/migrations/odontogram-migration.ts
import { prisma } from "@/lib/prisma"

/**
 * Migration utility to handle the transition from consultation-specific 
 * to patient-level odontogram persistence
 */

interface MigrationStats {
  totalSnapshots: number
  migratedSnapshots: number
  duplicatesFound: number
  errors: string[]
}

/**
 * Analyzes the current state of odontogram data and identifies migration needs
 */
export async function analyzeOdontogramMigration(): Promise<{
  consultationSpecific: number
  patientLevel: number
  duplicates: number
  orphaned: number
}> {
  const [consultationSpecific, patientLevel, duplicates, orphaned] = await Promise.all([
    // Snapshots linked to specific consultations
    prisma.odontogramSnapshot.count({
      where: {
        consultaId: { not: null }
      }
    }),
    
    // Snapshots at patient level (consultaId is null)
    prisma.odontogramSnapshot.count({
      where: {
        consultaId: null
      }
    }),
    
    // Potential duplicates (multiple snapshots for same patient on same day)
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM (
        SELECT "Paciente_idPaciente", DATE("taken_at") as date_taken, COUNT(*) as daily_count
        FROM "OdontogramSnapshot"
        GROUP BY "Paciente_idPaciente", DATE("taken_at")
        HAVING COUNT(*) > 1
      ) duplicates
    `.then(result => Number(result[0]?.count || 0)),
    
    // Orphaned snapshots (patient doesn't exist)
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM "OdontogramSnapshot" os
      WHERE NOT EXISTS (
        SELECT 1 FROM "Paciente" p WHERE p."idPaciente" = os."Paciente_idPaciente"
      )
    `.then(result => Number(result[0]?.count || 0))
  ])

  return {
    consultationSpecific,
    patientLevel,
    duplicates,
    orphaned
  }
}

/**
 * Migrates consultation-specific odontograms to patient-level persistence
 * This ensures continuity while preserving historical data
 */
export async function migrateConsultationOdontograms(dryRun = true): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalSnapshots: 0,
    migratedSnapshots: 0,
    duplicatesFound: 0,
    errors: []
  }

  try {
    // Get all consultation-specific snapshots grouped by patient
    const consultationSnapshots = await prisma.odontogramSnapshot.findMany({
      where: {
        consultaId: { not: null }
      },
      include: {
        entries: true,
        consulta: {
          select: {
            citaId: true,
            cita: {
              select: {
                pacienteId: true
              }
            }
          }
        }
      },
      orderBy: [
        { pacienteId: 'asc' },
        { takenAt: 'desc' }
      ]
    })

    stats.totalSnapshots = consultationSnapshots.length

    // Group by patient to handle migration logic
    const patientGroups = new Map<number, typeof consultationSnapshots>()
    
    for (const snapshot of consultationSnapshots) {
      const pacienteId = snapshot.pacienteId
      if (!patientGroups.has(pacienteId)) {
        patientGroups.set(pacienteId, [])
      }
      patientGroups.get(pacienteId)!.push(snapshot)
    }

    // Process each patient's odontograms
    for (const [pacienteId, snapshots] of patientGroups) {
      try {
        // Check if patient already has a patient-level odontogram
        const existingPatientOdontogram = await prisma.odontogramSnapshot.findFirst({
          where: {
            pacienteId,
            consultaId: null
          },
          orderBy: { takenAt: 'desc' }
        })

        // Get the most recent consultation odontogram
        const latestSnapshot = snapshots[0] // Already ordered by takenAt desc

        if (existingPatientOdontogram) {
          // Patient already has patient-level odontogram
          // Check if it's newer than the latest consultation one
          if (existingPatientOdontogram.takenAt >= latestSnapshot.takenAt) {
            // Patient-level is newer, mark consultation ones as historical
            console.log(`Patient ${pacienteId}: Patient-level odontogram is up to date`)
            continue
          }
        }

        // Migration needed: create/update patient-level odontogram
        if (!dryRun) {
          // Create new patient-level snapshot based on latest consultation data
          await prisma.odontogramSnapshot.create({
            data: {
              pacienteId,
              consultaId: null, // Patient-level (not consultation-specific)
              notes: latestSnapshot.notes,
              createdByUserId: latestSnapshot.createdByUserId,
              takenAt: latestSnapshot.takenAt,
              entries: {
                create: latestSnapshot.entries.map(entry => ({
                  toothNumber: entry.toothNumber,
                  surface: entry.surface,
                  condition: entry.condition,
                  notes: entry.notes
                }))
              }
            }
          })

          stats.migratedSnapshots++
          console.log(`Migrated patient ${pacienteId}: Created patient-level odontogram from consultation ${latestSnapshot.consultaId}`)
        } else {
          stats.migratedSnapshots++
          console.log(`[DRY RUN] Would migrate patient ${pacienteId}: Create patient-level odontogram from consultation ${latestSnapshot.consultaId}`)
        }

        // Count duplicates for this patient
        if (snapshots.length > 1) {
          stats.duplicatesFound += snapshots.length - 1
        }

      } catch (error) {
        const errorMsg = `Error migrating patient ${pacienteId}: ${error instanceof Error ? error.message : String(error)}`
        stats.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return stats

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    stats.errors.push(errorMsg)
    console.error(errorMsg)
    return stats
  }
}

/**
 * Validates the migration results
 */
export async function validateMigration(): Promise<{
  isValid: boolean
  issues: string[]
  patientsWithOdontograms: number
  patientsWithoutOdontograms: number
}> {
  const issues: string[] = []

  try {
    // Check that all patients with consultation odontograms now have patient-level ones
    const patientsWithConsultationOdontograms = await prisma.odontogramSnapshot.findMany({
      where: {
        consultaId: { not: null }
      },
      select: {
        pacienteId: true
      },
      distinct: ['pacienteId']
    })

    const patientsWithPatientLevelOdontograms = await prisma.odontogramSnapshot.findMany({
      where: {
        consultaId: null
      },
      select: {
        pacienteId: true
      },
      distinct: ['pacienteId']
    })

    const consultationPatientIds = new Set(patientsWithConsultationOdontograms.map(p => p.pacienteId))
    const patientLevelIds = new Set(patientsWithPatientLevelOdontograms.map(p => p.pacienteId))

    // Find patients with consultation odontograms but no patient-level ones
    const missingPatientLevel = [...consultationPatientIds].filter(id => !patientLevelIds.has(id))
    
    if (missingPatientLevel.length > 0) {
      issues.push(`${missingPatientLevel.length} patients have consultation odontograms but no patient-level odontogram`)
    }

    // Check for orphaned entries
    const orphanedResult = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM "OdontogramSnapshot" os
      WHERE NOT EXISTS (
        SELECT 1 FROM "Paciente" p WHERE p."idPaciente" = os."Paciente_idPaciente"
      )
    `
    const orphanedSnapshots = Number(orphanedResult[0]?.count || 0)

    if (orphanedSnapshots > 0) {
      issues.push(`${orphanedSnapshots} orphaned odontogram snapshots found`)
    }

    return {
      isValid: issues.length === 0,
      issues,
      patientsWithOdontograms: patientLevelIds.size,
      patientsWithoutOdontograms: missingPatientLevel.length
    }

  } catch (error) {
    issues.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
    return {
      isValid: false,
      issues,
      patientsWithOdontograms: 0,
      patientsWithoutOdontograms: 0
    }
  }
}

/**
 * CLI-friendly migration runner
 */
export async function runOdontogramMigration(options: {
  dryRun?: boolean
  verbose?: boolean
} = {}) {
  const { dryRun = true, verbose = false } = options

  console.log('🦷 Starting Odontogram Migration Analysis...')
  
  // Step 1: Analyze current state
  const analysis = await analyzeOdontogramMigration()
  console.log('\n📊 Current State:')
  console.log(`  - Consultation-specific odontograms: ${analysis.consultationSpecific}`)
  console.log(`  - Patient-level odontograms: ${analysis.patientLevel}`)
  console.log(`  - Potential duplicates: ${analysis.duplicates}`)
  console.log(`  - Orphaned snapshots: ${analysis.orphaned}`)

  if (analysis.consultationSpecific === 0) {
    console.log('\n✅ No migration needed - all odontograms are already patient-level')
    return
  }

  // Step 2: Run migration
  console.log(`\n🔄 ${dryRun ? 'Simulating' : 'Running'} Migration...`)
  const migrationStats = await migrateConsultationOdontograms(dryRun)
  
  console.log('\n📈 Migration Results:')
  console.log(`  - Total snapshots processed: ${migrationStats.totalSnapshots}`)
  console.log(`  - Snapshots migrated: ${migrationStats.migratedSnapshots}`)
  console.log(`  - Duplicates found: ${migrationStats.duplicatesFound}`)
  console.log(`  - Errors: ${migrationStats.errors.length}`)

  if (migrationStats.errors.length > 0 && verbose) {
    console.log('\n❌ Errors:')
    migrationStats.errors.forEach(error => console.log(`  - ${error}`))
  }

  // Step 3: Validate (only if not dry run)
  if (!dryRun) {
    console.log('\n🔍 Validating Migration...')
    const validation = await validateMigration()
    
    if (validation.isValid) {
      console.log('✅ Migration validation passed')
    } else {
      console.log('❌ Migration validation failed:')
      validation.issues.forEach(issue => console.log(`  - ${issue}`))
    }
    
    console.log(`\n📊 Final State:`)
    console.log(`  - Patients with odontograms: ${validation.patientsWithOdontograms}`)
    console.log(`  - Patients missing odontograms: ${validation.patientsWithoutOdontograms}`)
  }

  console.log(`\n${dryRun ? '🔍 Dry run completed' : '✅ Migration completed'}`)
}
