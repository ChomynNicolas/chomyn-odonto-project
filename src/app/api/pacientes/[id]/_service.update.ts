import { prisma } from "@/lib/prisma"
import { normalizeEmail, normalizePhonePY } from "@/lib/normalize"
import type { PatientUpdateBody } from "./_schemas"

interface UpdateContext {
  userId: number
  role: "ADMIN" | "RECEP" | "ODONT"
  ip?: string
}

/**
 * Calculate field differences for audit logging
 */
function calculateDiff(oldData: any, newData: any): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {}

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
      const error: any = new Error("Paciente no encontrado")
      error.status = 404
      throw error
    }

    // 2. Concurrency control - check updatedAt
    const currentUpdatedAt = current.updatedAt.toISOString()
    if (currentUpdatedAt !== body.updatedAt) {
      const error: any = new Error(
        "El paciente fue actualizado por otro usuario. Por favor, recarga la página e intenta nuevamente.",
      )
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

    // 5. Check for duplicates
    if (body.documentType && body.documentNumber) {
      const duplicate = await tx.persona.findFirst({
        where: {
          AND: [
            { idPersona: { not: current.personaId } },
            {
              documento: {
                tipo: body.documentType,
                numero: body.documentNumber.trim(),
              },
            },
          ],
        },
      })

      if (duplicate) {
        const error: any = new Error("Ya existe un paciente con este tipo y número de documento")
        error.status = 409
        error.code = "DUPLICATE_DOCUMENT"
        throw error
      }
    }

    if (normalizedEmail) {
      const duplicate = await tx.contacto.findFirst({
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
        const error: any = new Error("Ya existe un paciente con este email")
        error.status = 409
        error.code = "DUPLICATE_EMAIL"
        throw error
      }
    }

    // 6. Prepare update data for Persona
    const personaUpdateData: any = {}
    const oldPersonaData: any = {}

    if (canEditDemographics) {
      if (body.firstName !== undefined) {
        personaUpdateData.nombres = body.firstName
        oldPersonaData.firstName = current.persona.nombres
      }
      if (body.lastName !== undefined) {
        personaUpdateData.apellidos = body.lastName
        oldPersonaData.lastName = current.persona.apellidos
      }
      if (body.gender !== undefined) {
        personaUpdateData.genero = body.gender
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
    }

    // 7. Update Persona if needed
    if (Object.keys(personaUpdateData).length > 0) {
      await tx.persona.update({
        where: { idPersona: current.personaId },
        data: personaUpdateData,
      })
    }

    // 8. Update or create Documento if needed
    if (canEditDemographics && (body.documentType || body.documentNumber || body.ruc)) {
      const documentData: any = {}

      if (body.documentType) documentData.tipo = body.documentType
      if (body.documentNumber) documentData.numero = body.documentNumber.trim()
      if (body.ruc !== undefined) documentData.ruc = body.ruc
      if (body.documentCountry) documentData.pais = body.documentCountry

      if (current.persona.documento) {
        await tx.documento.update({
          where: { idDocumento: current.persona.documento.idDocumento },
          data: documentData,
        })
      } else if (body.documentType && body.documentNumber) {
        await tx.documento.create({
          data: {
            personaId: current.personaId,
            tipo: body.documentType,
            numero: body.documentNumber.trim(),
            pais: body.documentCountry ?? "PY",
            ruc: body.ruc ?? null,
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
          await tx.contacto.update({
            where: { idContacto: existingPhone.idContacto },
            data: { activo: false },
          })
        }
      } else if (existingPhone) {
        // Update existing
        await tx.contacto.update({
          where: { idContacto: existingPhone.idContacto },
          data: { valorNorm: normalizedPhone },
        })
      } else {
        // Create new
        await tx.contacto.create({
          data: {
            personaId: current.personaId,
            tipo: "PHONE",
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
          await tx.contacto.update({
            where: { idContacto: existingEmail.idContacto },
            data: { activo: false },
          })
        }
      } else if (existingEmail) {
        // Update existing
        await tx.contacto.update({
          where: { idContacto: existingEmail.idContacto },
          data: { valorNorm: normalizedEmail },
        })
      } else {
        // Create new
        await tx.contacto.create({
          data: {
            personaId: current.personaId,
            tipo: "EMAIL",
            valorNorm: normalizedEmail,
            esPrincipal: true,
            activo: true,
          },
        })
      }
    }

    // 11. Update Paciente notes (legacy fields)
    const notasData: any = current.notas ? JSON.parse(current.notas as string) : {}
    const oldNotasData: any = { ...notasData }

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
    const pacienteUpdateData: any = {
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
    const newData: any = {
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
          },
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
