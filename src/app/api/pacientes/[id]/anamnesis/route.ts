// src/app/api/pacientes/[id]/anamnesis/route.ts
// Professional Anamnesis API endpoints with normalized structure

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AnamnesisCreateUpdateBodySchema, AnamnesisResponseSchema } from "./_schemas"
import { z } from "zod"
import {
  logMedicationChange,
  logAllergyChange,
  type AuditAction,
} from "@/lib/services/anamnesis-audit.service"

/**
 * GET /api/pacientes/[id]/anamnesis
 * 
 * Retrieves the current anamnesis for a patient with all normalized relationships.
 * Returns null if no anamnesis exists yet.
 * 
 * @returns { data: AnamnesisResponse | null }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id } = await params
    const pacienteId = parseInt(id, 10)

    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Fetch anamnesis with all normalized relationships
    const anamnesis = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
      include: {
        creadoPor: { select: { idUsuario: true, nombreApellido: true } },
        actualizadoPor: { select: { idUsuario: true, nombreApellido: true } },
        antecedents: {
          include: {
            antecedentCatalog: true,
          },
          orderBy: { idAnamnesisAntecedent: "asc" },
        } as any,
        medications: {
          include: {
            medication: {
              include: {
                medicationCatalog: true,
              },
            },
            addedBy: { select: { idUsuario: true, nombreApellido: true } },
            removedBy: { select: { idUsuario: true, nombreApellido: true } },
          },
          orderBy: { idAnamnesisMedication: "asc" },
        } as any,
        allergies: {
          include: {
            allergy: {
              include: {
                allergyCatalog: true,
              },
            },
            addedBy: { select: { idUsuario: true, nombreApellido: true } },
            removedBy: { select: { idUsuario: true, nombreApellido: true } },
          },
          orderBy: { idAnamnesisAllergy: "asc" },
        } as any,
      },
    })

    if (!anamnesis) {
      return NextResponse.json({ data: null }, { status: 200 })
    }

    // Transform to response format
    const response = {
      idPatientAnamnesis: anamnesis.idPatientAnamnesis,
      pacienteId: anamnesis.pacienteId,
      tipo: anamnesis.tipo,
      motivoConsulta: anamnesis.motivoConsulta,
      tieneDolorActual: anamnesis.tieneDolorActual,
      dolorIntensidad: anamnesis.dolorIntensidad,
      urgenciaPercibida: anamnesis.urgenciaPercibida,
      tieneEnfermedadesCronicas: anamnesis.tieneEnfermedadesCronicas,
      tieneAlergias: anamnesis.tieneAlergias,
      tieneMedicacionActual: anamnesis.tieneMedicacionActual,
      embarazada: anamnesis.embarazada,
      expuestoHumoTabaco: anamnesis.expuestoHumoTabaco,
      bruxismo: anamnesis.bruxismo,
      higieneCepilladosDia: anamnesis.higieneCepilladosDia,
      usaHiloDental: anamnesis.usaHiloDental,
      ultimaVisitaDental: anamnesis.ultimaVisitaDental?.toISOString() || null,
      tieneHabitosSuccion: anamnesis.tieneHabitosSuccion,
      lactanciaRegistrada: anamnesis.lactanciaRegistrada,
      payload: anamnesis.payload as Record<string, any> | null,
      antecedents: anamnesis.antecedents.map((ant) => ({
        idAnamnesisAntecedent: ant.idAnamnesisAntecedent,
        anamnesisId: ant.anamnesisId,
        antecedentId: ant.antecedentId,
        antecedentCatalog: ant.antecedentCatalog
          ? {
              idAntecedentCatalog: ant.antecedentCatalog.idAntecedentCatalog,
              code: ant.antecedentCatalog.code,
              name: ant.antecedentCatalog.name,
              category: ant.antecedentCatalog.category,
              description: ant.antecedentCatalog.description,
            }
          : null,
        customName: ant.customName,
        customCategory: ant.customCategory,
        notes: ant.notes,
        diagnosedAt: ant.diagnosedAt?.toISOString() || null,
        isActive: ant.isActive,
        resolvedAt: ant.resolvedAt?.toISOString() || null,
      })),
      medications: anamnesis.medications.map((med) => ({
        idAnamnesisMedication: med.idAnamnesisMedication,
        medicationId: med.medicationId,
        medication: {
          idPatientMedication: med.medication.idPatientMedication,
          label: med.medication.label,
          medicationCatalog: med.medication.medicationCatalog
            ? {
                name: med.medication.medicationCatalog.name,
              }
            : null,
          dose: med.medication.dose,
          freq: med.medication.freq,
          route: med.medication.route,
          isActive: med.medication.isActive,
        },
      })),
      allergies: anamnesis.allergies.map((all) => ({
        idAnamnesisAllergy: all.idAnamnesisAllergy,
        allergyId: all.allergyId,
        allergy: {
          idPatientAllergy: all.allergy.idPatientAllergy,
          label: all.allergy.label,
          allergyCatalog: all.allergy.allergyCatalog
            ? {
                name: all.allergy.allergyCatalog.name,
              }
            : null,
          severity: all.allergy.severity,
          reaction: all.allergy.reaction,
          isActive: all.allergy.isActive,
        },
      })),
      creadoPor: {
        idUsuario: (anamnesis as any).creadoPor.idUsuario,
        nombreApellido: (anamnesis as any).creadoPor.nombreApellido,
      },
      actualizadoPor: (anamnesis as any).actualizadoPor
        ? {
            idUsuario: (anamnesis as any).actualizadoPor.idUsuario,
            nombreApellido: (anamnesis as any).actualizadoPor.nombreApellido,
          }
        : null,
      createdAt: anamnesis.createdAt.toISOString(),
      updatedAt: anamnesis.updatedAt.toISOString(),
    }

    return NextResponse.json({ data: response }, { status: 200 })
  } catch (error) {
    console.error("Error fetching anamnesis:", error)
    return NextResponse.json({ error: "Error al cargar anamnesis" }, { status: 500 })
  }
}

/**
 * POST /api/pacientes/[id]/anamnesis
 * 
 * Creates or updates anamnesis for a patient with normalized structure.
 * Automatically determines tipo (ADULTO vs PEDIATRICO) based on patient age.
 * Creates version history when updating existing anamnesis.
 * 
 * @returns { data: AnamnesisResponse }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id } = await params
    const pacienteId = parseInt(id, 10)
    const userId = parseInt(session.user.id, 10)

    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
    }

    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    // Parse and validate request body
    const body = await req.json()
    const data = AnamnesisCreateUpdateBodySchema.parse(body)

    // Verify patient exists and get age/gender for tipo determination
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      include: { persona: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Determine tipo (ADULTO vs PEDIATRICO) based on age
    let tipo: "ADULTO" | "PEDIATRICO" = "ADULTO"
    if (paciente.persona.fechaNacimiento) {
      const fechaNacimiento = new Date(paciente.persona.fechaNacimiento)
      const hoy = new Date()
      const edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
      const mesDiff = hoy.getMonth() - fechaNacimiento.getMonth()
      const diaDiff = hoy.getDate() - fechaNacimiento.getDate()
      const edadExacta = edad - (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0) ? 1 : 0)
      tipo = edadExacta < 18 ? "PEDIATRICO" : "ADULTO"
    }

    // Build payload JSON for custom notes (backward compatibility)
    const payload = data.customNotes ? { customNotes: data.customNotes } : undefined

    // Extract women-specific fields if provided
    const embarazada = data.womenSpecific?.embarazada ?? null

    // Check if anamnesis already exists for versioning
    const existing = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
      include: {
        antecedents: true,
        medications: true,
        allergies: true,
      },
    })

    // Upsert anamnesis with normalized relationships
    const anamnesis = await prisma.$transaction(async (tx) => {
      const result = await tx.patientAnamnesis.upsert({
        where: { pacienteId },
        create: {
          pacienteId,
          tipo,
          motivoConsulta: data.motivoConsulta,
          tieneDolorActual: data.tieneDolorActual,
          dolorIntensidad: data.dolorIntensidad,
          urgenciaPercibida: data.urgenciaPercibida,
          tieneEnfermedadesCronicas: data.tieneEnfermedadesCronicas,
          tieneAlergias: data.tieneAlergias,
          tieneMedicacionActual: data.tieneMedicacionActual,
          embarazada,
          expuestoHumoTabaco: data.expuestoHumoTabaco,
          bruxismo: data.bruxismo,
          higieneCepilladosDia: data.higieneCepilladosDia,
          usaHiloDental: data.usaHiloDental,
          ultimaVisitaDental: data.ultimaVisitaDental ? new Date(data.ultimaVisitaDental) : null,
          tieneHabitosSuccion: data.tieneHabitosSuccion,
          lactanciaRegistrada: data.lactanciaRegistrada,
          ...(payload !== undefined && { payload }),
          creadoPorUserId: userId,
        },
        update: {
          motivoConsulta: data.motivoConsulta,
          tieneDolorActual: data.tieneDolorActual,
          dolorIntensidad: data.dolorIntensidad,
          urgenciaPercibida: data.urgenciaPercibida,
          tieneEnfermedadesCronicas: data.tieneEnfermedadesCronicas,
          tieneAlergias: data.tieneAlergias,
          tieneMedicacionActual: data.tieneMedicacionActual,
          embarazada,
          expuestoHumoTabaco: data.expuestoHumoTabaco,
          bruxismo: data.bruxismo,
          higieneCepilladosDia: data.higieneCepilladosDia,
          usaHiloDental: data.usaHiloDental,
          ultimaVisitaDental: data.ultimaVisitaDental ? new Date(data.ultimaVisitaDental) : null,
          tieneHabitosSuccion: data.tieneHabitosSuccion,
          lactanciaRegistrada: data.lactanciaRegistrada,
          ...(payload !== undefined && { payload }),
          actualizadoPorUserId: userId,
          updatedAt: new Date(),
        },
        include: {
          creadoPor: { select: { idUsuario: true, nombreApellido: true } },
          actualizadoPor: { select: { idUsuario: true, nombreApellido: true } },
        },
      })

      // Handle antecedents: delete existing and create new ones
      // Note: Prisma client uses camelCase for model names
      if (existing) {
        await (tx as any).anamnesisAntecedent.deleteMany({
          where: { anamnesisId: result.idPatientAnamnesis },
        })
      }

      if (data.antecedents && data.antecedents.length > 0) {
        await (tx as any).anamnesisAntecedent.createMany({
          data: data.antecedents.map((ant) => ({
            anamnesisId: result.idPatientAnamnesis,
            antecedentId: ant.antecedentId || undefined,
            customName: ant.customName || undefined,
            customCategory: ant.customCategory || undefined,
            notes: ant.notes || undefined,
            diagnosedAt: ant.diagnosedAt ? new Date(ant.diagnosedAt) : undefined,
            isActive: ant.isActive,
            resolvedAt: ant.resolvedAt ? new Date(ant.resolvedAt) : undefined,
          })),
        })
      }

      // Handle medications: enhanced with catalog, custom entries, and audit
      const existingMedications = existing
        ? await (tx as any).anamnesisMedication.findMany({
            where: { anamnesisId: result.idPatientAnamnesis },
            include: { medication: true },
          })
        : []

      // Process new medications
      if (data.medications && data.medications.length > 0) {
        for (const medInput of data.medications) {
          let medicationId: number

          if (medInput.medicationId) {
            // Link existing PatientMedication
            const existingMed = await tx.patientMedication.findUnique({
              where: { idPatientMedication: medInput.medicationId },
            })
            if (!existingMed || existingMed.pacienteId !== pacienteId) {
              throw new Error(
                `Medicación ${medInput.medicationId} no existe o no pertenece al paciente`
              )
            }
            medicationId = medInput.medicationId
          } else if (medInput.catalogId) {
            // Create PatientMedication from catalog
            const catalog = await tx.medicationCatalog.findUnique({
              where: { idMedicationCatalog: medInput.catalogId },
            })
            if (!catalog) {
              throw new Error(`Catálogo de medicación ${medInput.catalogId} no existe`)
            }

            const newMed = await tx.patientMedication.create({
              data: {
                pacienteId,
                medicationId: medInput.catalogId,
                label: null,
                dose: medInput.customDose || null,
                freq: medInput.customFreq || null,
                route: medInput.customRoute || null,
                createdByUserId: userId,
              },
            })
            medicationId = newMed.idPatientMedication
          } else if (medInput.customLabel) {
            // Create PatientMedication with custom data
            const newMed = await tx.patientMedication.create({
              data: {
                pacienteId,
                medicationId: null,
                label: medInput.customLabel,
                dose: medInput.customDose || null,
                freq: medInput.customFreq || null,
                route: medInput.customRoute || null,
                createdByUserId: userId,
              },
            })
            medicationId = newMed.idPatientMedication
          } else {
            throw new Error("Medicación debe tener medicationId, catalogId, o customLabel")
          }

          // Check if AnamnesisMedication already exists
          const existingLink = existingMedications.find(
            (em: any) => em.medicationId === medicationId
          )

          if (existingLink) {
            // Update existing link (soft delete/reactivate or update notes)
            const previousSnapshot = {
              medicationId: existingLink.medicationId,
              notes: existingLink.notes,
              isActive: existingLink.isActive,
            }

            await (tx as any).anamnesisMedication.update({
              where: { idAnamnesisMedication: existingLink.idAnamnesisMedication },
              data: {
                isActive: medInput.isActive ?? true,
                notes: medInput.notes || null,
                removedAt: medInput.isActive === false ? new Date() : null,
                removedByUserId: medInput.isActive === false ? userId : null,
              },
            })

            // Log audit
            const action: AuditAction = medInput.isActive === false ? "DEACTIVATED" : "UPDATED"
            await logMedicationChange(
              {
                anamnesisMedicationId: existingLink.idAnamnesisMedication,
                action,
                previousValue: previousSnapshot,
                newValue: {
                  medicationId,
                  notes: medInput.notes,
                  isActive: medInput.isActive ?? true,
                },
                performedByUserId: userId,
              },
              tx
            )
          } else {
            // Create new link
            const newLink = await (tx as any).anamnesisMedication.create({
              data: {
                anamnesisId: result.idPatientAnamnesis,
                medicationId,
                isActive: medInput.isActive ?? true,
                notes: medInput.notes || null,
                addedByUserId: userId,
              },
            })

            // Log audit
            await logMedicationChange(
              {
                anamnesisMedicationId: newLink.idAnamnesisMedication,
                action: "ADDED",
                newValue: {
                  medicationId,
                  notes: medInput.notes,
                  isActive: medInput.isActive ?? true,
                },
                performedByUserId: userId,
              },
              tx
            )
          }
        }
      }

      // Soft delete medications not in the new list
      const newMedicationIds = new Set(
        data.medications
          ?.filter((m) => m.medicationId)
          .map((m) => m.medicationId) || []
      )
      const medicationsToDeactivate = existingMedications.filter(
        (em: any) => !newMedicationIds.has(em.medicationId) && em.isActive
      )

      for (const medToDeactivate of medicationsToDeactivate) {
        await (tx as any).anamnesisMedication.update({
          where: { idAnamnesisMedication: medToDeactivate.idAnamnesisMedication },
          data: {
            isActive: false,
            removedAt: new Date(),
            removedByUserId: userId,
          },
        })

        await logMedicationChange(
          {
            anamnesisMedicationId: medToDeactivate.idAnamnesisMedication,
            action: "DEACTIVATED",
            previousValue: {
              medicationId: medToDeactivate.medicationId,
              notes: medToDeactivate.notes,
              isActive: true,
            },
            newValue: {
              medicationId: medToDeactivate.medicationId,
              notes: medToDeactivate.notes,
              isActive: false,
            },
            performedByUserId: userId,
          },
          tx
        )
      }

      // Handle allergies: enhanced with catalog, custom entries, and audit
      const existingAllergies = existing
        ? await (tx as any).anamnesisAllergy.findMany({
            where: { anamnesisId: result.idPatientAnamnesis },
            include: { allergy: true },
          })
        : []

      // Process new allergies
      if (data.allergies && data.allergies.length > 0) {
        for (const allInput of data.allergies) {
          let allergyId: number

          if (allInput.allergyId) {
            // Link existing PatientAllergy
            const existingAll = await tx.patientAllergy.findUnique({
              where: { idPatientAllergy: allInput.allergyId },
            })
            if (!existingAll || existingAll.pacienteId !== pacienteId) {
              throw new Error(
                `Alergia ${allInput.allergyId} no existe o no pertenece al paciente`
              )
            }
            allergyId = allInput.allergyId
          } else if (allInput.catalogId) {
            // Create PatientAllergy from catalog
            const catalog = await tx.allergyCatalog.findUnique({
              where: { idAllergyCatalog: allInput.catalogId },
            })
            if (!catalog) {
              throw new Error(`Catálogo de alergia ${allInput.catalogId} no existe`)
            }

            const newAll = await tx.patientAllergy.create({
              data: {
                pacienteId,
                allergyId: allInput.catalogId,
                label: null,
                severity: allInput.severity || "MODERATE",
                reaction: allInput.reaction || null,
                createdByUserId: userId,
              },
            })
            allergyId = newAll.idPatientAllergy
          } else if (allInput.customLabel) {
            // Create PatientAllergy with custom data
            const newAll = await tx.patientAllergy.create({
              data: {
                pacienteId,
                allergyId: null,
                label: allInput.customLabel,
                severity: allInput.severity || "MODERATE",
                reaction: allInput.reaction || null,
                createdByUserId: userId,
              },
            })
            allergyId = newAll.idPatientAllergy
          } else {
            throw new Error("Alergia debe tener allergyId, catalogId, o customLabel")
          }

          // Check if AnamnesisAllergy already exists
          const existingLink = existingAllergies.find(
            (ea: any) => ea.allergyId === allergyId
          )

          if (existingLink) {
            // Update existing link (soft delete/reactivate or update notes)
            const previousSnapshot = {
              allergyId: existingLink.allergyId,
              notes: existingLink.notes,
              isActive: existingLink.isActive,
            }

            await (tx as any).anamnesisAllergy.update({
              where: { idAnamnesisAllergy: existingLink.idAnamnesisAllergy },
              data: {
                isActive: allInput.isActive ?? true,
                notes: allInput.notes || null,
                removedAt: allInput.isActive === false ? new Date() : null,
                removedByUserId: allInput.isActive === false ? userId : null,
              },
            })

            // Log audit
            const action: AuditAction = allInput.isActive === false ? "DEACTIVATED" : "UPDATED"
            await logAllergyChange(
              {
                anamnesisAllergyId: existingLink.idAnamnesisAllergy,
                action,
                previousValue: previousSnapshot,
                newValue: {
                  allergyId,
                  notes: allInput.notes,
                  isActive: allInput.isActive ?? true,
                },
                performedByUserId: userId,
              },
              tx
            )
          } else {
            // Create new link
            const newLink = await (tx as any).anamnesisAllergy.create({
              data: {
                anamnesisId: result.idPatientAnamnesis,
                allergyId,
                isActive: allInput.isActive ?? true,
                notes: allInput.notes || null,
                addedByUserId: userId,
              },
            })

            // Log audit
            await logAllergyChange(
              {
                anamnesisAllergyId: newLink.idAnamnesisAllergy,
                action: "ADDED",
                newValue: {
                  allergyId,
                  notes: allInput.notes,
                  isActive: allInput.isActive ?? true,
                },
                performedByUserId: userId,
              },
              tx
            )
          }
        }
      }

      // Soft delete allergies not in the new list
      const newAllergyIds = new Set(
        data.allergies?.filter((a) => a.allergyId).map((a) => a.allergyId) || []
      )
      const allergiesToDeactivate = existingAllergies.filter(
        (ea: any) => !newAllergyIds.has(ea.allergyId) && ea.isActive
      )

      for (const allToDeactivate of allergiesToDeactivate) {
        await (tx as any).anamnesisAllergy.update({
          where: { idAnamnesisAllergy: allToDeactivate.idAnamnesisAllergy },
          data: {
            isActive: false,
            removedAt: new Date(),
            removedByUserId: userId,
          },
        })

        await logAllergyChange(
          {
            anamnesisAllergyId: allToDeactivate.idAnamnesisAllergy,
            action: "DEACTIVATED",
            previousValue: {
              allergyId: allToDeactivate.allergyId,
              notes: allToDeactivate.notes,
              isActive: true,
            },
            newValue: {
              allergyId: allToDeactivate.allergyId,
              notes: allToDeactivate.notes,
              isActive: false,
            },
            performedByUserId: userId,
          },
          tx
        )
      }

      // Create version history if updating existing anamnesis
      if (existing) {
        await tx.patientAnamnesisVersion.create({
          data: {
            pacienteId,
            anamnesisId: result.idPatientAnamnesis,
            consultaId: data.consultaId || null,
            tipo: existing.tipo,
            motivoConsulta: existing.motivoConsulta,
            dolorIntensidad: existing.dolorIntensidad,
            tieneDolorActual: existing.tieneDolorActual,
            urgenciaPercibida: existing.urgenciaPercibida,
            tieneEnfermedadesCronicas: existing.tieneEnfermedadesCronicas,
            tieneAlergias: existing.tieneAlergias,
            tieneMedicacionActual: existing.tieneMedicacionActual,
            embarazada: existing.embarazada,
            expuestoHumoTabaco: existing.expuestoHumoTabaco,
            bruxismo: existing.bruxismo,
            higieneCepilladosDia: existing.higieneCepilladosDia,
            usaHiloDental: existing.usaHiloDental,
            ultimaVisitaDental: existing.ultimaVisitaDental,
            tieneHabitosSuccion: existing.tieneHabitosSuccion,
            lactanciaRegistrada: existing.lactanciaRegistrada,
            payload: existing.payload as object,
            motivoCambio: "Actualización desde consulta",
            creadoPorUserId: userId,
          },
        })
      }

      // Fetch complete anamnesis with relationships for response
      return await tx.patientAnamnesis.findUnique({
        where: { idPatientAnamnesis: result.idPatientAnamnesis },
        include: {
          creadoPor: { select: { idUsuario: true, nombreApellido: true } },
          actualizadoPor: { select: { idUsuario: true, nombreApellido: true } },
          antecedents: {
            include: {
              antecedentCatalog: true,
            },
          } as any,
          medications: {
            include: {
              medication: {
                include: {
                  medicationCatalog: true,
                },
              },
              addedBy: { select: { idUsuario: true, nombreApellido: true } },
              removedBy: { select: { idUsuario: true, nombreApellido: true } },
            },
            orderBy: { idAnamnesisMedication: "asc" },
          } as any,
          allergies: {
            include: {
              allergy: {
                include: {
                  allergyCatalog: true,
                },
              },
              addedBy: { select: { idUsuario: true, nombreApellido: true } },
              removedBy: { select: { idUsuario: true, nombreApellido: true } },
            },
            orderBy: { idAnamnesisAllergy: "asc" },
          } as any,
        },
      })
    })

    if (!anamnesis) {
      throw new Error("Error al crear/actualizar anamnesis")
    }

    // Transform to response format
    const response = {
      idPatientAnamnesis: anamnesis.idPatientAnamnesis,
      pacienteId: anamnesis.pacienteId,
      tipo: anamnesis.tipo,
      motivoConsulta: anamnesis.motivoConsulta,
      tieneDolorActual: anamnesis.tieneDolorActual,
      dolorIntensidad: anamnesis.dolorIntensidad,
      urgenciaPercibida: anamnesis.urgenciaPercibida,
      tieneEnfermedadesCronicas: anamnesis.tieneEnfermedadesCronicas,
      tieneAlergias: anamnesis.tieneAlergias,
      tieneMedicacionActual: anamnesis.tieneMedicacionActual,
      embarazada: anamnesis.embarazada,
      expuestoHumoTabaco: anamnesis.expuestoHumoTabaco,
      bruxismo: anamnesis.bruxismo,
      higieneCepilladosDia: anamnesis.higieneCepilladosDia,
      usaHiloDental: anamnesis.usaHiloDental,
      ultimaVisitaDental: anamnesis.ultimaVisitaDental?.toISOString() || null,
      tieneHabitosSuccion: anamnesis.tieneHabitosSuccion,
      lactanciaRegistrada: anamnesis.lactanciaRegistrada,
      payload: anamnesis.payload as Record<string, any> | null,
      antecedents: anamnesis.antecedents.map((ant) => ({
        idAnamnesisAntecedent: ant.idAnamnesisAntecedent,
        anamnesisId: ant.anamnesisId,
        antecedentId: ant.antecedentId,
        antecedentCatalog: ant.antecedentCatalog
          ? {
              idAntecedentCatalog: ant.antecedentCatalog.idAntecedentCatalog,
              code: ant.antecedentCatalog.code,
              name: ant.antecedentCatalog.name,
              category: ant.antecedentCatalog.category,
              description: ant.antecedentCatalog.description,
            }
          : null,
        customName: ant.customName,
        customCategory: ant.customCategory,
        notes: ant.notes,
        diagnosedAt: ant.diagnosedAt?.toISOString() || null,
        isActive: ant.isActive,
        resolvedAt: ant.resolvedAt?.toISOString() || null,
      })),
      medications: anamnesis.medications.map((med) => ({
        idAnamnesisMedication: med.idAnamnesisMedication,
        medicationId: med.medicationId,
        medication: {
          idPatientMedication: med.medication.idPatientMedication,
          label: med.medication.label,
          medicationCatalog: med.medication.medicationCatalog
            ? {
                name: med.medication.medicationCatalog.name,
              }
            : null,
          dose: med.medication.dose,
          freq: med.medication.freq,
          route: med.medication.route,
          isActive: med.medication.isActive,
        },
      })),
      allergies: anamnesis.allergies.map((all) => ({
        idAnamnesisAllergy: all.idAnamnesisAllergy,
        allergyId: all.allergyId,
        allergy: {
          idPatientAllergy: all.allergy.idPatientAllergy,
          label: all.allergy.label,
          allergyCatalog: all.allergy.allergyCatalog
            ? {
                name: all.allergy.allergyCatalog.name,
              }
            : null,
          severity: all.allergy.severity,
          reaction: all.allergy.reaction,
          isActive: all.allergy.isActive,
        },
      })),
      creadoPor: {
        idUsuario: (anamnesis as any).creadoPor.idUsuario,
        nombreApellido: (anamnesis as any).creadoPor.nombreApellido,
      },
      actualizadoPor: (anamnesis as any).actualizadoPor
        ? {
            idUsuario: (anamnesis as any).actualizadoPor.idUsuario,
            nombreApellido: (anamnesis as any).actualizadoPor.nombreApellido,
          }
        : null,
      createdAt: anamnesis.createdAt.toISOString(),
      updatedAt: anamnesis.updatedAt.toISOString(),
    }

    return NextResponse.json({ data: response }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error("Error saving anamnesis:", error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      )
    }

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: any }
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una anamnesis para este paciente" },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar anamnesis" },
      { status: 500 }
    )
  }
}
