"use client";

import { useSession } from "next-auth/react";
import type { RolNombre } from "@/components/icons/role-icon-map";
import { getRoleConfig, type RoleConfig } from "@/lib/rbac/role-config";

export interface UserSessionData {
  name: string;
  email?: string;
  role?: RolNombre;
  roleConfig: RoleConfig | null;
  initials: string;
  image?: string;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook personalizado que encapsula toda la lógica de sesión de usuario
 * Única fuente de verdad para datos de usuario en todo el sistema
 */
export function useUserSession(): UserSessionData {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // Extraer datos del usuario
  const name = session?.user?.name ?? session?.user?.username ?? "Usuario";
  const email = session?.user?.email ?? undefined;
  const role = (session?.user?.role as RolNombre | undefined) ?? undefined;
  const image = session?.user?.image ?? undefined;

  // Obtener configuración del rol
  const roleConfig = getRoleConfig(role);

  // Generar iniciales (máximo 2 letras)
  const initials = generateInitials(name);

  return {
    name,
    email,
    role,
    roleConfig,
    initials,
    image,
    isLoading,
    isAuthenticated,
  };
}

/**
 * Genera las iniciales de un nombre
 * Toma máximo 2 letras de las iniciales del nombre en mayúsculas
 */
function generateInitials(name: string): string {
  if (!name || name.trim().length === 0) {
    return "U";
  }

  const words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
    // Si solo hay una palabra, tomar las primeras 2 letras
    return name.substring(0, 2).toUpperCase();
  }

  // Si hay múltiples palabras, tomar la primera letra de cada una (máx 2)
  const firstInitial = words[0]?.[0]?.toUpperCase() ?? "";
  const secondInitial = words[1]?.[0]?.toUpperCase() ?? "";

  return (firstInitial + secondInitial).substring(0, 2);
}

