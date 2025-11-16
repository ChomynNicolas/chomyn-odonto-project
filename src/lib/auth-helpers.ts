import { auth } from "@/auth"
import type { CurrentUser, RolUsuario } from "@/types/agenda"
import prisma from "@/lib/prisma"

/**
 * Convierte session.user de NextAuth a CurrentUser para el sistema de agenda
 * Incluye la obtención del profesionalId si el usuario tiene un profesional asociado
 */
export async function getCurrentUserForAgenda(): Promise<CurrentUser | null> {
  const session = await auth()
  
  if (!session?.user) {
    return null
  }

  const { user } = session

  // Validar que tenemos los campos mínimos requeridos
  if (!user.id || !user.role) {
    return null
  }

  const idUsuario = Number(user.id)
  if (!Number.isFinite(idUsuario)) {
    return null
  }

  // Validar que el rol es válido
  const role = user.role as RolUsuario
  if (!["ADMIN", "ODONT", "RECEP"].includes(role)) {
    return null
  }

  // Obtener profesionalId si el usuario tiene un profesional asociado
  let profesionalId: number | null = null
  if (role === "ODONT") {
    const profesional = await prisma.profesional.findUnique({
      where: { userId: idUsuario },
      select: { idProfesional: true },
    })
    profesionalId = profesional?.idProfesional ?? null
  }

  return {
    idUsuario,
    role,
    profesionalId,
    nombre: user.name ?? undefined,
  }
}

/**
 * Convierte session.user de NextAuth a CurrentUser (versión síncrona)
 * Úsala solo cuando no necesites obtener el profesionalId desde la BD
 * Para obtener profesionalId, usa getCurrentUserForAgenda() en su lugar
 */
export function mapSessionUserToCurrentUser(user: {
  id?: string
  role?: "ADMIN" | "ODONT" | "RECEP"
  name?: string | null
}): CurrentUser | null {
  if (!user.id || !user.role) {
    return null
  }

  const idUsuario = Number(user.id)
  if (!Number.isFinite(idUsuario)) {
    return null
  }

  const role = user.role as RolUsuario
  if (!["ADMIN", "ODONT", "RECEP"].includes(role)) {
    return null
  }

  return {
    idUsuario,
    role,
    profesionalId: undefined, // No se puede obtener sin consulta a BD
    nombre: user.name ?? undefined,
  }
}

