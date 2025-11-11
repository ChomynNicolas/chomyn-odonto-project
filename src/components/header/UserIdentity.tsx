"use client"

import { clsx } from "clsx"
import { SvgMaskIcon } from "@/components/icons/SvgMaskIcon"
import { ROLE_ICON_NAME, type RolNombre } from "@/components/icons/role-icon-map"

type Props = {
  name: string
  role: RolNombre
  variant?: "header" | "sidebar"
  className?: string
  loading?: boolean
  error?: boolean
}

function roleConfig(role: RolNombre) {
  switch (role) {
    case "ADMIN":
      return {
        label: "Administrador",
        badgeClass: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
        iconName: ROLE_ICON_NAME.ADMIN,
        iconColor: "text-brand-600 dark:text-brand-400",
      }
    case "ODONT":
      return {
        label: "Odontólogo/a",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        iconName: ROLE_ICON_NAME.ODONT,
        iconColor: "text-emerald-600 dark:text-emerald-400",
      }
    case "RECEP":
      return {
        label: "Recepción",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        iconName: ROLE_ICON_NAME.RECEP,
        iconColor: "text-amber-600 dark:text-amber-400",
      }
  }
}

export function UserIdentity({ name, role, variant = "header", className, loading, error }: Props) {
  const { label, badgeClass, iconName, iconColor } = roleConfig(role)

  return (
    <div
      className={clsx(
        "group flex items-center gap-2 rounded-lg transition-colors",
        variant === "header" ? "px-2 py-1.5" : "px-2 py-2",
        className,
      )}
      aria-label={`Usuario: ${name}, Rol: ${label}`}
    >
      <div
        className={clsx("hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex", badgeClass)}
        title={label}
      >
        <SvgMaskIcon name={iconName} sizeClassName="h-3.5 w-3.5" className={iconColor} aria-hidden />
        <span className="hidden lg:inline">{label}</span>
      </div>

      <div
        className={clsx(
          "truncate rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
          variant === "header" ? "text-sm" : "text-[13px]",
        )}
      >
        {loading ? "Cargando..." : error ? "Usuario" : name}
      </div>
    </div>
  )
}
