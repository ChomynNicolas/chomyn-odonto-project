"use client"
import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Plus, Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils" // si no tienes cn, reemplaza por una función simple o elimina.

import { RelacionPacienteEnum } from "@/lib/schema/paciente"
import type { PersonaListItemDTO } from "@/lib/schema/personas"
import { PatientQuickCreateModal } from "./PatientQuickCreateModal"

/** Valor que este selector entrega al formulario */
export type ResponsablePagoValue = {
  personaId: number
  relacion: (typeof RelacionPacienteEnum._def.values)[number]
  esPrincipal: boolean
} | null

type Props = {
  value: ResponsablePagoValue
  onChange: (v: ResponsablePagoValue) => void

  /** Para invalidación del listado cuando se usa alta rápida (tu KEY) */
  qForList?: string
  soloActivos?: boolean
  limit?: number

  disabled?: boolean
  className?: string

  /** Texto de ayuda opcional (se usa en aria-describedby) */
  descriptionId?: string
}

const RELACION_OPTS = RelacionPacienteEnum.options as unknown as string[] // ["PADRE","MADRE","TUTOR","CONYUGE","FAMILIAR","OTRO"]

/** ---------- util: debounced value ---------- */
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** ---------- fetchers ---------- */
async function fetchPersonas(q: string, limit = 10): Promise<{ items: PersonaListItemDTO[]; hasMore: boolean }> {
  const url = `/api/personas?q=${encodeURIComponent(q)}&limit=${limit}`
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" })
  const data = await res.json()
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error ?? "No se pudo buscar personas")
  }
  return data.data
}

async function resolvePersonaIdFromPacienteId(idPaciente: number): Promise<number> {
  const res = await fetch(`/api/pacientes/${idPaciente}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
  const data = await res.json()
  if (!res.ok || !data?.ok) throw new Error(data?.error ?? "No se pudo obtener la persona del paciente")
  // Suponiendo estructura: data.data.persona.idPersona (como en tu ficha)
  const personaId = Number(data?.data?.persona?.idPersona)
  if (!Number.isFinite(personaId)) throw new Error("La respuesta no contiene personaId")
  return personaId
}

/** ---------- vista compacta de persona seleccionada ---------- */
function PersonaBadge({ p }: { p: PersonaListItemDTO }) {
  const doc = [p.documento?.tipo, p.documento?.numero].filter(Boolean).join(" ")
  const ruc = p.documento?.ruc ? ` • RUC ${p.documento.ruc}` : ""
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <div className="font-medium">{p.nombreCompleto}</div>
      <div className="text-xs text-muted-foreground">
        {doc}
        {ruc}
      </div>
    </div>
  )
}

/** ---------- componente principal ---------- */
export default function ResponsablePagoSelector({
  value,
  onChange,
  qForList = "",
  soloActivos = true,
  limit = 20,
  disabled,
  className,
  descriptionId,
}: Props) {
  const [term, setTerm] = useState("")
  const [openList, setOpenList] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // valores controlados (cuando ya hay persona elegida)
  const [relacion, setRelacion] = useState<(typeof RELACION_OPTS)[number]>(value?.relacion ?? "OTRO")
  const [esPrincipal, setEsPrincipal] = useState<boolean>(value?.esPrincipal ?? true)

  // datos de la persona seleccionada (para mostrar badge)
  const [selectedPersona, setSelectedPersona] = useState<PersonaListItemDTO | null>(null)

  // alta rápida
  const [quickOpen, setQuickOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useRef(`rp-listbox-${Math.random().toString(36).slice(2)}`).current

  const debouncedTerm = useDebounced(term, 300)
  const enabled = debouncedTerm.trim().length >= 2 && !value // no buscar si ya hay valor seleccionado

  const relacionTriggerRef = useRef<HTMLButtonElement | null>(null)

  const {
    data,
    isFetching,
    isError,
    error: qError,
  } = useQuery({
    queryKey: ["personas", debouncedTerm, 10],
    queryFn: () => fetchPersonas(debouncedTerm, 10),
    enabled,
  })

  useEffect(() => {
    setError(isError ? ((qError as Error)?.message ?? "Error al buscar") : null)
  }, [isError, qError])

  // si cambian props.value desde fuera, alinear relacion/esPrincipal
  useEffect(() => {
    if (value) {
      setRelacion(value.relacion)
      setEsPrincipal(value.esPrincipal)
    } else {
      setRelacion("OTRO")
      setEsPrincipal(true)
      setSelectedPersona(null)
    }
  }, [value])

  const items = data?.items ?? []
  const empty = enabled && !isFetching && items.length === 0 && !error

  function handlePick(p: PersonaListItemDTO) {
    setSelectedPersona(p)
    onChange({ personaId: p.idPersona, relacion, esPrincipal })
    setOpenList(false)
  }

  function handleClear() {
    setSelectedPersona(null)
    setTerm("")
    onChange(null)
    setOpenList(false)
    inputRef.current?.focus()
  }

  // si cambia relacion o principal y ya hay personaId, propagar
  useEffect(() => {
    if (value?.personaId) {
      onChange({ personaId: value.personaId, relacion, esPrincipal })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relacion, esPrincipal])

  /** Quick-create: cuando el modal crea un paciente */
  async function handleQuickCreated(idPacienteStr: string) {
    try {
      const idPaciente = Number(idPacienteStr)
      const personaId = await resolvePersonaIdFromPacienteId(idPaciente)

      onChange({ personaId, relacion, esPrincipal })
      setQuickOpen(false)
      setOpenList(false)

      // Visual rápido (placeholder); se actualizará al volver a la ficha/listado
      setSelectedPersona({
        idPersona: personaId,
        nombreCompleto: "Responsable creado",
        documento: { tipo: "OTRO", numero: "" },
        contactos: [],
      })

      // ⬅️ NUEVO: foco al control de relación (mejor accesibilidad)
      setTimeout(() => relacionTriggerRef.current?.focus(), 0)
    } catch (e: any) {
      setError(e?.message ?? "No se pudo obtener el responsable creado")
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">Responsable de pago</Label>

      {/* entrada de búsqueda o badge si ya hay selección */}
      {value && selectedPersona ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PersonaBadge p={selectedPersona} />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Relación</Label>
                <Select
                  value={relacion}
                  onValueChange={(v) => setRelacion(v as (typeof RELACION_OPTS)[number])}
                  disabled={disabled}
                >
                  <SelectTrigger ref={relacionTriggerRef} className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELACION_OPTS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r[0] + r.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="rp-principal"
                    checked={esPrincipal}
                    onCheckedChange={setEsPrincipal}
                    disabled={disabled}
                  />
                  <Label htmlFor="rp-principal" className="text-sm">
                    Principal
                  </Label>
                </div>

                <Button type="button" variant="ghost" size="icon" onClick={handleClear} aria-label="Quitar responsable">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Input
              ref={inputRef}
              value={term}
              onChange={(e) => {
                setTerm(e.target.value)
                setOpenList(true)
              }}
              onFocus={() => setOpenList(true)}
              onBlur={() => {
                // pequeño delay para permitir clic en la lista
                setTimeout(() => setOpenList(false), 150)
              }}
              placeholder="Buscar por CI/DNI/RUC o nombre..."
              disabled={disabled}
              aria-autocomplete="list"
              aria-expanded={openList}
              aria-controls={listboxId}
              aria-describedby={descriptionId}
              className="pe-10"
            />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </div>

            {/* dropdown results */}
            {openList && enabled && (
              <div
                id={listboxId}
                role="listbox"
                className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
              >
                {error && <div className="px-2 py-3 text-sm text-destructive">Error: {error}</div>}
                {!error && empty && <div className="px-2 py-3 text-sm text-muted-foreground">Sin resultados…</div>}
                {!error &&
                  items.map((p) => {
                    const doc = [p.documento?.tipo, p.documento?.numero].filter(Boolean).join(" ")
                    const ruc = p.documento?.ruc ? ` • RUC ${p.documento.ruc}` : ""
                    const contact =
                      p.contactos?.find((c) => c.tipo === "PHONE")?.valor ??
                      p.contactos?.find((c) => c.tipo === "EMAIL")?.valor ??
                      ""
                    return (
                      <button
                        key={p.idPersona}
                        role="option"
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handlePick(p)}
                        className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left hover:bg-accent"
                      >
                        <span className="text-sm font-medium">{p.nombreCompleto}</span>
                        <span className="text-xs text-muted-foreground">
                          {doc}
                          {ruc}
                          {contact ? ` • ${contact}` : ""}
                        </span>
                      </button>
                    )
                  })}
                {data?.hasMore && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Hay más resultados… afiná la búsqueda</div>
                )}
              </div>
            )}
          </div>

          {/* Relación + Principal + Alta rápida */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Relación</Label>
              <Select
                value={relacion}
                onValueChange={(v) => setRelacion(v as (typeof RELACION_OPTS)[number])}
                disabled={disabled}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {RELACION_OPTS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r[0] + r.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Switch id="rp-principal-2" checked={esPrincipal} onCheckedChange={setEsPrincipal} disabled={disabled} />
              <Label htmlFor="rp-principal-2" className="text-sm">
                Principal
              </Label>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setQuickOpen(true)}
                disabled={disabled}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" /> Crear responsable rápido
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Errores fijos */}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Modal de alta rápida (reutilizado tal cual) */}
      <PatientQuickCreateModal
        open={quickOpen}
        onOpenChange={() => setQuickOpen(false)}
        onCreated={handleQuickCreated}
        qForList={qForList}
        soloActivos={soloActivos}
        limit={limit}
      />
    </div>
  )
}
