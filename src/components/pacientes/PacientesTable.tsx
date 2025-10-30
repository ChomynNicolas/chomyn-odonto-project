"use client"

import { useDeferredValue, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import PatientQuickCreateModal from "./PatientQuickCreateModal"
import { usePacientes } from "@/hooks/usePacientesQuery"
import type { PacienteItem } from "@/lib/api/pacientes.types"
import { Search, UserPlus, Users, AlertCircle, Phone, Mail, FileText } from "lucide-react"

function Toolbar({
  q,
  setQ,
  onOpenQuick,
}: {
  q: string
  setQ: (v: string) => void
  onOpenQuick: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, documento, RUC o contacto…"
          aria-label="Buscar pacientes"
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onOpenQuick} variant="outline" className="whitespace-nowrap bg-transparent">
          <UserPlus className="size-4" />
          Alta rápida
        </Button>
        <Button asChild className="whitespace-nowrap">
          <Link href="/pacientes/nuevo" prefetch={false}>
            <Users className="size-4" />
            Nuevo paciente
          </Link>
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users className="size-6" />
        </EmptyMedia>
        <EmptyTitle>{query ? "No se encontraron pacientes" : "No hay pacientes registrados"}</EmptyTitle>
        <EmptyDescription>
          {query
            ? `No encontramos pacientes que coincidan con "${query}". Intenta con otros términos de búsqueda.`
            : "Comienza agregando tu primer paciente al sistema."}
        </EmptyDescription>
      </EmptyHeader>
      {!query && (
        <EmptyContent>
          <Button asChild>
            <Link href="/pacientes/nuevo">
              <Users className="size-4" />
              Crear primer paciente
            </Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

function renderNombre(p: PacienteItem) {
  const nom = [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim()
  return nom || "—"
}

function renderDocumento(p: PacienteItem) {
  const doc = p.persona.documento
  if (!doc) return "—"
  const tipoLabel =
    doc.tipo === "CI"
      ? "CI"
      : doc.tipo === "DNI"
        ? "DNI"
        : doc.tipo === "PASAPORTE"
          ? "Pasaporte"
          : doc.tipo === "RUC"
            ? "RUC"
            : doc.tipo
  return `${tipoLabel}: ${doc.numero}${doc.ruc ? ` • RUC ${doc.ruc}` : ""}`
}

function renderTelefono(p: PacienteItem) {
  const phone = p.persona.contactos.find((c) => c.tipo === "PHONE" && c.activo !== false)
  return phone?.valorNorm || "—"
}

function renderEmail(p: PacienteItem) {
  const mail = p.persona.contactos.find((c) => c.tipo === "EMAIL" && c.activo !== false)
  return mail?.valorNorm || "—"
}

function TableDesktop({ data }: { data: PacienteItem[] }) {
  return (
    <Card className="overflow-hidden p-0 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[25%] font-semibold">Nombre</TableHead>
              <TableHead className="w-[20%] font-semibold">Documento</TableHead>
              <TableHead className="w-[18%] font-semibold">Teléfono</TableHead>
              <TableHead className="w-[22%] font-semibold">Email</TableHead>
              <TableHead className="w-[5%] text-right font-semibold">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.idPaciente}>
                <TableCell className="font-medium">{renderNombre(p)}</TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    
                    <span className="truncate">{renderDocumento(p)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{renderTelefono(p)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{renderEmail(p)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="sm" className="h-8">
                      <Link
                        href={`/pacientes/${p.idPaciente}`}
                        prefetch={false}
                        aria-label={`Ver detalles de ${renderNombre(p)}`}
                      >
                        Ver
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      aria-label={`Inactivar a ${renderNombre(p)}`}
                    >
                      Inactivar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function ListMobile({ data }: { data: PacienteItem[] }) {
  return (
    <ul className="space-y-3 sm:hidden" role="list">
      {data.map((p) => (
        <li key={p.idPaciente}>
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold leading-tight">{renderNombre(p)}</h3>
                  <div className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{renderDocumento(p)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{renderTelefono(p)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{renderEmail(p)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Link
                    href={`/pacientes/${p.idPaciente}`}
                    prefetch={false}
                    aria-label={`Ver detalles de ${renderNombre(p)}`}
                  >
                    Ver detalles
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Inactivar a ${renderNombre(p)}`}
                >
                  Inactivar
                </Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function PacientesSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Nombre</TableHead>
              <TableHead className="font-semibold">Documento</TableHead>
              <TableHead className="font-semibold">Teléfono</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="text-right font-semibold">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-36" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function SuccessBanner({
  patientId,
  onClose,
}: {
  patientId: string
  onClose: () => void
}) {
  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20">
      <AlertDescription className="flex items-center justify-between gap-3">
        <span className="text-green-900 dark:text-green-100">
          Paciente creado correctamente.{" "}
          <Link
            href={`/pacientes/${patientId}`}
            className="font-medium underline underline-offset-4 hover:text-green-700 dark:hover:text-green-300"
          >
            Ver detalles
          </Link>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0 text-green-900 hover:bg-green-100 hover:text-green-900 dark:text-green-100 dark:hover:bg-green-900/30"
          aria-label="Cerrar notificación"
        >
          <span className="sr-only">Cerrar</span>
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export default function PacientesTable() {
  const [q, setQ] = useState("")
  const [openQuick, setOpenQuick] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const deferredQ = useDeferredValue(q)

  const soloActivos = true
  const limit = 20

  const { items, hasMore, fetchNextPage, isFetchingNextPage, isLoading, isError, error, refetch, isFetching } =
    usePacientes({ q: deferredQ, soloActivos, limit })

  const showSkeleton = isLoading && !items.length
  const showEmpty = !isLoading && !isError && items.length === 0

  return (
    <section className="space-y-4" aria-label="Gestión de pacientes">
      {createdId && <SuccessBanner patientId={createdId} onClose={() => setCreatedId(null)} />}

      <Toolbar
        q={state.q}
        setQ={setQ}
        status={state.status}
        setStatus={setStatus}
        resultCount={filteredItems.length}
        onOpenQuick={() => setOpenQuick(true)}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            <div className="flex items-center justify-between gap-3">
              <span>
                Ocurrió un error al cargar los pacientes.{" "}
                <button
                  onClick={() => refetch()}
                  className="font-medium underline underline-offset-4 hover:no-underline"
                >
                  Reintentar
                </button>
              </span>
            </div>
            {process.env.NODE_ENV !== "production" && (
              <p className="mt-1 text-xs opacity-70">{(error as any)?.message || "Error desconocido"}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showSkeleton && <PacientesSkeleton />}

      {!isError && !showSkeleton && (
        <>
          {showEmpty ? (
            <EmptyState
              message={state.q || state.status !== "Todos"
                ? `No encontramos pacientes para “${state.q}”.`
                : "Aún no hay pacientes cargados."
              }
              showCta={!state.q && state.status === "Todos"}
            />
          ) : (
            <>
              <TableDesktop data={filteredItems} />
              <ListMobile data={filteredItems} />

              <div className="flex justify-center pt-2">
                {hasMore ? (
                  <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline" size="lg">
                    {isFetchingNextPage ? "Cargando..." : "Cargar más pacientes"}
                  </Button>
                ) : (
                  items.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {isFetching ? "Actualizando..." : "No hay más resultados"}
                    </p>
                  )
                )}
              </div>
            </>
          )}
        </>
      )}

      <PatientQuickCreateModal
        open={openQuick}
        onClose={() => setOpenQuick(false)}
        onCreated={(id) => setCreatedId(id)}
        qForList={deferredQ}
        soloActivos={soloActivos}
        limit={limit}
      />
    </section>
  )
}
