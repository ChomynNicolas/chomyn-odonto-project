// lib/rbac/role-config.ts
import type { RolNombre } from "@/components/icons/role-icon-map";
import { ROLE_ICON_NAME } from "@/components/icons/role-icon-map";

export interface RoleConfig {
  label: string;
  shortLabel: string;
  badgeClass: string;
  iconName: string;
  iconColor: string;
}

/**
 * Configuración centralizada de roles del sistema
 * Mapea cada rol a su configuración completa de UI
 */
const ROLE_CONFIG: Record<RolNombre, RoleConfig> = {
  ADMIN: {
    label: "Administrador",
    shortLabel: "Admin",
    badgeClass:
      "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
    iconName: ROLE_ICON_NAME.ADMIN,
    iconColor: "text-brand-600 dark:text-brand-400",
  },
  ODONT: {
    label: "Odontólogo/a",
    shortLabel: "Odont",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    iconName: ROLE_ICON_NAME.ODONT,
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  RECEP: {
    label: "Recepción",
    shortLabel: "Recep",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    iconName: ROLE_ICON_NAME.RECEP,
    iconColor: "text-amber-600 dark:text-amber-400",
  },
} as const;

/**
 * Obtiene la configuración de un rol
 * @param role - El rol a obtener configuración
 * @returns La configuración del rol o null si no existe
 */
export function getRoleConfig(role?: RolNombre): RoleConfig | null {
  if (!role) return null;
  return ROLE_CONFIG[role] ?? null;
}

