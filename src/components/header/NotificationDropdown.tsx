"use client"

import Link from "next/link"
import { type JSX, useEffect, useMemo, useRef, useState } from "react"
import { Dropdown } from "../ui/dropdown/Dropdown"
import { DropdownItem } from "../ui/dropdown/DropdownItem"
import clsx from "clsx"

/** =========================================================
 * Tipos de dominio y utilidades (amigable con Prisma luego)
 * ========================================================= */
type NotificationType = "APPOINTMENT" | "BILLING" | "CLINICAL" | "SYSTEM"
type Severity = "info" | "warning" | "critical"

type UiNotification = {
  id: string
  type: NotificationType
  title: string // breve: "Turno confirmado"
  message: string // detalle: "Juan Pérez confirmó el turno de las 10:00"
  entity?: "Appointment" | "Paciente" | "Factura"
  entityId?: string
  severity: Severity
  readAt?: string | null
  createdAt: string // ISO
}

/** =========================================
 * MOCK: hardcode de notificaciones de ejemplo
 * (luego cargarás desde Server Actions/API)
 * ========================================= */
const MOCK_NOTIFS: UiNotification[] = [
  {
    id: "n1",
    type: "APPOINTMENT",
    title: "Turno confirmado",
    message: "Juan Pérez confirmó el turno de hoy 10:00 con Dr/a. Gómez",
    entity: "Appointment",
    entityId: "apt_123",
    severity: "info",
    readAt: null,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // hace 5 min
  },
  {
    id: "n2",
    type: "BILLING",
    title: "Factura vencida",
    message: "Factura #F-2025-0045 con 5 días de atraso",
    entity: "Factura",
    entityId: "fac_45",
    severity: "warning",
    readAt: null,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // hace 1h
  },
  {
    id: "n3",
    type: "CLINICAL",
    title: "Alergia registrada",
    message: "Paciente Ana Ruiz: alergia a penicilina (actualizado en ficha)",
    entity: "Paciente",
    entityId: "pac_999",
    severity: "critical",
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // hace 2h
  },
  {
    id: "n4",
    type: "SYSTEM",
    title: "Nuevo usuario",
    message: "Se creó el usuario recepcionista: mgarcia@clinic.com",
    entity: undefined,
    entityId: undefined,
    severity: "info",
    readAt: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // ayer
  },
]

/** ==========================
 * Utilidades de presentación
 * ========================== */
function formatDate(dt: string) {
  // futuro: i18n con dayjs/date-fns
  const d = new Date(dt)
  return d.toLocaleString()
}

function entityHref(n: UiNotification): string | undefined {
  if (n.entity === "Appointment" && n.entityId) return `/agenda?focus=${n.entityId}`
  if (n.entity === "Factura" && n.entityId) return `/facturacion/${n.entityId}`
  if (n.entity === "Paciente" && n.entityId) return `/pacientes/${n.entityId}`
  return undefined
}

/** ==========================
 * Componente principal
 * ========================== */
export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<UiNotification[]>([])
  const unread = items.filter((n) => !n.readAt).length
  const hasUnread = unread > 0

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false)
    }
    function onClickOutside(e: MouseEvent) {
      if (!dropdownRef.current) return
      if (isOpen && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onClickOutside)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && items.length === 0) {
      // futuro: aquí llamarás a listMyNotifications()
      setItems(MOCK_NOTIFS)
    }
  }, [isOpen, items.length])

  function toggleDropdown() {
    setIsOpen((v) => !v)
  }
  function closeDropdown() {
    setIsOpen(false)
  }

  async function handleBellClick() {
    toggleDropdown()
    // futuro: puedes disparar unreadCount() aquí
  }

  async function handleMarkAllRead() {
    // futuro: await markAllAsRead()
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
  }

  async function handleItemClick(n: UiNotification) {
    // futuro: await markAsRead(n.id)
    if (!n.readAt) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
    }
    const href = entityHref(n)
    if (href) window.location.href = href
    else closeDropdown()
  }

  const ui = useMemo(() => {
    const iconByType: Record<NotificationType, JSX.Element> = {
      APPOINTMENT: (
        <svg width="20" height="20" viewBox="0 0 24 24" className="text-brand-600 dark:text-brand-400">
          <path
            fill="currentColor"
            d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zM3 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10zm5 3h4v4H8z"
          />
        </svg>
      ),
      BILLING: (
        <svg width="20" height="20" viewBox="0 0 24 24" className="text-amber-600 dark:text-amber-400">
          <path fill="currentColor" d="M21 7H3V5h18zm0 4H3V9h18zm0 8H3v-6h18z" />
        </svg>
      ),
      CLINICAL: (
        <svg width="20" height="20" viewBox="0 0 24 24" className="text-emerald-600 dark:text-emerald-400">
          <path fill="currentColor" d="M19 3H5a2 2 0 0 0-2 2v14l4-2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
        </svg>
      ),
      SYSTEM: (
        <svg width="20" height="20" viewBox="0 0 24 24" className="text-slate-600 dark:text-slate-300">
          <path fill="currentColor" d="M3 4h18v2H3zm0 14h18v2H3zM8 9h8v6H8z" />
        </svg>
      ),
    }
    const colorBySeverity: Record<Severity, string> = {
      info: "bg-blue-500",
      warning: "bg-warning-500",
      critical: "bg-danger-500",
    }
    return { iconByType, colorBySeverity }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Notificaciones${hasUnread ? ` (${unread} sin leer)` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:h-11 lg:w-11"
        onClick={handleBellClick}
      >
        {hasUnread && (
          <span className="absolute right-0.5 top-0.5 z-10 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
        )}

        <svg className="h-5 w-5 fill-current" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
          />
        </svg>
        {hasUnread && <span className="sr-only">{unread} notificaciones sin leer</span>}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-3 flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
          <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h5>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Marcar todas
            </button>
            <button
              onClick={toggleDropdown}
              className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5 fill-current" width="24" height="24" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                />
              </svg>
            </button>
          </div>
        </div>

        <ul
          className="flex h-auto flex-col overflow-y-auto p-2 custom-scrollbar"
          role="menu"
          aria-label="Lista de notificaciones"
        >
          {items.length === 0 && (
            <li className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No tienes notificaciones por ahora.
            </li>
          )}

          {items.map((n) => {
            const href = entityHref(n)
            const isUnread = !n.readAt
            return (
              <li key={n.id} role="none">
                <DropdownItem
                  onItemClick={() => handleItemClick(n)}
                  className={clsx(
                    "flex gap-3 rounded-lg border-b border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800",
                    isUnread && "bg-blue-50/50 dark:bg-blue-950/20",
                  )}
                >
                  {/* Ícono por tipo + dot de severidad */}
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    {ui.iconByType[n.type]}
                    <span
                      className={clsx(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900",
                        ui.colorBySeverity[n.severity],
                      )}
                    ></span>
                  </span>

                  <span className="block min-w-0 flex-1">
                    <span className="mb-1 block text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">{n.title}</span>
                      <span className="mx-1 text-gray-400">·</span>
                      <span className="text-gray-600 dark:text-gray-400">{n.message}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {n.type === "APPOINTMENT"
                          ? "Turnos"
                          : n.type === "BILLING"
                            ? "Facturación"
                            : n.type === "CLINICAL"
                              ? "Clínica"
                              : "Sistema"}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-gray-400" />
                      <time dateTime={n.createdAt}>{formatDate(n.createdAt)}</time>
                      {href && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-gray-400" />
                          <span className="underline underline-offset-2">Abrir</span>
                        </>
                      )}
                    </span>
                  </span>
                </DropdownItem>
              </li>
            )
          })}
        </ul>

        <div className="grid grid-cols-2 gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
          <Link
            href="/notificaciones"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Ver todas
          </Link>
          <Link
            href="/configuracion?tab=notificaciones"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Preferencias
          </Link>
        </div>
      </Dropdown>
    </div>
  )
}
