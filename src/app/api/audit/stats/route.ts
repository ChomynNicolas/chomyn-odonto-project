// src/app/api/audit/stats/route.ts
/**
 * GET /api/audit/stats
 * Endpoint para obtener estadísticas agregadas del registro de auditoría
 */

import { type NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { prisma } from "@/lib/prisma"
import { canAccessGlobalAuditLog } from "@/lib/audit/rbac"
import { buildAuditLogWhere } from "@/lib/audit/build-audit-where"
import { auditLogFiltersSchema } from "../_schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    // Verificar permisos usando RBAC
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    if (!canAccessGlobalAuditLog(userRole)) {
      return errors.forbidden("Solo administradores pueden ver estadísticas de auditoría")
    }

    // Parsear y validar query params (opcional, para filtrar stats)
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = searchParams.dateFrom || searchParams.dateTo
      ? auditLogFiltersSchema.parse(searchParams)
      : null

    const where = filters ? buildAuditLogWhere(filters) : {}

    // Calcular rangos de fechas
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    
    const monthStart = new Date(now)
    monthStart.setMonth(monthStart.getMonth() - 1)

    // Estadísticas por período
    const [totalToday, totalWeek, totalMonth, totalAll] = await Promise.all([
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: todayStart },
        },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: weekStart },
        },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: monthStart },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    // Usuarios más activos (top 5)
    const topUsers = await prisma.auditLog.groupBy({
      by: ["actorId"],
      where,
      _count: {
        actorId: true,
      },
      orderBy: {
        _count: {
          actorId: "desc",
        },
      },
      take: 5,
    })

    const topUsersWithDetails = await Promise.all(
      topUsers.map(async (user) => {
        const usuario = await prisma.usuario.findUnique({
          where: { idUsuario: user.actorId },
          select: {
            idUsuario: true,
            nombreApellido: true,
            rol: {
              select: {
                nombreRol: true,
              },
            },
          },
        })
        return {
          userId: user.actorId,
          count: user._count.actorId,
          nombre: usuario?.nombreApellido || `Usuario #${user.actorId}`,
          role: usuario?.rol.nombreRol || "UNKNOWN",
        }
      })
    )

    // Acciones más comunes (top 10)
    const topActions = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 10,
    })

    // Entidades más modificadas (top 10)
    const topEntities = await prisma.auditLog.groupBy({
      by: ["entity"],
      where,
      _count: {
        entity: true,
      },
      orderBy: {
        _count: {
          entity: "desc",
        },
      },
      take: 10,
    })

    // Distribución por hora del día (últimas 24 horas)
    const last24Hours = new Date(now)
    last24Hours.setHours(last24Hours.getHours() - 24)

    const hourlyDistribution = await prisma.auditLog.findMany({
      where: {
        ...where,
        createdAt: { gte: last24Hours },
      },
      select: {
        createdAt: true,
      },
    })

    

    return ok({
      periods: {
        today: totalToday,
        week: totalWeek,
        month: totalMonth,
        all: totalAll,
      },
      topUsers: topUsersWithDetails,
      topActions: topActions.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      topEntities: topEntities.map((e) => ({
        entity: e.entity,
        count: e._count.entity,
      })),
      hourlyDistribution,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: Array<{ message?: string }> }
      return errors.validation(zodError.issues?.[0]?.message ?? "Parámetros de filtro inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/audit/stats]", e)
    return errors.internal(errorMessage ?? "Error al obtener estadísticas de auditoría")
  }
}

