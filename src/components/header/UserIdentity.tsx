// components/header/UserIdentity.tsx
"use client";

import Link from "next/link";
import { clsx } from "clsx";
import * as React from "react";
import { SvgMaskIcon } from "@/components/icons/SvgMaskIcon";
import { ROLE_ICON_NAME, RolNombre } from "@/components/icons/role-icon-map";

type Props = {
  name: string;
  role: RolNombre;
  variant?: "header" | "sidebar";
  className?: string;
  loading?: boolean;
  error?: boolean;
};

function roleConfig(role: RolNombre) {
  switch (role) {
    case "ADMIN":
      return {
        label: "Administrador",
        badgeClass:
          "bg-brand/10 text-brand-700 dark:bg-brand/20 dark:text-brand-300",
        iconName: ROLE_ICON_NAME.ADMIN,
      };
    case "ODONT":
      return {
        label: "Odontólogo/a",
        badgeClass:
          "bg-success/10 text-success-700 dark:bg-success/20 dark:text-success-300",
        iconName: ROLE_ICON_NAME.ODONT,
      };
    case "RECEP":
      return {
        label: "Recepción",
        badgeClass:
          "bg-warning/10 text-warning-700 dark:bg-warning/20 dark:text-warning-300",
        iconName: ROLE_ICON_NAME.RECEP,
      };
  }
}

export function UserIdentity({
  name,
  role,
  variant = "header",
  className,
  loading,
  error,
}: Props) {
  const { label, badgeClass, iconName } = roleConfig(role);

  const base = (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-lg",
        variant === "header" ? "px-2 py-1.5" : "px-2 py-2",
        "text-foreground",
        className
      )}
      aria-label={`Usuario: ${name}, Rol: ${label}`}
    >
      

      {/* Texto + chip de rol */}
      <div className="flex items-center min-w-0 ">
        <div
          className={clsx(
            "mt-0.5 hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
            
            badgeClass
          )}
          title={label}
        >
          <SvgMaskIcon
            name={iconName}
            sizeClassName="h-8 w-8"
            // el color del relleno vendrá de las clases del chip (text-*)
            // si quieres forzar, añade aquí p. ej. className="text-current"
            aria-hidden
          />
        </div>
        <div
          className={clsx(
            "truncate",
            variant === "header" ? "text-sm font-medium" : "text-[13px] font-medium",
            "border border-border rounded-full px-1.5 "
          )}
        >
          {error ? "Usuario" : name}
        </div>

        {/* Chip (oculto en xs para ahorrar espacio) */}
      </div>
    </div>
  );

  
  return base;
}
