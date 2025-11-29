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
import {
  createAnamnesisAuditLog,
  createAnamnesisSnapshot,
  type AnamnesisState,
} from "@/lib/services/anamnesis-audit-complete.service"
import { AuditAction as GeneralAuditAction, AuditEntity } from "@/lib/audit/actions"
import { writeAudit } from "@/lib/audit/log"

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
                idMedicationCatalog: med.medication.medicationCatalog.idMedicationCatalog,
                name: med.medication.medicationCatalog.name,
                description: med.medication.medicationCatalog.description,
              }
            : null,
          dose: med.medication.dose,
          freq: med.medication.freq,
          route: med.medication.route,
          isActive: med.medication.isActive,
        },
        notes: (med as any).notes || null, // Include notes for customDescription mapping
      })),
      allergies: anamnesis.allergies.map((all) => ({
        idAnamnesisAllergy: all.idAnamnesisAllergy,
        allergyId: all.allergyId,
        allergy: {
          idPatientAllergy: all.allergy.idPatientAllergy,
          label: all.allergy.label,
          allergyCatalog: all.allergy.allergyCatalog
            ? {
                idAllergyCatalog: all.allergy.allergyCatalog.idAllergyCatalog,
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
 * Helper function to calculate age from birth date
 */
function calcularEdad(fechaNacimiento: Date | null): number {
  if (!fechaNacimiento) return 0
  const hoy = new Date()
  const edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
  const mesDiff = hoy.getMonth() - fechaNacimiento.getMonth()
  const diaDiff = hoy.getDate() - fechaNacimiento.getDate()
  return edad - (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0) ? 1 : 0)
}

/**
 * Helper function to convert Prisma anamnesis to AnamnesisState for audit
 */
function convertToAnamnesisState(anamnesis: any): AnamnesisState {
  return {
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
    payload: anamnesis.payload as Record<string, unknown> | null,
    antecedents: anamnesis.antecedents || [],
    medications: anamnesis.medications || [],
    allergies: anamnesis.allergies || [],
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
    console.log("📥 Received data:", body)
    const data = AnamnesisCreateUpdateBodySchema.parse(body)

    // Verify patient exists and get age/gender for tipo determination
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      include: { persona: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Calculate age and determine tipo
    const fechaNacimiento = paciente.persona.fechaNacimiento
      ? new Date(paciente.persona.fechaNacimiento)
      : null
    const edad = calcularEdad(fechaNacimiento)
    const tipo: "ADULTO" | "PEDIATRICO" = edad < 18 ? "PEDIATRICO" : "ADULTO"

    // Validations: gender for womenSpecific
    if (data.womenSpecific && paciente.persona.genero !== "FEMENINO") {
      return NextResponse.json(
        { error: "womenSpecific solo aplica para género FEMENINO" },
        { status: 400 }
      )
    }

    // Validations: age for pregnancy
    if (data.womenSpecific?.embarazada === true && edad < 15) {
      return NextResponse.json(
        { error: "Paciente menor de 15 años no puede estar embarazada" },
        { status: 400 }
      )
    }

    // Build complete payload JSON
    const payload: Record<string, any> = {}

    // Custom notes
    if (data.customNotes?.trim()) {
      payload.customNotes = data.customNotes.trim()
    }

    // Women-specific data
    if (data.womenSpecific) {
      payload.womenSpecific = {
        embarazada: data.womenSpecific.embarazada ?? null,
        semanasEmbarazo: data.womenSpecific.semanasEmbarazo ?? null,
        ultimaMenstruacion: data.womenSpecific.ultimaMenstruacion ?? null,
        planificacionFamiliar: data.womenSpecific.planificacionFamiliar?.trim() || null,
      }
    }

    // Pediatric-specific data
    if (tipo === "PEDIATRICO") {
      payload.pediatricSpecific = {
        tieneHabitosSuccion: data.tieneHabitosSuccion ?? null,
        lactanciaRegistrada: data.lactanciaRegistrada ?? null, // Can be enum string or boolean
      }
    }

    // Metadata
    payload._metadata = {
      patientAge: edad,
      patientGender: paciente.persona.genero,
      formVersion: "2.0",
      completedAt: new Date().toISOString(),
    }

    const finalPayload = Object.keys(payload).length > 0 ? payload : undefined
    console.log("📦 Built payload:", finalPayload)

    // Extract women-specific fields if provided (for direct DB field)
    const embarazada = data.womenSpecific?.embarazada ?? null

    // Handle lactanciaRegistrada: if it's a string enum, don't save to direct DB field
    // The enum value goes in payload.pediatricSpecific.lactanciaRegistrada
    // The direct DB field (Boolean?) is only for backward compatibility with old boolean values
    const lactanciaRegistradaForDB =
      typeof data.lactanciaRegistrada === "string"
        ? null // Don't save enum string to Boolean field
        : data.lactanciaRegistrada ?? null // Save boolean or null

    // Check if anamnesis already exists for versioning and audit
    const existing = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
      include: {
        antecedents: {
          include: { antecedentCatalog: true },
        },
        medications: {
          include: {
            medication: {
              include: { medicationCatalog: true },
            },
          },
        },
        allergies: {
          include: {
            allergy: {
              include: { allergyCatalog: true },
            },
          },
        },
      },
    })

    // Get previous state for audit (if updating)
    const previousState: AnamnesisState | null = existing ? convertToAnamnesisState(existing) : null
    const isCreate = !existing
    const previousVersionNumber = existing?.versionNumber || null

    // Get user role for audit
    const user = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      include: { rol: true },
    })
    const actorRole = (user?.rol?.nombreRol as "ADMIN" | "ODONT" | "RECEP") || "RECEP"

    // Upsert anamnesis with normalized relationships
    const anamnesis = await prisma.$transaction(async (tx) => {
      const result = await tx.patientAnamnesis.upsert({
        where: { pacienteId },
        create: {
          pacienteId,
          tipo,
          motivoConsulta: data.motivoConsulta ?? null, // Optional - moved to consulta
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
          lactanciaRegistrada: lactanciaRegistradaForDB, // Boolean or null only (enum goes in payload)
          ...(finalPayload !== undefined && { payload: finalPayload }),
          creadoPorUserId: userId,
          versionNumber: 1, // Initial version
        },
        update: {
          motivoConsulta: data.motivoConsulta ?? null, // Optional - moved to consulta
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
          lactanciaRegistrada: lactanciaRegistradaForDB, // Boolean or null only (enum goes in payload)
          ...(finalPayload !== undefined && { payload: finalPayload }),
          actualizadoPorUserId: userId,
          updatedAt: new Date(),
          versionNumber: { increment: 1 }, // Increment version
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
            // Store customDescription in notes for custom medications
            if (medInput.customDescription) {
              medInput.notes = medInput.customDescription
            }
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

    console.log("✅ Saved anamnesis ID:", anamnesis.idPatientAnamnesis)

    // Handle outside consultation edits
    const isOutsideConsultation = !data.consultaId && data.editContext?.isOutsideConsultation
    if (isOutsideConsultation && !isCreate && data.editContext) {
      try {
        const { processOutsideConsultationEdit } = await import(
          "@/lib/services/anamnesis-outside-consultation.service"
        )
        const newState = convertToAnamnesisState(anamnesis)
        
        await processOutsideConsultationEdit({
          anamnesisId: anamnesis.idPatientAnamnesis,
          pacienteId,
          previousState,
          newState,
          actorId: userId,
          actorRole,
          context: {
            isOutsideConsultation: true,
            informationSource: data.editContext.informationSource,
            verifiedWithPatient: data.editContext.verifiedWithPatient,
            reason: data.editContext.reason,
            requiresReview: true, // Will be determined by field analysis
          },
          headers: req.headers,
          requestPath: req.nextUrl.pathname,
        })
      } catch (outsideEditError) {
        console.error("[Outside Consultation Edit] Error:", outsideEditError)
        // Don't fail the request, but log the error
      }
    }

    // Register in general AuditLog for consistency
    try {
      await writeAudit({
        actorId: userId,
        action: isCreate ? GeneralAuditAction.ANAMNESIS_CREATE : GeneralAuditAction.ANAMNESIS_UPDATE,
        entity: AuditEntity.PatientAnamnesis,
        entityId: anamnesis.idPatientAnamnesis,
        metadata: {
          pacienteId,
          versionNumber: anamnesis.versionNumber,
          consultaId: data.consultaId || null,
          isOutsideConsultation: isOutsideConsultation || false,
        },
        headers: req.headers,
        path: req.nextUrl.pathname,
      })
    } catch (auditError) {
      console.error("[Audit] Error writing to general AuditLog:", auditError)
      // Don't fail the request if audit fails
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
                idMedicationCatalog: med.medication.medicationCatalog.idMedicationCatalog,
                name: med.medication.medicationCatalog.name,
                description: med.medication.medicationCatalog.description,
              }
            : null,
          dose: med.medication.dose,
          freq: med.medication.freq,
          route: med.medication.route,
          isActive: med.medication.isActive,
        },
        notes: (med as any).notes || null, // Include notes for customDescription mapping
      })),
      allergies: anamnesis.allergies.map((all) => ({
        idAnamnesisAllergy: all.idAnamnesisAllergy,
        allergyId: all.allergyId,
        allergy: {
          idPatientAllergy: all.allergy.idPatientAllergy,
          label: all.allergy.label,
          allergyCatalog: all.allergy.allergyCatalog
            ? {
                idAllergyCatalog: all.allergy.allergyCatalog.idAllergyCatalog,
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

// DELETE endpoint for soft delete
export async function DELETE(
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

    if (isNaN(pacienteId) || isNaN(userId)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Get anamnesis
    const anamnesis = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
      include: {
        antecedents: {
          include: { antecedentCatalog: true },
        },
        medications: {
          include: {
            medication: {
              include: { medicationCatalog: true },
            },
          },
        },
        allergies: {
          include: {
            allergy: {
              include: { allergyCatalog: true },
            },
          },
        },
      },
    })

    if (!anamnesis) {
      return NextResponse.json({ error: "Anamnesis no encontrada" }, { status: 404 })
    }

    if (anamnesis.isDeleted) {
      return NextResponse.json({ error: "La anamnesis ya está eliminada" }, { status: 400 })
    }

    // Check permissions (only ADMIN and ODONT can delete)
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    if (userRole === "RECEP") {
      return NextResponse.json({ error: "No tiene permisos para eliminar anamnesis" }, { status: 403 })
    }

    // Parse body for reason
    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === "string" ? body.reason.trim() : "Eliminación de anamnesis"

    // Get previous state for audit
    const previousState: AnamnesisState | null = convertToAnamnesisState(anamnesis)

    // Soft delete in transaction
    await prisma.$transaction(async (tx) => {
      // Mark as deleted
      await tx.patientAnamnesis.update({
        where: { idPatientAnamnesis: anamnesis.idPatientAnamnesis },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedByUserId: userId,
          deletedReason: reason,
        },
      })

      // Create final snapshot
      await createAnamnesisSnapshot(
        anamnesis.idPatientAnamnesis,
        anamnesis.versionNumber,
        reason,
        null,
        req.headers,
        tx
      )

      // Create audit log
      await createAnamnesisAuditLog(
        {
          action: "DELETE",
          anamnesisId: anamnesis.idPatientAnamnesis,
          pacienteId,
          actorId: userId,
          actorRole,
          previousState,
          newState: null,
          reason,
          headers: req.headers,
          path: req.nextUrl.pathname,
          previousVersionNumber: anamnesis.versionNumber,
          newVersionNumber: null,
        },
        tx
      )
    })

    // Register in general AuditLog
    try {
      await writeAudit({
        actorId: userId,
        action: GeneralAuditAction.ANAMNESIS_DELETE,
        entity: AuditEntity.PatientAnamnesis,
        entityId: anamnesis.idPatientAnamnesis,
        metadata: {
          pacienteId,
          reason,
        },
        headers: req.headers,
        path: req.nextUrl.pathname,
      })
    } catch (auditError) {
      console.error("[Audit] Error writing to general AuditLog:", auditError)
    }

    return NextResponse.json({
      message: "Anamnesis eliminada correctamente",
    })
  } catch (error) {
    console.error("Error in DELETE /api/pacientes/[id]/anamnesis:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar anamnesis" },
      { status: 500 }
    )
  }
}
