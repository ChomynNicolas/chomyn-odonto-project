"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getProcedimientoAuditLog, type AuditLogEntry } from "@/lib/api/admin/procedimientos"
import { AuditAction } from "@/lib/audit/actions"
import { toast } from "sonner"

interface ProcedimientoAuditLogProps {
  procedimientoId: number
}

// Helper to format audit action display name
function formatAction(action: string): string {
  switch (action) {
    case AuditAction.PROCEDIMIENTO_CREATE:
      return "Creación"
    case AuditAction.PROCEDIMIENTO_UPDATE:
      return "Actualización"
    case AuditAction.PROCEDIMIENTO_DEACTIVATE:
      return "Desactivación"
    default:
      return action
  }
}

// Helper to format metadata changes
function formatMetadata(metadata: unknown): React.ReactNode {
  if (!metadata || typeof metadata !== "object") {
    return <span className="text-muted-foreground">-</span>
  }

  const meta = metadata as Record<string, unknown>

  // If there are changes, show them
  if (meta.changes && typeof meta.changes === "object") {
    const changes = meta.changes as Record<string, { old: unknown; new: unknown }>
    const changeEntries = Object.entries(changes)

    if (changeEntries.length === 0) {
      return <span className="text-muted-foreground">Sin cambios específicos</span>
    }

    return (
      <div className="space-y-1">
        {changeEntries.map(([key, change]) => {
          // Format field names
          const fieldNames: Record<string, string> = {
            code: "Código",
            nombre: "Nombre",
            descripcion: "Descripción",
            defaultPriceCents: "Precio",
            defaultDurationMin: "Duración",
            aplicaDiente: "Aplica a diente",
            aplicaSuperficie: "Aplica a superficie",
            activo: "Estado",
          }

          const fieldName = fieldNames[key] || key

          // Format values based on field type
          const formatValue = (value: unknown): string => {
            if (value === null || value === undefined) return "-"
            if (key === "defaultPriceCents" && typeof value === "number") {
              // Note: defaultPriceCents field now stores guaraníes, not cents
              return new Intl.NumberFormat("es-PY", {
                style: "currency",
                currency: "PYG",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)
            }
            if (key === "defaultDurationMin" && typeof value === "number") {
              if (value < 60) return `${value} min`
              const hours = Math.floor(value / 60)
              const mins = value % 60
              return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`
            }
            if (typeof value === "boolean") {
              return value ? "Sí" : "No"
            }
            return String(value)
          }

          return (
            <div key={key} className="text-sm">
              <span className="font-medium">{fieldName}:</span>{" "}
              <span className="text-muted-foreground line-through">{formatValue(change.old)}</span>{" "}
              → <span className="font-medium">{formatValue(change.new)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // Show other metadata if present
  const otherMeta = Object.entries(meta).filter(([key]) => key !== "changes")
  if (otherMeta.length > 0) {
    return (
      <div className="space-y-1 text-sm">
        {otherMeta.map(([key, value]) => (
          <div key={key}>
            <span className="font-medium">{key}:</span> {String(value)}
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-muted-foreground">-</span>
}

export default function ProcedimientoAuditLog({ procedimientoId }: ProcedimientoAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getProcedimientoAuditLog(procedimientoId)
      .then((auditLogs) => {
        setLogs(auditLogs)
      })
      .catch((error) => {
        toast.error(error.message || "Error al cargar log de auditoría")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [procedimientoId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Cargando log de auditoría...</div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">No hay registros de auditoría</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Cambios</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.idAuditLog}>
              <TableCell>
                {new Date(log.createdAt).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{formatAction(log.action)}</Badge>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{log.actor.nombre || log.actor.usuario}</div>
                  <div className="text-sm text-muted-foreground">{log.actor.usuario}</div>
                </div>
              </TableCell>
              <TableCell className="max-w-md">{formatMetadata(log.metadata)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

