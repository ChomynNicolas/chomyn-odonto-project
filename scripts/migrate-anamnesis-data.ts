// scripts/migrate-anamnesis-data.ts
// Data migration script to extract and normalize existing anamnesis payload JSON

import { PrismaClient } from "@prisma/client"
import { prisma } from "../src/lib/prisma"

interface OldPayload {
  historyOfPresentIllness?: string
  pastMedicalHistory?: string
  currentMedications?: string
  allergies?: string
  noKnownAllergies?: boolean
  doctorNotes?: string
  [key: string]: unknown
}

async function migrateAnamnesisData() {
  console.log("Starting anamnesis data migration...")

  try {
    // Get all anamnesis records with payload
    const anamnesisRecords = await prisma.patientAnamnesis.findMany({
      where: {
        payload: {
          not: null,
        },
      },
      include: {
        paciente: {
          include: {
            persona: true,
          },
        },
      },
    })

    console.log(`Found ${anamnesisRecords.length} anamnesis records to migrate`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const anamnesis of anamnesisRecords) {
      try {
        const payload = anamnesis.payload as OldPayload | null
        if (!payload) {
          skipped++
          continue
        }

        await prisma.$transaction(async (tx) => {
          // Extract antecedents from pastMedicalHistory
          if (payload.pastMedicalHistory) {
            // Simple extraction: split by common delimiters and create custom antecedents
            const conditions = payload.pastMedicalHistory
              .split(/[,;]/)
              .map((c) => c.trim())
              .filter((c) => c.length > 0)

            for (const condition of conditions) {
              await tx.anamnesisAntecedent.create({
                data: {
                  anamnesisId: anamnesis.idPatientAnamnesis,
                  customName: condition,
                  customCategory: "OTHER",
                  isActive: true,
                },
              })
            }
          }

          // Extract medications from currentMedications
          if (payload.currentMedications) {
            // Try to find existing PatientMedication records or create new ones
            const medicationTexts = payload.currentMedications
              .split(/[,;]/)
              .map((m) => m.trim())
              .filter((m) => m.length > 0)

            for (const medText of medicationTexts) {
              // Try to find existing medication by label
              const existingMed = await tx.patientMedication.findFirst({
                where: {
                  pacienteId: anamnesis.pacienteId,
                  label: {
                    contains: medText,
                    mode: "insensitive",
                  },
                  isActive: true,
                },
              })

              if (existingMed) {
                // Link to existing medication
                await tx.anamnesisMedication.upsert({
                  where: {
                    anamnesisId_medicationId: {
                      anamnesisId: anamnesis.idPatientAnamnesis,
                      medicationId: existingMed.idPatientMedication,
                    },
                  },
                  create: {
                    anamnesisId: anamnesis.idPatientAnamnesis,
                    medicationId: existingMed.idPatientMedication,
                  },
                  update: {},
                })
              } else {
                // Create new PatientMedication
                const newMed = await tx.patientMedication.create({
                  data: {
                    pacienteId: anamnesis.pacienteId,
                    label: medText,
                    isActive: true,
                    createdByUserId: anamnesis.creadoPorUserId,
                  },
                })

                await tx.anamnesisMedication.create({
                  data: {
                    anamnesisId: anamnesis.idPatientAnamnesis,
                    medicationId: newMed.idPatientMedication,
                  },
                })
              }
            }
          }

          // Extract allergies
          if (payload.allergies && !payload.noKnownAllergies) {
            const allergyTexts = payload.allergies
              .split(/[,;]/)
              .map((a) => a.trim())
              .filter((a) => a.length > 0)

            for (const allergyText of allergyTexts) {
              // Try to find existing allergy
              const existingAllergy = await tx.patientAllergy.findFirst({
                where: {
                  pacienteId: anamnesis.pacienteId,
                  label: {
                    contains: allergyText,
                    mode: "insensitive",
                  },
                  isActive: true,
                },
              })

              if (existingAllergy) {
                await tx.anamnesisAllergy.upsert({
                  where: {
                    anamnesisId_allergyId: {
                      anamnesisId: anamnesis.idPatientAnamnesis,
                      allergyId: existingAllergy.idPatientAllergy,
                    },
                  },
                  create: {
                    anamnesisId: anamnesis.idPatientAnamnesis,
                    allergyId: existingAllergy.idPatientAllergy,
                  },
                  update: {},
                })
              } else {
                // Create new PatientAllergy
                const newAllergy = await tx.patientAllergy.create({
                  data: {
                    pacienteId: anamnesis.pacienteId,
                    label: allergyText,
                    severity: "MODERATE",
                    isActive: true,
                    createdByUserId: anamnesis.creadoPorUserId,
                  },
                })

                await tx.anamnesisAllergy.create({
                  data: {
                    anamnesisId: anamnesis.idPatientAnamnesis,
                    allergyId: newAllergy.idPatientAllergy,
                  },
                })
              }
            }
          }

          // Update flags based on extracted data
          const hasAntecedents = payload.pastMedicalHistory && payload.pastMedicalHistory.trim().length > 0
          const hasMedications = payload.currentMedications && payload.currentMedications.trim().length > 0
          const hasAllergies = payload.allergies && payload.allergies.trim().length > 0 && !payload.noKnownAllergies

          await tx.patientAnamnesis.update({
            where: { idPatientAnamnesis: anamnesis.idPatientAnamnesis },
            data: {
              tieneEnfermedadesCronicas: hasAntecedents || anamnesis.tieneEnfermedadesCronicas,
              tieneMedicacionActual: hasMedications || anamnesis.tieneMedicacionActual,
              tieneAlergias: hasAllergies || anamnesis.tieneAlergias,
              // Keep payload for custom notes
              payload: payload.doctorNotes ? { customNotes: payload.doctorNotes } : null,
            },
          })
        })

        migrated++
        if (migrated % 10 === 0) {
          console.log(`Migrated ${migrated} records...`)
        }
      } catch (error) {
        console.error(`Error migrating anamnesis ${anamnesis.idPatientAnamnesis}:`, error)
        errors++
      }
    }

    console.log("\nMigration completed!")
    console.log(`Migrated: ${migrated}`)
    console.log(`Skipped: ${skipped}`)
    console.log(`Errors: ${errors}`)
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}

// Run migration
if (require.main === module) {
  migrateAnamnesisData()
    .then(() => {
      console.log("Migration script completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Migration script failed:", error)
      process.exit(1)
    })
}

