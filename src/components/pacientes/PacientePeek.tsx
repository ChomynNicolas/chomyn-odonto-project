"use client"

import * as React from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Phone, Mail, FileWarning, CalendarDays, IdCard, Activity } from "lucide-react"

type PacienteFichaDTO = {
  idPaciente: number
  estaActivo: boolean
  persona: {
    idPersona: number
    nombres: string | null
    apellidos: string | null
    documento: { tipo: string; numero: string; ruc: string | null } | null
    contactos: Array<{
      tipo: "PHONE" | "EMAIL"
      valorNorm: string
      label: string | null
      esPrincipal: boolean
      activo: boolean
    }>
  }
  antecedentes: {
    alergias: string | null
    obraSocial: string | null
  }
  kpis: {
    proximoTurno: string | null
    noShow: number
  }
}

export function PacientePeek({
  pacienteId,
  children,
  side = "top",
}: {
  pacienteId: number
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [data, setData] = React.useState<PacienteFichaDTO | null>(null)

  const load = React.useCallback(async () => {
    if (data || loading) return
    try {
      setLoading(true)
      setErr(null)
      const r = await fetch(`/api/pacientes/${pacienteId}`, { cache: "no-store" })
      const j = await r.json()
      if (!r.ok || !j) throw new Error(j?.error ?? "No se pudo cargar el paciente")
      const d = j?.data ?? j
      setData(d as PacienteFichaDTO)
    } catch (e: any) {
      setErr(e?.message ?? "Error")
    } finally {
      setLoading(false)
    }
  }, [pacienteId, data, loading])

  return (
    <HoverCard
      openDelay={150}
      closeDelay={100}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) void load()
      }}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} align="start" className="w-96 p-0 overflow-hidden">
        <Card className="border-0 shadow-none">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : err ? (
            <div className="p-4 text-sm text-destructive">{err}</div>
          ) : data ? (
            <PacientePeekBody d={data} />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Sin datos.</div>
          )}
        </Card>
      </HoverCardContent>
    </HoverCard>
  )
}

function PacientePeekBody({ d }: { d: PacienteFichaDTO }) {
  const nombre = [d.persona.nombres ?? "", d.persona.apellidos ?? ""].join(" ").trim()
  const doc = d.persona.documento
    ? `${d.persona.documento.tipo} ${d.persona.documento.numero}${d.persona.documento.ruc ? " · RUC " + d.persona.documento.ruc : ""}`
    : null
  const contacto = pickContactoPrincipal(d.persona.contactos)
  const proximo = d.kpis.proximoTurno ? fmtShort(new Date(d.kpis.proximoTurno)) : "—"

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h4 className="text-base font-semibold truncate">{nombre}</h4>
          {doc ? (
            <div className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-1">
              <IdCard className="h-3.5 w-3.5" />
              <span className="truncate">{doc}</span>
            </div>
          ) : null}
        </div>
        <Badge
          variant={d.estaActivo ? "default" : "outline"}
          className={cn("text-xs", d.estaActivo ? "" : "opacity-70")}
        >
          {d.estaActivo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <Separator className="my-3" />

      {/* Contacto / Próximo turno */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Contacto</div>
          {contacto ? (
            <div className="flex items-center gap-1">
              {contacto.tipo === "PHONE" ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              <span className="truncate">{contacto.valorNorm}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Próximo turno</div>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <span>{proximo}</span>
          </div>
        </div>
      </div>

      {/* Clínica rápida */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Obra social</div>
          <span>{d.antecedentes.obraSocial ? d.antecedentes.obraSocial : "—"}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Alergias</div>
          <div className="inline-flex items-center gap-1">
            <FileWarning className="h-4 w-4" />
            <span className={d.antecedentes.alergias ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
              {d.antecedentes.alergias ? "Sí" : "No registradas"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer enlaces */}
      <div className="mt-4 flex items-center justify-between">
        <a href={`/pacientes/${d.idPaciente}`} className="text-sm underline decoration-dotted text-primary">
          Abrir ficha completa
        </a>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" /> No-show: {d.kpis.noShow}
        </div>
      </div>
    </div>
  )
}

function pickContactoPrincipal(cs: PacienteFichaDTO["persona"]["contactos"]) {
  const activos = cs.filter((c) => c.activo)
  const principal = activos.find((c) => c.esPrincipal)
  if (principal) return principal
  // fallback preferencia: PHONE > EMAIL
  return activos.find((c) => c.tipo === "PHONE") ?? activos.find((c) => c.tipo === "EMAIL") ?? null
}

function fmtShort(d: Date) {
  const day = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "2-digit", month: "short" }).format(d)
  const tm = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(d)
  return `${day} · ${tm}`
}
