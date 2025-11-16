import { prisma } from "@/lib/prisma"
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize"
import type { PatientUpdateBody } from "./_schemas"
import type { Prisma } from "@prisma/client"

interface UpdateContext {
  userId: number
  role: "ADMIN" | "RECEP" | "ODONT"
  ip?: string
}

/**
 * Calculate field differences for audit logging
 */
function calculateDiff(oldData: Record<string, unknown>, newData: Record<string, unknown>): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {}

  for (const key in newData) {
    if (newData[key] !== undefined && oldData[key] !== newData[key]) {
      diff[key] = { old: oldData[key], new: newData[key] }
    }
  }

  return diff
}

/**
 * Update patient with concurrency control, duplicate detection, and audit logging
 */
export async function updatePaciente(id: number, body: PatientUpdateBody, context: UpdateContext) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current patient with persona
    const current = await tx.paciente.findUnique({
      where: { idPaciente: id },
      include: {
        persona: {
          include: {
            documento: true,
            contactos: {
              where: { activo: true },
              orderBy: { esPrincipal: "desc" },
            },
          },
        },
      },
    })

    if (!current) {
      const error = new Error("Paciente no encontrado") as Error & { status: number }
      error.status = 404
      throw error
    }

    // 2. Concurrency control - check updatedAt
    const currentUpdatedAt = current.updatedAt.toISOString()
    if (currentUpdatedAt !== body.updatedAt) {
      const error = new Error(
        "El paciente fue actualizado por otro usuario. Por favor, recarga la página e intenta nuevamente.",
      ) as Error & { status: number; code: string }
      error.status = 409
      error.code = "VERSION_CONFLICT"
      throw error
    }

    // 3. Check permissions
    const canEditDemographics = context.role === "ADMIN" || context.role === "RECEP"
    const canEditStatus = context.role === "ADMIN" || context.role === "RECEP"

    // 4. Normalize data
    const normalizedEmail = body.email ? normalizeEmail(body.email) : undefined
    const normalizedPhone = body.phone ? normalizePhonePY(body.phone) : undefined

    // Map documentType from API to Prisma enum
    const documentTypeMap: Record<string, "CI" | "DNI" | "PASAPORTE" | "RUC" | "OTRO"> = {
      CI: "CI",
      PASSPORT: "PASAPORTE",
      RUC: "RUC",
      OTHER: "OTRO",
    }
    const prismaDocumentType = body.documentType ? documentTypeMap[body.documentType] : undefined

    // Map gender from API to Prisma enum
    const genderMap: Record<string, "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"> = {
      MALE: "MASCULINO",
      FEMALE: "FEMENINO",
      OTHER: "OTRO",
    }
    const prismaGender = body.gender ? genderMap[body.gender] : undefined

    // 5. Check for duplicates
    if (prismaDocumentType && body.documentNumber) {
      const duplicate = await tx.persona.findFirst({
        where: {
          AND: [
            { idPersona: { not: current.personaId } },
            {
              documento: {
                tipo: prismaDocumentType,
                numero: body.documentNumber.trim(),
              },
            },
          ],
        },
      })

      if (duplicate) {
        const error = new Error("Ya existe un paciente con este tipo y número de documento") as Error & { status: number; code: string }
        error.status = 409
        error.code = "DUPLICATE_DOCUMENT"
        throw error
      }
    }

    if (normalizedEmail) {
      const duplicate = await tx.personaContacto.findFirst({
        where: {
          AND: [
            { personaId: { not: current.personaId } },
            { tipo: "EMAIL" },
            { valorNorm: normalizedEmail },
            { activo: true },
          ],
        },
      })

      if (duplicate) {
        const error = new Error("Ya existe un paciente con este email") as Error & { status: number; code: string }
        error.status = 409
        error.code = "DUPLICATE_EMAIL"
        throw error
      }
    }

    // 6. Prepare update data for Persona
    const personaUpdateData: Prisma.PersonaUpdateInput = {}
    const oldPersonaData: Record<string, unknown> = {}

    if (canEditDemographics) {
      if (body.firstName !== undefined) {
        personaUpdateData.nombres = body.firstName
        oldPersonaData.firstName = current.persona.nombres
      }
      if (body.lastName !== undefined) {
        personaUpdateData.apellidos = body.lastName
        oldPersonaData.lastName = current.persona.apellidos
      }
      if (body.secondLastName !== undefined) { // ⭐ Added
        personaUpdateData.segundoApellido = body.secondLastName
        oldPersonaData.secondLastName = current.persona.segundoApellido
      }
      if (prismaGender !== undefined) {
        personaUpdateData.genero = prismaGender
        oldPersonaData.gender = current.persona.genero
      }
      if (body.dateOfBirth !== undefined) {
        personaUpdateData.fechaNacimiento = body.dateOfBirth ? new Date(body.dateOfBirth) : null
        oldPersonaData.dateOfBirth = current.persona.fechaNacimiento?.toISOString() ?? null
      }
      if (body.address !== undefined) {
        personaUpdateData.direccion = body.address
        oldPersonaData.address = current.persona.direccion
      }
      if (body.city !== undefined) { // ⭐ Added
        personaUpdateData.ciudad = body.city
        oldPersonaData.city = current.persona.ciudad
      }
      if (body.country !== undefined) { // ⭐ Added
        personaUpdateData.pais = body.country
        oldPersonaData.country = current.persona.pais
      }
      if (body.emergencyContactName !== undefined) { // ⭐ Added
        personaUpdateData.contactoEmergenciaNombre = body.emergencyContactName
        oldPersonaData.emergencyContactName = current.persona.contactoEmergenciaNombre
      }
      if (body.emergencyContactPhone !== undefined) { // ⭐ Added
        personaUpdateData.contactoEmergenciaTelefono = body.emergencyContactPhone
        oldPersonaData.emergencyContactPhone = current.persona.contactoEmergenciaTelefono
      }
      if (body.emergencyContactRelation !== undefined) { // ⭐ Added
        personaUpdateData.contactoEmergenciaRelacion = body.emergencyContactRelation
        oldPersonaData.emergencyContactRelation = current.persona.contactoEmergenciaRelacion
      }
    }

    // 7. Update Persona if needed
    if (Object.keys(personaUpdateData).length > 0) {
      await tx.persona.update({
        where: { idPersona: current.personaId },
        data: personaUpdateData,
      })
    }

    // 8. Update or create Documento if needed
    if (canEditDemographics && (prismaDocumentType || body.documentNumber || body.ruc || body.documentIssueDate !== undefined || body.documentExpiryDate !== undefined)) {
      const documentData: Prisma.DocumentoUpdateInput = {}

      if (prismaDocumentType) documentData.tipo = prismaDocumentType
      if (body.documentNumber) documentData.numero = body.documentNumber.trim()
      if (body.ruc !== undefined) documentData.ruc = body.ruc
      if (body.documentCountry) documentData.paisEmision = body.documentCountry
      if (body.documentIssueDate !== undefined) documentData.fechaEmision = body.documentIssueDate ? new Date(body.documentIssueDate) : null // ⭐ Added
      if (body.documentExpiryDate !== undefined) documentData.fechaVencimiento = body.documentExpiryDate ? new Date(body.documentExpiryDate) : null // ⭐ Added

      if (current.persona.documento) {
        await tx.documento.update({
          where: { idDocumento: current.persona.documento.idDocumento },
          data: documentData,
        })
      } else if (prismaDocumentType && body.documentNumber) {
        await tx.documento.create({
          data: {
            personaId: current.personaId,
            tipo: prismaDocumentType,
            numero: body.documentNumber.trim(),
            paisEmision: body.documentCountry ?? "PY",
            ruc: body.ruc ?? null,
            fechaEmision: body.documentIssueDate ? new Date(body.documentIssueDate) : null, // ⭐ Added
            fechaVencimiento: body.documentExpiryDate ? new Date(body.documentExpiryDate) : null, // ⭐ Added
          },
        })
      }
    }

    // 9. Update or create primary phone contact
    if (normalizedPhone !== undefined && canEditDemographics) {
      const existingPhone = current.persona.contactos.find((c) => c.tipo === "PHONE")

      if (normalizedPhone === null) {
        // Remove phone if exists
        if (existingPhone) {
          await tx.personaContacto.update({
            where: { idContacto: existingPhone.idContacto },
            data: { activo: false },
          })
        }
      } else if (existingPhone) {
        // Update existing
        await tx.personaContacto.update({
          where: { idContacto: existingPhone.idContacto },
          data: { valorNorm: normalizedPhone },
        })
      } else {
        // Create new
        await tx.personaContacto.create({
          data: {
            personaId: current.personaId,
            tipo: "PHONE",
            valorRaw: normalizedPhone,
            valorNorm: normalizedPhone,
            esPrincipal: true,
            activo: true,
          },
        })
      }
    }

    // 10. Update or create primary email contact
    if (normalizedEmail !== undefined && canEditDemographics) {
      const existingEmail = current.persona.contactos.find((c) => c.tipo === "EMAIL")

      if (normalizedEmail === null) {
        // Remove email if exists
        if (existingEmail) {
          await tx.personaContacto.update({
            where: { idContacto: existingEmail.idContacto },
            data: { activo: false },
          })
        }
      } else if (existingEmail) {
        // Update existing
        await tx.personaContacto.update({
          where: { idContacto: existingEmail.idContacto },
          data: { valorNorm: normalizedEmail },
        })
      } else {
        // Create new
        await tx.personaContacto.create({
          data: {
            personaId: current.personaId,
            tipo: "EMAIL",
            valorRaw: normalizedEmail,
            valorNorm: normalizedEmail,
            esPrincipal: true,
            activo: true,
          },
        })
      }
    }

    // 11. Update Paciente notes (legacy fields)
    const notasData: Record<string, unknown> = current.notas ? (JSON.parse(current.notas as string) as Record<string, unknown>) : {}
    const oldNotasData: Record<string, unknown> = { ...notasData }

    if (body.insurance !== undefined) {
      notasData.obraSocial = body.insurance
      oldPersonaData.insurance = oldNotasData.obraSocial
    }
    if (body.emergencyContactName !== undefined) {
      notasData.emergencyContactName = body.emergencyContactName
      oldPersonaData.emergencyContactName = oldNotasData.emergencyContactName
    }
    if (body.emergencyContactPhone !== undefined) {
      notasData.emergencyContactPhone = body.emergencyContactPhone
      oldPersonaData.emergencyContactPhone = oldNotasData.emergencyContactPhone
    }

    // 12. Update Paciente status if allowed
    const pacienteUpdateData: Prisma.PacienteUpdateInput = {
      notas: JSON.stringify(notasData),
    }

    if (canEditStatus && body.status !== undefined) {
      pacienteUpdateData.estaActivo = body.status === "ACTIVE"
      oldPersonaData.status = current.estaActivo ? "ACTIVE" : "INACTIVE"
    }

    const updatedPaciente = await tx.paciente.update({
      where: { idPaciente: id },
      data: pacienteUpdateData,
      include: {
        persona: {
          include: {
            documento: true,
            contactos: {
              where: { activo: true },
              orderBy: { esPrincipal: "desc" },
            },
          },
        },
      },
    })

    // 13. Calculate diff for audit
    const newData: Record<string, unknown> = {
      firstName: body.firstName,
      lastName: body.lastName,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      address: body.address,
      phone: normalizedPhone,
      email: normalizedEmail,
      insurance: body.insurance,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      status: body.status,
    }

    const diff = calculateDiff(oldPersonaData, newData)

    // 14. Create audit log
    try {
      await tx.auditLog.create({
        data: {
          actorId: context.userId,
          action: "PATIENT_UPDATE",
          entity: "Patient",
          entityId: id,
          ip: context.ip ?? null,
          metadata: {
            diff,
            role: context.role,
          } as Prisma.InputJsonValue,
        },
      })
    } catch (auditError) {
      // Audit log is non-critical, log but don't fail transaction
      console.error("[v0] Failed to create audit log:", auditError)
    }

    // 15. Return updated patient
    return {
      id: updatedPaciente.idPaciente,
      firstName: updatedPaciente.persona.nombres,
      lastName: updatedPaciente.persona.apellidos,
      status: updatedPaciente.estaActivo ? ("ACTIVE" as const) : ("INACTIVE" as const),
      updatedAt: updatedPaciente.updatedAt.toISOString(),
    }
  })
}
